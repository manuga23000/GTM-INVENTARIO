// utils/pdfGenerator.ts
import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import { ProductoLubricentro } from "@/types/lubricentro";
import { formatCurrency as fc, formatFecha, formatNumber, formatPercent, hoyISO } from "@/lib/format";
import { Resumen } from "@/lib/resumen";
import type { FiltrosPorTipo, ProductoFiltro } from "@/actions/reportes";

type RGB = [number, number, number];

const ROJO: RGB = [220, 38, 38];
const GRIS_OSCURO: RGB = [38, 38, 38];
const MARGEN = 14;

// jsPDF (fuente Helvetica) no soporta espacios finos de Intl: los normalizamos
const formatCurrency = (n: number) => fc(n).replace(/[\u202F\u00A0]/g, " ");

/** Y donde terminó la última tabla dibujada. */
function finalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 40;
}

function encabezado(doc: jsPDF, titulo: string, subtitulo: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...ROJO);
  doc.rect(0, 0, w, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("GTM · GRANDOLI TALLER MECÁNICO", w / 2, 13, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(titulo, w / 2, 22, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(subtitulo, MARGEN, 40);
}

function pieDePagina(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const generado = new Date().toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "short",
    timeStyle: "short",
  });
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado el ${generado}`, MARGEN, h - 8);
    doc.text(`Página ${i} de ${total}`, w - MARGEN, h - 8, { align: "right" });
  }
}

function asegurarEspacio(doc: jsPDF, y: number, necesario: number): number {
  if (y + necesario > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    return 20;
  }
  return y;
}

function tituloSeccion(doc: jsPDF, texto: string, y: number, color: RGB = GRIS_OSCURO): number {
  const w = doc.internal.pageSize.getWidth();
  y = asegurarEspacio(doc, y, 20);
  doc.setFillColor(...color);
  doc.rect(MARGEN, y, w - MARGEN * 2, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(texto, MARGEN + 2, y + 5.5);
  return y + 10;
}

// ---------------------------------------------------------------------------
// Reporte de ventas (semanal / mensual / personalizado)
// ---------------------------------------------------------------------------
export async function generarReporteSemanal(
  resumen: Resumen,
  productos: ProductoLubricentro[],
  fechaInicio: string,
  fechaFin: string
) {
  const doc = new jsPDF();
  const productosPorId = new Map(productos.map((p) => [p.id, p]));

  encabezado(
    doc,
    "REPORTE DE VENTAS",
    `Período: ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}`
  );

  // --- Resumen en recuadros ---
  const w = doc.internal.pageSize.getWidth();
  const cajas: { label: string; valor: string; color: RGB }[] = [
    { label: "Ventas", valor: formatCurrency(resumen.totalVentas), color: [0, 0, 0] },
    { label: "Costos", valor: formatCurrency(resumen.totalCostos), color: [80, 80, 80] },
    { label: "Ganancia", valor: formatCurrency(resumen.totalGanancia), color: [0, 128, 0] },
    { label: "Margen", valor: formatPercent(resumen.margenPromedio), color: [0, 0, 0] },
  ];
  const anchoCaja = (w - MARGEN * 2 - 6 * (cajas.length - 1)) / cajas.length;
  cajas.forEach((c, i) => {
    const x = MARGEN + i * (anchoCaja + 6);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(x, 45, anchoCaja, 18, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.setFont("helvetica", "normal");
    doc.text(c.label.toUpperCase(), x + 3, 51);
    doc.setFontSize(12);
    doc.setTextColor(...c.color);
    doc.setFont("helvetica", "bold");
    doc.text(c.valor, x + 3, 59);
  });

  let y = 70;

  // --- Detalle de ventas ---
  y = tituloSeccion(doc, `DETALLE DE VENTAS (${resumen.ventas.length} líneas)`, y, ROJO);
  const filasVentas: RowInput[] = resumen.ventas.map((l) => {
    const p = l.productoId ? productosPorId.get(l.productoId) : undefined;
    // Para filtros mostramos el código (la descripción es la lista de vehículos)
    const desc = p && p.categoria === "Filtros" && p.codigo ? `${p.codigo} (filtro)` : l.descripcion;
    return [
      formatFecha(l.fecha).slice(0, 5),
      desc,
      formatNumber(l.cantidad),
      l.sinCosto ? "s/d" : formatCurrency(l.precioCosto),
      formatCurrency(l.precioVenta),
      formatCurrency(l.subtotal),
      l.sinCosto ? "-" : formatCurrency(l.ganancia),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Fecha", "Producto / Servicio", "Cant.", "P. Costo", "P. Venta", "Subtotal", "Ganancia"]],
    body: filasVentas.length ? filasVentas : [["", "Sin ventas en el período", "", "", "", "", ""]],
    foot: [
      [
        "",
        "TOTAL",
        "",
        "",
        "",
        formatCurrency(resumen.totalVentas),
        formatCurrency(resumen.totalGanancia),
      ],
    ],
    theme: "striped",
    margin: { left: MARGEN, right: MARGEN },
    headStyles: { fillColor: GRIS_OSCURO, textColor: 255, fontStyle: "bold", fontSize: 9 },
    footStyles: { fillColor: [235, 235, 235], textColor: 0, fontStyle: "bold", fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2.5, overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 13, halign: "center" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 27, halign: "right", fontStyle: "bold" },
      6: { cellWidth: 25, halign: "right" },
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    showFoot: "lastPage",
  });
  y = finalY(doc) + 8;

  // --- Gastos ---
  if (resumen.gastos.length > 0) {
    y = tituloSeccion(doc, `GASTOS (${resumen.gastos.length})`, y, [120, 53, 15]);
    autoTable(doc, {
      startY: y,
      head: [["Fecha", "Concepto", "Detalle", "Importe"]],
      body: resumen.gastos.map((l) => [
        formatFecha(l.fecha).slice(0, 5),
        l.titulo,
        l.descripcion,
        formatCurrency(l.subtotal),
      ]),
      foot: [["", "TOTAL GASTOS", "", formatCurrency(resumen.totalGastos)]],
      theme: "striped",
      margin: { left: MARGEN, right: MARGEN },
      headStyles: { fillColor: GRIS_OSCURO, textColor: 255, fontSize: 9 },
      footStyles: { fillColor: [235, 235, 235], textColor: 0, fontStyle: "bold", fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: { 0: { cellWidth: 14 }, 3: { cellWidth: 30, halign: "right" } },
      showFoot: "lastPage",
    });
    y = finalY(doc) + 8;
  }

  // --- Resumen final ---
  y = asegurarEspacio(doc, y, 50);
  doc.setFillColor(245, 245, 245);
  doc.rect(MARGEN, y, w - MARGEN * 2, resumen.gastos.length ? 42 : 34, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("RESUMEN", MARGEN + 4, y + 8);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const filas: [string, string][] = [
    ["Total ventas", formatCurrency(resumen.totalVentas)],
    ["Total costos", formatCurrency(resumen.totalCostos)],
    ["Ganancia bruta", `${formatCurrency(resumen.totalGanancia)}  (${formatPercent(resumen.margenPromedio)})`],
  ];
  if (resumen.gastos.length) {
    filas.push(["Gastos", `- ${formatCurrency(resumen.totalGastos)}`]);
    filas.push(["Resultado neto", formatCurrency(resumen.resultadoNeto)]);
  }
  filas.forEach(([k, v], i) => {
    const fy = y + 15 + i * 6;
    const esUltima = i === filas.length - 1;
    doc.setFont("helvetica", esUltima ? "bold" : "normal");
    if (esUltima) doc.setTextColor(0, 128, 0);
    doc.text(k, MARGEN + 4, fy);
    doc.text(v, w - MARGEN - 4, fy, { align: "right" });
    doc.setTextColor(0, 0, 0);
  });

  if (resumen.lineasSinCosto > 0) {
    doc.setFontSize(8);
    doc.setTextColor(150, 90, 0);
    doc.text(
      `Atención: ${resumen.lineasSinCosto} línea(s) sin precio de costo ("s/d"); su ganancia se calculó con costo 0.`,
      MARGEN,
      y + (resumen.gastos.length ? 48 : 40)
    );
  }

  pieDePagina(doc);

  const nombreArchivo = `GTM_Reporte_Ventas_${fechaInicio}_${fechaFin}.pdf`;
  doc.save(nombreArchivo);
  return { success: true, nombreArchivo };
}

// ---------------------------------------------------------------------------
// Reporte de filtros
// ---------------------------------------------------------------------------
export function generarReporteFiltros(data: FiltrosPorTipo) {
  const doc = new jsPDF();
  const fecha = new Date().toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "long",
  });
  encabezado(doc, "REPORTE DE FILTROS · INVENTARIO", `Al ${fecha}`);

  let y = 46;
  const seccion = (titulo: string, filtros: ProductoFiltro[], color: RGB) => {
    if (filtros.length === 0) return;
    y = tituloSeccion(doc, `${titulo} (${filtros.length})`, y, color);
    autoTable(doc, {
      startY: y,
      head: [["Código", "Marca", "Vehículos compatibles", "Stock"]],
      body: filtros.map((f) => [f.codigo, f.marca, f.descripcion, formatNumber(f.stock)]),
      theme: "grid",
      margin: { left: MARGEN, right: MARGEN },
      headStyles: { fillColor: [64, 64, 64], textColor: 255, fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: 0 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: "bold" },
        1: { cellWidth: 28 },
        2: { cellWidth: "auto" },
        3: { cellWidth: 16, halign: "center" },
      },
      didParseCell: (cell) => {
        // Resaltar sin stock
        if (cell.section === "body" && cell.column.index === 3 && filtros[cell.row.index]?.stock <= 0) {
          cell.cell.styles.textColor = [200, 0, 0];
          cell.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = finalY(doc) + 8;
  };

  seccion("FILTROS DE ACEITE", data.aceite, [220, 38, 38]);
  seccion("FILTROS DE COMBUSTIBLE", data.combustible, [234, 88, 12]);
  seccion("FILTROS DE AIRE", data.aire, [37, 99, 235]);
  seccion("FILTROS DE HABITÁCULO", data.habitaculo, [22, 163, 74]);
  seccion("SIN CLASIFICAR (cargar el tipo de filtro)", data.sinClasificar, [100, 100, 100]);

  // Resumen
  const total =
    data.aceite.length +
    data.combustible.length +
    data.aire.length +
    data.habitaculo.length +
    data.sinClasificar.length;
  const sinStock = Object.values(data)
    .flat()
    .filter((f: ProductoFiltro) => f.stock <= 0).length;

  y = asegurarEspacio(doc, y, 30);
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(240, 240, 240);
  doc.rect(MARGEN, y, w - MARGEN * 2, 22, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN", MARGEN + 3, y + 7);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Total de filtros: ${total}`, MARGEN + 3, y + 14);
  doc.text(`Sin stock: ${sinStock}`, MARGEN + 3, y + 19);
  doc.text(`Aceite: ${data.aceite.length}   Combustible: ${data.combustible.length}`, 80, y + 14);
  doc.text(`Aire: ${data.aire.length}   Habitáculo: ${data.habitaculo.length}`, 80, y + 19);

  pieDePagina(doc);

  const nombreArchivo = `GTM_Reporte_Filtros_${hoyISO().replace(/-/g, "")}.pdf`;
  doc.save(nombreArchivo);
  return { nombreArchivo, total };
}

