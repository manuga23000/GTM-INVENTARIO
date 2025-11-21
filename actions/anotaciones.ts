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
} from "firebase/firestore";
import { Anotacion } from "@/types/anotaciones";

export async function crearAnotacion(data: Omit<Anotacion, "id">) {
  try {
    const ref = await addDoc(collection(db, "anotaciones"), {
      fecha: data.fecha ? Timestamp.fromDate(new Date(data.fecha)) : serverTimestamp(),
      tipo: data.tipo,
      titulo: data.titulo,
      descripcion: data.descripcion || "",
      items: data.items || [],
      total: data.total ?? 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const snap = await getDoc(ref);
    const d = snap.data() as any;
    const anotacionCreada: Anotacion = {
      id: ref.id,
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
    return { success: false, error: "Error al crear la anotación" };
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
