// types/anotaciones.ts
export const TIPOS_ANOTACION = [
  "LUBRICENTRO",
  "TALLER",
  "GASTOS_ALQUILER",
  "OTRO",
] as const;

export type TipoAnotacion = (typeof TIPOS_ANOTACION)[number];

export const ETIQUETAS_TIPO: Record<TipoAnotacion, string> = {
  LUBRICENTRO: "Lubricentro",
  TALLER: "Taller",
  GASTOS_ALQUILER: "Gastos / Alquiler",
  OTRO: "Otro",
};

/** Los gastos no son ventas: no suman ganancia en reportes. */
export function esGasto(tipo: TipoAnotacion | string | undefined): boolean {
  return tipo === "GASTOS_ALQUILER";
}

export interface Anotacion {
  id?: string;
  fecha: string; // YYYY-MM-DD
  tipo: TipoAnotacion;
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
  precio?: number; // Precio de venta unitario (o importe, si es gasto)
  precioCosto?: number; // Precio de costo unitario
  unidad?: string; // lts, unidades, etc.
  // Para vincular con un producto existente (ej: lubricentro)
  productoId?: string;
}
