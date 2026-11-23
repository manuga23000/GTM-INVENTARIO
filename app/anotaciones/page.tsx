"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Edit2, FileText, Plus, Receipt, Trash2, TrendingUp, Wallet } from "lucide-react";
import AnotacionForm from "@/components/AnotacionForm";
import { useFeedback } from "@/components/ui/Feedback";
import {
  EmptyState,
  FilterChips,
  ListSkeleton,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
} from "@/components/ui";
import { Anotacion, ETIQUETAS_TIPO, esGasto, TIPOS_ANOTACION, TipoAnotacion } from "@/types/anotaciones";
import {
  cancelarAnotacion,
  eliminarAnotacion,
  obtenerAnotaciones,
  obtenerAnotacionesPorRango,
} from "@/actions/anotaciones";
import {
  coincideBusqueda,
  formatCurrency,
  formatFecha,
  formatFechaCorta,
  formatNumber,
  hoyISO,
  mesDe,
  semanaDe,
  sumarDias,
} from "@/lib/format";
import { calcularResumen, gananciaAnotacion, subtotalItem } from "@/lib/resumen";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;

const TIPO_STYLE: Record<TipoAnotacion, string> = {
  LUBRICENTRO: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  TALLER: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  GASTOS_ALQUILER: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  OTRO: "bg-neutral-700/50 text-neutral-300 ring-neutral-600",
};

function TipoBadge({ tipo }: { tipo: TipoAnotacion }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
        TIPO_STYLE[tipo] || TIPO_STYLE.OTRO
      )}
    >
      {ETIQUETAS_TIPO[tipo] || tipo}
    </span>
  );
}

type Periodo = "todo" | "hoy" | "semana" | "mes" | "mesPasado";

function rangoDe(periodo: Periodo): { inicio: string; fin: string } | null {
  const hoy = hoyISO();
  if (periodo === "hoy") return { inicio: hoy, fin: hoy };
  if (periodo === "semana") return semanaDe(hoy);
  if (periodo === "mes") return mesDe(hoy);
  if (periodo === "mesPasado") return mesDe(sumarDias(mesDe(hoy).inicio, -1));
  return null;
}

function DetalleItems({ anotacion }: { anotacion: Anotacion }) {
  const gasto = esGasto(anotacion.tipo);
  return (
    <div className="space-y-1.5">
      {anotacion.items.map((it, i) => (
        <div key={i} className="flex items-start justify-between gap-3 text-sm">
          <div className="min-w-0">
            <p className="text-neutral-200">{it.descripcion || "-"}</p>
            <p className="text-xs text-neutral-500 tabular">
              {formatNumber(it.cantidad || 1)} × {formatCurrency(it.precio)}
              {!gasto && it.precioCosto ? ` · costo ${formatCurrency(it.precioCosto)}` : ""}
            </p>
          </div>
          <span className="shrink-0 font-medium text-white tabular">{formatCurrency(subtotalItem(it))}</span>
        </div>
      ))}
      {anotacion.descripcion && (
        <p className="border-t border-neutral-800 pt-2 text-xs whitespace-pre-line text-neutral-400">
          {anotacion.descripcion}
        </p>
      )}
    </div>
  );
}

