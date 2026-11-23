import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { ProductoLubricentro } from "@/types/lubricentro";
import { round2 } from "@/lib/format";

const COL = "lubricentro";

type DatosProducto = Omit<ProductoLubricentro, "id" | "createdAt" | "updatedAt">;

/** Normaliza los datos antes de guardarlos (números válidos, sin campos sobrantes). */
function limpiar(data: Partial<ProductoLubricentro>): Partial<ProductoLubricentro> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, createdAt, updatedAt, ...resto } = data;
  const out: Partial<ProductoLubricentro> = { ...resto };
  for (const key of ["stock", "precioCosto", "precioVenta", "stockMinimo"] as const) {
    if (key in out) {
      const v = Number(out[key]);
      if (Number.isFinite(v)) out[key] = round2(v);
      else if (key === "stockMinimo") delete out[key];
      else out[key] = 0;
    }
  }
  for (const key of ["codigo", "descripcion", "marca", "ubicacion"] as const) {
    if (typeof out[key] === "string") out[key] = (out[key] as string).trim();
  }
  if (out.categoria && out.categoria !== "Filtros") out.tipoFiltro = "";
  return out;
}

// Crear producto
export async function crearProductoLubricentro(data: DatosProducto) {
  try {
    const limpio = limpiar(data);
    const docRef = await addDoc(collection(db, COL), {
      ...limpio,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return { success: true as const, data: { id: docRef.id, ...limpio } as ProductoLubricentro };
  } catch (error) {
    console.error("Error al crear producto:", error);
    return { success: false as const, error: "No se pudo crear el producto" };
  }
}

// Actualizar producto
export async function actualizarProductoLubricentro(
  id: string,
  data: Partial<ProductoLubricentro>
) {
  try {
    const limpio = limpiar(data);
    await runTransaction(db, async (tx) => {
      const ref = doc(db, COL, id);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Producto no encontrado");
      tx.update(ref, { ...limpio, updatedAt: Timestamp.now() });
    });
    return { success: true as const, data: { id, ...limpio } as ProductoLubricentro };
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    return { success: false as const, error: "No se pudo actualizar el producto" };
  }
}

/**
 * Suma o resta stock de forma atómica (botones +/- de la lista).
 * Nunca deja el stock por debajo de 0.
 */
export async function ajustarStockLubricentro(id: string, delta: number) {
  try {
    const nuevoStock = await runTransaction(db, async (tx) => {
      const ref = doc(db, COL, id);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Producto no encontrado");
      const actual = typeof snap.data().stock === "number" ? snap.data().stock : 0;
      const nuevo = round2(actual + delta);
      if (nuevo < 0) throw new Error("El stock no puede quedar negativo");
      tx.update(ref, { stock: nuevo, updatedAt: Timestamp.now() });
      return nuevo;
    });
    return { success: true as const, data: nuevoStock };
  } catch (error) {
    console.error("Error al ajustar stock:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "No se pudo ajustar el stock",
    };
  }
}

export interface CambioPrecio {
  id: string;
  precioCosto?: number;
  precioVenta?: number;
}

/**
 * Actualiza precios de muchos productos a la vez (aumentos por inflación, listas nuevas).
 * Los nuevos valores se calculan en la pantalla, así lo que se ve en la vista previa
 * es exactamente lo que se guarda. Firestore admite hasta 500 escrituras por lote.
 */
export async function actualizarPreciosMasivo(cambios: CambioPrecio[]) {
  try {
    const validos = cambios.filter(
      (c) =>
        c.id &&
        ((c.precioCosto != null && Number.isFinite(c.precioCosto) && c.precioCosto >= 0) ||
          (c.precioVenta != null && Number.isFinite(c.precioVenta) && c.precioVenta >= 0))
    );
    for (let i = 0; i < validos.length; i += 450) {
      const batch = writeBatch(db);
      for (const c of validos.slice(i, i + 450)) {
        const update: Record<string, unknown> = { updatedAt: Timestamp.now() };
        if (c.precioCosto != null) update.precioCosto = round2(c.precioCosto);
        if (c.precioVenta != null) update.precioVenta = round2(c.precioVenta);
        batch.update(doc(db, COL, c.id), update);
      }
      await batch.commit();
    }
    return { success: true as const, data: validos.length };
  } catch (error) {
    console.error("Error en actualización masiva de precios:", error);
    return { success: false as const, error: "No se pudieron actualizar los precios" };
  }
}

// Eliminar producto
export async function eliminarProductoLubricentro(id: string) {
  try {
    await deleteDoc(doc(db, COL, id));
    return { success: true as const };
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    return { success: false as const, error: "No se pudo eliminar el producto" };
  }
}

// Obtener todos los productos
export async function obtenerProductosLubricentro() {
  try {
    // Sin orderBy en la consulta: Firestore excluiría en silencio los productos sin "createdAt"
    // (por ejemplo, cargados a mano desde la consola). Ordenamos acá: más recientes primero.
    const snap = await getDocs(collection(db, COL));
    const productos = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ProductoLubricentro[];
    productos.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
    return { success: true as const, data: productos };
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return { success: false as const, error: "No se pudieron obtener los productos" };
  }
}

// Obtener un producto por ID
export async function obtenerProductoLubricentroPorId(id: string) {
  try {
    const snap = await getDoc(doc(db, COL, id));
    if (!snap.exists()) return { success: false as const, error: "Producto no encontrado" };
    return {
      success: true as const,
      data: { id: snap.id, ...snap.data() } as ProductoLubricentro,
    };
  } catch (error) {
    console.error("Error al obtener producto:", error);
    return { success: false as const, error: "No se pudo obtener el producto" };
  }
}
