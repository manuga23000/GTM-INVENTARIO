import { round2 } from "@/lib/format";
import { Anotacion, esGasto, ItemAnotacion, TipoAnotacion } from "@/types/anotaciones";

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
  /** true si la línea no tiene precio de costo cargado (la ganancia no es real). */
  sinCosto: boolean;
}

export interface ProductoVendido {
  clave: string;
  descripcion: string;
  cantidad: number;
  total: number;
  ganancia: number;
}

export interface Resumen {
  ventas: LineaReporte[];
  gastos: LineaReporte[];
  totalVentas: number;
  totalCostos: number;
  totalGanancia: number;
  totalGastos: number;
  /** Ganancia de ventas menos gastos. */
  resultadoNeto: number;
  margenPromedio: number;
  cantidadOperaciones: number;
  lineasSinCosto: number;
  topProductos: ProductoVendido[];
}

export function cantidadDe(item: ItemAnotacion): number {
  return typeof item.cantidad === "number" && item.cantidad > 0 ? item.cantidad : 1;
}

export function subtotalItem(item: ItemAnotacion): number {
  return round2(cantidadDe(item) * (item.precio || 0));
}

export function totalAnotacion(items: ItemAnotacion[]): number {
  return round2(items.reduce((sum, it) => sum + subtotalItem(it), 0));
}

export function gananciaAnotacion(items: ItemAnotacion[]): number {
  return round2(
    items.reduce(
      (sum, it) => sum + cantidadDe(it) * ((it.precio || 0) - (it.precioCosto || 0)),
      0
    )
  );
}

export function calcularResumen(anotaciones: Anotacion[]): Resumen {
  const ventas: LineaReporte[] = [];
  const gastos: LineaReporte[] = [];
  const operaciones = new Set<string>();

  const ordenadas = [...anotaciones].sort((a, b) => a.fecha.localeCompare(b.fecha));

  for (const anot of ordenadas) {
    const gasto = esGasto(anot.tipo);
    if (!gasto && anot.id) operaciones.add(anot.id);

    for (const item of anot.items || []) {
      const cantidad = cantidadDe(item);
      const precioVenta = item.precio || 0;
      const precioCosto = gasto ? 0 : item.precioCosto || 0;
      const subtotal = round2(precioVenta * cantidad);
      const costoTotal = round2(precioCosto * cantidad);
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
        ganancia: gasto ? 0 : round2(subtotal - costoTotal),
        sinCosto: !gasto && !item.precioCosto,
      };
      (gasto ? gastos : ventas).push(linea);
    }
  }

  const totalVentas = round2(ventas.reduce((s, l) => s + l.subtotal, 0));
  const totalCostos = round2(ventas.reduce((s, l) => s + l.costoTotal, 0));
  const totalGanancia = round2(totalVentas - totalCostos);
  const totalGastos = round2(gastos.reduce((s, l) => s + l.subtotal, 0));

  const porProducto = new Map<string, ProductoVendido>();
  for (const l of ventas) {
    const clave = l.productoId || l.descripcion.trim().toLowerCase();
    const prev = porProducto.get(clave) || {
      clave,
      descripcion: l.descripcion,
      cantidad: 0,
      total: 0,
      ganancia: 0,
    };
    prev.cantidad = round2(prev.cantidad + l.cantidad);
    prev.total = round2(prev.total + l.subtotal);
    prev.ganancia = round2(prev.ganancia + l.ganancia);
    porProducto.set(clave, prev);
  }

  return {
    ventas,
    gastos,
    totalVentas,
    totalCostos,
    totalGanancia,
    totalGastos,
    resultadoNeto: round2(totalGanancia - totalGastos),
    margenPromedio: totalVentas > 0 ? (totalGanancia / totalVentas) * 100 : 0,
    cantidadOperaciones: operaciones.size,
    lineasSinCosto: ventas.filter((l) => l.sinCosto).length,
    topProductos: [...porProducto.values()].sort((a, b) => b.total - a.total).slice(0, 10),
  };
}
