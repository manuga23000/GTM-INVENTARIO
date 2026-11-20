import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  DocumentReference,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import { round2 } from "@/lib/format";

const COL = "ingresos_mercaderia";
const COL_PRODUCTOS = "lubricentro";

export interface ItemIngreso {
  productoId: string;
  descripcion: string;
  cantidad: number;
  /** Costo unitario de esta compra. */
  costoUnitario?: number;
  /** Nuevo precio de venta (si se quiere actualizar). */
  precioVenta?: number;
}

export interface DatosIngreso {
  fecha: string; // YYYY-MM-DD
  proveedor?: string;
  remito?: string;
  items: ItemIngreso[];
  /** Si es true, actualiza costo y precio de venta de los productos. */
  actualizarPrecios: boolean;
}

export interface IngresoGuardado {
  id: string;
  fecha: string;
  proveedor: string;
  remito: string;
  total: number;
  unidades: number;
  items: (ItemIngreso & { stockAnterior: number; costoAnterior: number; ventaAnterior: number })[];
}

/**
 * Registra una compra / ingreso de mercadería:
 *  - suma el stock de cada producto,
 *  - opcionalmente actualiza costo y precio de venta,
 *  - guarda el comprobante en "ingresos_mercaderia" (con los valores anteriores,
 *    para poder armar un historial de movimientos más adelante).
 * Todo en una transacción: o se aplica completo o no se aplica nada.
 */
export async function registrarIngresoMercaderia(datos: DatosIngreso) {
  try {
    const items = datos.items.filter((it) => it.productoId && it.cantidad > 0);
    if (items.length === 0) throw new Error("Agregá al menos un producto con cantidad mayor a 0");

    // Un mismo producto en varias líneas: se suman las cantidades y vale el último costo/precio
    const porProducto = new Map<string, ItemIngreso>();
    for (const it of items) {
      const prev = porProducto.get(it.productoId);
      porProducto.set(it.productoId, {
        ...prev,
        ...it,
        cantidad: round2((prev?.cantidad || 0) + it.cantidad),
        costoUnitario: it.costoUnitario ?? prev?.costoUnitario,
        precioVenta: it.precioVenta ?? prev?.precioVenta,
      });
    }

    const ingresoRef = doc(collection(db, COL));

    const resultado = await runTransaction(db, async (tx) => {
      // 1) Lecturas
      const leidos: { it: ItemIngreso; ref: DocumentReference; datos: Record<string, unknown> }[] = [];
      for (const it of porProducto.values()) {
        const ref = doc(db, COL_PRODUCTOS, it.productoId);
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error(`Producto no encontrado: ${it.descripcion}`);
        leidos.push({ it, ref, datos: snap.data() });
      }

      // 2) Escrituras
      const detalle: IngresoGuardado["items"] = [];
      for (const { it, ref, datos: p } of leidos) {
        const stockAnterior = typeof p.stock === "number" ? p.stock : 0;
        const costoAnterior = typeof p.precioCosto === "number" ? p.precioCosto : 0;
        const ventaAnterior = typeof p.precioVenta === "number" ? p.precioVenta : 0;
        const update: Record<string, unknown> = {
          stock: round2(stockAnterior + it.cantidad),
          updatedAt: Timestamp.now(),
        };
        if (datos.actualizarPrecios) {
          if (it.costoUnitario != null && it.costoUnitario > 0) update.precioCosto = round2(it.costoUnitario);
          if (it.precioVenta != null && it.precioVenta > 0) update.precioVenta = round2(it.precioVenta);
        }
        tx.update(ref, update);

        const linea: IngresoGuardado["items"][number] = {
          productoId: it.productoId,
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          stockAnterior,
          costoAnterior,
          ventaAnterior,
        };
        if (it.costoUnitario != null) linea.costoUnitario = round2(it.costoUnitario);
        if (it.precioVenta != null) linea.precioVenta = round2(it.precioVenta);
        detalle.push(linea);
      }

      const total = round2(detalle.reduce((s, l) => s + l.cantidad * (l.costoUnitario ?? l.costoAnterior), 0));
      const unidades = round2(detalle.reduce((s, l) => s + l.cantidad, 0));
      tx.set(ingresoRef, {
        fecha: Timestamp.fromDate(new Date(`${datos.fecha}T12:00:00Z`)),
        proveedor: (datos.proveedor || "").trim(),
        remito: (datos.remito || "").trim(),
        actualizarPrecios: datos.actualizarPrecios,
        items: detalle,
        total,
        unidades,
        createdAt: Timestamp.now(),
      });
      return { total, unidades, productos: detalle.length };
    });

    return { success: true as const, data: { id: ingresoRef.id, ...resultado } };
  } catch (error) {
    console.error("Error al registrar ingreso:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "No se pudo registrar el ingreso",
    };
  }
}

/** Últimos ingresos registrados (para mostrar un historial breve). */
export async function obtenerUltimosIngresos(cantidad = 10) {
  try {
    const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc"), limit(cantidad)));
    const data: IngresoGuardado[] = snap.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        fecha: x.fecha instanceof Timestamp ? x.fecha.toDate().toISOString().slice(0, 10) : "",
        proveedor: x.proveedor || "",
        remito: x.remito || "",
        total: x.total || 0,
        unidades: x.unidades || 0,
        items: Array.isArray(x.items) ? x.items : [],
      };
    });
    return { success: true as const, data };
  } catch (error) {
    console.error("Error al obtener ingresos:", error);
    return { success: false as const, error: "No se pudieron obtener los ingresos" };
  }
}
