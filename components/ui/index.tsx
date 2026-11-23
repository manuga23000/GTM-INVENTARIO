// Componentes sin estado: se pueden usar tanto en Server como en Client Components.
import { ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EstadoStock } from "@/lib/stock";
import { formatNumber } from "@/lib/format";

// ---------------------------------------------------------------------------
// Encabezado de página
// ---------------------------------------------------------------------------
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-brand-600/15 p-2.5 ring-1 ring-brand-600/30">
          <Icon className="h-6 w-6 text-brand-500" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
          {description && <p className="text-sm text-neutral-400">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2 sm:flex-nowrap">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Buscador
// ---------------------------------------------------------------------------
export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-neutral-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pr-10 pl-10"
        enterKeyHint="search"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-neutral-500 hover:text-white"
          aria-label="Limpiar búsqueda"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chips de filtro (scroll horizontal en mobile)
// ---------------------------------------------------------------------------
export interface ChipOption {
  value: string;
  label: string;
  count?: number;
}

export function FilterChips({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: ChipOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      {label && (
        <p className="mb-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">{label}</p>
      )}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn("chip", value === o.value && "chip-active")}
            aria-pressed={value === o.value}
          >
            {o.label}
            {typeof o.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] tabular",
                  value === o.value ? "bg-white/20" : "bg-neutral-800 text-neutral-400"
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estado vacío
// ---------------------------------------------------------------------------
export function EmptyState({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center animate-fade-in">
      <Icon className="mb-4 h-14 w-14 text-neutral-700" />
      <p className="text-neutral-400">{title}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton de carga
// ---------------------------------------------------------------------------
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card divide-y divide-neutral-800 overflow-hidden" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4 px-4 py-4">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-neutral-800" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/3 rounded bg-neutral-800" />
            <div className="h-3 w-1/3 rounded bg-neutral-800" />
          </div>
          <div className="h-5 w-16 rounded bg-neutral-800" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Paginación
// ---------------------------------------------------------------------------
export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = "registros",
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  itemLabel?: string;
}) {
  if (totalItems === 0) return null;
  const desde = (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, totalItems);
  const ir = (p: number) => {
    onPageChange(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-neutral-400 tabular">
        {desde}–{hasta} de <span className="font-medium text-white">{totalItems}</span> {itemLabel}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button onClick={() => ir(1)} disabled={page === 1} className="icon-btn" aria-label="Primera página">
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button onClick={() => ir(page - 1)} disabled={page === 1} className="icon-btn" aria-label="Página anterior">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[72px] px-2 text-center text-sm text-neutral-300 tabular">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => ir(page + 1)}
            disabled={page === totalPages}
            className="icon-btn"
            aria-label="Página siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => ir(totalPages)}
            disabled={page === totalPages}
            className="icon-btn"
            aria-label="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge de stock
// ---------------------------------------------------------------------------
const STOCK_STYLE: Record<EstadoStock, string> = {
  sin: "bg-red-500/15 text-red-400 ring-red-500/30",
  bajo: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  ok: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25",
};

export function StockBadge({ stock, estado }: { stock: number; estado: EstadoStock }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[2.5rem] items-center justify-center rounded-md px-2 py-0.5 text-sm font-semibold ring-1 tabular",
        STOCK_STYLE[estado]
      )}
      title={estado === "sin" ? "Sin stock" : estado === "bajo" ? "Stock bajo" : "Stock OK"}
    >
      {formatNumber(stock)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta de estadística
// ---------------------------------------------------------------------------
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneStyle = {
    default: "bg-brand-600/15 text-brand-500",
    success: "bg-emerald-500/15 text-emerald-400",
    warning: "bg-amber-500/15 text-amber-400",
    danger: "bg-red-500/15 text-red-400",
  }[tone];
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className={cn("rounded-lg p-2", toneStyle)}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-xs font-medium text-neutral-400 sm:text-sm">{label}</p>
      </div>
      <p className="mt-3 text-xl font-bold text-white tabular sm:text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
