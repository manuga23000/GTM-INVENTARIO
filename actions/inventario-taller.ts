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
import { ItemTaller } from "@/types/inventario-taller";

const COLLECTION_NAME = "inventario_taller";

// Crear nuevo item
export async function crearItemTaller(
  item: Omit<ItemTaller, "id" | "createdAt" | "updatedAt">
) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...item,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error al crear item:", error);
    return { success: false, error: "Error al crear item" };
  }
}

// Obtener todos los items
export async function obtenerItemsTaller() {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("nombre"));
    const querySnapshot = await getDocs(q);

    const items: ItemTaller[] = [];
    querySnapshot.forEach((doc) => {
      items.push({
        id: doc.id,
        ...doc.data(),
      } as ItemTaller);
    });

    return { success: true, data: items };
  } catch (error) {
    console.error("Error al obtener items:", error);
    return { success: false, error: "Error al obtener items", data: [] };
  }
}

// Obtener un item por ID
export async function obtenerItemTaller(id: string) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        success: true,
        data: { id: docSnap.id, ...docSnap.data() } as ItemTaller,
      };
    } else {
      return { success: false, error: "Item no encontrado" };
    }
  } catch (error) {
    console.error("Error al obtener item:", error);
    return { success: false, error: "Error al obtener item" };
  }
}

// Actualizar item
export async function actualizarItemTaller(
  id: string,
  item: Partial<ItemTaller>
) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...item,
      updatedAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar item:", error);
    return { success: false, error: "Error al actualizar item" };
  }
}

// Eliminar item
export async function eliminarItemTaller(id: string) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar item:", error);
    return { success: false, error: "Error al eliminar item" };
  }
}
