"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Download, Loader2, Percent, Receipt, TrendingUp, Wallet } from "lucide-react";
import { obtenerAnotacionesPorRango } from "@/actions/anotaciones";
import { obtenerProductosLubricentro } from "@/actions/lubricentro";
import { useFeedback } from "@/components/ui/Feedback";
import { PageHeader, StatCard } from "@/components/ui";
import { Anotacion } from "@/types/anotaciones";
import { ProductoLubricentro } from "@/types/lubricentro";
import { calcularResumen } from "@/lib/resumen";
import { formatCurrency, formatFecha, formatNumber, formatPercent, hoyISO, mesDe, semanaDe, sumarDias } from "@/lib/format";
import { cn } from "@/lib/utils";

type Atajo = "semana" | "semanaPasada" | "mes" | "mesPasado";

function rango(atajo: Atajo) {
  const hoy = hoyISO();
  switch (atajo) {
    case "semana":
      return semanaDe(hoy);
    case "semanaPasada":
      return semanaDe(sumarDias(hoy, -7));
    case "mes":
      return mesDe(hoy);
    case "mesPasado":
      return mesDe(sumarDias(mesDe(hoy).inicio, -1));
  }
}

const ATAJOS: { value: Atajo; label: string }[] = [
  { value: "semana", label: "Esta semana" },
  { value: "semanaPasada", label: "Semana pasada" },
  { value: "mes", label: "Este mes" },
  { value: "mesPasado", label: "Mes pasado" },
];

