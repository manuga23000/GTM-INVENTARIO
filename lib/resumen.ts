import { round2 } from "@/lib/format";
import {
  Anotacion,
  esGasto,
  ETIQUETAS_TIPO,
  ItemAnotacion,
  TipoAnotacion,
} from "@/types/anotaciones";
import type { ProductoLubricentro } from "@/types/lubricentro";

// ---------------------------------------------------------------------------
// Cómo se calcula la ganancia
// ---------------------------------------------------------------------------
// Cada línea vendida se clasifica según de dónde sale su costo:
//  - "real":     tiene precio de costo cargado en la anotación.
//  - "estimado": no lo tiene, pero está vinculada a un producto del inventario
//                y se usa el costo actual de ese producto.
//  - "servicio": mano de obra / servicio de taller sin costo de mercadería
//                (su ganancia es el total cobrado).
//  - "sin":      producto sin costo y sin forma de estimarlo. Se suma a la
//                ganancia (no hay otra opción) pero se informa aparte y NO se
//                usa para calcular el margen de productos.
//
// Indicadores:
//  - Margen bruto       = ganancia bruta / ventas            (sobre precio de venta)
//  - Recargo s/ costo   = ganancia de productos / costo      (markup)
//  - Margen de productos= ganancia / ventas, sólo líneas con costo conocido
//  - Margen neto        = (ganancia bruta − gastos) / ventas
// ---------------------------------------------------------------------------

export type OrigenCosto = "real" | "estimado" | "servicio" | "sin";

export interface LineaReporte {
  anotacionId?: string;
  fecha: string;
  tipo: TipoAnotacion;
  titulo: string;
  descripcion: string;
  productoId?: string;
  cantidad: number;
  precioCosto: number;
  precioVenta: number;
  subtotal: number;
  costoTotal: number;
  ganancia: number;
  /** Margen sobre venta de la línea (%), undefined si no se conoce el costo. */
  margen?: number;
  origenCosto: OrigenCosto;
  /** Compatibilidad: true si la línea no tiene costo conocido. */
  sinCosto: boolean;
}

export interface Operacion {
  id?: string;
  fecha: string;
  tipo: TipoAnotacion;
  titulo: string;
  notas: string;
  lineas: LineaReporte[];
  total: number;
  costo: number;
  ganancia: number;
}

export interface Agrupado {
  clave: string;
  etiqueta: string;
  operaciones: number;
  cantidad: number;
  ventas: number;
  costo: number;
  ganancia: number;
  /** Margen sobre venta (%). */
  margen: number;
  /** Participación sobre el total de ventas (%). */
  participacion: number;
}

export interface ProductoVendido {
  clave: string;
  descripcion: string;
  cantidad: number;
  total: number;
  costo: number;
  ganancia: number;
  margen?: number;
  costoConocido: boolean;
}

export interface Resumen {
  ventas: LineaReporte[];
  gastos: LineaReporte[];
  operaciones: Operacion[];

  totalVentas: number;
  totalCostos: number;
  totalGanancia: number;
  totalGastos: number;
  resultadoNeto: number;

  /** Ventas desglosadas según el origen del costo. */
  ventasProductos: number; // real + estimado
  ventasServicios: number;
  ventasSinCosto: number;
  costoEstimado: number;

  /** Ganancia bruta / ventas (%). */
  margenPromedio: number;
  /** Ganancia de productos / ventas de productos, sólo con costo conocido (%). */
  margenProductos: number;
  /** Ganancia de productos / costo (%). */
  recargoPromedio: number;
  /** Resultado neto / ventas (%). */
  margenNeto: number;

  cantidadOperaciones: number;
  ticketPromedio: number;
  unidadesVendidas: number;

  lineasSinCosto: number;
  lineasEstimadas: number;

  porTipo: Agrupado[];
  porDia: Agrupado[];
  topProductos: ProductoVendido[];
}

// ---------------------------------------------------------------------------
// Helpers de items (usados también por las pantallas)
// ---------------------------------------------------------------------------
export function cantidadDe(item: ItemAnotacion): number {
  return typeof item.cantidad === "number" && item.cantidad > 0 ? item.cantidad : 1;
}

