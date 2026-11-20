"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit, MapPin, Minus, Package, PackagePlus, Percent, Plus, Trash2 } from "lucide-react";
import AumentoPreciosModal from "@/components/AumentoPreciosModal";
import IngresoMercaderiaModal from "@/components/IngresoMercaderiaModal";
import ProductoLubricentroForm from "@/components/ProductoLubricentroForm";
import BotonReporteFiltros from "@/components/BotonReporteFiltros";
import { useFeedback } from "@/components/ui/Feedback";
import {
  EmptyState,
  FilterChips,
  ListSkeleton,
  PageHeader,
  Pagination,
  SearchInput,
  StockBadge,
} from "@/components/ui";
import { CATEGORIAS_LUBRICENTRO, ProductoLubricentro, TIPOS_FILTRO } from "@/types/lubricentro";
import {
  ajustarStockLubricentro,
  eliminarProductoLubricentro,
  obtenerProductosLubricentro,
} from "@/actions/lubricentro";
import { calcularMargen, coincideBusqueda, formatCurrency, formatPercent, round2 } from "@/lib/format";
import { estadoStock, tipoFiltroDe } from "@/lib/stock";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

type Orden = "recientes" | "descripcion" | "stock" | "precio";

const CATEGORIA_STYLE: Record<string, string> = {
  Aceites: "bg-sky-500/15 text-sky-300",
  Filtros: "bg-orange-500/15 text-orange-300",
  Lubricantes: "bg-yellow-500/15 text-yellow-300",
  Aditivos: "bg-emerald-500/15 text-emerald-300",
  Refrigerantes: "bg-violet-500/15 text-violet-300",
  "Líquido de freno": "bg-rose-500/15 text-rose-300",
};

function CategoriaBadge({ categoria }: { categoria?: string }) {
  if (!categoria) return <span className="text-xs text-neutral-600">-</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        CATEGORIA_STYLE[categoria] || "bg-neutral-800 text-neutral-300"
      )}
    >
      {categoria}
    </span>
  );
}