export default function ReportesPage() {
  const { toast } = useFeedback();
  const inicial = rango("semana");
  const [fechaInicio, setFechaInicio] = useState(inicial.inicio);
  const [fechaFin, setFechaFin] = useState(inicial.fin);
  const [anotaciones, setAnotaciones] = useState<Anotacion[]>([]);
  const [productos, setProductos] = useState<ProductoLubricentro[]>([]);
  // Período cuyos datos ya están cargados: "cargando" se deriva de esto, así nunca queda trabado
  const [periodoCargado, setPeriodoCargado] = useState("");
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  const rangoInvalido = Boolean(fechaInicio && fechaFin && fechaInicio > fechaFin);
  const clavePeriodo = `${fechaInicio}|${fechaFin}`;
  const cargando = !rangoInvalido && Boolean(fechaInicio && fechaFin) && periodoCargado !== clavePeriodo;

  // Productos: para estimar el costo de items vendidos que no lo tienen cargado
  useEffect(() => {
    obtenerProductosLubricentro().then((res) => {
      if (res.success) setProductos(res.data);
    });
  }, []);

  // Vista previa: se recalcula cada vez que cambia el período
  useEffect(() => {
    if (!fechaInicio || !fechaFin || rangoInvalido) return;
    let cancelado = false;
    obtenerAnotacionesPorRango(fechaInicio, fechaFin).then((res) => {
      if (cancelado) return;
      if (res.success) {
        setAnotaciones(res.data);
        setError("");
      } else {
        setError(res.error);
      }
      setPeriodoCargado(`${fechaInicio}|${fechaFin}`);
    });
    return () => {
      cancelado = true;
    };
  }, [fechaInicio, fechaFin, rangoInvalido]);

  const resumen = useMemo(() => calcularResumen(anotaciones, productos), [anotaciones, productos]);

  const atajoActivo = ATAJOS.find((a) => {
    const r = rango(a.value);
    return r.inicio === fechaInicio && r.fin === fechaFin;
  })?.value;

  const aplicarAtajo = (a: Atajo) => {
    const r = rango(a);
    setFechaInicio(r.inicio);
    setFechaFin(r.fin);
  };

  const handleGenerar = async () => {
    if (resumen.ventas.length === 0 && resumen.gastos.length === 0) {
      toast("No hay anotaciones en el período seleccionado", "warning");
      return;
    }
    setGenerando(true);
    try {
      const { generarReporteSemanal, cargarLogoPDF } = await import("@/utils/pdfGenerator");
      const logo = await cargarLogoPDF();
      const result = await generarReporteSemanal(resumen, productos, fechaInicio, fechaFin, { logo });
      toast(`PDF descargado: ${result.nombreArchivo}`);
    } catch (err) {
      console.error("Error al generar reporte:", err);
      toast("Error al generar el reporte", "error");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <PageHeader icon={BarChart3} title="Reportes" description="Ventas, costos, ganancias y gastos por período" />

      {/* Período */}
      <div className="card mb-4 space-y-4 p-4">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {ATAJOS.map((a) => (
            <button
              key={a.value}
              onClick={() => aplicarAtajo(a.value)}
              className={cn("chip", atajoActivo === a.value && "chip-active")}
            >
              {a.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="r-inicio">Desde</label>
            <input
              id="r-inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="r-fin">Hasta</label>
            <input
              id="r-fin"
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="input"
            />
          </div>
        </div>
        {rangoInvalido && (
          <p className="text-sm text-red-400">La fecha “desde” debe ser anterior a la fecha “hasta”.</p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {/* Resumen */}
      <div className={cn("transition-opacity", cargando && "opacity-50")}>
        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={Receipt}
            label="Ventas"
            value={formatCurrency(resumen.totalVentas)}
            hint={`${resumen.cantidadOperaciones} operaciones · ticket ${formatCurrency(resumen.ticketPromedio)}`}
          />
          <StatCard
            icon={TrendingUp}
            label="Ganancia bruta"
            tone="success"
            value={formatCurrency(resumen.totalGanancia)}
            hint={`Margen ${formatPercent(resumen.margenPromedio)} · costo ${formatCurrency(resumen.totalCostos)}`}
          />
          <StatCard
            icon={Percent}
            label="Margen productos"
            value={formatPercent(resumen.margenProductos)}
            hint={`Recargo s/ costo ${formatPercent(resumen.recargoPromedio)}`}
          />
          <StatCard
            icon={Wallet}
            label="Resultado neto"
            tone={resumen.resultadoNeto < 0 ? "danger" : "success"}
            value={formatCurrency(resumen.resultadoNeto)}
            hint={`Gastos ${formatCurrency(resumen.totalGastos)} · margen neto ${formatPercent(resumen.margenNeto)}`}
          />
        </div>

        {/* Ventas por tipo */}
        {resumen.porTipo.length > 0 && (
          <div className="card mb-4 overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead className="border-b border-neutral-800 bg-neutral-950/60">
                <tr>
                  <th className="th">Tipo</th>
                  <th className="th text-right">Ventas</th>
                  <th className="th text-right">Costo</th>
                  <th className="th text-right">Ganancia</th>
                  <th className="th text-right">Margen</th>
                  <th className="th text-right">Particip.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {resumen.porTipo.map((g) => (
                  <tr key={g.clave}>
                    <td className="td text-white">
                      {g.etiqueta} <span className="text-xs text-neutral-500">({g.operaciones})</span>
                    </td>
                    <td className="td text-right text-white tabular">{formatCurrency(g.ventas)}</td>
                    <td className="td text-right text-neutral-400 tabular">{formatCurrency(g.costo)}</td>
                    <td className={cn("td text-right tabular", g.ganancia < 0 ? "text-red-400" : "text-emerald-400")}>
                      {formatCurrency(g.ganancia)}
                    </td>
                    <td className="td text-right text-neutral-300 tabular">{formatPercent(g.margen)}</td>
                    <td className="td text-right text-neutral-400 tabular">{formatPercent(g.participacion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(resumen.lineasSinCosto > 0 || resumen.lineasEstimadas > 0) && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              {resumen.lineasEstimadas > 0 && (
                <p>
                  {resumen.lineasEstimadas} item(s) no tenían costo cargado: se estimó con el costo actual del
                  inventario ({formatCurrency(resumen.costoEstimado)}).
                </p>
              )}
              {resumen.lineasSinCosto > 0 && (
                <p>
                  {resumen.lineasSinCosto} item(s) por {formatCurrency(resumen.ventasSinCosto)} no tienen costo y no se
                  puede estimar: la ganancia puede estar sobrestimada. No se usan para el margen de productos.
                </p>
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleGenerar}
          disabled={generando || cargando || rangoInvalido}
          className="btn btn-primary mb-6 w-full py-3 text-base sm:w-auto"
        >
          {generando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          {generando ? "Generando PDF..." : `Descargar PDF (${formatFecha(fechaInicio)} – ${formatFecha(fechaFin)})`}
        </button>

        {/* Más vendidos */}
        {resumen.topProductos.length > 0 && (
          <div className="card overflow-hidden">
            <h2 className="border-b border-neutral-800 px-4 py-3 font-semibold text-white">Más vendidos del período</h2>
            <ul className="divide-y divide-neutral-800">
              {resumen.topProductos.map((p, i) => (
                <li key={p.clave} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-5 text-sm text-neutral-500 tabular">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{p.descripcion}</p>
                    <p className="text-xs text-neutral-500 tabular">{formatNumber(p.cantidad)} vendidos</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white tabular">{formatCurrency(p.total)}</p>
                    <p className="text-xs text-emerald-400 tabular">
                      +{formatCurrency(p.ganancia)}
                      {p.margen != null && <span className="text-neutral-500"> · {formatPercent(p.margen)}</span>}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
