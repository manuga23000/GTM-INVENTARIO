// types/inventario-lubricentro.ts
import { Timestamp } from "firebase/firestore";

export interface ProductoLubricentro {
  id?: string;
  codigo: string;
  descripcion: string;
  marca: string;
  categoria: string;
  stock: number;
  precioCosto: number;
  precioVenta: number;
  ubicacion?: string;
  // Modelos/vehículos para los que aplica (solo relevante para Filtros)
  aplicaciones?: string[];
  // Tipo de filtro (solo si categoria === "Filtros")
  tipoFiltro?: "Aire" | "Aceite" | "Combustible" | "Habitáculo";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Categorías predefinidas
export const CATEGORIAS_LUBRICENTRO = [
  "Aceites",
  "Filtros",
  "Lubricantes",
  "Aditivos",
  "Líquido de freno",
  "Refrigerantes",
  "Otros",
] as const;
