// types/inventario-lubricentro.ts
import { Timestamp } from "firebase/firestore";

export interface ProductoLubricentro {
  id?: string;
  codigo: string;
  descripcion: string;
  marca: string;
  categoria: string;
  stock: number;
  stockMinimo: number;
  precioCosto: number;
  precioVenta: number;
  ubicacion?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Categorías predefinidas
export const CATEGORIAS_LUBRICENTRO = [
  "Aceites",
  "Filtros",
  "Lubricantes",
  "Aditivos",
  "Otros",
] as const;
