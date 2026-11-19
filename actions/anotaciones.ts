"use server";

import { db } from "@/lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  DocumentData,
  DocumentSnapshot,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  QueryDocumentSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { Anotacion, ItemAnotacion, TipoAnotacion } from "@/types/anotaciones";
import { parseDecimal, round2 } from "@/lib/format";
import { totalAnotacion } from "@/lib/resumen";

const COL = "anotaciones";
const COL_PRODUCTOS = "lubricentro";

type Resultado<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** "YYYY-MM-DD" => Timestamp al mediodía UTC (mismo día en cualquier zona de AR). */
function fechaATimestamp(fecha: string): Timestamp {
  return Timestamp.fromDate(new Date(`${fecha}T12:00:00Z`));
}

function timestampAFecha(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString().slice(0, 10);
  return "";
}

function docAAnotacion(
  snap: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>
): Anotacion {
  const d = snap.data() || {};
  return {
    id: snap.id,
    fecha: timestampAFecha(d.fecha),
    tipo: d.tipo,
    titulo: d.titulo || "",
    descripcion: d.descripcion || "",
    items: Array.isArray(d.items) ? d.items : [],
    total: typeof d.total === "number" ? d.total : 0,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : undefined,
    updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : undefined,
  };
}

/** Limpia y normaliza los items antes de guardarlos (sin undefined, números válidos). */
function limpiarItems(items: ItemAnotacion[] | undefined): ItemAnotacion[] {
  return (items || [])
    .filter((it) => (it.descripcion || "").trim() !== "" || it.productoId)
    .map((it) => {
      const limpio: ItemAnotacion = { descripcion: (it.descripcion || "").trim() };
      const cantidad = parseDecimal(it.cantidad);
      const precio = parseDecimal(it.precio);
      const precioCosto = parseDecimal(it.precioCosto);
      limpio.cantidad = cantidad && cantidad > 0 ? round2(cantidad) : 1;
      if (precio !== undefined) limpio.precio = round2(precio);
      if (precioCosto !== undefined) limpio.precioCosto = round2(precioCosto);
      if (it.unidad) limpio.unidad = it.unidad;
      if (it.productoId) limpio.productoId = it.productoId;
      return limpio;
    });
}

/** Suma las cantidades por producto (un mismo producto puede estar en varias líneas). */
function cantidadesPorProducto(
  tipo: TipoAnotacion | undefined,
  items: ItemAnotacion[] | undefined
): Map<string, number> {
  const map = new Map<string, number>();
  if (tipo !== "LUBRICENTRO" || !Array.isArray(items)) return map;
  for (const it of items) {
    const cantidad = typeof it?.cantidad === "number" ? it.cantidad : 0;
    if (!it?.productoId || cantidad <= 0) continue;
    map.set(it.productoId, round2((map.get(it.productoId) || 0) + cantidad));
  }
  return map;
}

function mensajeError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------

