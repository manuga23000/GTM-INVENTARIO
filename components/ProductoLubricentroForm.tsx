"use client";

import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import NumberInput from "@/components/ui/NumberInput";
import { useFeedback } from "@/components/ui/Feedback";
import {
  CATEGORIAS_LUBRICENTRO,
  ProductoLubricentro,
  TIPOS_FILTRO,
  TipoFiltro,
} from "@/types/lubricentro";
import { actualizarProductoLubricentro, crearProductoLubricentro } from "@/actions/lubricentro";
import { calcularMargen, calcularRecargo, formatCurrency, formatPercent, round2 } from "@/lib/format";
import { STOCK_MINIMO_DEFAULT } from "@/lib/stock";
import { cn } from "@/lib/utils";

interface ProductoLubricentroFormProps {
  producto?: ProductoLubricentro;
  onClose: () => void;
  onSuccess: (producto: ProductoLubricentro) => void;
}

interface FormState {
  codigo: string;
  descripcion: string;
  marca: string;
  categoria: string;
  tipoFiltro: TipoFiltro | "";
  stock: number | undefined;
  stockMinimo: number | undefined;
  precioCosto: number | undefined;
  precioVenta: number | undefined;
  ubicacion: string;
}

const RECARGOS = [30, 40, 50, 60, 80, 100];

