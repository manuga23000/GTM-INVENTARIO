"use client";

import React, { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { obtenerFiltrosOrganizados } from "@/actions/reportes";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function BotonReporteFiltros() {
  const [generando, setGenerando] = useState(false);

  const generarPDF = async () => {
    try {
      setGenerando(true);

      // Obtener los filtros organizados
      const resultado = await obtenerFiltrosOrganizados();

      if (!resultado.success || !resultado.data) {
        alert("Error al obtener los filtros");
        return;
      }

      const { aceite, combustible, aire, habitaculo } = resultado.data;

      // Crear el PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      // ========== ENCABEZADO ==========
      // Logo/Título GTM
      doc.setFillColor(220, 38, 38); // Rojo GTM
      doc.rect(0, 0, pageWidth, 30, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("GTM - GRANDOLI TALLER MECÁNICO", pageWidth / 2, 13, {
        align: "center",
      });

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("Reporte de Filtros - Inventario", pageWidth / 2, 22, {
        align: "center",
      });

      // Fecha y hora
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const fechaActual = new Date().toLocaleString("es-AR", {
        dateStyle: "long",
        timeStyle: "short",
      });
      doc.text(`Generado: ${fechaActual}`, 14, 38);

      yPosition = 45;

      // ========== FUNCIÓN PARA AGREGAR SECCIÓN ==========
      const agregarSeccion = (
        titulo: string,
        filtros: Array<{
          codigo: string;
          marca: string;
          descripcion: string;
          stock: number;
        }>,
        color: [number, number, number]
      ) => {
        // Verificar si hay espacio suficiente
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        // Título de la sección
        doc.setFillColor(...color);
        doc.rect(14, yPosition, pageWidth - 28, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(titulo, 16, yPosition + 5.5);

        yPosition += 10;

        if (filtros.length === 0) {
          doc.setTextColor(128, 128, 128);
          doc.setFontSize(10);
          doc.setFont("helvetica", "italic");
          doc.text(
            "No hay filtros registrados en esta categoría",
            16,
            yPosition + 5
          );
          yPosition += 12;
          return;
        }

        // Tabla de filtros
        const tableData = filtros.map((f) => [
          f.codigo,
          f.marca,
          f.descripcion,
          f.stock.toString(),
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [["Código", "Marca", "Vehículos Compatibles", "Stock"]],
          body: tableData,
          theme: "grid",
          headStyles: {
            fillColor: [64, 64, 64],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 9,
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [0, 0, 0],
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245],
          },
          columnStyles: {
            0: { cellWidth: 25 }, // Código
            1: { cellWidth: 30 }, // Marca
            2: { cellWidth: 95 }, // Descripción (vehículos)
            3: { cellWidth: 20, halign: "center" }, // Stock
          },
          margin: { left: 14, right: 14 },
          didDrawPage: (data) => {
            // Actualizar yPosition después de dibujar la tabla
            yPosition = data.cursor?.y || yPosition;
          },
        });

        yPosition += 8;
      };

      // ========== AGREGAR SECCIONES ==========
      // Filtros de Aceite (Rojo)
      agregarSeccion(
        `FILTROS DE ACEITE (${aceite.length})`,
        aceite,
        [220, 38, 38]
      );

      // Filtros de Combustible (Naranja)
      agregarSeccion(
        `FILTROS DE COMBUSTIBLE (${combustible.length})`,
        combustible,
        [249, 115, 22]
      );

      // Filtros de Aire (Azul)
      agregarSeccion(`FILTROS DE AIRE (${aire.length})`, aire, [59, 130, 246]);

      // Filtros de Habitáculo (Verde) - solo si hay
      if (habitaculo.length > 0) {
        agregarSeccion(
          `FILTROS DE HABITÁCULO (${habitaculo.length})`,
          habitaculo,
          [34, 197, 94]
        );
      }

      // ========== RESUMEN FINAL ==========
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFillColor(240, 240, 240);
      doc.rect(14, yPosition, pageWidth - 28, 25, "F");

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("RESUMEN DE INVENTARIO", 16, yPosition + 7);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const totalFiltros =
        aceite.length + combustible.length + aire.length + habitaculo.length;
      doc.text(`Total de filtros: ${totalFiltros}`, 16, yPosition + 14);
      doc.text(`Filtros de Aceite: ${aceite.length}`, 16, yPosition + 19);
      doc.text(
        `Filtros de Combustible: ${combustible.length}`,
        70,
        yPosition + 14
      );
      doc.text(`Filtros de Aire: ${aire.length}`, 70, yPosition + 19);
      if (habitaculo.length > 0) {
        doc.text(
          `Filtros de Habitáculo: ${habitaculo.length}`,
          130,
          yPosition + 14
        );
      }

      // ========== PIE DE PÁGINA ==========
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      // ========== GUARDAR PDF ==========
      const nombreArchivo = `GTM_Reporte_Filtros_${new Date()
        .toISOString()
        .split("T")[0]
        .replace(/-/g, "")}.pdf`;

      doc.save(nombreArchivo);

      alert(`PDF generado exitosamente: ${nombreArchivo}`);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Error al generar el PDF");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <button
      onClick={generarPDF}
      disabled={generando}
      className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors transform hover:scale-105 disabled:scale-100 flex items-center gap-2"
      title="Generar PDF con todos los filtros organizados por tipo"
    >
      {generando ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Generando PDF...
        </>
      ) : (
        <>
          <FileDown className="w-5 h-5" />
          Reporte de Filtros
        </>
      )}
    </button>
  );
}