export default function AnotacionesPage() {
  const { toast, choose, confirm } = useFeedback();
  const [anotaciones, setAnotaciones] = useState<Anotacion[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipo, setTipo] = useState("Todos");
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [page, setPage] = useState(1);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Anotacion | undefined>();
  // Se piden a Firestore sólo las anotaciones del período elegido (no todo el historial).
  // "version" fuerza recargar después de crear/editar/borrar.
  const [version, setVersion] = useState(0);
  const [cargadoPara, setCargadoPara] = useState("");
  const claveCarga = `${periodo}|${version}`;
  const loading = cargadoPara !== claveCarga;

  useEffect(() => {
    let activo = true;
    const rango = rangoDe(periodo);
    const pedido = rango ? obtenerAnotacionesPorRango(rango.inicio, rango.fin) : obtenerAnotaciones();
    pedido.then((result) => {
      if (!activo) return;
      if (result.success) {
        // Más recientes primero (el filtro por rango devuelve en orden ascendente)
        const ordenadas = [...result.data].sort(
          (a, b) =>
            b.fecha.localeCompare(a.fecha) ||
            new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        );
        setAnotaciones(ordenadas);
      } else {
        toast(result.error, "error");
      }
      setCargadoPara(`${periodo}|${version}`);
    });
    return () => {
      activo = false;
    };
  }, [periodo, version, toast]);

  const cargar = () => setVersion((v) => v + 1);

  // Acceso directo del ícono instalado ("Nueva anotación"): /anotaciones?nueva=1
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("nueva")) return;
    window.history.replaceState(null, "", window.location.pathname);
    const t = setTimeout(() => setShowForm(true), 0);
    return () => clearTimeout(t);
  }, []);
  const porPeriodo = anotaciones;

  const porBusqueda = useMemo(
    () =>
      porPeriodo.filter((a) =>
        coincideBusqueda(searchTerm, a.titulo, a.descripcion, ...a.items.map((it) => it.descripcion))
      ),
    [porPeriodo, searchTerm]
  );

  const filtradas = useMemo(
    () => (tipo === "Todos" ? porBusqueda : porBusqueda.filter((a) => a.tipo === tipo)),
    [porBusqueda, tipo]
  );

  const resumen = useMemo(() => calcularResumen(filtradas), [filtradas]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const paginaActual = Math.min(page, totalPages);
  const visibles = filtradas.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  const handleNuevo = () => {
    setEditing(undefined);
    setShowForm(true);
  };

  const handleEditar = (a: Anotacion) => {
    setEditing(a);
    setShowForm(true);
  };

  const handleEliminar = async (a: Anotacion) => {
    const descuentaStock = a.tipo === "LUBRICENTRO" && a.items.some((it) => it.productoId);
    let accion: string | null;

    if (descuentaStock) {
      accion = await choose({
        title: "Eliminar anotación",
        message: (
          <>
            <strong className="text-white">{a.titulo}</strong> descontó stock de productos del inventario. ¿Qué
            querés hacer?
          </>
        ),
        tone: "warning",
        actions: [
          {
            value: "cancelar",
            label: "Anular venta y devolver stock",
            description: "Recomendado: los productos vuelven al inventario.",
            tone: "primary",
          },
          {
            value: "eliminar",
            label: "Borrar sin devolver stock",
            description: "Sólo si el stock ya se corrigió a mano.",
            tone: "danger",
          },
        ],
      });
    } else {
      accion = (await confirm({
        title: "Eliminar anotación",
        message: (
          <>
            ¿Eliminar <strong className="text-white">{a.titulo}</strong>? Esta acción no se puede deshacer.
          </>
        ),
        confirmLabel: "Eliminar",
        tone: "danger",
      }))
        ? "eliminar"
        : null;
    }
    if (!accion) return;

    const result = accion === "cancelar" ? await cancelarAnotacion(a.id!) : await eliminarAnotacion(a.id!);
    if (result.success) {
      setAnotaciones((as) => as.filter((x) => x.id !== a.id));
      toast(accion === "cancelar" ? "Venta anulada y stock devuelto" : "Anotación eliminada");
    } else {
      toast(result.error, "error");
    }
  };

  const hayFiltros = searchTerm || tipo !== "Todos" || periodo !== "todo";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <PageHeader
        icon={FileText}
        title="Anotaciones"
        description="Ventas, servicios y gastos del negocio"
        actions={
          <button onClick={handleNuevo} className="btn btn-primary w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Nueva anotación
          </button>
        }
      />

      {/* Resumen del período filtrado */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Receipt} label="Ventas" value={formatCurrency(resumen.totalVentas)} />
        <StatCard
          icon={TrendingUp}
          label="Ganancia"
          tone="success"
          value={formatCurrency(resumen.totalGanancia)}
          hint={resumen.lineasSinCosto > 0 ? `${resumen.lineasSinCosto} item(s) sin costo` : undefined}
        />
        <StatCard icon={Wallet} label="Gastos" tone="warning" value={formatCurrency(resumen.totalGastos)} />
        <StatCard
          icon={FileText}
          label="Resultado"
          tone={resumen.resultadoNeto < 0 ? "danger" : "success"}
          value={formatCurrency(resumen.resultadoNeto)}
          hint="Ganancia − gastos"
        />
      </div>

      {/* Filtros */}
      <div className="card mb-4 space-y-4 p-4">
        <SearchInput
          value={searchTerm}
          onChange={(v) => {
            setSearchTerm(v);
            setPage(1);
          }}
          placeholder="Buscar por título, notas o items..."
        />
        <FilterChips
          label="Período"
          value={periodo}
          onChange={(v) => {
            setPeriodo(v as Periodo);
            setPage(1);
          }}
          options={[
            { value: "hoy", label: "Hoy" },
            { value: "semana", label: "Esta semana" },
            { value: "mes", label: "Este mes" },
            { value: "mesPasado", label: "Mes pasado" },
            { value: "todo", label: "Todo el historial" },
          ]}
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
            ...TIPOS_ANOTACION.map((t) => ({
              value: t,
              label: ETIQUETAS_TIPO[t],
              count: porBusqueda.filter((a) => a.tipo === t).length,
            })),
          ]}
        />
      </div>

      {loading ? (
        <ListSkeleton />
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={hayFiltros ? "No hay anotaciones con esos filtros" : "No hay anotaciones registradas"}
          action={
            periodo !== "todo" ? (
              <button className="btn btn-secondary" onClick={() => setPeriodo("todo")}>
                Ver todas
              </button>
            ) : (
              <button onClick={handleNuevo} className="btn btn-primary">
                <Plus className="h-4 w-4" /> Crear anotación
              </button>
            )
          }
        />
      ) : (
        <>
          {/* Mobile: tarjetas desplegables */}
          <div className="space-y-2.5 md:hidden">
            {visibles.map((a) => {
              const abierta = expandida === a.id;
              const gasto = esGasto(a.tipo);
              return (
                <div key={a.id} className="card overflow-hidden animate-fade-in">
                  <button
                    type="button"
                    onClick={() => setExpandida(abierta ? null : a.id!)}
                    className="flex w-full items-start justify-between gap-3 p-3.5 text-left"
                    aria-expanded={abierta}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-400 capitalize">{formatFechaCorta(a.fecha)}</span>
                        <TipoBadge tipo={a.tipo} />
                      </div>
                      <p className="mt-1 truncate font-medium text-white">{a.titulo}</p>
                      <p className="text-xs text-neutral-500">
                        {a.items.length} item{a.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className={cn("font-bold tabular", gasto ? "text-amber-300" : "text-white")}>
                          {gasto ? "−" : ""}
                          {formatCurrency(a.total)}
                        </p>
                        {!gasto && gananciaAnotacion(a.items) !== a.total && (
                          <p className="text-[11px] text-emerald-400 tabular">
                            +{formatCurrency(gananciaAnotacion(a.items))}
                          </p>
                        )}
                      </div>
                      <ChevronDown
                        className={cn("h-4 w-4 text-neutral-500 transition-transform", abierta && "rotate-180")}
                      />
                    </div>
                  </button>
                  {abierta && (
                    <div className="border-t border-neutral-800 bg-neutral-950/50 p-3.5 animate-fade-in">
                      <DetalleItems anotacion={a} />
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => handleEditar(a)} className="btn btn-secondary flex-1">
                          <Edit2 className="h-4 w-4" /> Editar
                        </button>
                        <button onClick={() => handleEliminar(a)} className="btn btn-secondary flex-1 text-red-400">
                          <Trash2 className="h-4 w-4" /> Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Escritorio: tabla con filas desplegables */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full">
              <thead className="border-b border-neutral-800 bg-neutral-950/60">
                <tr>
                  <th className="th w-8" />
                  <th className="th">Fecha</th>
                  <th className="th">Tipo</th>
                  <th className="th">Título</th>
                  <th className="th text-center">Items</th>
                  <th className="th text-right">Total</th>
                  <th className="th text-right">Ganancia</th>
                  <th className="th text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {visibles.map((a) => {
                  const abierta = expandida === a.id;
                  const gasto = esGasto(a.tipo);
                  const gan = gananciaAnotacion(a.items);
                  const tieneCosto = a.items.some((it) => it.precioCosto);
                  return [
                    <tr
                      key={a.id}
                      onClick={() => setExpandida(abierta ? null : a.id!)}
                      className="cursor-pointer transition-colors hover:bg-neutral-800/40"
                    >
                      <td className="td">
                        <ChevronDown
                          className={cn("h-4 w-4 text-neutral-500 transition-transform", abierta && "rotate-180")}
                        />
                      </td>
                      <td className="td whitespace-nowrap text-neutral-300 tabular">{formatFecha(a.fecha)}</td>
                      <td className="td whitespace-nowrap">
                        <TipoBadge tipo={a.tipo} />
                      </td>
                      <td className="td">
                        <p className="font-medium text-white">{a.titulo}</p>
                        {a.descripcion && (
                          <p className="max-w-md truncate text-xs text-neutral-500">{a.descripcion}</p>
                        )}
                      </td>
                      <td className="td text-center text-neutral-400 tabular">{a.items.length}</td>
                      <td
                        className={cn(
                          "td text-right font-semibold whitespace-nowrap tabular",
                          gasto ? "text-amber-300" : "text-white"
                        )}
                      >
                        {gasto ? "−" : ""}
                        {formatCurrency(a.total)}
                      </td>
                      <td className="td text-right whitespace-nowrap tabular">
                        {gasto || !tieneCosto ? (
                          <span className="text-neutral-600">-</span>
                        ) : (
                          <span className={gan < 0 ? "text-red-400" : "text-emerald-400"}>{formatCurrency(gan)}</span>
                        )}
                      </td>
                      <td className="td text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleEditar(a)} className="icon-btn text-sky-400" aria-label="Editar">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEliminar(a)}
                          className="icon-btn text-red-400"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>,
                    abierta && (
                      <tr key={`${a.id}-detalle`} className="bg-neutral-950/50">
                        <td />
                        <td colSpan={7} className="px-4 pt-1 pb-4">
                          <div className="max-w-2xl">
                            <DetalleItems anotacion={a} />
                          </div>
                        </td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={paginaActual}
            totalPages={totalPages}
            totalItems={filtradas.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            itemLabel="anotaciones"
          />
        </>
      )}

      {showForm && (
        <AnotacionForm
          anotacion={editing}
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