export default function ProductoLubricentroForm({
  producto,
  onClose,
  onSuccess,
}: ProductoLubricentroFormProps) {
  const { toast, confirm } = useFeedback();
  const esEdicion = Boolean(producto?.id);

  const [form, setForm] = useState<FormState>(() => ({
    codigo: producto?.codigo || "",
    descripcion: producto?.descripcion || "",
    marca: producto?.marca || "",
    categoria: producto?.categoria || "",
    tipoFiltro: producto?.tipoFiltro || "",
    stock: producto?.stock ?? 0,
    stockMinimo: producto?.stockMinimo,
    precioCosto: producto?.precioCosto || undefined,
    precioVenta: producto?.precioVenta || undefined,
    ubicacion: producto?.ubicacion || "",
  }));
  const [loading, setLoading] = useState(false);
  const [inicial] = useState(() => JSON.stringify(form));
  const isDirty = useMemo(() => JSON.stringify(form) !== inicial, [form, inicial]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const margen = calcularMargen(form.precioCosto, form.precioVenta);
  const recargo = calcularRecargo(form.precioCosto, form.precioVenta);
  const ganancia =
    form.precioVenta != null && form.precioCosto != null ? form.precioVenta - form.precioCosto : undefined;
  const ventaMenorQueCosto =
    form.precioCosto != null && form.precioVenta != null && form.precioVenta < form.precioCosto;

  const aplicarRecargo = (pct: number) => {
    if (!form.precioCosto) return;
    set("precioVenta", round2(form.precioCosto * (1 + pct / 100)));
  };

  const pedirCierre = async () => {
    if (loading) return;
    if (
      !isDirty ||
      (await confirm({
        title: "¿Salir sin guardar?",
        message: "Hay cambios sin guardar en este producto.",
        confirmLabel: "Salir sin guardar",
        cancelLabel: "Seguir editando",
        tone: "warning",
      }))
    ) {
      onClose();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.descripcion.trim()) {
      toast("La descripción es obligatoria", "error");
      return;
    }
    setLoading(true);
    const datos = {
      codigo: form.codigo,
      descripcion: form.descripcion,
      marca: form.marca,
      categoria: form.categoria,
      tipoFiltro: form.categoria === "Filtros" ? form.tipoFiltro : "",
      stock: form.stock ?? 0,
      precioCosto: form.precioCosto ?? 0,
      precioVenta: form.precioVenta ?? 0,
      ubicacion: form.ubicacion,
      ...(form.stockMinimo != null ? { stockMinimo: form.stockMinimo } : {}),
    } satisfies Omit<ProductoLubricentro, "id">;

    const result = producto?.id
      ? await actualizarProductoLubricentro(producto.id, datos)
      : await crearProductoLubricentro(datos);
    setLoading(false);

    if (result.success) {
      toast(esEdicion ? "Producto actualizado" : "Producto creado");
      onSuccess({ ...producto, ...result.data });
      onClose();
    } else {
      toast(result.error || "Error al guardar el producto", "error");
    }
  };

  return (
    <Modal
      title={esEdicion ? "Editar producto" : "Nuevo producto"}
      subtitle={!esEdicion && producto ? "Precargado con los datos del último producto" : undefined}
      onClose={pedirCierre}
      closeOnBackdrop={!isDirty}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={pedirCierre} className="btn btn-secondary flex-1 sm:flex-none">
            Cancelar
          </button>
          <button
            type="submit"
            form="producto-form"
            disabled={loading}
            className="btn btn-primary flex-1 sm:ml-auto sm:min-w-[140px] sm:flex-none"
          >
            {loading ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      }
    >
      <form id="producto-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Datos */}
        <section className="space-y-4">
          <div>
            <label className="label" htmlFor="p-descripcion">
              Descripción <span className="text-brand-500">*</span>
            </label>
            <input
              id="p-descripcion"
              className="input"
              value={form.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
              required
              placeholder={
                form.categoria === "Filtros"
                  ? "Vehículos separados por coma: Gol, Fox, Suran"
                  : "Ej: Aceite sintético 5W30 4L"
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="label" htmlFor="p-codigo">Código</label>
              <input
                id="p-codigo"
                className="input font-mono"
                value={form.codigo}
                onChange={(e) => set("codigo", e.target.value)}
                placeholder="Ej: WO-130"
                autoCapitalize="characters"
              />
            </div>
            <div>
              <label className="label" htmlFor="p-marca">Marca</label>
              <input
                id="p-marca"
                className="input"
                value={form.marca}
                onChange={(e) => set("marca", e.target.value)}
                placeholder="Ej: Shell, Wega"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className={cn(form.categoria !== "Filtros" && "col-span-2 sm:col-span-1")}>
              <label className="label" htmlFor="p-categoria">Categoría</label>
              <select
                id="p-categoria"
                className="input"
                value={form.categoria}
                onChange={(e) => set("categoria", e.target.value)}
              >
                <option value="">Sin categoría</option>
                {CATEGORIAS_LUBRICENTRO.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {form.categoria === "Filtros" && (
              <div>
                <label className="label" htmlFor="p-tipo">Tipo de filtro</label>
                <select
                  id="p-tipo"
                  className="input"
                  value={form.tipoFiltro}
                  onChange={(e) => set("tipoFiltro", e.target.value as TipoFiltro | "")}
                >
                  <option value="">Seleccionar</option>
                  {TIPOS_FILTRO.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className={cn(form.categoria === "Filtros" && "col-span-2")}>
              <label className="label" htmlFor="p-ubicacion">Ubicación</label>
              <input
                id="p-ubicacion"
                className="input"
                value={form.ubicacion}
                onChange={(e) => set("ubicacion", e.target.value)}
                placeholder="Ej: Estante A"
              />
            </div>
          </div>
        </section>

        {/* Stock */}
        <section className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-3 sm:p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">Stock</h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="label" htmlFor="p-stock">Cantidad actual</label>
              <NumberInput
                id="p-stock"
                value={form.stock}
                onValueChange={(v) => set("stock", v != null && v < 0 ? 0 : v)}
              />
            </div>
            <div>
              <label className="label" htmlFor="p-stockmin">Avisar con</label>
              <NumberInput
                id="p-stockmin"
                value={form.stockMinimo}
                onValueChange={(v) => set("stockMinimo", v)}
                placeholder={String(STOCK_MINIMO_DEFAULT)}
                suffix="o menos"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Se marca como “stock bajo” cuando quedan {form.stockMinimo ?? STOCK_MINIMO_DEFAULT} unidades o
            menos.
          </p>
        </section>

        {/* Precios */}
        <section className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-3 sm:p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">Precios</h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="label" htmlFor="p-costo">Costo</label>
              <NumberInput
                id="p-costo"
                money
                value={form.precioCosto}
                onValueChange={(v) => set("precioCosto", v)}
                onBlur={() => {
                  // Sugerencia: si todavía no hay precio de venta, completar con +50%
                  if (form.precioCosto && !form.precioVenta) aplicarRecargo(50);
                }}
                placeholder="0"
              />
            </div>
            <div>
              <label className="label" htmlFor="p-venta">Venta</label>
              <NumberInput
                id="p-venta"
                money
                value={form.precioVenta}
                onValueChange={(v) => set("precioVenta", v)}
                placeholder="0"
                className={cn(ventaMenorQueCosto && "border-amber-500")}
              />
            </div>
          </div>

          <div className="mt-3">
            <p className="mb-1.5 text-xs text-neutral-500">Calcular venta desde el costo:</p>
            <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
              {RECARGOS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  disabled={!form.precioCosto}
                  onClick={() => aplicarRecargo(pct)}
                  className={cn(
                    "chip disabled:cursor-not-allowed disabled:opacity-40",
                    recargo != null && Math.abs(recargo - pct) < 0.05 && "chip-active"
                  )}
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-neutral-900 p-3 text-center">
            <div>
              <p className="text-[11px] text-neutral-500 uppercase">Ganancia</p>
              <p
                className={cn(
                  "text-sm font-semibold tabular",
                  ganancia == null ? "text-neutral-500" : ganancia < 0 ? "text-red-400" : "text-emerald-400"
                )}
              >
                {ganancia == null ? "-" : formatCurrency(ganancia)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-neutral-500 uppercase">Margen</p>
              <p className="text-sm font-semibold text-white tabular">{formatPercent(margen)}</p>
            </div>
            <div>
              <p className="text-[11px] text-neutral-500 uppercase">Recargo</p>
              <p className="text-sm font-semibold text-white tabular">{formatPercent(recargo)}</p>
            </div>
          </div>

          {ventaMenorQueCosto && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              El precio de venta es menor que el costo.
            </p>
          )}
        </section>
      </form>
    </Modal>
  );
}
