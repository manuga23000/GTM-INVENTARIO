"use server";

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Herramienta } from "@/types/herramienta";

const COLLECTION_NAME = "herramientas";

// Crear nueva herramienta
export async function crearHerramienta(
  herramienta: Omit<Herramienta, "id" | "createdAt" | "updatedAt">
) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...herramienta,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error al crear herramienta:", error);
    return { success: false, error: "Error al crear herramienta" };
  }
}

// Obtener todas las herramientas
export async function obtenerHerramientas() {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("nombre"));
    const querySnapshot = await getDocs(q);

    const herramientas: Herramienta[] = [];
    querySnapshot.forEach((doc) => {
      herramientas.push({
        id: doc.id,
        ...doc.data(),
      } as Herramienta);
    });

    return { success: true, data: herramientas };
  } catch (error) {
    console.error("Error al obtener herramientas:", error);
    return { success: false, error: "Error al obtener herramientas", data: [] };
  }
}

// Obtener una herramienta por ID
export async function obtenerHerramienta(id: string) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        success: true,
        data: { id: docSnap.id, ...docSnap.data() } as Herramienta,
      };
    } else {
      return { success: false, error: "Herramienta no encontrada" };
    }
  } catch (error) {
    console.error("Error al obtener herramienta:", error);
    return { success: false, error: "Error al obtener herramienta" };
  }
}

// Actualizar herramienta
export async function actualizarHerramienta(
  id: string,
  herramienta: Partial<Herramienta>
) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...herramienta,
      updatedAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar herramienta:", error);
    return { success: false, error: "Error al actualizar herramienta" };
  }
}

// Eliminar herramienta
export async function eliminarHerramienta(id: string) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar herramienta:", error);
    return { success: false, error: "Error al eliminar herramienta" };
  }
}
