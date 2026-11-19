"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Link2, Plus, Search, Trash2, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import NumberInput from "@/components/ui/NumberInput";
import { useFeedback } from "@/components/ui/Feedback";
import {
  Anotacion,
  ETIQUETAS_TIPO,
  esGasto,
  ItemAnotacion,
  TipoAnotacion,
  TIPOS_ANOTACION,
} from "@/types/anotaciones";
import { ProductoLubricentro } from "@/types/lubricentro";
import { actualizarAnotacion, crearAnotacion } from "@/actions/anotaciones";
import { obtenerProductosLubricentro } from "@/actions/lubricentro";
import {
  calcularMargen,
  coincideBusqueda,
  formatCurrency,
  formatNumber,
  formatPercent,
  hoyISO,
  round2,
} from "@/lib/format";
import { estadoStock } from "@/lib/stock";
import { cn } from "@/lib/utils";

interface AnotacionFormProps {
  anotacion?: Anotacion;
  onClose: () => void;
  onSuccess: () => void;
}

interface ItemForm extends ItemAnotacion {
  key: number;
}

let nextKey = 1;
const conKey = (it: ItemAnotacion): ItemForm => ({ ...it, key: nextKey++ });
const sinKey = (it: ItemForm): ItemAnotacion => {
  const copia: Partial<ItemForm> = { ...it };
  delete copia.key;
  return copia as ItemAnotacion;
};

const PLACEHOLDER_TITULO: Record<TipoAnotacion, string> = {
  LUBRICENTRO: "Ej: Cambio de aceite Gol AB123CD",
  TALLER: "Ej: Service completo Corsa",
  GASTOS_ALQUILER: "Ej: Alquiler noviembre",
  OTRO: "Ej: Venta varios",
};

