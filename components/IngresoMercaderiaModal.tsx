"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import NumberInput from "@/components/ui/NumberInput";
import SelectorProducto from "@/components/SelectorProducto";
import { useFeedback } from "@/components/ui/Feedback";
import { ProductoLubricentro } from "@/types/lubricentro";
import { registrarIngresoMercaderia } from "@/actions/ingresos";
import { calcularMargen, formatCurrency, formatNumber, formatPercent, hoyISO, round2 } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Linea {
  key: number;
  productoId?: string;
  cantidad?: number;
  costo?: number;
  venta?: number;
  /** true si el usuario escribió la venta a mano (no se recalcula sola). */
  ventaManual: boolean;
}

let nextKey = 1;
const nuevaLinea = (): Linea => ({ key: nextKey++, cantidad: 1, ventaManual: false });

/** Precio de venta que mantiene el mismo recargo que tenía el producto con el costo anterior. */
function ventaSugerida(p: ProductoLubricentro, nuevoCosto?: number): number | undefined {
  const costo = p.precioCosto || 0;
  const venta = p.precioVenta || 0;
  if (!nuevoCosto || !costo || !venta) return venta || undefined;
  return Math.ceil((venta * nuevoCosto) / costo / 10) * 10; // redondeado hacia arriba a $10
}

interface Props {
  productos: ProductoLubricentro[];
  onClose: () => void;
  onDone: () => void;
}

