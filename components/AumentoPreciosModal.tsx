"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Info } from "lucide-react";
import Modal from "@/components/ui/Modal";
import NumberInput from "@/components/ui/NumberInput";
import { useFeedback } from "@/components/ui/Feedback";
import { ProductoLubricentro } from "@/types/lubricentro";
import { actualizarPreciosMasivo, CambioPrecio } from "@/actions/lubricentro";
import { calcularMargen, formatCurrency, formatPercent, round2 } from "@/lib/format";
import { cn } from "@/lib/utils";

type AplicarA = "ambos" | "venta" | "costo";

const OPCIONES_APLICAR: { value: AplicarA; label: string; ayuda: string }[] = [
  { value: "ambos", label: "Costo y venta", ayuda: "Aumentó el proveedor y trasladás el aumento: el margen se mantiene." },
  { value: "venta", label: "Solo venta", ayuda: "Subís tu precio de venta: el margen aumenta." },
  { value: "costo", label: "Solo costo", ayuda: "Te aumentó el proveedor pero no tocás la venta: el margen baja." },
];

const REDONDEOS = [0, 10, 50, 100, 500];
const PORCENTAJES_RAPIDOS = [5, 10, 15, 20, 30];

/** Redondea hacia arriba al múltiplo indicado (precios "redondos" de venta). */
function redondear(n: number, paso: number) {
  if (!paso) return round2(n);
  return Math.ceil(round2(n) / paso) * paso;
}

interface Props {
  /** Productos a los que se aplica (los que están filtrados en la lista). */
  productos: ProductoLubricentro[];
  /** Texto que describe el filtro actual, para que quede claro a qué se aplica. */
  alcance: string;
  onClose: () => void;
  onDone: () => void;
}

