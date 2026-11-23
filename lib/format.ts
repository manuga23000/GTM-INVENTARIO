// Utilidades de formato, números y fechas compartidas por toda la app.
// Las fechas de negocio se manejan como strings "YYYY-MM-DD" para evitar
// corrimientos de día por zona horaria (Argentina es UTC-3).

export const TIMEZONE = "America/Argentina/Buenos_Aires";

const currencyFmt0 = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const currencyFmt2 = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFmt = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 2,
});

/** Formatea un importe en pesos. Muestra centavos sólo si los hay. */
export function formatCurrency(value: number | null | undefined): string {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const tieneCentavos = Math.round(n * 100) % 100 !== 0;
  return (tieneCentavos ? currencyFmt2 : currencyFmt0).format(n);
}

/** Formatea un número (cantidades, stock) con coma decimal. */
export function formatNumber(value: number | null | undefined): string {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return numberFmt.format(n);
}

/** Formatea un porcentaje con 1 decimal. */
export function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${value.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`;
}

/** Redondea a 2 decimales evitando errores de coma flotante. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Interpreta lo que el usuario escribe en un campo numérico.
 * Acepta "1500", "1500,50", "1500.50", "1.500", "1.500,50", "$ 1.500".
 * Devuelve undefined si el texto está vacío o no es un número.
 */
export function parseDecimal(raw: string | number | null | undefined): number | undefined {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : undefined;
  if (raw == null) return undefined;
  let s = String(raw).replace(/[\s$]/g, "");
  if (s === "" || s === "-") return undefined;

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");

  if (lastDot !== -1 && lastComma !== -1) {
    // Ambos separadores: el último es el decimal
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma !== -1) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot !== -1 && /^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.500" o "12.000.000" => separador de miles
    s = s.replace(/\./g, "");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** Margen de ganancia sobre el precio de venta (en %). */
export function calcularMargen(costo?: number, venta?: number): number | undefined {
  if (!venta || venta <= 0 || costo == null || costo < 0) return undefined;
  return ((venta - costo) / venta) * 100;
}

/** Recargo sobre el costo (en %). */
export function calcularRecargo(costo?: number, venta?: number): number | undefined {
  if (!costo || costo <= 0 || venta == null) return undefined;
  return ((venta - costo) / costo) * 100;
}

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

/** Fecha de hoy en Argentina como "YYYY-MM-DD" (sirve en cliente y servidor). */
export function hoyISO(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isoToUTCDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function sumarDias(iso: string, dias: number): string {
  const d = isoToUTCDate(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Semana (lunes a domingo) que contiene la fecha dada. */
export function semanaDe(iso: string): { inicio: string; fin: string } {
  const dow = isoToUTCDate(iso).getUTCDay(); // 0 = domingo
  const diffLunes = dow === 0 ? -6 : 1 - dow;
  const inicio = sumarDias(iso, diffLunes);
  return { inicio, fin: sumarDias(inicio, 6) };
}

/** Mes calendario que contiene la fecha dada. */
export function mesDe(iso: string): { inicio: string; fin: string } {
  const [y, m] = iso.split("-").map(Number);
  const inicio = `${y}-${String(m).padStart(2, "0")}-01`;
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { inicio, fin: `${y}-${String(m).padStart(2, "0")}-${ultimo}` };
}

/** "2025-01-07" => "07/01/2025" (sin pasar por Date, sin corrimientos). */
export function formatFecha(iso?: string): string {
  if (!iso) return "-";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** "2025-01-07" => "mar 07 ene" */
export function formatFechaCorta(iso?: string): string {
  if (!iso) return "-";
  const d = isoToUTCDate(iso);
  return d.toLocaleDateString("es-AR", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

/** Minúsculas y sin acentos, para búsquedas tolerantes. */
export function normalizar(s?: string | null): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** true si todas las palabras de la búsqueda aparecen en alguno de los campos. */
export function coincideBusqueda(query: string, ...campos: (string | undefined | null)[]): boolean {
  const q = normalizar(query).trim();
  if (!q) return true;
  const haystack = normalizar(campos.filter(Boolean).join(" "));
  return q.split(/\s+/).every((palabra) => haystack.includes(palabra));
}