export default function IngresoMercaderiaModal({ productos, onClose, onDone }: Props) {
  const { toast, confirm } = useFeedback();
  const [fecha, setFecha] = useState(hoyISO());
  const [proveedor, setProveedor] = useState("");
  const [remito, setRemito] = useState("");
  const [actualizarPrecios, setActualizarPrecios] = useState(true);
  const [lineas, setLineas] = useState<Linea[]>(() => [nuevaLinea()]);
  const [guardando, setGuardando] = useState(false);

  const porId = useMemo(() => new Map(productos.map((p) => [p.id!, p])), [productos]);

  const actualizar = (key: number, cambios: Partial<Linea>) =>
    setLineas((ls) =>
      ls.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...cambios };
        // Si cambia el costo y la venta no se tocó a mano, recalcular manteniendo el recargo
        const p = next.productoId ? porId.get(next.productoId) : undefined;
        if (p && "costo" in cambios && !next.ventaManual) next.venta = ventaSugerida(p, next.costo);
        return next;
      })
    );

  const elegir = (key: number, p: ProductoLubricentro) =>
    setLineas((ls) =>
      ls.map((l) =>
        l.key === key
          ? { ...l, productoId: p.id, costo: p.precioCosto || undefined, venta: p.precioVenta || undefined, ventaManual: false }
          : l
      )
    );

  const completas = lineas.filter((l) => l.productoId && (l.cantidad || 0) > 0);
  const total = round2(completas.reduce((s, l) => s + (l.cantidad || 0) * (l.costo || 0), 0));
  const unidades = round2(completas.reduce((s, l) => s + (l.cantidad || 0), 0));
  const hayDatos = lineas.some((l) => l.productoId) || proveedor || remito;

  const pedirCierre = async () => {
    if (guardando) return;
    if (
      !hayDatos ||
      (await confirm({
        title: "¿Descartar el ingreso?",
        message: "Los productos cargados no se van a guardar.",
        confirmLabel: "Descartar",
        cancelLabel: "Seguir cargando",
        tone: "warning",
      }))
    ) {
      onClose();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (completas.length === 0) {
      toast("Elegí al menos un producto con cantidad", "error");
      return;
    }
    if (lineas.some((l) => l.productoId && !(l.cantidad && l.cantidad > 0))) {
      toast("Hay productos con cantidad 0 o vacía", "error");
      return;
    }
    setGuardando(true);
    const res = await registrarIngresoMercaderia({
      fecha,
      proveedor,
      remito,
      actualizarPrecios,
      items: completas.map((l) => ({
        productoId: l.productoId!,
        descripcion: porId.get(l.productoId!)?.descripcion || "",
        cantidad: l.cantidad!,
        costoUnitario: l.costo,
        precioVenta: l.venta,
      })),
    });
    setGuardando(false);
    if (res.success) {
      toast(`Ingreso registrado: ${res.data.productos} productos, +${formatNumber(res.data.unidades)} unidades`);
      onDone();
      onClose();
    } else {
      toast(res.error, "error");
    }
  };

  return (
    <Modal
      size="xl"
      title="Ingreso de mercadería"
      subtitle="Suma stock y actualiza costos con la compra al proveedor"
      onClose={pedirCierre}
      closeOnBackdrop={!hayDatos}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-baseline justify-between gap-4 sm:justify-start">
            <div>
              <p className="text-[11px] text-neutral-500 uppercase">Total compra</p>
              <p className="text-2xl font-bold text-white tabular">{formatCurrency(total)}</p>
            </div>
            <p className="text-sm text-neutral-400 tabular">+{formatNumber(unidades)} unidades</p>
          </div>
          <div className="flex gap-3 sm:ml-auto">
            <button type="button" onClick={pedirCierre} className="btn btn-secondary flex-1 sm:flex-none">
              Cancelar
            </button>
            <button
              type="submit"
              form="ingreso-form"
              disabled={guardando}
              className="btn btn-primary flex-1 sm:min-w-[160px] sm:flex-none"
            >
              {guardando ? "Guardando..." : "Registrar ingreso"}
            </button>
          </div>
        </div>
      }
    >
      <form id="ingreso-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="label" htmlFor="in-fecha">Fecha</label>
            <input id="in-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="in-prov">Proveedor</label>
            <input id="in-prov" value={proveedor} onChange={(e) => setProveedor(e.target.value)} className="input" placeholder="Opcional" />
          </div>
          <div>
            <label className="label" htmlFor="in-remito">Remito / factura</label>
            <input id="in-remito" value={remito} onChange={(e) => setRemito(e.target.value)} className="input" placeholder="Opcional" />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-950/50 p-3">
          <input
            type="checkbox"
            checked={actualizarPrecios}
            onChange={(e) => setActualizarPrecios(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
          />
          <span>
            <span className="block text-sm font-medium text-white">Actualizar costo y precio de venta</span>
            <span className="block text-xs text-neutral-400">
              Si cambia el costo, la venta se recalcula para mantener el mismo recargo (podés editarla). Desmarcalo
              para sumar solo stock.
            </span>
          </span>
        </label>

        <div className="space-y-3">
          {lineas.map((l, i) => {
            const p = l.productoId ? porId.get(l.productoId) : undefined;
            const costoAnterior = p?.precioCosto || 0;
            const cambioCosto =
              p && l.costo != null && costoAnterior > 0 && l.costo !== costoAnterior
                ? ((l.costo - costoAnterior) / costoAnterior) * 100
                : undefined;
            const margenNuevo = calcularMargen(l.costo, l.venta);
            return (
              <div key={l.key} className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3 sm:p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500">PRODUCTO {i + 1}</span>
                  {lineas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLineas((ls) => ls.filter((x) => x.key !== l.key))}
                      className="icon-btn h-8 w-8 text-red-400"
                      aria-label={`Quitar producto ${i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <SelectorProducto
                  productos={productos}
                  seleccionado={p}
                  onSelect={(prod) => elegir(l.key, prod)}
                  onClear={() => actualizar(l.key, { productoId: undefined })}
                  placeholder="Buscar producto por código, nombre o marca"
                />

                {p && (
                  <>
                    <div className={cn("mt-3 grid gap-2 sm:gap-3", actualizarPrecios ? "grid-cols-3" : "grid-cols-2")}>
                      <div>
                        <label className="mb-1 block text-xs text-neutral-400">Cantidad</label>
                        <NumberInput value={l.cantidad} onValueChange={(v) => actualizar(l.key, { cantidad: v })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-neutral-400">Costo unit.</label>
                        <NumberInput money value={l.costo} onValueChange={(v) => actualizar(l.key, { costo: v })} />
                      </div>
                      {actualizarPrecios && (
                        <div>
                          <label className="mb-1 block text-xs text-neutral-400">Nueva venta</label>
                          <NumberInput
                            money
                            value={l.venta}
                            onValueChange={(v) => actualizar(l.key, { venta: v, ventaManual: true })}
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400 tabular">
                      <span>
                        Stock {formatNumber(p.stock)} <ArrowRight className="inline h-3 w-3" />{" "}
                        <span className="font-semibold text-emerald-400">
                          {formatNumber(round2((p.stock || 0) + (l.cantidad || 0)))}
                        </span>
                      </span>
                      {cambioCosto != null && (
                        <span className={cambioCosto > 0 ? "text-amber-300" : "text-emerald-400"}>
                          Costo {cambioCosto > 0 ? "+" : ""}
                          {formatPercent(cambioCosto)} vs. anterior ({formatCurrency(costoAnterior)})
                        </span>
                      )}
                      {actualizarPrecios && l.venta !== (p.precioVenta || undefined) && l.venta != null && (
                        <span>
                          Venta {formatCurrency(p.precioVenta)} <ArrowRight className="inline h-3 w-3" />{" "}
                          <span className="text-white">{formatCurrency(l.venta)}</span>
                        </span>
                      )}
                      {actualizarPrecios && margenNuevo != null && <span>Margen {formatPercent(margenNuevo)}</span>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setLineas((ls) => [...ls, nuevaLinea()])}
          className="btn w-full border border-dashed border-neutral-700 text-neutral-300 hover:border-brand-600 hover:text-white"
        >
          <Plus className="h-4 w-4" />
          Agregar otro producto
        </button>
      </form>
    </Modal>
  );
}
