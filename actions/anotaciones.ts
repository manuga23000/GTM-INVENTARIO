"use server";

import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { Anotacion } from "@/types/anotaciones";

export async function crearAnotacion(data: Omit<Anotacion, "id">) {
  try {
    // Ejecutamos todo en una transacción para mantener stock consistente
    const result = await runTransaction(db, async (tx) => {
      // 1) Crear la anotación (preparamos el ref manualmente para poder usar tx.set)
      const anotacionesCol = collection(db, "anotaciones");
      const anotacionRef = doc(anotacionesCol);

      // 2) Si es venta de LUBRICENTRO, descontar stock por cada item con productoId
      if (data.tipo === "LUBRICENTRO" && Array.isArray(data.items)) {
        for (const item of data.items) {
          const cantidad = item.cantidad ?? 0;
          const productoId = (item as any).productoId as string | undefined;
          if (!productoId || !cantidad || cantidad <= 0) continue;

          const productoRef = doc(db, "lubricentro", productoId);
          const productoSnap = await tx.get(productoRef);
          if (!productoSnap.exists()) {
            throw new Error(`Producto no encontrado (id: ${productoId})`);
          }
          const producto = productoSnap.data() as any;
          const stockActual = typeof producto.stock === "number" ? producto.stock : 0;
          if (stockActual < cantidad) {
            throw new Error(
              `Stock insuficiente para "${producto.descripcion ?? producto.codigo ?? productoId}". Disponible: ${stockActual}, solicitado: ${cantidad}`
            );
          }
          // Descontar
          tx.update(productoRef, {
            stock: stockActual - cantidad,
            updatedAt: serverTimestamp(),
          });
        }
      }

      // 3) Guardar la anotación
      const payload = {
        fecha: data.fecha
          ? Timestamp.fromDate(new Date(data.fecha))
          : serverTimestamp(),
        tipo: data.tipo,
        titulo: data.titulo,
        descripcion: data.descripcion || "",
        items: data.items || [],
        total: data.total ?? 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      tx.set(anotacionRef, payload);

      return anotacionRef.id;
    });

    // Leer la anotación creada para normalizar la respuesta
    const snap = await getDoc(doc(db, "anotaciones", result));
    const d = snap.data() as any;
    const anotacionCreada: Anotacion = {
      id: snap.id,
      fecha:
        d?.fecha instanceof Timestamp
          ? d.fecha.toDate().toISOString()
          : new Date().toISOString(),
      tipo: d.tipo,
      titulo: d.titulo,
      descripcion: d.descripcion || "",
      items: Array.isArray(d.items) ? d.items : [],
      total: typeof d.total === "number" ? d.total : 0,
      createdAt: d?.createdAt instanceof Timestamp ? d.createdAt.toDate() : undefined,
      updatedAt: d?.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : undefined,
    };

    return { success: true, data: anotacionCreada };
  } catch (error) {
    console.error("Error al crear anotación:", error);
    const message =
      error instanceof Error ? error.message : "Error al crear la anotación";
    return { success: false, error: message };
  }
}

export async function obtenerAnotaciones() {
  try {
    const q = query(collection(db, "anotaciones"), orderBy("fecha", "desc"));
    const snaps = await getDocs(q);
    const anotaciones = snaps.docs.map((docSnap) => {
      const d = docSnap.data() as any;
      const fechaISO = d?.fecha instanceof Timestamp ? d.fecha.toDate().toISOString() : "";
      const createdAt = d?.createdAt instanceof Timestamp ? d.createdAt.toDate() : undefined;
      const updatedAt = d?.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : undefined;
      const anot: Anotacion = {
        id: docSnap.id,
        fecha: fechaISO,
        tipo: d?.tipo,
        titulo: d?.titulo,
        descripcion: d?.descripcion || "",
        items: Array.isArray(d?.items) ? d.items : [],
        total: typeof d?.total === "number" ? d.total : 0,
        createdAt,
        updatedAt,
      };
      return anot;
    });

    return { success: true, data: anotaciones };
  } catch (error) {
    console.error("Error al obtener anotaciones:", error);
    return { success: false, error: "Error al obtener las anotaciones" };
  }
}

export async function obtenerAnotacionPorId(id: string) {
  try {
    const ref = doc(db, "anotaciones", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { success: false, error: "Anotación no encontrada" };
    }

    const d = snap.data() as any;
    const anotacion = {
      id: snap.id,
      fecha: d?.fecha instanceof Timestamp ? d.fecha.toDate().toISOString() : "",
      tipo: d?.tipo,
      titulo: d?.titulo,
      descripcion: d?.descripcion || "",
      items: Array.isArray(d?.items) ? d.items : [],
      total: typeof d?.total === "number" ? d.total : 0,
      createdAt: d?.createdAt instanceof Timestamp ? d.createdAt.toDate() : undefined,
      updatedAt: d?.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : undefined,
    } as Anotacion;

    return { success: true, data: anotacion };
  } catch (error) {
    console.error("Error al obtener anotación:", error);
    return { success: false, error: "Error al obtener la anotación" };
  }
}

export async function actualizarAnotacion(
  id: string,
  data: Partial<Omit<Anotacion, "id">>
) {
  try {
    const updateData: any = { updatedAt: serverTimestamp() };

    if (data.fecha) updateData.fecha = Timestamp.fromDate(new Date(data.fecha));
    if (data.tipo) updateData.tipo = data.tipo;
    if (data.titulo) updateData.titulo = data.titulo;
    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion;
    if (data.items) updateData.items = data.items;
    if (data.total !== undefined) updateData.total = data.total;

    const ref = doc(db, "anotaciones", id);
    await updateDoc(ref, updateData);

    const snap = await getDoc(ref);
    const d = snap.data() as any;
    const anotacionActualizada: Anotacion = {
      id: snap.id,
      fecha: d?.fecha instanceof Timestamp ? d.fecha.toDate().toISOString() : "",
      tipo: d?.tipo,
      titulo: d?.titulo,
      descripcion: d?.descripcion || "",
      items: Array.isArray(d?.items) ? d.items : [],
      total: typeof d?.total === "number" ? d.total : 0,
      createdAt: d?.createdAt instanceof Timestamp ? d.createdAt.toDate() : undefined,
      updatedAt: d?.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : undefined,
    };

    return { success: true, data: anotacionActualizada };
  } catch (error) {
    console.error("Error al actualizar anotación:", error);
    return { success: false, error: "Error al actualizar la anotación" };
  }
}

export async function eliminarAnotacion(id: string) {
  try {
    const ref = doc(db, "anotaciones", id);
    await deleteDoc(ref);

    return { success: true };
  } catch (error) {
    console.error("Error al eliminar anotación:", error);
    return { success: false, error: "Error al eliminar la anotación" };
  }
}

// Cancelar una anotación: restablece stock (si corresponde) y elimina la anotación
export async function cancelarAnotacion(id: string) {
  try {
    await runTransaction(db, async (tx) => {
      const anotRef = doc(db, "anotaciones", id);
      const anotSnap = await tx.get(anotRef);
      if (!anotSnap.exists()) {
        throw new Error("Anotación no encontrada");
      }
      const d = anotSnap.data() as any;

      // Si fue de LUBRICENTRO, reponer stock por cada item con productoId
      if (d?.tipo === "LUBRICENTRO" && Array.isArray(d?.items)) {
        for (const item of d.items) {
          const cantidad = typeof item?.cantidad === "number" ? item.cantidad : 0;
          const productoId = item?.productoId as string | undefined;
          if (!productoId || !cantidad || cantidad <= 0) continue;

          const productoRef = doc(db, "lubricentro", productoId);
          const prodSnap = await tx.get(productoRef);
          if (!prodSnap.exists()) {
            // Si el producto no existe, seguimos (no bloqueamos toda la cancelación)
            continue;
          }
          const prod = prodSnap.data() as any;
          const stockActual = typeof prod.stock === "number" ? prod.stock : 0;
          tx.update(productoRef, {
            stock: stockActual + cantidad,
            updatedAt: serverTimestamp(),
          });
        }
      }

      // Eliminar la anotación tras reponer stock
      tx.delete(anotRef);
    });

    return { success: true };
  } catch (error) {
    console.error("Error al cancelar anotación:", error);
    const message = error instanceof Error ? error.message : "Error al cancelar la anotación";
    return { success: false, error: message };
  }
}
