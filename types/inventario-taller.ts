import { Timestamp } from "firebase/firestore";

export interface ItemTaller {
  id?: string;
  nombre: string; // Solo este es obligatorio
  tipo?: string;
  marca?: string;
  cantidad?: number;
  ubicacion?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Tipos de items - SIMPLIFICADO
export const TIPOS_ITEMS_TALLER = [
  // Herramientas
  "Herramienta Manual",
  "Herramienta Eléctrica",
  "Herramienta de Medición",

  // Equipos
  "Equipos de Taller", // Soldadoras, compresores, elevadores, etc.
  "Equipos Tecnológicos", // PC, impresoras, teléfonos, equipos de música

  // Mobiliario
  "Muebles", // Escritorios, sillas, mesas

  // Repuestos
  "Repuestos",

  // Otros
  "Otros",
] as const;
