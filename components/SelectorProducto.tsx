"use client";

import { useMemo, useState } from "react";
import { Link2, Search, X } from "lucide-react";
import { ProductoLubricentro } from "@/types/lubricentro";
import { coincideBusqueda, formatCurrency, formatNumber } from "@/lib/format";
import { estadoStock } from "@/lib/stock";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Buscador de productos del inventario (anotaciones, ingreso de mercadería)
// ---------------------------------------------------------------------------
export default function SelectorProducto({
  productos,
  seleccionado,
  onSelect,
  onClear,
  placeholder = "Buscar en inventario (opcional)",
}: {
  productos: ProductoLubricentro[];
  seleccionado?: ProductoLubricentro;
  onSelect: (p: ProductoLubricentro) => void;
  onClear: () => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [abierto, setAbierto] = useState(false);

  const resultados = useMemo(
    () =>
      productos
        .filter((p) => coincideBusqueda(query, p.codigo, p.descripcion, p.marca, p.categoria))
        .slice(0, 50),
    [productos, query]
  );

  if (seleccionado) {
    const estado = estadoStock(seleccionado);
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
        <Link2 className="h-4 w-4 shrink-0 text-emerald-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-white">
            {seleccionado.codigo && <span className="font-mono text-neutral-400">{seleccionado.codigo} · </span>}
            {seleccionado.descripcion}
          </p>
          <p className="text-xs text-neutral-400">
            {seleccionado.marca && `${seleccionado.marca} · `}
            Stock:{" "}
            <span
              className={cn(
                "font-semibold",
                estado === "sin" ? "text-red-400" : estado === "bajo" ? "text-amber-300" : "text-emerald-300"
              )}
            >
              {formatNumber(seleccionado.stock)}
            </span>
          </p>
        </div>
        <button type="button" onClick={onClear} className="icon-btn h-8 w-8" aria-label="Desvincular producto">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        placeholder={placeholder}
        className="input pl-9"
      />
      {abierto && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-neutral-700 bg-neutral-900 shadow-2xl">
          {resultados.length === 0 ? (
            <p className="px-3 py-3 text-sm text-neutral-400">No hay resultados</p>
          ) : (
            resultados.map((p) => {
              const estado = estadoStock(p);
              return (
                <button
                  type="button"
                  key={p.id}
                  // onMouseDown para elegir antes de que el blur cierre la lista
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(p);
                    setQuery("");
                    setAbierto(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 border-b border-neutral-800 px-3 py-2.5 text-left last:border-0 hover:bg-neutral-800"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-white">
                      {p.codigo && <span className="font-mono text-neutral-400">{p.codigo} · </span>}
                      {p.descripcion}
                    </span>
                    <span className="text-xs text-neutral-500">{p.marca}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs">
                    <span className="block font-semibold text-white tabular">
                      {p.precioVenta ? formatCurrency(p.precioVenta) : "-"}
                    </span>
                    <span
                      className={cn(
                        "tabular",
                        estado === "sin" ? "text-red-400" : estado === "bajo" ? "text-amber-300" : "text-neutral-400"
                      )}
                    >
                      Stock {formatNumber(p.stock)}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

