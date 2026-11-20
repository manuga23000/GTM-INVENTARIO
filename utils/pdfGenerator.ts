// utils/pdfGenerator.ts
import jsPDF from "jspdf";
import autoTable, { CellHookData, RowInput, UserOptions } from "jspdf-autotable";
import { ProductoLubricentro } from "@/types/lubricentro";
import { ETIQUETAS_TIPO } from "@/types/anotaciones";
import { formatFecha, formatNumber, hoyISO, TIMEZONE } from "@/lib/format";
import { calcularResumen, LineaReporte, Resumen } from "@/lib/resumen";
import { STOCK_MINIMO_DEFAULT } from "@/lib/stock";
import type { Anotacion } from "@/types/anotaciones";
import type { FiltrosPorTipo, ProductoFiltro } from "@/actions/reportes";

// ---------------------------------------------------------------------------
// Estilo
// ---------------------------------------------------------------------------
type RGB = [number, number, number];

const C = {
  ink: [24, 24, 27] as RGB, // texto principal / encabezado
  red: [220, 38, 38] as RGB, // acento de marca
  muted: [113, 113, 122] as RGB, // texto secundario
  line: [228, 228, 231] as RGB, // bordes
  soft: [244, 244, 245] as RGB, // fondos suaves
  green: [21, 128, 61] as RGB,
  amber: [180, 83, 9] as RGB,
  negative: [185, 28, 28] as RGB,
  white: [255, 255, 255] as RGB,
};

const EMPRESA = "GRANDOLI TALLER MECÁNICO";
const M = 14; // margen lateral (mm)
const TOP_CONT = 24; // margen superior en páginas siguientes

// ---------------------------------------------------------------------------
// Formato (Helvetica de jsPDF no soporta espacios finos ni el signo "−")
// ---------------------------------------------------------------------------
function crearFormato(conCentavos: boolean) {
  const fmt = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: conCentavos ? 2 : 0,
    maximumFractionDigits: conCentavos ? 2 : 0,
  });
  const money = (n: number) => {
    const v = Number.isFinite(n) ? n : 0;
    return `${v < 0 ? "-" : ""}$ ${fmt.format(Math.abs(v))}`;
  };
  return money;
}

