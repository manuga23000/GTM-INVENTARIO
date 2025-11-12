export interface Herramienta {
  id?: string;
  nombre: string;
  marca: string;
  modelo: string;
  categoria: string;
  cantidad: number;
  ubicacion: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const CATEGORIAS_HERRAMIENTAS = [
  "Llaves y Dados",
  "Herramientas Eléctricas",
  "Herramientas Neumáticas",
  "Instrumentos de Medición",
  "Herramientas Manuales",
  "Equipamiento Específico",
  "Otras",
] as const;
