import { db } from "@/lib/firebase";
import { collection, getCountFromServer, getDocs } from "firebase/firestore";
import { ProductoLubricentro } from "@/types/lubricentro";
import { Anotacion } from "@/types/anotaciones";
import { estadoStock } from "@/lib/stock";
import { hoyISO, mesDe, round2, semanaDe } from "@/lib/format";
import { calcularResumen } from "@/lib/resumen";
import { obtenerAnotacionesPorRango, obtenerUltimasAnotaciones } from "@/actions/anotaciones";

export interface DashboardData {
  ok: boolean;
  lubricentroProductos: number;
  tallerItems: number;
  sinStock: number;
  stockBajo: number;
  valorCosto: number;
  valorVenta: number;
  productosCriticos: ProductoLubricentro[];
  mes: { inicio: string; fin: string; ventas: number; ganancia: number; gastos: number; operaciones: number };
  semana: { ventas: number; ganancia: number };
  ultimas: Anotacion[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const hoy = hoyISO();
  const mes = mesDe(hoy);
  const semana = semanaDe(hoy);

  try {
    const [lubriSnap, tallerCount, anotMes, ultimas] = await Promise.all([
      getDocs(collection(db, "lubricentro")),
      getCountFromServer(collection(db, "inventario_taller")),
      obtenerAnotacionesPorRango(mes.inicio, mes.fin),
      obtenerUltimasAnotaciones(5),
    ]);

    const productos = lubriSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as ProductoLubricentro[];

    let valorCosto = 0;
    let valorVenta = 0;
    const criticos: ProductoLubricentro[] = [];
    for (const p of productos) {
      const stock = typeof p.stock === "number" && p.stock > 0 ? p.stock : 0;
      valorCosto += stock * (p.precioCosto || 0);
      valorVenta += stock * (p.precioVenta || 0);
      if (estadoStock(p) !== "ok") criticos.push(p);
    }
    criticos.sort((a, b) => (a.stock || 0) - (b.stock || 0));

    const anotacionesMes = anotMes.success ? anotMes.data : [];
    const resumenMes = calcularResumen(anotacionesMes);
    const resumenSemana = calcularResumen(
      anotacionesMes.filter((a) => a.fecha >= semana.inicio && a.fecha <= semana.fin)
    );

    // Serializamos a objetos planos (los Timestamp no pasan a componentes cliente)
    const productosCriticos = criticos.slice(0, 8).map((p) => ({
      id: p.id,
      codigo: p.codigo,
      descripcion: p.descripcion,
      marca: p.marca,
      categoria: p.categoria,
      stock: p.stock,
      stockMinimo: p.stockMinimo,
      precioCosto: p.precioCosto,
      precioVenta: p.precioVenta,
    }));

    return {
      ok: true,
      lubricentroProductos: productos.length,
      tallerItems: tallerCount.data().count,
      sinStock: criticos.filter((p) => estadoStock(p) === "sin").length,
      stockBajo: criticos.filter((p) => estadoStock(p) === "bajo").length,
      valorCosto: round2(valorCosto),
      valorVenta: round2(valorVenta),
      productosCriticos,
      mes: {
        ...mes,
        ventas: resumenMes.totalVentas,
        ganancia: resumenMes.totalGanancia,
        gastos: resumenMes.totalGastos,
        operaciones: resumenMes.cantidadOperaciones,
      },
      semana: { ventas: resumenSemana.totalVentas, ganancia: resumenSemana.totalGanancia },
      ultimas: ultimas.success ? ultimas.data : [],
    };
  } catch (error) {
    console.error("Error al cargar el dashboard:", error);
    return {
      ok: false,
      lubricentroProductos: 0,
      tallerItems: 0,
      sinStock: 0,
      stockBajo: 0,
      valorCosto: 0,
      valorVenta: 0,
      productosCriticos: [],
      mes: { ...mes, ventas: 0, ganancia: 0, gastos: 0, operaciones: 0 },
      semana: { ventas: 0, ganancia: 0 },
      ultimas: [],
    };
  }
}