// ---------------------------------------------------------------------------
// Buscador de productos del inventario
// ---------------------------------------------------------------------------
function SelectorProducto({
  productos,
  seleccionado,
  onSelect,
  onClear,
}: {
  productos: ProductoLubricentro[];
  seleccionado?: ProductoLubricentro;
  onSelect: (p: ProductoLubricentro) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [abierto, setAbierto] = useState(false);

  const resultados = useMemo(
    () =>
      productos
        .filter((p) => coincideBusqueda(query, p.codigo, p.descripcion, p.marca, p.categoria))
        .slice(0, 50),
    [productos, query]
  );

  if (seleccionado) {
    const estado = estadoStock(seleccionado);
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
        <Link2 className="h-4 w-4 shrink-0 text-emerald-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-white">
            {seleccionado.codigo && <span className="font-mono text-neutral-400">{seleccionado.codigo} · </span>}
            {seleccionado.descripcion}
          </p>
          <p className="text-xs text-neutral-400">
            {seleccionado.marca && `${seleccionado.marca} · `}
            Stock:{" "}
            <span
              className={cn(
                "font-semibold",
                estado === "sin" ? "text-red-400" : estado === "bajo" ? "text-amber-300" : "text-emerald-300"
              )}
            >
              {formatNumber(seleccionado.stock)}
            </span>
          </p>
        </div>
        <button type="button" onClick={onClear} className="icon-btn h-8 w-8" aria-label="Desvincular producto">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        placeholder="Buscar en inventario (opcional)"
        className="input pl-9"
      />
      {abierto && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-neutral-700 bg-neutral-900 shadow-2xl">
          {resultados.length === 0 ? (
            <p className="px-3 py-3 text-sm text-neutral-400">No hay resultados</p>
          ) : (
            resultados.map((p) => {
              const estado = estadoStock(p);
              return (
                <button
                  type="button"
                  key={p.id}
                  // onMouseDown para elegir antes de que el blur cierre la lista
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(p);
                    setQuery("");
                    setAbierto(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 border-b border-neutral-800 px-3 py-2.5 text-left last:border-0 hover:bg-neutral-800"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-white">
                      {p.codigo && <span className="font-mono text-neutral-400">{p.codigo} · </span>}
                      {p.descripcion}
                    </span>
                    <span className="text-xs text-neutral-500">{p.marca}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs">
                    <span className="block font-semibold text-white tabular">
                      {p.precioVenta ? formatCurrency(p.precioVenta) : "-"}
                    </span>
                    <span
                      className={cn(
                        "tabular",
                        estado === "sin" ? "text-red-400" : estado === "bajo" ? "text-amber-300" : "text-neutral-400"
                      )}
                    >
                      Stock {formatNumber(p.stock)}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulario
// ---------------------------------------------------------------------------
export default function AnotacionForm({ anotacion, onClose, onSuccess }: AnotacionFormProps) {
  const { toast, confirm } = useFeedback();
  const esEdicion = Boolean(anotacion?.id);

  const [fecha, setFecha] = useState(anotacion?.fecha || hoyISO());
  const [tipo, setTipo] = useState<TipoAnotacion>(anotacion?.tipo || "LUBRICENTRO");
  const [titulo, setTitulo] = useState(anotacion?.titulo || "");
  const [descripcion, setDescripcion] = useState(anotacion?.descripcion || "");
  const [items, setItems] = useState<ItemForm[]>(() =>
    (anotacion?.items?.length ? anotacion.items : [{ descripcion: "", cantidad: 1 }]).map(conKey)
  );
  const [productos, setProductos] = useState<ProductoLubricentro[]>([]);
  const [loading, setLoading] = useState(false);

  const snapshot = JSON.stringify({ fecha, tipo, titulo, descripcion, items: items.map(sinKey) });
  const [inicial] = useState(snapshot);
  const isDirty = snapshot !== inicial;

  const gasto = esGasto(tipo);

  useEffect(() => {
    if (tipo !== "LUBRICENTRO" || productos.length > 0) return;
    obtenerProductosLubricentro().then((res) => {
      if (res.success) setProductos(res.data);
    });
  }, [tipo, productos.length]);

  const productosPorId = useMemo(() => new Map(productos.map((p) => [p.id!, p])), [productos]);

  // Stock disponible por producto (al editar, se suma lo que ya tenía esta anotación)
  const disponible = useMemo(() => {
    const map = new Map<string, number>();
    productos.forEach((p) => map.set(p.id!, p.stock || 0));
    if (anotacion?.tipo === "LUBRICENTRO") {
      anotacion.items.forEach((it) => {
        if (it.productoId && map.has(it.productoId)) {
          map.set(it.productoId, round2(map.get(it.productoId)! + (it.cantidad || 0)));
        }
      });
    }
    return map;
  }, [productos, anotacion]);

  const pedidoPorProducto = useMemo(() => {
    const map = new Map<string, number>();
    if (tipo !== "LUBRICENTRO") return map;
    items.forEach((it) => {
      if (it.productoId) map.set(it.productoId, round2((map.get(it.productoId) || 0) + (it.cantidad || 0)));
    });
    return map;
  }, [items, tipo]);

  const total = round2(items.reduce((s, it) => s + (it.cantidad || 0) * (it.precio || 0), 0));
  const costoTotal = round2(items.reduce((s, it) => s + (it.cantidad || 0) * (it.precioCosto || 0), 0));
  const ganancia = round2(total - costoTotal);

  const actualizarItem = (key: number, cambios: Partial<ItemAnotacion>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...cambios } : it)));

  const agregarItem = () =>
    setItems((prev) => {
      const last = prev[prev.length - 1];
      // Se copia la línea anterior para cargar más rápido ventas parecidas
      return [
        ...prev,
        conKey(
          last
            ? {
                descripcion: last.descripcion,
                cantidad: last.cantidad || 1,
                precio: last.precio,
                precioCosto: last.precioCosto,
                unidad: last.unidad,
                productoId: last.productoId,
              }
            : { descripcion: "", cantidad: 1 }
        ),
      ];
    });

  const eliminarItem = (key: number) => setItems((prev) => prev.filter((it) => it.key !== key));

  const seleccionarProducto = (key: number, p: ProductoLubricentro) =>
    actualizarItem(key, {
      productoId: p.id,
      descripcion: p.categoria === "Filtros" && p.codigo ? `Filtro ${p.codigo}` : p.descripcion,
      ...(typeof p.precioVenta === "number" && p.precioVenta > 0 ? { precio: p.precioVenta } : {}),
      ...(typeof p.precioCosto === "number" && p.precioCosto > 0 ? { precioCosto: p.precioCosto } : {}),
    });

  const pedirCierre = async () => {
    if (loading) return;
    if (
      !isDirty ||
      (await confirm({
        title: "¿Salir sin guardar?",
        message: "Hay cambios sin guardar en esta anotación.",
        confirmLabel: "Salir sin guardar",
        cancelLabel: "Seguir editando",
        tone: "warning",
      }))
    ) {
      onClose();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validos = items.filter((it) => it.descripcion.trim() || it.productoId);
    if (validos.length === 0) {
      toast("Agregá al menos un item con descripción", "error");
      return;
    }
    const sinPrecio = validos.findIndex((it) => it.precio == null);
    if (sinPrecio !== -1) {
      toast(`Falta el ${gasto ? "importe" : "precio de venta"} en el item ${sinPrecio + 1}`, "error");
      return;
    }
    const sinCantidad = validos.findIndex((it) => !it.cantidad || it.cantidad <= 0);
    if (sinCantidad !== -1) {
      toast(`La cantidad del item ${sinCantidad + 1} debe ser mayor a 0`, "error");
      return;
    }

    setLoading(true);
    const data = {
      fecha,
      tipo,
      titulo: titulo.trim() || validos[0].descripcion.trim(),
      descripcion,
      // Si no es de lubricentro, no tiene sentido mantener vínculo con el inventario
      items: validos.map((item) => {
        const it = sinKey(item);
        return tipo === "LUBRICENTRO" ? it : { ...it, productoId: undefined };
      }),
    };

    const result = anotacion?.id ? await actualizarAnotacion(anotacion.id, data) : await crearAnotacion(data);
    setLoading(false);

    if (result.success) {
      toast(esEdicion ? "Anotación actualizada" : "Anotación guardada");
      onSuccess();
      onClose();
    } else {
      toast(result.error || "Error al guardar la anotación", "error");
    }
  };

  return (
    <Modal
      size="xl"
      title={esEdicion ? "Editar anotación" : "Nueva anotación"}
      onClose={pedirCierre}
      closeOnBackdrop={!isDirty}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-baseline justify-between gap-4 sm:justify-start">
            <div>
              <p className="text-[11px] text-neutral-500 uppercase">Total</p>
              <p className="text-2xl font-bold text-white tabular">{formatCurrency(total)}</p>
            </div>
            {!gasto && costoTotal > 0 && (
              <div className="text-right sm:text-left">
                <p className="text-[11px] text-neutral-500 uppercase">Ganancia</p>
                <p className={cn("font-semibold tabular", ganancia < 0 ? "text-red-400" : "text-emerald-400")}>
                  {formatCurrency(ganancia)}{" "}
                  <span className="text-xs text-neutral-500">({formatPercent(calcularMargen(costoTotal, total))})</span>
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-3 sm:ml-auto">
            <button type="button" onClick={pedirCierre} className="btn btn-secondary flex-1 sm:flex-none">
              Cancelar
            </button>
            <button
              type="submit"
              form="anotacion-form"
              disabled={loading}
              className="btn btn-primary flex-1 sm:min-w-[150px] sm:flex-none"
            >
              {loading ? "Guardando..." : esEdicion ? "Guardar cambios" : "Guardar"}
            </button>
          </div>
        </div>
      }
    >
      <form id="anotacion-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Tipo */}
        <div>
          <span className="label">Tipo</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TIPOS_ANOTACION.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  tipo === t
                    ? "border-brand-600 bg-brand-600/15 text-white"
                    : "border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600"
                )}
                aria-pressed={tipo === t}
              >
                {ETIQUETAS_TIPO[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="a-fecha">Fecha</label>
            <input
              id="a-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="a-titulo">Título</label>
            <input
              id="a-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="input"
              placeholder={PLACEHOLDER_TITULO[tipo]}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="a-desc">Notas</label>
          <textarea
            id="a-desc"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            className="input resize-y"
            placeholder="Cliente, patente, detalles adicionales..."
          />
        </div>

        {/* Items */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label mb-0">
              Items <span className="text-neutral-500">({items.length})</span>
            </span>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => {
              const producto = item.productoId ? productosPorId.get(item.productoId) : undefined;
              const pedido = item.productoId ? pedidoPorProducto.get(item.productoId) || 0 : 0;
              const disp = item.productoId ? disponible.get(item.productoId) : undefined;
              const faltaStock = tipo === "LUBRICENTRO" && disp != null && pedido > disp;
              const subtotal = round2((item.cantidad || 0) * (item.precio || 0));
              const margen = calcularMargen(item.precioCosto, item.precio);

              return (
                <div key={item.key} className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-500">ITEM {index + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarItem(item.key)}
                        className="icon-btn h-8 w-8 text-red-400"
                        aria-label={`Quitar item ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {tipo === "LUBRICENTRO" && (
                      <SelectorProducto
                        productos={productos}
                        seleccionado={producto}
                        onSelect={(p) => seleccionarProducto(item.key, p)}
                        onClear={() => actualizarItem(item.key, { productoId: undefined })}
                      />
                    )}

                    <input
                      value={item.descripcion}
                      onChange={(e) => actualizarItem(item.key, { descripcion: e.target.value })}
                      className="input"
                      placeholder={gasto ? "Concepto (ej: Alquiler local)" : "Descripción (ej: Aceite 5W30)"}
                      aria-label={`Descripción del item ${index + 1}`}
                    />

                    <div className={cn("grid gap-2 sm:gap-3", gasto ? "grid-cols-2" : "grid-cols-3")}>
                      <div>
                        <label className="mb-1 block text-xs text-neutral-400">Cantidad</label>
                        <NumberInput
                          value={item.cantidad}
                          onValueChange={(v) => actualizarItem(item.key, { cantidad: v })}
                          placeholder="1"
                          className={cn(faltaStock && "border-amber-500")}
                        />
                      </div>
                      {!gasto && (
                        <div>
                          <label className="mb-1 block text-xs text-neutral-400">Costo unit.</label>
                          <NumberInput
                            money
                            value={item.precioCosto}
                            onValueChange={(v) => actualizarItem(item.key, { precioCosto: v })}
                            placeholder="0"
                          />
                        </div>
                      )}
                      <div>
                        <label className="mb-1 block text-xs text-neutral-400">
                          {gasto ? "Importe unit." : "Venta unit."}
                        </label>
                        <NumberInput
                          money
                          value={item.precio}
                          onValueChange={(v) => actualizarItem(item.key, { precio: v })}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {faltaStock && (
                      <p className="flex items-center gap-1.5 text-xs text-amber-400">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        Stock insuficiente: hay {formatNumber(disp)} y se piden {formatNumber(pedido)}.
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-neutral-800 pt-2 text-sm">
                      <span className="text-neutral-400">
                        Subtotal <span className="font-semibold text-white tabular">{formatCurrency(subtotal)}</span>
                      </span>
                      {!gasto && item.precioCosto != null && item.precio != null && (
                        <span
                          className={cn(
                            "text-xs tabular",
                            (margen ?? 0) < 0 ? "text-red-400" : "text-emerald-400"
                          )}
                        >
                          Ganancia {formatCurrency((item.cantidad || 0) * (item.precio - item.precioCosto))} ·{" "}
                          {formatPercent(margen)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={agregarItem}
            className="btn mt-3 w-full border border-dashed border-neutral-700 text-neutral-300 hover:border-brand-600 hover:text-white"
          >
            <Plus className="h-4 w-4" />
            Agregar item
          </button>
        </div>
      </form>
    </Modal>
  );
}