export default function AumentoPreciosModal({ productos, alcance, onClose, onDone }: Props) {
  const { toast, confirm } = useFeedback();
  const [porcentaje, setPorcentaje] = useState<number | undefined>(10);
  const [aplicarA, setAplicarA] = useState<AplicarA>("ambos");
  const [redondeo, setRedondeo] = useState(10);
  const [guardando, setGuardando] = useState(false);

  const cambios = useMemo(() => {
    if (!porcentaje) return [];
    const factor = 1 + porcentaje / 100;
    return productos
      .map((p) => {
        const costo = p.precioCosto || 0;
        const venta = p.precioVenta || 0;
        const nuevoCosto = aplicarA !== "venta" && costo > 0 ? round2(costo * factor) : costo;
        const nuevaVenta = aplicarA !== "costo" && venta > 0 ? redondear(venta * factor, redondeo) : venta;
        return { p, costo, venta, nuevoCosto, nuevaVenta };
      })
      .filter((c) => c.nuevoCosto !== c.costo || c.nuevaVenta !== c.venta);
  }, [productos, porcentaje, aplicarA, redondeo]);

  const sinPrecio = productos.length - cambios.length;

  // Margen promedio (ponderado por precio de venta) antes y después
  const margenes = useMemo(() => {
    const conAmbos = cambios.filter((c) => c.costo > 0 && c.venta > 0);
    const sum = (f: (c: (typeof cambios)[number]) => number) => conAmbos.reduce((s, c) => s + f(c), 0);
    return {
      antes: calcularMargen(sum((c) => c.costo), sum((c) => c.venta)),
      despues: calcularMargen(sum((c) => c.nuevoCosto), sum((c) => c.nuevaVenta)),
    };
  }, [cambios]);

  const aplicar = async () => {
    if (cambios.length === 0) return;
    const ok = await confirm({
      title: "Confirmar actualización",
      message: (
        <>
          Se van a actualizar <strong className="text-white">{cambios.length} productos</strong> con un{" "}
          {porcentaje! > 0 ? "aumento" : "descuento"} de{" "}
          <strong className="text-white">{formatPercent(Math.abs(porcentaje!))}</strong> (
          {OPCIONES_APLICAR.find((o) => o.value === aplicarA)!.label.toLowerCase()}).
        </>
      ),
      confirmLabel: "Actualizar precios",
      tone: "warning",
    });
    if (!ok) return;

    setGuardando(true);
    const payload: CambioPrecio[] = cambios.map((c) => ({
      id: c.p.id!,
      ...(c.nuevoCosto !== c.costo ? { precioCosto: c.nuevoCosto } : {}),
      ...(c.nuevaVenta !== c.venta ? { precioVenta: c.nuevaVenta } : {}),
    }));
    const res = await actualizarPreciosMasivo(payload);
    setGuardando(false);
    if (res.success) {
      toast(`Precios actualizados en ${res.data} productos`);
      onDone();
      onClose();
    } else {
      toast(res.error, "error");
    }
  };

  return (
    <Modal
      size="lg"
      title="Actualizar precios"
      subtitle={alcance}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1 sm:flex-none">
            Cancelar
          </button>
          <button
            type="button"
            onClick={aplicar}
            disabled={guardando || cambios.length === 0}
            className="btn btn-primary flex-1 sm:ml-auto sm:min-w-[180px] sm:flex-none"
          >
            {guardando ? "Actualizando..." : `Actualizar ${cambios.length} productos`}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Porcentaje */}
        <div>
          <label className="label" htmlFor="ap-pct">Porcentaje</label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="sm:w-40">
              <NumberInput id="ap-pct" value={porcentaje} onValueChange={setPorcentaje} suffix="%" />
            </div>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {PORCENTAJES_RAPIDOS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPorcentaje(p)}
                  className={cn("chip", porcentaje === p && "chip-active")}
                >
                  +{p}%
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">Para bajar precios usá un número negativo (ej: -10).</p>
        </div>

        {/* Aplicar a */}
        <div>
          <span className="label">Aplicar a</span>
          <div className="grid grid-cols-3 gap-2">
            {OPCIONES_APLICAR.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setAplicarA(o.value)}
                className={cn(
                  "rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors",
                  aplicarA === o.value
                    ? "border-brand-600 bg-brand-600/15 text-white"
                    : "border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">{OPCIONES_APLICAR.find((o) => o.value === aplicarA)!.ayuda}</p>
        </div>

        {/* Redondeo */}
        {aplicarA !== "costo" && (
          <div>
            <span className="label">Redondear precio de venta hacia arriba</span>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              {REDONDEOS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRedondeo(r)}
                  className={cn("chip", redondeo === r && "chip-active")}
                >
                  {r === 0 ? "Sin redondeo" : `a $${r}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Vista previa */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/50">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 px-3 py-2.5 sm:px-4">
            <p className="text-sm font-semibold text-white">Vista previa · {cambios.length} productos</p>
            {margenes.antes != null && (
              <p className="text-xs text-neutral-400 tabular">
                Margen promedio {formatPercent(margenes.antes)} →{" "}
                <span
                  className={cn(
                    "font-semibold",
                    (margenes.despues ?? 0) < (margenes.antes ?? 0) - 0.05 ? "text-amber-300" : "text-emerald-400"
                  )}
                >
                  {formatPercent(margenes.despues)}
                </span>
              </p>
            )}
          </div>
          {cambios.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-neutral-500">
              {porcentaje ? "Ningún producto tiene precio para actualizar." : "Ingresá un porcentaje."}
            </p>
          ) : (
            <ul className="max-h-72 divide-y divide-neutral-800 overflow-y-auto">
              {cambios.slice(0, 100).map(({ p, costo, venta, nuevoCosto, nuevaVenta }) => (
                <li key={p.id} className="px-3 py-2 sm:px-4">
                  <p className="truncate text-sm text-white">
                    {p.codigo && <span className="font-mono text-neutral-500">{p.codigo} · </span>}
                    {p.descripcion}
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs tabular">
                    {nuevoCosto !== costo && (
                      <span className="inline-flex items-center gap-1 text-neutral-400">
                        Costo {formatCurrency(costo)} <ArrowRight className="h-3 w-3" />
                        <span className="text-neutral-200">{formatCurrency(nuevoCosto)}</span>
                      </span>
                    )}
                    {nuevaVenta !== venta && (
                      <span className="inline-flex items-center gap-1 text-neutral-400">
                        Venta {formatCurrency(venta)} <ArrowRight className="h-3 w-3" />
                        <span className="font-semibold text-white">{formatCurrency(nuevaVenta)}</span>
                      </span>
                    )}
                  </div>
                </li>
              ))}
              {cambios.length > 100 && (
                <li className="px-4 py-2 text-center text-xs text-neutral-500">y {cambios.length - 100} más…</li>
              )}
            </ul>
          )}
        </div>

        {sinPrecio > 0 && porcentaje ? (
          <p className="flex items-start gap-1.5 text-xs text-neutral-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {sinPrecio} producto(s) del filtro no tienen precio cargado y no se modifican.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