function StockStepper({
  producto,
  onAjustar,
  ocupado,
}: {
  producto: ProductoLubricentro;
  onAjustar: (p: ProductoLubricentro, delta: number) => void;
  ocupado: boolean;
}) {
  const stock = producto.stock || 0;
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => onAjustar(producto, -1)}
        disabled={ocupado || stock <= 0}
        className="icon-btn h-8 w-8 border border-neutral-800"
        aria-label={`Restar 1 a ${producto.descripcion}`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <StockBadge stock={stock} estado={estadoStock(producto)} />
      <button
        type="button"
        onClick={() => onAjustar(producto, 1)}
        disabled={ocupado}
        className="icon-btn h-8 w-8 border border-neutral-800"
        aria-label={`Sumar 1 a ${producto.descripcion}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function LubricentroInventario() {
  const { toast, confirm } = useFeedback();
  const [productos, setProductos] = useState<ProductoLubricentro[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoria, setCategoria] = useState("Todos");
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [filtroStock, setFiltroStock] = useState("todos");
  const [orden, setOrden] = useState<Orden>("recientes");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [showPrecios, setShowPrecios] = useState(false);
  const [showIngreso, setShowIngreso] = useState(false);
  const [editing, setEditing] = useState<ProductoLubricentro | undefined>();
  const [ultimoProducto, setUltimoProducto] = useState<ProductoLubricentro | undefined>();
  const [ajustando, setAjustando] = useState<string | null>(null);

  const aplicarResultado = (result: Awaited<ReturnType<typeof obtenerProductosLubricentro>>) => {
    if (result.success) setProductos(result.data);
    else toast(result.error, "error");
    setLoading(false);
  };

  const cargarProductos = async () => aplicarResultado(await obtenerProductosLubricentro());

  useEffect(() => {
    let activo = true;
    obtenerProductosLubricentro().then((r) => activo && aplicarResultado(r));
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtros por búsqueda + categoría + tipo de filtro (base para contar chips)
  const porBusqueda = useMemo(
    () =>
      productos.filter((p) =>
        coincideBusqueda(
          searchTerm,
          p.codigo,
          p.descripcion,
          p.marca,
          p.ubicacion,
          p.categoria,
          ...(Array.isArray(p.aplicaciones) ? p.aplicaciones : [])
        )
      ),
    [productos, searchTerm]
  );

  const porCategoria = useMemo(() => {
    let lista = porBusqueda;
    if (categoria !== "Todos") lista = lista.filter((p) => p.categoria === categoria);
    if (categoria === "Filtros" && tipoFiltro !== "Todos") {
      lista = lista.filter((p) => tipoFiltroDe(p) === tipoFiltro);
    }
    return lista;
  }, [porBusqueda, categoria, tipoFiltro]);

  const filtrados = useMemo(() => {
    let lista = porCategoria;
    if (filtroStock !== "todos") lista = lista.filter((p) => estadoStock(p) === filtroStock);
    const ordenada = [...lista];
    if (orden === "descripcion") {
      ordenada.sort((a, b) => (a.descripcion || "").localeCompare(b.descripcion || "", "es"));
    } else if (orden === "stock") {
      ordenada.sort((a, b) => (a.stock || 0) - (b.stock || 0));
    } else if (orden === "precio") {
      ordenada.sort((a, b) => (b.precioVenta || 0) - (a.precioVenta || 0));
    }
    return ordenada;
  }, [porCategoria, filtroStock, orden]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaActual = Math.min(page, totalPages);
  const visibles = filtrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  const categoriasPresentes = useMemo(() => {
    const extra = [...new Set(productos.map((p) => p.categoria).filter(Boolean))].filter(
      (c) => !(CATEGORIAS_LUBRICENTRO as readonly string[]).includes(c)
    );
    return [...CATEGORIAS_LUBRICENTRO, ...extra].filter((c) =>
      porBusqueda.some((p) => p.categoria === c)
    );
  }, [productos, porBusqueda]);

  const conteoStock = useMemo(() => {
    const c = { sin: 0, bajo: 0 };
    porCategoria.forEach((p) => {
      const e = estadoStock(p);
      if (e !== "ok") c[e]++;
    });
    return c;
  }, [porCategoria]);

  const valorFiltrado = useMemo(
    () =>
      filtrados.reduce(
        (acc, p) => {
          const s = Math.max(0, p.stock || 0);
          acc.costo += s * (p.precioCosto || 0);
          acc.venta += s * (p.precioVenta || 0);
          return acc;
        },
        { costo: 0, venta: 0 }
      ),
    [filtrados]
  );

  const cambiarFiltro = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  const handleNuevo = () => {
    if (ultimoProducto) {
      // Precarga con el último producto guardado pero como registro nuevo
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, createdAt, updatedAt, ...resto } = ultimoProducto;
      setEditing({ ...resto, stock: 0 } as ProductoLubricentro);
    } else {
      setEditing(undefined);
    }
    setShowForm(true);
  };

  const handleEditar = (p: ProductoLubricentro) => {
    setEditing(p);
    setShowForm(true);
  };

  const handleEliminar = async (p: ProductoLubricentro) => {
    const ok = await confirm({
      title: "Eliminar producto",
      message: (
        <>
          ¿Eliminar <strong className="text-white">{p.descripcion || p.codigo}</strong>? Esta acción no se puede
          deshacer.
        </>
      ),
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    const result = await eliminarProductoLubricentro(p.id!);
    if (result.success) {
      setProductos((ps) => ps.filter((x) => x.id !== p.id));
      toast("Producto eliminado");
    } else {
      toast(result.error, "error");
    }
  };

  const handleAjustar = async (p: ProductoLubricentro, delta: number) => {
    if (!p.id) return;
    setAjustando(p.id);
    // Actualización optimista
    setProductos((ps) =>
      ps.map((x) => (x.id === p.id ? { ...x, stock: round2((x.stock || 0) + delta) } : x))
    );
    const result = await ajustarStockLubricentro(p.id, delta);
    setAjustando(null);
    if (result.success) {
      setProductos((ps) => ps.map((x) => (x.id === p.id ? { ...x, stock: result.data } : x)));
    } else {
      setProductos((ps) => ps.map((x) => (x.id === p.id ? { ...x, stock: p.stock } : x)));
      toast(result.error, "error");
    }
  };

  const hayFiltros =
    searchTerm || categoria !== "Todos" || filtroStock !== "todos" || tipoFiltro !== "Todos";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <PageHeader
        icon={Package}
        title="Lubricentro"
        description="Productos, stock y precios"
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <button onClick={handleNuevo} className="btn btn-primary sm:order-last">
              <Plus className="h-4 w-4" />
              Nuevo producto
            </button>
            <button onClick={() => setShowIngreso(true)} className="btn btn-secondary">
              <PackagePlus className="h-4 w-4" />
              Ingreso
            </button>
            <button
              onClick={() => setShowPrecios(true)}
              disabled={filtrados.length === 0}
              className="btn btn-secondary"
              title="Aumentar o bajar precios de los productos filtrados"
            >
              <Percent className="h-4 w-4" />
              Precios
            </button>
            <BotonReporteFiltros />
          </div>
        }
      />

      {/* Filtros */}
      <div className="card mb-4 space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchInput
            value={searchTerm}
            onChange={cambiarFiltro(setSearchTerm)}
            placeholder="Buscar por código, descripción, marca, vehículo o ubicación..."
          />
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
            className="input sm:w-52"
            aria-label="Ordenar"
          >
            <option value="recientes">Más recientes</option>
            <option value="descripcion">Descripción (A-Z)</option>
            <option value="stock">Menor stock primero</option>
            <option value="precio">Mayor precio primero</option>
          </select>
        </div>

        <FilterChips
          label="Categoría"
          value={categoria}
          onChange={(v) => {
            cambiarFiltro(setCategoria)(v);
            if (v !== "Filtros") setTipoFiltro("Todos");
          }}
          options={[
            { value: "Todos", label: "Todas", count: porBusqueda.length },
            ...categoriasPresentes.map((c) => ({
              value: c,
              label: c,
              count: porBusqueda.filter((p) => p.categoria === c).length,
            })),
          ]}
        />

        {categoria === "Filtros" && (
          <FilterChips
            label="Tipo de filtro"
            value={tipoFiltro}
            onChange={cambiarFiltro(setTipoFiltro)}
            options={[
              { value: "Todos", label: "Todos" },
              ...TIPOS_FILTRO.map((t) => ({
                value: t,
                label: t,
                count: porBusqueda.filter((p) => p.categoria === "Filtros" && tipoFiltroDe(p) === t).length,
              })),
            ]}
          />
        )}

        <FilterChips
          label="Stock"
          value={filtroStock}
          onChange={cambiarFiltro(setFiltroStock)}
          options={[
            { value: "todos", label: "Todos" },
            { value: "bajo", label: "Stock bajo", count: conteoStock.bajo },
            { value: "sin", label: "Sin stock", count: conteoStock.sin },
          ]}
        />
      </div>

      {/* Resumen del listado */}
      {!loading && filtrados.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:flex sm:flex-wrap sm:gap-6">
          <div className="card px-3 py-2 sm:border-0 sm:bg-transparent sm:p-0">
            <span className="text-neutral-500">Valor a costo: </span>
            <span className="font-semibold text-white tabular">{formatCurrency(valorFiltrado.costo)}</span>
          </div>
          <div className="card px-3 py-2 sm:border-0 sm:bg-transparent sm:p-0">
            <span className="text-neutral-500">Valor a venta: </span>
            <span className="font-semibold text-white tabular">{formatCurrency(valorFiltrado.venta)}</span>
          </div>
        </div>
      )}

      {loading ? (
        <ListSkeleton />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={Package}
          title={hayFiltros ? "No se encontraron productos con esos filtros" : "No hay productos registrados"}
          action={
            hayFiltros ? (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSearchTerm("");
                  setCategoria("Todos");
                  setTipoFiltro("Todos");
                  setFiltroStock("todos");
                  setPage(1);
                }}
              >
                Limpiar filtros
              </button>
            ) : (
              <button onClick={handleNuevo} className="btn btn-primary">
                <Plus className="h-4 w-4" /> Agregar primer producto
              </button>
            )
          }
        />
      ) : (
        <>
          {/* Mobile: tarjetas */}
          <div className="space-y-2.5 md:hidden">
            {visibles.map((p) => {
              const margen = calcularMargen(p.precioCosto, p.precioVenta);
              return (
                <div key={p.id} className="card p-3.5 animate-fade-in">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {p.codigo && <span className="font-mono text-xs text-neutral-400">{p.codigo}</span>}
                        <CategoriaBadge categoria={p.categoria} />
                      </div>
                      <p className="mt-1 leading-snug font-medium text-white">{p.descripcion || "-"}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-neutral-400">
                        {p.marca && <span>{p.marca}</span>}
                        {p.ubicacion && (
                          <span className="inline-flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {p.ubicacion}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white tabular">
                        {p.precioVenta ? formatCurrency(p.precioVenta) : "-"}
                      </p>
                      <p className="text-[11px] text-neutral-500 tabular">
                        Costo {p.precioCosto ? formatCurrency(p.precioCosto) : "-"}
                      </p>
                      {margen != null && (
                        <p className={cn("text-[11px] tabular", margen < 0 ? "text-red-400" : "text-emerald-400")}>
                          Margen {formatPercent(margen)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-neutral-800 pt-3">
                    <StockStepper producto={p} onAjustar={handleAjustar} ocupado={ajustando === p.id} />
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEditar(p)} className="icon-btn text-sky-400" aria-label="Editar">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEliminar(p)}
                        className="icon-btn text-red-400"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Escritorio: tabla */}
          <div className="card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-neutral-800 bg-neutral-950/60">
                  <tr>
                    <th className="th">Código</th>
                    <th className="th">Descripción</th>
                    <th className="th">Categoría</th>
                    <th className="th text-center">Stock</th>
                    <th className="th text-right">Costo</th>
                    <th className="th text-right">Venta</th>
                    <th className="th text-right">Margen</th>
                    <th className="th text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {visibles.map((p) => {
                    const margen = calcularMargen(p.precioCosto, p.precioVenta);
                    return (
                      <tr key={p.id} className="transition-colors hover:bg-neutral-800/40">
                        <td className="td font-mono whitespace-nowrap text-neutral-300">{p.codigo || "-"}</td>
                        <td className="td max-w-md">
                          <p className="font-medium text-white">{p.descripcion || "-"}</p>
                          <p className="text-xs text-neutral-500">
                            {[p.marca, p.ubicacion && `📍 ${p.ubicacion}`].filter(Boolean).join(" · ") || ""}
                          </p>
                        </td>
                        <td className="td whitespace-nowrap">
                          <CategoriaBadge categoria={p.categoria} />
                        </td>
                        <td className="td text-center whitespace-nowrap">
                          <StockStepper producto={p} onAjustar={handleAjustar} ocupado={ajustando === p.id} />
                        </td>
                        <td className="td text-right whitespace-nowrap text-neutral-300 tabular">
                          {p.precioCosto ? formatCurrency(p.precioCosto) : "-"}
                        </td>
                        <td className="td text-right font-semibold whitespace-nowrap text-white tabular">
                          {p.precioVenta ? formatCurrency(p.precioVenta) : "-"}
                        </td>
                        <td
                          className={cn(
                            "td text-right whitespace-nowrap tabular",
                            margen == null ? "text-neutral-600" : margen < 0 ? "text-red-400" : "text-emerald-400"
                          )}
                        >
                          {formatPercent(margen)}
                        </td>
                        <td className="td text-right whitespace-nowrap">
                          <button onClick={() => handleEditar(p)} className="icon-btn text-sky-400" aria-label="Editar">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEliminar(p)}
                            className="icon-btn text-red-400"
                            aria-label="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            page={paginaActual}
            totalPages={totalPages}
            totalItems={filtrados.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            itemLabel="productos"
          />
        </>
      )}

      {showPrecios && (
        <AumentoPreciosModal
          productos={filtrados}
          alcance={
            hayFiltros
              ? `Se aplica a los ${filtrados.length} productos filtrados${
                  categoria !== "Todos" ? ` (${categoria}${tipoFiltro !== "Todos" ? ` · ${tipoFiltro}` : ""})` : ""
                }${searchTerm ? ` que coinciden con “${searchTerm}”` : ""}`
              : `Se aplica a TODOS los productos (${filtrados.length}). Usá los filtros para elegir categoría o marca.`
          }
          onClose={() => setShowPrecios(false)}
          onDone={cargarProductos}
        />
      )}

      {showIngreso && (
        <IngresoMercaderiaModal
          productos={productos}
          onClose={() => setShowIngreso(false)}
          onDone={cargarProductos}
        />
      )}

      {showForm && (
        <ProductoLubricentroForm
          producto={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(undefined);
          }}
          onSuccess={(guardado) => {
            setUltimoProducto(guardado);
            cargarProductos();
          }}
        />
      )}
    </div>
  );
}
