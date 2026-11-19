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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ItemTaller } from "@/types/inventario-taller";

const COLLECTION_NAME = "inventario_taller";

type DatosItem = Omit<ItemTaller, "id" | "createdAt" | "updatedAt">;

function limpiar(item: Partial<ItemTaller>): Partial<ItemTaller> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, createdAt, updatedAt, ...resto } = item;
  const out: Partial<ItemTaller> = { ...resto };
  if ("cantidad" in out) {
    const n = Number(out.cantidad);
    out.cantidad = Number.isFinite(n) && n >= 0 ? n : 0;
  }
  for (const key of ["nombre", "tipo", "marca", "ubicacion"] as const) {
    if (typeof out[key] === "string") out[key] = (out[key] as string).trim();
  }
  return out;
}

// Crear nuevo item
export async function crearItemTaller(item: DatosItem) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...limpiar(item),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return { success: true as const, id: docRef.id };
  } catch (error) {
    console.error("Error al crear item:", error);
    return { success: false as const, error: "Error al crear item" };
  }
}

// Obtener todos los items
export async function obtenerItemsTaller() {
  try {
    const snap = await getDocs(query(collection(db, COLLECTION_NAME), orderBy("nombre")));
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ItemTaller[];
    return { success: true as const, data: items };
  } catch (error) {
    console.error("Error al obtener items:", error);
    return { success: false as const, error: "Error al obtener items", data: [] as ItemTaller[] };
  }
}

// Obtener un item por ID
export async function obtenerItemTaller(id: string) {
  try {
    const snap = await getDoc(doc(db, COLLECTION_NAME, id));
    if (!snap.exists()) return { success: false as const, error: "Item no encontrado" };
    return { success: true as const, data: { id: snap.id, ...snap.data() } as ItemTaller };
  } catch (error) {
    console.error("Error al obtener item:", error);
    return { success: false as const, error: "Error al obtener item" };
  }
}

// Actualizar item
export async function actualizarItemTaller(id: string, item: Partial<ItemTaller>) {
  try {
    await updateDoc(doc(db, COLLECTION_NAME, id), {
      ...limpiar(item),
      updatedAt: Timestamp.now(),
    });
    return { success: true as const };
  } catch (error) {
    console.error("Error al actualizar item:", error);
    return { success: false as const, error: "Error al actualizar item" };
  }
}

// Eliminar item
export async function eliminarItemTaller(id: string) {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return { success: true as const };
  } catch (error) {
    console.error("Error al eliminar item:", error);
    return { success: false as const, error: "Error al eliminar item" };
  }
}
