// utils/pdfGenerator.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Anotacion } from "@/types/anotaciones";
import { ProductoLubricentro } from "@/types/lubricentro";

interface ReporteItem {
  fecha: string;
  descripcion: string;
  cantidad: number;
  precioCosto: number;
  precioVenta: number;
  ganancia: number;
  subtotal: number;
}

export async function generarReporteSemanal(
  anotaciones: Anotacion[],
  productos: ProductoLubricentro[],
  fechaInicio: string,
  fechaFin: string
) {
  const doc = new jsPDF();

  // Configuración
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  let yPos = 20;

  // Logo/Header
  doc.setFillColor(220, 38, 38); // GTM Red
  doc.rect(0, 0, pageWidth, 35, "F");

  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("GTM GRANDOLI TALLER MECÁNICO", pageWidth / 2, 15, {
    align: "center",
  });

  doc.setFontSize(18);
  doc.text("REPORTE SEMANAL DE VENTAS", pageWidth / 2, 25, { align: "center" });

  // Período
  yPos = 45;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  // Parsear fechas correctamente sin conversión UTC
  const fechaInicioFormat = new Date(fechaInicio + 'T12:00:00').toLocaleDateString("es-AR");
  const fechaFinFormat = new Date(fechaFin + 'T12:00:00').toLocaleDateString("es-AR");
  doc.text(
    `Período: ${fechaInicioFormat} al ${fechaFinFormat}`,
    marginLeft,
    yPos
  );

  yPos += 10;

  // Procesar anotaciones para extraer items
  const items: ReporteItem[] = [];

  for (const anotacion of anotaciones) {
    // Parsear fecha correctamente sin conversión UTC
    const fecha = new Date(anotacion.fecha + 'T12:00:00').toLocaleDateString("es-AR");

    for (const item of anotacion.items) {
      let precioCosto = 0;
      let precioVenta = 0;

      // Si el item tiene precioCosto especificado manualmente, usarlo
      if ((item as any).precioCosto !== undefined) {
        precioCosto = (item as any).precioCosto;
        precioVenta = item.precio || 0;
      }
      // Si es LUBRICENTRO y tiene productoId, buscar precios del producto
      else if (anotacion.tipo === "LUBRICENTRO" && item.productoId) {
        const producto = productos.find((p) => p.id === item.productoId);
        if (producto) {
          precioCosto = producto.precioCosto || 0;
          precioVenta = producto.precioVenta || 0;
        }
      }
      // Para entrada manual sin precioCosto especificado, usar el precio del item
      else {
        precioVenta = item.precio || 0;
        // Asumir 50% de margen para calcular costo aproximado si no se especificó
        precioCosto = precioVenta / 1.5;
      }

      const cantidad = item.cantidad || 1;
      const subtotal = precioVenta * cantidad;
      const ganancia = (precioVenta - precioCosto) * cantidad;

      items.push({
        fecha,
        descripcion: item.descripcion,
        cantidad,
        precioCosto,
        precioVenta,
        ganancia,
        subtotal,
      });
    }
  }

  // Crear tabla con los items
  const tableData = items.map((item) => [
    item.fecha,
    item.descripcion,
    item.cantidad.toString(),
    `$${item.precioCosto.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    `$${item.precioVenta.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    `$${item.ganancia.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [
      [
        "Fecha",
        "Producto/Servicio",
        "Cant.",
        "P. Costo",
        "P. Venta",
        "Ganancia",
      ],
    ],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [220, 38, 38], // GTM Red
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 13,
    },
    styles: {
      fontSize: 12,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 26 }, // Fecha
      1: { cellWidth: 51 }, // Descripción
      2: { cellWidth: 15, halign: "center" }, // Cantidad
      3: { cellWidth: 32, halign: "right" }, // P. Costo
      4: { cellWidth: 32, halign: "right", fontStyle: "bold" }, // P. Venta en negrita
      5: { cellWidth: 32, halign: "right" }, // Ganancia
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  // Calcular totales
  const totalVentas = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalGanancias = items.reduce((sum, item) => sum + item.ganancia, 0);
  const totalCostos = items.reduce(
    (sum, item) => sum + item.precioCosto * item.cantidad,
    0
  );

  // Obtener posición Y después de la tabla
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Resumen
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN", marginLeft, finalY);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");

  const summaryY = finalY + 10;
  doc.setTextColor(0, 0, 0);
  doc.text(
    `Total Ventas: $${totalVentas.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
    })}`,
    marginLeft,
    summaryY
  );
  doc.text(
    `Total Costos: $${totalCostos.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
    })}`,
    marginLeft,
    summaryY + 8
  );

  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 128, 0); // Verde para ganancias
  doc.setFontSize(14);
  doc.text(
    `Total Ganancias: $${totalGanancias.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
    })}`,
    marginLeft,
    summaryY + 16
  );

  // Margen promedio
  const margenPromedio =
    totalVentas > 0 ? (totalGanancias / totalVentas) * 100 : 0;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(
    `Margen Promedio: ${margenPromedio.toFixed(1)}%`,
    marginLeft,
    summaryY + 24
  );

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generado el ${new Date().toLocaleDateString(
      "es-AR"
    )} a las ${new Date().toLocaleTimeString("es-AR")}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  // Guardar PDF
  const nombreArchivo = `GTM_Reporte_Semanal_${fechaInicio}_${fechaFin}.pdf`;
  doc.save(nombreArchivo);

  return { success: true, nombreArchivo };
}
