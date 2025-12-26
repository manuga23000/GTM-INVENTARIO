"use client";

import { useState } from "react";
import { FileText, Download, Calendar, TrendingUp } from "lucide-react";
import { obtenerAnotacionesPorRango } from "@/actions/anotaciones";
import { obtenerProductosLubricentro } from "@/actions/lubricentro";
import { generarReporteSemanal } from "@/utils/pdfGenerator";

export default function ReportesPage() {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Función para establecer rápidamente la semana actual
  const setSemanaActual = () => {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const diff = diaSemana === 0 ? -6 : 1 - diaSemana; // Lunes como inicio de semana

    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + diff);

    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);

    setFechaInicio(lunes.toISOString().split("T")[0]);
    setFechaFin(domingo.toISOString().split("T")[0]);
  };

  // Función para establecer la semana pasada
  const setSemanaPasada = () => {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const diff = diaSemana === 0 ? -6 : 1 - diaSemana;

    const lunesActual = new Date(hoy);
    lunesActual.setDate(hoy.getDate() + diff);

    const lunesPasado = new Date(lunesActual);
    lunesPasado.setDate(lunesActual.getDate() - 7);

    const domingoPasado = new Date(lunesPasado);
    domingoPasado.setDate(lunesPasado.getDate() + 6);

    setFechaInicio(lunesPasado.toISOString().split("T")[0]);
    setFechaFin(domingoPasado.toISOString().split("T")[0]);
  };

  const handleGenerarReporte = async () => {
    if (!fechaInicio || !fechaFin) {
      setError("Por favor selecciona ambas fechas");
      return;
    }

    if (new Date(fechaInicio) > new Date(fechaFin)) {
      setError("La fecha de inicio debe ser anterior a la fecha fin");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Obtener anotaciones del rango
      const resultAnotaciones = await obtenerAnotacionesPorRango(
        fechaInicio,
        fechaFin
      );

      if (!resultAnotaciones.success || !resultAnotaciones.data) {
        setError("Error al obtener las anotaciones");
        setLoading(false);
        return;
      }

      if (resultAnotaciones.data.length === 0) {
        setError("No hay anotaciones en el período seleccionado");
        setLoading(false);
        return;
      }

      // Obtener productos de lubricentro para los precios
      const resultProductos = await obtenerProductosLubricentro();
      const productos =
        resultProductos.success && resultProductos.data
          ? resultProductos.data
          : [];

      // Generar PDF
      const result = await generarReporteSemanal(
        resultAnotaciones.data,
        productos,
        fechaInicio,
        fechaFin
      );

      if (result.success) {
        // El PDF se descarga automáticamente
        alert(`Reporte generado: ${result.nombreArchivo}`);
      }
    } catch (err) {
      console.error("Error al generar reporte:", err);
      setError("Error al generar el reporte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="bg-red-600 p-2 rounded-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Reportes Semanales</h1>
        </div>
        <p className="text-gray-400">
          Genera reportes en PDF de ventas, costos y ganancias por semana
        </p>
      </div>

      {/* Card principal */}
      <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6">
        {/* Botones rápidos */}
        <div className="mb-6">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-500" />
            Selección Rápida
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={setSemanaActual}
              className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Semana Actual
            </button>
            <button
              onClick={setSemanaPasada}
              className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Semana Pasada
            </button>
          </div>
        </div>

        {/* Selector de fechas */}
        <div className="mb-6">
          <h3 className="text-white font-semibold mb-3">
            Período Personalizado
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fecha Fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Botón generar */}
        <button
          onClick={handleGenerarReporte}
          disabled={loading || !fechaInicio || !fechaFin}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Generando Reporte...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Generar Reporte PDF
            </>
          )}
        </button>

        {/* Info adicional */}
        <div className="mt-6 bg-neutral-800 border border-neutral-700 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Contenido del Reporte
          </h4>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• Listado detallado de todas las ventas del período</li>
            <li>• Precio de costo y precio de venta de cada producto</li>
            <li>• Ganancia individual por producto vendido</li>
            <li>• Totales: Ventas, Costos y Ganancias</li>
            <li>• Margen de ganancia promedio del período</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
