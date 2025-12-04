// types/anotaciones.ts
export interface Anotacion {
  id?: string;
  fecha: string;
  tipo: "LUBRICENTRO" | "GASTOS_ALQUILER" | "TALLER" | "OTRO";
  titulo: string;
  descripcion: string;
  items: ItemAnotacion[];
  total?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ItemAnotacion {
  cantidad?: number;
  descripcion: string;
  precio?: number;
  unidad?: string; // lts, unidades, etc.
  // Para vincular con un producto existente (ej: lubricentro)
  productoId?: string;
}

export const TIPOS_ANOTACION = [
  "LUBRICENTRO",
  "GASTOS_ALQUILER",
  "TALLER",
  "OTRO",
] as const;