export function subtotalItem(item: ItemAnotacion): number {
  return round2(cantidadDe(item) * (item.precio || 0));
}

export function totalAnotacion(items: ItemAnotacion[]): number {
  return round2(items.reduce((sum, it) => sum + subtotalItem(it), 0));
}

/** Ganancia de una anotación según los costos cargados en ella. */
export function gananciaAnotacion(items: ItemAnotacion[]): number {
  return round2(
    items.reduce((sum, it) => sum + cantidadDe(it) * ((it.precio || 0) - (it.precioCosto || 0)), 0)
  );
}

const pct = (parte: number, total: number) => (total > 0 ? (parte / total) * 100 : 0);

function agrupar(
  lineas: LineaReporte[],
  claveDe: (l: LineaReporte) => string,
  etiquetaDe: (clave: string) => string,
  totalVentas: number
): Agrupado[] {
  const map = new Map<string, Agrupado & { ops: Set<string> }>();
  for (const l of lineas) {
    const clave = claveDe(l);
    const g =
      map.get(clave) ||
      ({
        clave,
        etiqueta: etiquetaDe(clave),
        operaciones: 0,
        cantidad: 0,
        ventas: 0,
        costo: 0,
        ganancia: 0,
        margen: 0,
        participacion: 0,
        ops: new Set<string>(),
      } as Agrupado & { ops: Set<string> });
    g.ops.add(l.anotacionId || `${l.fecha}-${l.titulo}`);
    g.cantidad = round2(g.cantidad + l.cantidad);
    g.ventas = round2(g.ventas + l.subtotal);
    g.costo = round2(g.costo + l.costoTotal);
    g.ganancia = round2(g.ganancia + l.ganancia);
    map.set(clave, g);
  }
  return [...map.values()].map(({ ops, ...g }) => ({
    ...g,
    operaciones: ops.size,
    margen: pct(g.ganancia, g.ventas),
    participacion: pct(g.ventas, totalVentas),
  }));
}

// ---------------------------------------------------------------------------
// Resumen principal
// ---------------------------------------------------------------------------
/**
 * @param productos  Opcional. Si se pasa, las líneas vinculadas a un producto
 *                   que no tienen costo cargado usan el costo actual del producto.
 */
