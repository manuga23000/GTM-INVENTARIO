"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { obtenerFiltrosOrganizados } from "@/actions/reportes";
import { useFeedback } from "@/components/ui/Feedback";

export default function BotonReporteFiltros() {
  const { toast } = useFeedback();
  const [generando, setGenerando] = useState(false);

  const generarPDF = async () => {
    setGenerando(true);
    try {
      const resultado = await obtenerFiltrosOrganizados();
      if (!resultado.success || !resultado.data) {
        toast("Error al obtener los filtros", "error");
        return;
      }
      // jsPDF se carga recién al usarlo (no pesa en la carga inicial de la página)
      const { generarReporteFiltros } = await import("@/utils/pdfGenerator");
      const { nombreArchivo } = generarReporteFiltros(resultado.data);
      toast(`PDF descargado: ${nombreArchivo}`);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast("Error al generar el PDF", "error");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <button
      onClick={generarPDF}
      disabled={generando}
      className="btn btn-secondary flex-1 sm:flex-none"
      title="Generar PDF con todos los filtros organizados por tipo"
    >
      {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      {generando ? "Generando..." : "PDF de filtros"}
    </button>
  );
}
