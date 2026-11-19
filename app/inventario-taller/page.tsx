"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit2, MapPin, Plus, Trash2, Wrench } from "lucide-react";
import ItemTallerForm from "@/components/ItemTallerForm";
import { useFeedback } from "@/components/ui/Feedback";
import { EmptyState, FilterChips, ListSkeleton, PageHeader, Pagination, SearchInput } from "@/components/ui";
import { ItemTaller, TIPOS_ITEMS_TALLER } from "@/types/inventario-taller";
import { eliminarItemTaller, obtenerItemsTaller } from "@/actions/inventario-taller";
import { coincideBusqueda, formatNumber } from "@/lib/format";

const PAGE_SIZE = 20;

export default function InventarioTallerPage() {
  const { toast, confirm } = useFeedback();
  const [items, setItems] = useState<ItemTaller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipo, setTipo] = useState("Todos");
  const [ubicacion, setUbicacion] = useState("Todos");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ItemTaller | undefined>();

  const cargar = async () => {
    const result = await obtenerItemsTaller();
    if (result.success) setItems(result.data);
    else toast(result.error, "error");
    setLoading(false);
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ubicaciones = useMemo(
    () =>
      [...new Set(items.map((i) => i.ubicacion?.trim()).filter((u): u is string => Boolean(u)))].sort((a, b) =>
        a.localeCompare(b, "es")
      ),
    [items]
  );

  const porBusqueda = useMemo(
    () => items.filter((i) => coincideBusqueda(searchTerm, i.nombre, i.marca, i.ubicacion, i.tipo)),
    [items, searchTerm]
  );

  const filtrados = useMemo(
    () =>
      porBusqueda.filter(
        (i) => (tipo === "Todos" || i.tipo === tipo) && (ubicacion === "Todos" || i.ubicacion?.trim() === ubicacion)
      ),
    [porBusqueda, tipo, ubicacion]
  );

  const totalUnidades = filtrados.reduce((s, i) => s + (i.cantidad || 0), 0);
  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaActual = Math.min(page, totalPages);
  const visibles = filtrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  const handleEliminar = async (item: ItemTaller) => {
    const ok = await confirm({
      title: "Eliminar item",
      message: (
        <>
          ¿Eliminar <strong className="text-white">{item.nombre}</strong>? Esta acción no se puede deshacer.
        </>
      ),
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    const result = await eliminarItemTaller(item.id!);
    if (result.success) {
      setItems((is) => is.filter((x) => x.id !== item.id));
      toast("Item eliminado");
    } else {
      toast(result.error, "error");
    }
  };

  const abrir = (item?: ItemTaller) => {
    setEditing(item);
    setShowForm(true);
  };

  const hayFiltros = searchTerm || tipo !== "Todos" || ubicacion !== "Todos";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <PageHeader
        icon={Wrench}
        title="Inventario de Taller"
        description="Herramientas, equipos, muebles y repuestos"
        actions={
          <button onClick={() => abrir()} className="btn btn-primary w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Nuevo item
          </button>
        }
      />

      <div className="card mb-4 space-y-4 p-4">
        <SearchInput
          value={searchTerm}
          onChange={(v) => {
            setSearchTerm(v);
            setPage(1);
          }}
          placeholder="Buscar por nombre, marca o ubicación..."
        />
        <FilterChips
          label="Tipo"
          value={tipo}
          onChange={(v) => {
            setTipo(v);
            setPage(1);
          }}
          options={[
            { value: "Todos", label: "Todos", count: porBusqueda.length },
            ...TIPOS_ITEMS_TALLER.map((t) => ({
              value: t,
              label: t,
              count: porBusqueda.filter((i) => i.tipo === t).length,
            })).filter((o) => o.count > 0 || o.value === tipo),
          ]}
        />
        {ubicaciones.length > 0 && (
          <FilterChips
            label="Ubicación"
            value={ubicacion}
            onChange={(v) => {
              setUbicacion(v);
              setPage(1);
            }}
            options={[{ value: "Todos", label: "Todas" }, ...ubicaciones.map((u) => ({ value: u, label: u }))]}
          />
        )}
      </div>

      {!loading && filtrados.length > 0 && (
        <p className="mb-3 text-sm text-neutral-400">
          <span className="font-semibold text-white tabular">{filtrados.length}</span> items ·{" "}
          <span className="font-semibold text-white tabular">{formatNumber(totalUnidades)}</span> unidades
        </p>
      )}

      {loading ? (
        <ListSkeleton />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={hayFiltros ? "No se encontraron items con esos filtros" : "No hay items registrados"}
          action={
            hayFiltros ? (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSearchTerm("");
                  setTipo("Todos");
                  setUbicacion("Todos");
                }}
              >
                Limpiar filtros
              </button>
            ) : (
              <button onClick={() => abrir()} className="btn btn-primary">
                <Plus className="h-4 w-4" /> Agregar primer item
              </button>
            )
          }
        />
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-2.5 md:hidden">
            {visibles.map((item) => (
              <div key={item.id} className="card flex items-center gap-3 p-3.5 animate-fade-in">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-lg font-bold text-white tabular">
                  {formatNumber(item.cantidad || 0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{item.nombre}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-400">
                    {item.tipo && <span>{item.tipo}</span>}
                    {item.marca && <span>· {item.marca}</span>}
                  </p>
                  {item.ubicacion && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-sky-400">
                      <MapPin className="h-3 w-3" />
                      {item.ubicacion}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col">
                  <button onClick={() => abrir(item)} className="icon-btn text-sky-400" aria-label="Editar">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleEliminar(item)} className="icon-btn text-red-400" aria-label="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Escritorio */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full">
              <thead className="border-b border-neutral-800 bg-neutral-950/60">
                <tr>
                  <th className="th">Item</th>
                  <th className="th">Tipo</th>
                  <th className="th">Marca</th>
                  <th className="th">Ubicación</th>
                  <th className="th text-center">Cantidad</th>
                  <th className="th text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {visibles.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-neutral-800/40">
                    <td className="td font-medium text-white">{item.nombre}</td>
                    <td className="td whitespace-nowrap">
                      {item.tipo ? (
                        <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-300">
                          {item.tipo}
                        </span>
                      ) : (
                        <span className="text-neutral-600">-</span>
                      )}
                    </td>
                    <td className="td text-neutral-300">{item.marca || "-"}</td>
                    <td className="td whitespace-nowrap text-sky-400">{item.ubicacion || <span className="text-neutral-600">-</span>}</td>
                    <td className="td text-center font-semibold text-white tabular">{formatNumber(item.cantidad || 0)}</td>
                    <td className="td text-right whitespace-nowrap">
                      <button onClick={() => abrir(item)} className="icon-btn text-sky-400" aria-label="Editar">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEliminar(item)}
                        className="icon-btn text-red-400"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={paginaActual}
            totalPages={totalPages}
            totalItems={filtrados.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            itemLabel="items"
          />
        </>
      )}

      {showForm && (
        <ItemTallerForm
          item={editing}
          ubicaciones={ubicaciones}
          onClose={() => {
            setShowForm(false);
            setEditing(undefined);
          }}
          onSuccess={cargar}
        />
      )}
    </div>
  );
}