export function calcularResumen(
  anotaciones: Anotacion[],
  productos: Pick<ProductoLubricentro, "id" | "precioCosto">[] = []
): Resumen {
  const costoProducto = new Map(
    productos.filter((p) => p.id && (p.precioCosto || 0) > 0).map((p) => [p.id!, p.precioCosto])
  );

  const ventas: LineaReporte[] = [];
  const gastos: LineaReporte[] = [];
  const operaciones: Operacion[] = [];

  const ordenadas = [...anotaciones].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || (a.titulo || "").localeCompare(b.titulo || "")
  );

  for (const anot of ordenadas) {
    const gasto = esGasto(anot.tipo);
    const lineasOp: LineaReporte[] = [];

    for (const item of anot.items || []) {
      const cantidad = cantidadDe(item);
      const precioVenta = item.precio || 0;
      const subtotal = round2(precioVenta * cantidad);

      let origen: OrigenCosto;
      let precioCosto = 0;
      if (gasto) {
        origen = "servicio";
      } else if ((item.precioCosto || 0) > 0) {
        origen = "real";
        precioCosto = item.precioCosto!;
      } else if (item.productoId && costoProducto.has(item.productoId)) {
        origen = "estimado";
        precioCosto = costoProducto.get(item.productoId)!;
      } else if (anot.tipo === "TALLER" && !item.productoId) {
        origen = "servicio";
      } else {
        origen = "sin";
      }

      const costoTotal = round2(precioCosto * cantidad);
      const ganancia = gasto ? 0 : round2(subtotal - costoTotal);
      const costoConocido = origen === "real" || origen === "estimado";

      const linea: LineaReporte = {
        anotacionId: anot.id,
        fecha: anot.fecha,
        tipo: anot.tipo,
        titulo: anot.titulo,
        descripcion: item.descripcion || anot.titulo,
        productoId: item.productoId,
        cantidad,
        precioCosto,
        precioVenta,
        subtotal,
        costoTotal,
        ganancia,
        margen: costoConocido ? pct(ganancia, subtotal) : origen === "servicio" && !gasto ? 100 : undefined,
        origenCosto: origen,
        sinCosto: origen === "sin",
      };
      lineasOp.push(linea);
      (gasto ? gastos : ventas).push(linea);
    }

    if (!gasto && lineasOp.length > 0) {
      operaciones.push({
        id: anot.id,
        fecha: anot.fecha,
        tipo: anot.tipo,
        titulo: anot.titulo,
        notas: anot.descripcion || "",
        lineas: lineasOp,
        total: round2(lineasOp.reduce((s, l) => s + l.subtotal, 0)),
        costo: round2(lineasOp.reduce((s, l) => s + l.costoTotal, 0)),
        ganancia: round2(lineasOp.reduce((s, l) => s + l.ganancia, 0)),
      });
    }
  }

  const suma = (ls: LineaReporte[], f: (l: LineaReporte) => number) => round2(ls.reduce((s, l) => s + f(l), 0));

  const totalVentas = suma(ventas, (l) => l.subtotal);
  const totalCostos = suma(ventas, (l) => l.costoTotal);
  const totalGanancia = round2(totalVentas - totalCostos);
  const totalGastos = suma(gastos, (l) => l.subtotal);
  const resultadoNeto = round2(totalGanancia - totalGastos);

  const conCosto = ventas.filter((l) => l.origenCosto === "real" || l.origenCosto === "estimado");
  const ventasProductos = suma(conCosto, (l) => l.subtotal);
  const costoProductos = suma(conCosto, (l) => l.costoTotal);
  const gananciaProductos = round2(ventasProductos - costoProductos);

  // Productos más vendidos
  const porProducto = new Map<string, ProductoVendido>();
  for (const l of ventas) {
    const clave = l.productoId || l.descripcion.trim().toLowerCase();
    const p =
      porProducto.get(clave) ||
      ({ clave, descripcion: l.descripcion, cantidad: 0, total: 0, costo: 0, ganancia: 0, costoConocido: true } as ProductoVendido);
    p.cantidad = round2(p.cantidad + l.cantidad);
    p.total = round2(p.total + l.subtotal);
    p.costo = round2(p.costo + l.costoTotal);
    p.ganancia = round2(p.ganancia + l.ganancia);
    if (l.origenCosto === "sin") p.costoConocido = false;
    porProducto.set(clave, p);
  }
  const topProductos = [...porProducto.values()]
    .map((p) => ({ ...p, margen: p.costoConocido ? pct(p.ganancia, p.total) : undefined }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    ventas,
    gastos,
    operaciones,
    totalVentas,
    totalCostos,
    totalGanancia,
    totalGastos,
    resultadoNeto,
    ventasProductos,
    ventasServicios: suma(
      ventas.filter((l) => l.origenCosto === "servicio"),
      (l) => l.subtotal
    ),
    ventasSinCosto: suma(
      ventas.filter((l) => l.origenCosto === "sin"),
      (l) => l.subtotal
    ),
    costoEstimado: suma(
      ventas.filter((l) => l.origenCosto === "estimado"),
      (l) => l.costoTotal
    ),
    margenPromedio: pct(totalGanancia, totalVentas),
    margenProductos: pct(gananciaProductos, ventasProductos),
    recargoPromedio: pct(gananciaProductos, costoProductos),
    margenNeto: pct(resultadoNeto, totalVentas),
    cantidadOperaciones: operaciones.length,
    ticketPromedio: operaciones.length ? round2(totalVentas / operaciones.length) : 0,
    unidadesVendidas: suma(ventas, (l) => l.cantidad),
    lineasSinCosto: ventas.filter((l) => l.origenCosto === "sin").length,
    lineasEstimadas: ventas.filter((l) => l.origenCosto === "estimado").length,
    porTipo: agrupar(ventas, (l) => l.tipo, (k) => ETIQUETAS_TIPO[k as TipoAnotacion] || k, totalVentas).sort(
      (a, b) => b.ventas - a.ventas
    ),
    porDia: agrupar(ventas, (l) => l.fecha, (k) => k, totalVentas).sort((a, b) => a.clave.localeCompare(b.clave)),
    topProductos,
  };
}
