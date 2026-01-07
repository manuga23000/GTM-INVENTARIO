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
    const result = await runTransaction(db, async (tx) => {
      const anotacionesCol = collection(db, "anotaciones");
      const anotacionRef = doc(anotacionesCol);

      // ✅ PASO 1: PRIMERO TODAS LAS LECTURAS
      const productosAActualizar: Array<{
        ref: any;
        stockActual: number;
        cantidad: number;
        producto: any;
      }> = [];

      if (data.tipo === "LUBRICENTRO" && Array.isArray(data.items)) {
        for (const item of data.items) {
          const cantidad = item.cantidad ?? 0;
          const productoId = (item as any).productoId as string | undefined;
          if (!productoId || !cantidad || cantidad <= 0) continue;

          const productoRef = doc(db, "lubricentro", productoId);
          const productoSnap = await tx.get(productoRef); // LECTURA

          if (!productoSnap.exists()) {
            throw new Error(`Producto no encontrado (id: ${productoId})`);
          }

          const producto = productoSnap.data() as any;
          const stockActual =
            typeof producto.stock === "number" ? producto.stock : 0;

          if (stockActual < cantidad) {
            throw new Error(
              `Stock insuficiente para "${
                producto.descripcion ?? producto.codigo ?? productoId
              }". Disponible: ${stockActual}, solicitado: ${cantidad}`
            );
          }

          // Guardamos la info para escribir después
          productosAActualizar.push({
            ref: productoRef,
            stockActual,
            cantidad,
            producto,
          });
        }
      }

      // ✅ PASO 2: AHORA TODAS LAS ESCRITURAS
      // Actualizar stocks
      for (const { ref, stockActual, cantidad } of productosAActualizar) {
        tx.update(ref, {
          stock: stockActual - cantidad,
          updatedAt: serverTimestamp(),
        });
      }

      // Guardar la anotación
      const payload = {
        fecha: data.fecha
          ? Timestamp.fromDate(new Date(data.fecha + "T12:00:00"))
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

    // El resto del código sigue igual...
    const snap = await getDoc(doc(db, "anotaciones", result));
    const d = snap.data() as any;
    const anotacionCreada: Anotacion = {
      id: snap.id,
      fecha:
        d?.fecha instanceof Timestamp
          ? d.fecha.toDate().toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      tipo: d.tipo,
      titulo: d.titulo,
      descripcion: d.descripcion || "",
      items: Array.isArray(d.items) ? d.items : [],
      total: typeof d.total === "number" ? d.total : 0,
      createdAt:
        d?.createdAt instanceof Timestamp ? d.createdAt.toDate() : undefined,
      updatedAt:
        d?.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : undefined,
    };

    return { success: true, data: anotacionCreada };
  } catch (error) {
    console.error("Error al crear anotación:", error);
    return { success: false, error: String(error) };
  }
}

export async function obtenerAnotaciones() {
  try {
    const q = query(collection(db, "anotaciones"), orderBy("fecha", "desc"));
    const snaps = await getDocs(q);
    const anotaciones = snaps.docs.map((docSnap) => {
      const d = docSnap.data() as any;
      // Convertir Timestamp a fecha en formato YYYY-MM-DD (sin zona horaria)
      const fechaStr =
        d?.fecha instanceof Timestamp
          ? d.fecha.toDate().toISOString().split("T")[0]
          : "";
      const createdAt =
        d?.createdAt instanceof Timestamp ? d.createdAt.toDate() : undefined;
      const updatedAt =
        d?.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : undefined;
      const anot: Anotacion = {
        id: docSnap.id,
        fecha: fechaStr,
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
      fecha:
        d?.fecha instanceof Timestamp
          ? d.fecha.toDate().toISOString().split("T")[0]
          : "",
      tipo: d?.tipo,
      titulo: d?.titulo,
      descripcion: d?.descripcion || "",
      items: Array.isArray(d?.items) ? d.items : [],
      total: typeof d?.total === "number" ? d.total : 0,
      createdAt:
        d?.createdAt instanceof Timestamp ? d.createdAt.toDate() : undefined,
      updatedAt:
        d?.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : undefined,
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

    if (data.fecha) updateData.fecha = Timestamp.fromDate(new Date(data.fecha + "T12:00:00"));
    if (data.tipo) updateData.tipo = data.tipo;
    if (data.titulo) updateData.titulo = data.titulo;
    if (data.descripcion !== undefined)
      updateData.descripcion = data.descripcion;
    if (data.items) updateData.items = data.items;
    if (data.total !== undefined) updateData.total = data.total;

    const ref = doc(db, "anotaciones", id);
    await updateDoc(ref, updateData);

    const snap = await getDoc(ref);
    const d = snap.data() as any;
    const anotacionActualizada: Anotacion = {
      id: snap.id,
      fecha:
        d?.fecha instanceof Timestamp
          ? d.fecha.toDate().toISOString().split("T")[0]
          : "",
      tipo: d?.tipo,
      titulo: d?.titulo,
      descripcion: d?.descripcion || "",
      items: Array.isArray(d?.items) ? d.items : [],
      total: typeof d?.total === "number" ? d.total : 0,
      createdAt:
        d?.createdAt instanceof Timestamp ? d.createdAt.toDate() : undefined,
      updatedAt:
        d?.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : undefined,
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
          const cantidad =
            typeof item?.cantidad === "number" ? item.cantidad : 0;
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
    const message =
      error instanceof Error ? error.message : "Error al cancelar la anotación";
    return { success: false, error: message };
  }
}

export async function obtenerAnotacionesPorRango(
  fechaInicio: string,
  fechaFin: string
) {
  try {
    const col = collection(db, "anotaciones");
    const q = query(col, orderBy("fecha", "asc"));

    const snapshot = await getDocs(q);

    const anotaciones: Anotacion[] = snapshot.docs
      .map((docSnap) => {
        const d = docSnap.data() as any;
        return {
          id: docSnap.id,
          fecha:
            d?.fecha instanceof Timestamp
              ? d.fecha.toDate().toISOString().split("T")[0]
              : "",
          tipo: d?.tipo,
          titulo: d?.titulo,
          descripcion: d?.descripcion || "",
          items: Array.isArray(d?.items) ? d.items : [],
          total: typeof d?.total === "number" ? d.total : 0,
          createdAt:
            d?.createdAt instanceof Timestamp
              ? d.createdAt.toDate()
              : undefined,
          updatedAt:
            d?.updatedAt instanceof Timestamp
              ? d.updatedAt.toDate()
              : undefined,
        };
      })
      .filter((a) => {
        const fechaAnot = new Date(a.fecha);
        const fechaInicioDate = new Date(fechaInicio);
        const fechaFinDate = new Date(fechaFin + "T23:59:59");
        return fechaAnot >= fechaInicioDate && fechaAnot <= fechaFinDate;
      });

    return { success: true, data: anotaciones };
  } catch (error) {
    console.error("Error al obtener anotaciones por rango:", error);
    return { success: false, error: "Error al obtener anotaciones" };
  }
}