const pctTxt = (n: number | undefined) =>
  n == null || !Number.isFinite(n) ? "-" : `${n.toLocaleString("es-AR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
function diaCorto(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DIAS[dow]} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

function ahora() {
  return new Date().toLocaleString("es-AR", { timeZone: TIMEZONE, dateStyle: "short", timeStyle: "short" });
}

// ---------------------------------------------------------------------------
// Bloques comunes
// ---------------------------------------------------------------------------
function finalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 40;
}

function alto(doc: jsPDF) {
  return doc.internal.pageSize.getHeight();
}
function ancho(doc: jsPDF) {
  return doc.internal.pageSize.getWidth();
}

function asegurarEspacio(doc: jsPDF, y: number, necesario: number): number {
  if (y + necesario > alto(doc) - 18) {
    doc.addPage();
    return TOP_CONT;
  }
  return y;
}

function logo(doc: jsPDF, x: number, y: number, size: number) {
  doc.setFillColor(...C.red);
  doc.roundedRect(x, y, size, size, 2, 2, "F");
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size * 0.62);
  doc.text("GTM", x + size / 2, y + size / 2 + size * 0.11, { align: "center" });
}

/** Encabezado de la primera página. Devuelve la Y donde empieza el contenido. */
function encabezado(doc: jsPDF, titulo: string, lineasDerecha: string[]): number {
  const w = ancho(doc);
  doc.setFillColor(...C.ink);
  doc.rect(0, 0, w, 30, "F");
  doc.setFillColor(...C.red);
  doc.rect(0, 30, w, 1.2, "F");

  logo(doc, M, 8, 14);
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(EMPRESA, M + 18, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(200, 200, 205);
  doc.text("Lubricentro  ·  Taller mecánico", M + 18, 19.5);

  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(titulo, w - M, 12, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(200, 200, 205);
  lineasDerecha.forEach((l, i) => doc.text(l, w - M, 18 + i * 4.5, { align: "right" }));

  return 40;
}

/** Encabezado reducido + pie de página en todas las hojas. */
function decorarPaginas(doc: jsPDF, tituloCorto: string) {
  const total = doc.getNumberOfPages();
  const w = ancho(doc);
  const h = alto(doc);
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    if (i > 1) {
      logo(doc, M, 8, 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...C.ink);
      doc.text(EMPRESA, M + 11, 13.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.muted);
      doc.text(tituloCorto, w - M, 13.5, { align: "right" });
      doc.setDrawColor(...C.line);
      doc.setLineWidth(0.3);
      doc.line(M, 18, w - M, 18);
    }
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.3);
    doc.line(M, h - 13, w - M, h - 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.muted);
    doc.text(`${tituloCorto}  ·  Emitido el ${ahora()}`, M, h - 8.5);
    doc.text(`Página ${i} de ${total}`, w - M, h - 8.5, { align: "right" });
  }
}

/** Título de sección con barra de acento. Devuelve la Y siguiente. */
function seccion(doc: jsPDF, texto: string, y: number, subtitulo?: string): number {
  y = asegurarEspacio(doc, y, 28);
  doc.setFillColor(...C.red);
  doc.rect(M, y - 4, 1.2, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.ink);
  doc.text(texto.toUpperCase(), M + 3.5, y);
  if (subtitulo) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(subtitulo, ancho(doc) - M, y, { align: "right" });
  }
  return y + 4;
}

/** Opciones base de tabla con estilo uniforme. */
function tabla(doc: jsPDF, opts: UserOptions) {
  autoTable(doc, {
    theme: "plain",
    margin: { left: M, right: M, top: TOP_CONT, bottom: 18 },
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 },
      textColor: C.ink,
      lineColor: C.line,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: C.ink,
      textColor: C.white,
      fontStyle: "bold",
      fontSize: 8,
    },
    footStyles: {
      fillColor: C.soft,
      textColor: C.ink,
      fontStyle: "bold",
    },
    bodyStyles: { lineWidth: { bottom: 0.2 } },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    ...opts,
    // Encabezado y pie toman la alineación de su columna (importes a la derecha)
    didParseCell: (d) => {
      if (d.section !== "body") {
        const cs = (opts.columnStyles as Record<number, { halign?: "left" | "center" | "right" }> | undefined)?.[
          d.column.index
        ];
        if (cs?.halign) d.cell.styles.halign = cs.halign;
      }
      opts.didParseCell?.(d);
    },
  });
}

/** Colorea en rojo los valores negativos de las columnas indicadas. */
function negativosEnRojo(cols: number[]) {
  return (data: CellHookData) => {
    if (data.section !== "body" && data.section !== "foot") return;
    if (!cols.includes(data.column.index)) return;
    const txt = String(data.cell.raw ?? "");
    if (txt.startsWith("-$") || /^-\d/.test(txt)) data.cell.styles.textColor = C.negative;
  };
}

// ---------------------------------------------------------------------------
// Reporte de ventas
// ---------------------------------------------------------------------------
/**
 * Genera el PDF de ventas del período.
 * Acepta un resumen ya calculado o las anotaciones crudas.
 */
export async function generarReporteSemanal(
  entrada: Resumen | Anotacion[],
  productos: ProductoLubricentro[],
  fechaInicio: string,
  fechaFin: string
) {
  const resumen = Array.isArray(entrada) ? calcularResumen(entrada, productos) : entrada;
  const productosPorId = new Map(productos.map((p) => [p.id, p]));

  const todas = [...resumen.ventas, ...resumen.gastos];
  const conCentavos = todas.some((l) => Math.round(l.subtotal * 100) % 100 !== 0 || Math.round(l.precioCosto * 100) % 100 !== 0);
  const $ = crearFormato(conCentavos);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = ancho(doc);
  const periodo = `${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}`;
  const aUTC = (iso: string) => {
    const [yy, mm, dd] = iso.split("-").map(Number);
    return Date.UTC(yy, mm - 1, dd);
  };
  const dias = Math.round((aUTC(fechaFin) - aUTC(fechaInicio)) / 86400000) + 1;

  let y = encabezado(doc, "REPORTE DE VENTAS", [`Período: ${periodo}`, `${dias} día${dias !== 1 ? "s" : ""}`]);

  // ---------------- Indicadores ----------------
  const kpis: { label: string; valor: string; detalle?: string; color?: RGB }[] = [
    { label: "Ventas", valor: $(resumen.totalVentas), detalle: `${resumen.cantidadOperaciones} operaciones` },
    { label: "Costo de mercadería", valor: $(resumen.totalCostos), detalle: `${formatNumber(resumen.unidadesVendidas)} unidades` },
    {
      label: "Ganancia bruta",
      valor: $(resumen.totalGanancia),
      detalle: `Margen ${pctTxt(resumen.margenPromedio)}`,
      color: resumen.totalGanancia < 0 ? C.negative : C.green,
    },
    { label: "Ticket promedio", valor: $(resumen.ticketPromedio), detalle: "por operación" },
    { label: "Margen productos", valor: pctTxt(resumen.margenProductos), detalle: "sobre precio de venta" },
    { label: "Recargo s/ costo", valor: pctTxt(resumen.recargoPromedio), detalle: "markup promedio" },
    { label: "Gastos", valor: $(resumen.totalGastos), detalle: `${resumen.gastos.length} conceptos`, color: C.amber },
    {
      label: "Resultado neto",
      valor: $(resumen.resultadoNeto),
      detalle: `Margen neto ${pctTxt(resumen.margenNeto)}`,
      color: resumen.resultadoNeto < 0 ? C.negative : C.green,
    },
  ];
  const gap = 3;
  const kw = (w - M * 2 - gap * 3) / 4;
  const kh = 19;
  kpis.forEach((k, i) => {
    const x = M + (i % 4) * (kw + gap);
    const ky = y + Math.floor(i / 4) * (kh + gap);
    doc.setFillColor(...C.soft);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, ky, kw, kh, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(k.label.toUpperCase(), x + 3, ky + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...(k.color || C.ink));
    doc.text(k.valor, x + 3, ky + 11.5);
    if (k.detalle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...C.muted);
      doc.text(k.detalle, x + 3, ky + 16);
    }
  });
  y += kh * 2 + gap + 10;

  // ---------------- Estado de resultados ----------------
  y = seccion(doc, "Estado de resultados", y, "% sobre ventas totales");
  const pv = (n: number) => pctTxt(resumen.totalVentas > 0 ? (n / resumen.totalVentas) * 100 : 0);
  const filasER: RowInput[] = [];
  if (resumen.ventasProductos) filasER.push(["   Venta de productos", $(resumen.ventasProductos), pv(resumen.ventasProductos)]);
  if (resumen.ventasServicios) filasER.push(["   Servicios / mano de obra", $(resumen.ventasServicios), pv(resumen.ventasServicios)]);
  if (resumen.ventasSinCosto)
    filasER.push(["   Ventas sin costo cargado (s/c)", $(resumen.ventasSinCosto), pv(resumen.ventasSinCosto)]);
  filasER.push(
    [
      { content: "Ventas totales", styles: { fontStyle: "bold" } },
      { content: $(resumen.totalVentas), styles: { fontStyle: "bold" } },
      { content: "100,0%", styles: { fontStyle: "bold" } },
    ],
    ["(-) Costo de mercadería vendida", `-${$(resumen.totalCostos)}`, pv(resumen.totalCostos)],
    [
      { content: "Ganancia bruta", styles: { fontStyle: "bold" } },
      { content: $(resumen.totalGanancia), styles: { fontStyle: "bold" } },
      { content: pctTxt(resumen.margenPromedio), styles: { fontStyle: "bold" } },
    ],
    ["(-) Gastos operativos", `-${$(resumen.totalGastos)}`, pv(resumen.totalGastos)]
  );
  tabla(doc, {
    startY: y,
    body: filasER,
    foot: [["RESULTADO NETO", $(resumen.resultadoNeto), pctTxt(resumen.margenNeto)]],
    columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 40, halign: "right" }, 2: { cellWidth: 28, halign: "right" } },
    footStyles: {
      fillColor: resumen.resultadoNeto < 0 ? [254, 226, 226] : [220, 252, 231],
      textColor: resumen.resultadoNeto < 0 ? C.negative : C.green,
      fontStyle: "bold",
      fontSize: 10,
    },
    alternateRowStyles: {},
    didParseCell: (d) => {
      negativosEnRojo([1])(d);
      if (d.section === "body" && String(d.cell.raw).startsWith("   ")) d.cell.styles.textColor = C.muted;
    },
  });
  y = finalY(doc) + 10;

  // ---------------- Por tipo ----------------
  if (resumen.porTipo.length > 0) {
    y = seccion(doc, "Ventas por tipo", y);
    tabla(doc, {
      startY: y,
      head: [["Tipo", "Operac.", "Ventas", "Costo", "Ganancia", "Margen", "Particip."]],
      body: resumen.porTipo.map((g) => [
        g.etiqueta,
        String(g.operaciones),
        $(g.ventas),
        $(g.costo),
        $(g.ganancia),
        pctTxt(g.margen),
        pctTxt(g.participacion),
      ]),
      foot:
        resumen.porTipo.length > 1
          ? [
              [
                "Total",
                String(resumen.cantidadOperaciones),
                $(resumen.totalVentas),
                $(resumen.totalCostos),
                $(resumen.totalGanancia),
                pctTxt(resumen.margenPromedio),
                "100,0%",
              ],
            ]
          : undefined,
      columnStyles: {
        1: { halign: "center", cellWidth: 16 },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right", cellWidth: 18 },
        6: { halign: "right", cellWidth: 18 },
      },
      didParseCell: negativosEnRojo([4]),
    });
    y = finalY(doc) + 10;
  }

  // ---------------- Por día ----------------
  if (resumen.porDia.length > 1) {
    y = seccion(doc, "Evolución diaria", y);
    const maxVenta = Math.max(...resumen.porDia.map((d) => d.ventas), 1);
    tabla(doc, {
      startY: y,
      head: [["Día", "Operac.", "Ventas", "", "Costo", "Ganancia", "Margen"]],
      body: resumen.porDia.map((g) => [
        diaCorto(g.clave),
        String(g.operaciones),
        $(g.ventas),
        "",
        $(g.costo),
        $(g.ganancia),
        pctTxt(g.margen),
      ]),
      columnStyles: {
        0: { cellWidth: 24 },
        1: { halign: "center", cellWidth: 16 },
        2: { halign: "right", cellWidth: 30 },
        3: { cellWidth: "auto" },
        4: { halign: "right", cellWidth: 28 },
        5: { halign: "right", cellWidth: 28 },
        6: { halign: "right", cellWidth: 18 },
      },
      headStyles: { fillColor: C.ink, textColor: C.white, fontStyle: "bold", fontSize: 8 },
      didParseCell: negativosEnRojo([5]),
      // Barra proporcional a las ventas del día
      didDrawCell: (d) => {
        if (d.section !== "body" || d.column.index !== 3) return;
        const g = resumen.porDia[d.row.index];
        const bw = Math.max(0.5, ((d.cell.width - 4) * g.ventas) / maxVenta);
        doc.setFillColor(...C.red);
        doc.rect(d.cell.x + 2, d.cell.y + d.cell.height / 2 - 1.5, bw, 3, "F");
      },
    });
    y = finalY(doc) + 10;
  }

  // ---------------- Más vendidos ----------------
  if (resumen.topProductos.length > 0) {
    y = seccion(doc, "Productos y servicios más vendidos", y, "Top 10 por importe");
    tabla(doc, {
      startY: y,
      head: [["#", "Producto / servicio", "Cant.", "Ventas", "Ganancia", "Margen"]],
      body: resumen.topProductos.map((p, i) => [
        String(i + 1),
        p.descripcion,
        formatNumber(p.cantidad),
        $(p.total),
        p.costoConocido ? $(p.ganancia) : `${$(p.ganancia)} (s/c)`,
        pctTxt(p.margen),
      ]),
      columnStyles: {
        0: { cellWidth: 8, halign: "center", textColor: C.muted },
        1: { cellWidth: "auto" },
        2: { cellWidth: 16, halign: "center" },
        3: { cellWidth: 30, halign: "right", fontStyle: "bold" },
        4: { cellWidth: 34, halign: "right" },
        5: { cellWidth: 18, halign: "right" },
      },
      didParseCell: negativosEnRojo([4]),
    });
    y = finalY(doc) + 10;
  }

  // ---------------- Detalle por operación ----------------
  y = seccion(doc, "Detalle de operaciones", y, `${resumen.operaciones.length} operación${resumen.operaciones.length !== 1 ? "es" : ""}`);
  const marca = (l: LineaReporte) => {
    if (l.origenCosto === "estimado") return `${$(l.precioCosto)} *`;
    if (l.origenCosto === "servicio") return "M.O.";
    if (l.origenCosto === "sin") return "s/c";
    return $(l.precioCosto);
  };
  const cuerpo: RowInput[] = [];
  for (const op of resumen.operaciones) {
    const margenOp = op.lineas.some((l) => l.origenCosto === "sin")
      ? "-"
      : pctTxt(op.total > 0 ? (op.ganancia / op.total) * 100 : 0);
    cuerpo.push([
      {
        content: `${diaCorto(op.fecha)}   ${op.titulo}   ·   ${ETIQUETAS_TIPO[op.tipo] || op.tipo}`,
        colSpan: 4,
        styles: { fontStyle: "bold", fillColor: C.soft },
      },
      { content: $(op.total), styles: { fontStyle: "bold", fillColor: C.soft, halign: "right" } },
      { content: $(op.ganancia), styles: { fontStyle: "bold", fillColor: C.soft, halign: "right" } },
      { content: margenOp, styles: { fontStyle: "bold", fillColor: C.soft, halign: "right" } },
    ]);
    for (const l of op.lineas) {
      const p = l.productoId ? productosPorId.get(l.productoId) : undefined;
      // En filtros la descripción del producto es la lista de vehículos: mostramos el código
      const desc =
        p?.categoria === "Filtros" && p.codigo && !l.descripcion.includes(p.codigo)
          ? `${l.descripcion} [${p.codigo}]`
          : l.descripcion;
      cuerpo.push([
        `   ${desc}`,
        formatNumber(l.cantidad),
        marca(l),
        $(l.precioVenta),
        $(l.subtotal),
        l.origenCosto === "sin" ? "-" : $(l.ganancia),
        pctTxt(l.margen),
      ]);
    }
    if (op.notas) {
      cuerpo.push([
        { content: `   Nota: ${op.notas}`, colSpan: 7, styles: { fontStyle: "italic", textColor: C.muted, fontSize: 7.5 } },
      ]);
    }
  }
  tabla(doc, {
    startY: y,
    head: [["Descripción", "Cant.", "Costo u.", "Venta u.", "Subtotal", "Ganancia", "Margen"]],
    body: cuerpo.length ? cuerpo : [[{ content: "Sin ventas en el período", colSpan: 7, styles: { halign: "center", textColor: C.muted } }]],
    foot: [["TOTAL DEL PERÍODO", "", "", "", $(resumen.totalVentas), $(resumen.totalGanancia), pctTxt(resumen.margenPromedio)]],
    showFoot: "lastPage",
    showHead: "everyPage",
    alternateRowStyles: {},
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 13, halign: "center" },
      2: { cellWidth: 24, halign: "right" },
      3: { cellWidth: 24, halign: "right" },
      4: { cellWidth: 26, halign: "right" },
      5: { cellWidth: 25, halign: "right" },
      6: { cellWidth: 16, halign: "right" },
    },
    didParseCell: (d) => {
      negativosEnRojo([5])(d);
      if (d.section === "body" && d.column.index === 2 && /s\/c|\*$/.test(String(d.cell.raw))) {
        d.cell.styles.textColor = C.amber;
      }
      if (d.section === "body" && d.column.index === 2 && d.cell.raw === "M.O.") d.cell.styles.textColor = C.muted;
    },
  });
  y = finalY(doc) + 10;

  // ---------------- Gastos ----------------
  if (resumen.gastos.length > 0) {
    y = seccion(doc, "Gastos del período", y);
    tabla(doc, {
      startY: y,
      head: [["Fecha", "Concepto", "Detalle", "Importe"]],
      body: resumen.gastos.map((l) => [diaCorto(l.fecha), l.titulo, l.descripcion !== l.titulo ? l.descripcion : "", $(l.subtotal)]),
      foot: [["", "TOTAL GASTOS", "", $(resumen.totalGastos)]],
      columnStyles: { 0: { cellWidth: 24 }, 3: { cellWidth: 32, halign: "right" } },
      footStyles: { fillColor: [254, 243, 199], textColor: C.amber, fontStyle: "bold" },
    });
    y = finalY(doc) + 10;
  }

  // ---------------- Notas ----------------
  const notas: string[] = [
    "Margen = ganancia / precio de venta.  Recargo = ganancia / costo.  Margen neto = (ganancia bruta - gastos) / ventas.",
    "M.O.: servicio o mano de obra sin costo de mercadería; su importe completo es ganancia.",
  ];
  if (resumen.lineasEstimadas > 0) {
    notas.push(
      `* Costo estimado con el precio de costo actual del inventario (${resumen.lineasEstimadas} item/s, ${$(resumen.costoEstimado)}): la anotación no tenía costo cargado.`
    );
  }
  if (resumen.lineasSinCosto > 0) {
    notas.push(
      `s/c: ${resumen.lineasSinCosto} item/s por ${$(resumen.ventasSinCosto)} sin costo cargado. Se suman completos a la ganancia, que puede estar sobrestimada, y no se usan para el margen de productos.`
    );
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const lineas = notas.flatMap((n) => doc.splitTextToSize(n, w - M * 2 - 6) as string[]);
  const altoNotas = lineas.length * 3.6 + 9;
  y = asegurarEspacio(doc, y, altoNotas);
  doc.setFillColor(...C.soft);
  doc.roundedRect(M, y, w - M * 2, altoNotas, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.ink);
  doc.text("NOTAS", M + 3, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.muted);
  lineas.forEach((l, i) => doc.text(l, M + 3, y + 9.5 + i * 3.6));

  decorarPaginas(doc, `Reporte de ventas ${formatFecha(fechaInicio)} - ${formatFecha(fechaFin)}`);

  const nombreArchivo = `GTM_Reporte_Ventas_${fechaInicio}_${fechaFin}.pdf`;
  doc.save(nombreArchivo);
  return { success: true, nombreArchivo, doc };
}

// ---------------------------------------------------------------------------
// Reporte de filtros
// ---------------------------------------------------------------------------
export function generarReporteFiltros(data: FiltrosPorTipo) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = ancho(doc);
  const hoy = formatFecha(hoyISO());

  const grupos: { titulo: string; filtros: ProductoFiltro[] }[] = [
    { titulo: "Filtros de aceite", filtros: data.aceite },
    { titulo: "Filtros de combustible", filtros: data.combustible },
    { titulo: "Filtros de aire", filtros: data.aire },
    { titulo: "Filtros de habitáculo", filtros: data.habitaculo },
    { titulo: "Sin clasificar (cargar el tipo de filtro)", filtros: data.sinClasificar },
  ];
  const todos = grupos.flatMap((g) => g.filtros);
  const sinStock = todos.filter((f) => f.stock <= 0).length;
  const unidades = todos.reduce((s, f) => s + Math.max(0, f.stock), 0);

  let y = encabezado(doc, "INVENTARIO DE FILTROS", [`Al ${hoy}`, `${todos.length} código${todos.length !== 1 ? "s" : ""}`]);

  // Resumen en recuadros
  const stockBajo = todos.filter((f) => f.stock > 0 && f.stock <= STOCK_MINIMO_DEFAULT).length;
  const kpis: { label: string; valor: string; color?: RGB }[] = [
    { label: "Códigos", valor: String(todos.length) },
    { label: "Unidades en stock", valor: formatNumber(unidades) },
    { label: "Sin stock", valor: String(sinStock), color: sinStock ? C.negative : C.ink },
    { label: `Stock bajo (${STOCK_MINIMO_DEFAULT} o menos)`, valor: String(stockBajo), color: stockBajo ? C.amber : C.ink },
  ];
  const kw = (w - M * 2 - 9) / 4;
  kpis.forEach((k, i) => {
    const x = M + i * (kw + 3);
    doc.setFillColor(...C.soft);
    doc.setDrawColor(...C.line);
    doc.roundedRect(x, y, kw, 15, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(k.label.toUpperCase(), x + 3, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...(k.color || C.ink));
    doc.text(k.valor, x + 3, y + 11.5);
  });
  y += 24;

  for (const g of grupos) {
    if (g.filtros.length === 0) continue;
    y = seccion(doc, g.titulo, y, `${g.filtros.length} código${g.filtros.length !== 1 ? "s" : ""}`);
    tabla(doc, {
      startY: y,
      head: [["Código", "Marca", "Vehículos compatibles", "Stock"]],
      body: g.filtros.map((f) => [f.codigo, f.marca, f.descripcion, formatNumber(f.stock)]),
      columnStyles: {
        0: { cellWidth: 30, fontStyle: "bold" },
        1: { cellWidth: 28 },
        2: { cellWidth: "auto" },
        3: { cellWidth: 16, halign: "center", fontStyle: "bold" },
      },
      didParseCell: (cell) => {
        if (cell.section === "body" && cell.column.index === 3) {
          const stock = g.filtros[cell.row.index]?.stock ?? 0;
          if (stock <= 0) cell.cell.styles.textColor = C.negative;
          else if (stock <= STOCK_MINIMO_DEFAULT) cell.cell.styles.textColor = C.amber;
        }
      },
    });
    y = finalY(doc) + 10;
  }

  decorarPaginas(doc, `Inventario de filtros al ${hoy}`);

  const nombreArchivo = `GTM_Reporte_Filtros_${hoyISO().replace(/-/g, "")}.pdf`;
  doc.save(nombreArchivo);
  return { nombreArchivo, total: todos.length, doc };
}