export async function crearAnotacion(
  data: Omit<Anotacion, "id">
): Promise<Resultado<Anotacion>> {
  try {
    const items = limpiarItems(data.items);
    if (items.length === 0) throw new Error("La anotación debe tener al menos un item");

    const anotacionRef = doc(collection(db, COL));

    await runTransaction(db, async (tx) => {
      // 1) Lecturas
      const cantidades = cantidadesPorProducto(data.tipo, items);
      const productos = await Promise.all(
        [...cantidades.keys()].map(async (id) => {
          const ref = doc(db, COL_PRODUCTOS, id);
          return { id, ref, snap: await tx.get(ref) };
        })
      );

      // 2) Validaciones
      for (const { id, snap } of productos) {
        if (!snap.exists()) throw new Error(`Producto no encontrado (id: ${id})`);
        const p = snap.data();
        const stock = typeof p.stock === "number" ? p.stock : 0;
        const pedido = cantidades.get(id)!;
        if (stock < pedido) {
          throw new Error(
            `Stock insuficiente para "${p.descripcion || p.codigo || id}". Disponible: ${stock}, solicitado: ${pedido}`
          );
        }
      }

      // 3) Escrituras
      for (const { id, ref, snap } of productos) {
        const stock = typeof snap.data()?.stock === "number" ? snap.data()!.stock : 0;
        tx.update(ref, {
          stock: round2(stock - cantidades.get(id)!),
          updatedAt: serverTimestamp(),
        });
      }

      tx.set(anotacionRef, {
        fecha: data.fecha ? fechaATimestamp(data.fecha) : serverTimestamp(),
        tipo: data.tipo,
        titulo: (data.titulo || "").trim(),
        descripcion: (data.descripcion || "").trim(),
        items,
        total: totalAnotacion(items),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    const snap = await getDoc(anotacionRef);
    return { success: true, data: docAAnotacion(snap) };
  } catch (error) {
    console.error("Error al crear anotación:", error);
    return { success: false, error: mensajeError(error, "Error al crear la anotación") };
  }
}

export async function obtenerAnotaciones(): Promise<Resultado<Anotacion[]>> {
  try {
    const snaps = await getDocs(query(collection(db, COL), orderBy("fecha", "desc")));
    return { success: true, data: snaps.docs.map(docAAnotacion) };
  } catch (error) {
    console.error("Error al obtener anotaciones:", error);
    return { success: false, error: "Error al obtener las anotaciones" };
  }
}

export async function obtenerUltimasAnotaciones(cantidad = 5): Promise<Resultado<Anotacion[]>> {
  try {
    const snaps = await getDocs(
      query(collection(db, COL), orderBy("fecha", "desc"), limit(cantidad))
    );
    return { success: true, data: snaps.docs.map(docAAnotacion) };
  } catch (error) {
    console.error("Error al obtener últimas anotaciones:", error);
    return { success: false, error: "Error al obtener las anotaciones" };
  }
}

export async function obtenerAnotacionPorId(id: string): Promise<Resultado<Anotacion>> {
  try {
    const snap = await getDoc(doc(db, COL, id));
    if (!snap.exists()) return { success: false, error: "Anotación no encontrada" };
    return { success: true, data: docAAnotacion(snap) };
  } catch (error) {
    console.error("Error al obtener anotación:", error);
    return { success: false, error: "Error al obtener la anotación" };
  }
}

/**
 * Actualiza una anotación y ajusta el stock según la diferencia entre
 * lo que tenía antes y lo que tiene ahora (cantidades, productos o tipo).
 */
export async function actualizarAnotacion(
  id: string,
  data: Partial<Omit<Anotacion, "id">>
): Promise<Resultado<Anotacion>> {
  try {
    const ref = doc(db, COL, id);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Anotación no encontrada");
      const anterior = snap.data();

      const items = data.items ? limpiarItems(data.items) : (anterior.items as ItemAnotacion[]);
      if (!items || items.length === 0) {
        throw new Error("La anotación debe tener al menos un item");
      }
      const tipoNuevo = (data.tipo || anterior.tipo) as TipoAnotacion;

      const antes = cantidadesPorProducto(anterior.tipo, anterior.items);
      const despues = cantidadesPorProducto(tipoNuevo, items);
      const ids = new Set([...antes.keys(), ...despues.keys()]);

      // Lecturas
      const productos = await Promise.all(
        [...ids].map(async (pid) => {
          const pref = doc(db, COL_PRODUCTOS, pid);
          return { pid, ref: pref, snap: await tx.get(pref) };
        })
      );

      // Validaciones y cálculo del nuevo stock
      const escrituras: { ref: typeof productos[number]["ref"]; stock: number }[] = [];
      for (const { pid, ref: pref, snap: psnap } of productos) {
        // delta > 0: se devuelve stock; delta < 0: se descuenta más
        const delta = round2((antes.get(pid) || 0) - (despues.get(pid) || 0));
        if (delta === 0) continue;
        if (!psnap.exists()) {
          if (delta < 0) throw new Error(`Producto no encontrado (id: ${pid})`);
          continue; // producto borrado: no hay a dónde devolver stock
        }
        const p = psnap.data();
        const stock = typeof p.stock === "number" ? p.stock : 0;
        const nuevo = round2(stock + delta);
        if (nuevo < 0) {
          throw new Error(
            `Stock insuficiente para "${p.descripcion || p.codigo || pid}". Disponible: ${round2(
              stock + (antes.get(pid) || 0)
            )}, solicitado: ${despues.get(pid)}`
          );
        }
        escrituras.push({ ref: pref, stock: nuevo });
      }

      // Escrituras
      for (const w of escrituras) {
        tx.update(w.ref, { stock: w.stock, updatedAt: serverTimestamp() });
      }

      const update: Record<string, unknown> = {
        items,
        tipo: tipoNuevo,
        total: totalAnotacion(items),
        updatedAt: serverTimestamp(),
      };
      if (data.fecha) update.fecha = fechaATimestamp(data.fecha);
      if (data.titulo !== undefined) update.titulo = data.titulo.trim();
      if (data.descripcion !== undefined) update.descripcion = data.descripcion.trim();
      tx.update(ref, update);
    });

    const snap = await getDoc(ref);
    return { success: true, data: docAAnotacion(snap) };
  } catch (error) {
    console.error("Error al actualizar anotación:", error);
    return { success: false, error: mensajeError(error, "Error al actualizar la anotación") };
  }
}

/** Elimina la anotación SIN tocar el stock. */
export async function eliminarAnotacion(id: string): Promise<Resultado> {
  try {
    await deleteDoc(doc(db, COL, id));
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error al eliminar anotación:", error);
    return { success: false, error: "Error al eliminar la anotación" };
  }
}

/** Cancela una anotación: repone el stock (si corresponde) y la elimina. */
export async function cancelarAnotacion(id: string): Promise<Resultado> {
  try {
    await runTransaction(db, async (tx) => {
      const ref = doc(db, COL, id);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Anotación no encontrada");
      const d = snap.data();

      const cantidades = cantidadesPorProducto(d.tipo, d.items);
      const productos = await Promise.all(
        [...cantidades.keys()].map(async (pid) => {
          const pref = doc(db, COL_PRODUCTOS, pid);
          return { pid, ref: pref, snap: await tx.get(pref) };
        })
      );

      for (const { pid, ref: pref, snap: psnap } of productos) {
        if (!psnap.exists()) continue; // si el producto ya no existe, seguimos
        const stock = typeof psnap.data().stock === "number" ? psnap.data().stock : 0;
        tx.update(pref, {
          stock: round2(stock + cantidades.get(pid)!),
          updatedAt: serverTimestamp(),
        });
      }

      tx.delete(ref);
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error al cancelar anotación:", error);
    return { success: false, error: mensajeError(error, "Error al cancelar la anotación") };
  }
}

/** Anotaciones entre dos fechas "YYYY-MM-DD" (inclusive), filtradas en Firestore. */
export async function obtenerAnotacionesPorRango(
  fechaInicio: string,
  fechaFin: string
): Promise<Resultado<Anotacion[]>> {
  try {
    const q = query(
      collection(db, COL),
      where("fecha", ">=", Timestamp.fromDate(new Date(`${fechaInicio}T00:00:00Z`))),
      where("fecha", "<=", Timestamp.fromDate(new Date(`${fechaFin}T23:59:59Z`))),
      orderBy("fecha", "asc")
    );
    const snapshot = await getDocs(q);
    return { success: true, data: snapshot.docs.map(docAAnotacion) };
  } catch (error) {
    console.error("Error al obtener anotaciones por rango:", error);
    return { success: false, error: "Error al obtener anotaciones" };
  }
}
