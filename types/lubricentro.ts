// types/lubricentro.ts
import { Timestamp } from "firebase/firestore";

export const TIPOS_FILTRO = ["Aire", "Aceite", "Combustible", "Habitáculo"] as const;
export type TipoFiltro = (typeof TIPOS_FILTRO)[number];

export interface ProductoLubricentro {
  id?: string;
  codigo: string;
  descripcion: string;
  marca: string;
  categoria: string;
  stock: number;
  /** Por debajo (o igual) de este valor el producto se marca como "stock bajo". */
  stockMinimo?: number;
  precioCosto: number;
  precioVenta: number;
  ubicacion?: string;
  // Modelos/vehículos para los que aplica (solo relevante para Filtros)
  aplicaciones?: string[];
  // Tipo de filtro (solo si categoria === "Filtros")
  tipoFiltro?: TipoFiltro | "";
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
