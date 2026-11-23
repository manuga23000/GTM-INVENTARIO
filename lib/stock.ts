import { normalizar } from "@/lib/format";
import { ProductoLubricentro, TipoFiltro } from "@/types/lubricentro";

/** Stock mínimo por defecto cuando el producto no tiene uno propio. */
export const STOCK_MINIMO_DEFAULT = 2;

export type EstadoStock = "sin" | "bajo" | "ok";

export function stockMinimoDe(p: Pick<ProductoLubricentro, "stockMinimo">): number {
  return typeof p.stockMinimo === "number" && p.stockMinimo >= 0
    ? p.stockMinimo
    : STOCK_MINIMO_DEFAULT;
}

export function estadoStock(p: Pick<ProductoLubricentro, "stock" | "stockMinimo">): EstadoStock {
  const stock = typeof p.stock === "number" ? p.stock : 0;
  if (stock <= 0) return "sin";
  if (stock <= stockMinimoDe(p)) return "bajo";
  return "ok";
}

const KEYWORDS_FILTRO: Record<TipoFiltro, string[]> = {
  Aceite: ["aceite", "aeite", "oil"],
  Combustible: ["combustible", "nafta", "diesel", "gasoil", "fuel"],
  Aire: ["aire", "air"],
  Habitáculo: ["habitaculo", "cabina", "polen"],
};

/**
 * Tipo de filtro del producto. Usa el campo tipoFiltro si existe y, si no,
 * intenta deducirlo por palabras clave. Devuelve undefined si no se puede.
 */
export function tipoFiltroDe(p: ProductoLubricentro): TipoFiltro | undefined {
  if (p.tipoFiltro) {
    const t = normalizar(p.tipoFiltro);
    const match = (Object.keys(KEYWORDS_FILTRO) as TipoFiltro[]).find(
      (k) => normalizar(k) === t
    );
    if (match) return match;
  }
  const haystack = normalizar(`${p.descripcion || ""} ${p.codigo || ""}`);
  // El orden importa: habitáculo antes que aire ("filtro de aire de habitáculo")
  const orden: TipoFiltro[] = ["Habitáculo", "Aceite", "Combustible", "Aire"];
  return orden.find((tipo) => KEYWORDS_FILTRO[tipo].some((kw) => haystack.includes(kw)));
}
