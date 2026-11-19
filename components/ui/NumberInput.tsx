"use client";

import { InputHTMLAttributes, useState } from "react";
import { parseDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";

interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number | undefined;
  onValueChange: (value: number | undefined) => void;
  /** Muestra "$" a la izquierda. */
  money?: boolean;
  /** Texto a la derecha (ej: "lts", "%", "u."). */
  suffix?: string;
  /** Sólo enteros (teclado numérico sin coma en mobile). */
  integer?: boolean;
}

function aTexto(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return String(n).replace(".", ",");
}

/**
 * Campo numérico que acepta coma o punto decimal ("1500,50", "1.500", "1500.5").
 * Muestra el teclado numérico en mobile y deja borrar el campo sin forzar un 0.
 */
export default function NumberInput({
  value,
  onValueChange,
  money,
  suffix,
  integer,
  className,
  ...rest
}: NumberInputProps) {
  const [texto, setTexto] = useState(aTexto(value));
  const [valorPrevio, setValorPrevio] = useState(value);

  // Si el valor cambia desde afuera (ej: se elige un producto), se refleja en el campo
  if (value !== valorPrevio) {
    setValorPrevio(value);
    if (parseDecimal(texto) !== value) setTexto(aTexto(value));
  }

  return (
    <div className="relative">
      {money && (
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-neutral-500">
          $
        </span>
      )}
      <input
        {...rest}
        type="text"
        inputMode={integer ? "numeric" : "decimal"}
        autoComplete="off"
        value={texto}
        onChange={(e) => {
          const raw = e.target.value;
          if (!/^[\d.,\s$-]*$/.test(raw)) return; // ignorar letras
          setTexto(raw);
          const n = parseDecimal(raw);
          const final = n === undefined ? undefined : integer ? Math.trunc(n) : n;
          setValorPrevio(final);
          onValueChange(final);
        }}
        onFocus={(e) => {
          e.currentTarget.select();
          rest.onFocus?.(e);
        }}
        className={cn("input tabular", money && "pl-7", suffix && "pr-12", className)}
      />
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-500">
          {suffix}
        </span>
      )}
    </div>
  );
}
