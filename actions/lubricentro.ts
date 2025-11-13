import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  Timestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { ProductoLubricentro } from "@/types/lubricentro";

// Crear producto
export async function crearProductoLubricentro(
  data: Omit<ProductoLubricentro, "id" | "createdAt" | "updatedAt">
) {
  try {
    const docRef = await addDoc(collection(db, "lubricentro"), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return {
      success: true,
      data: { id: docRef.id, ...data },
    };
  } catch (error) {
    console.error("Error al crear producto:", error);
    return {
      success: false,
      error: "No se pudo crear el producto",
    };
  }
}

// Actualizar producto
export async function actualizarProductoLubricentro(
  id: string,
  data: Partial<ProductoLubricentro>
) {
  try {
    const docRef = doc(db, "lubricentro", id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
    return {
      success: true,
      data: { id, ...data },
    };
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    return {
      success: false,
      error: "No se pudo actualizar el producto",
    };
  }
}

// Eliminar producto
export async function eliminarProductoLubricentro(id: string) {
  try {
    const docRef = doc(db, "lubricentro", id);
    await deleteDoc(docRef);
    return {
      success: true,
    };
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    return {
      success: false,
      error: "No se pudo eliminar el producto",
    };
  }
}

// Obtener todos los productos
export async function obtenerProductosLubricentro() {
  try {
    const q = query(
      collection(db, "lubricentro"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const productos = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ProductoLubricentro[];

    return {
      success: true,
      data: productos,
    };
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return {
      success: false,
      error: "No se pudieron obtener los productos",
    };
  }
}

// Obtener un producto por ID
export async function obtenerProductoLubricentroPorId(id: string) {
  try {
    const docRef = doc(db, "lubricentro", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        success: true,
        data: {
          id: docSnap.id,
          ...docSnap.data(),
        } as ProductoLubricentro,
      };
    } else {
      return {
        success: false,
        error: "Producto no encontrado",
      };
    }
  } catch (error) {
    console.error("Error al obtener producto:", error);
    return {
      success: false,
      error: "No se pudo obtener el producto",
    };
  }
}
