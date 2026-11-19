"use client";

import { FormEvent, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import NumberInput from "@/components/ui/NumberInput";
import { useFeedback } from "@/components/ui/Feedback";
import { ItemTaller, TIPOS_ITEMS_TALLER } from "@/types/inventario-taller";
import { actualizarItemTaller, crearItemTaller } from "@/actions/inventario-taller";

interface ItemTallerFormProps {
  item?: ItemTaller;
  /** Ubicaciones existentes, para sugerir mientras se escribe. */
  ubicaciones?: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ItemTallerForm({ item, ubicaciones = [], onClose, onSuccess }: ItemTallerFormProps) {
  const { toast, confirm } = useFeedback();
  const [form, setForm] = useState({
    nombre: item?.nombre || "",
    tipo: item?.tipo || "",
    marca: item?.marca || "",
    cantidad: item?.cantidad ?? 1,
    ubicacion: item?.ubicacion || "",
  });
  const [loading, setLoading] = useState(false);
  const [inicial] = useState(() => JSON.stringify(form));
  const isDirty = useMemo(() => JSON.stringify(form) !== inicial, [form, inicial]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((p) => ({ ...p, [k]: v }));

  const pedirCierre = async () => {
    if (loading) return;
    if (
      !isDirty ||
      (await confirm({
        title: "¿Salir sin guardar?",
        message: "Hay cambios sin guardar en este item.",
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
    if (!form.nombre.trim()) {
      toast("El nombre es obligatorio", "error");
      return;
    }
    setLoading(true);
    const datos = { ...form, cantidad: form.cantidad ?? 0 };
    const result = item?.id ? await actualizarItemTaller(item.id, datos) : await crearItemTaller(datos);
    setLoading(false);
    if (result.success) {
      toast(item?.id ? "Item actualizado" : "Item creado");
      onSuccess();
      onClose();
    } else {
      toast(result.error, "error");
    }
  };

  return (
    <Modal
      size="md"
      title={item ? "Editar item" : "Nuevo item"}
      onClose={pedirCierre}
      closeOnBackdrop={!isDirty}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={pedirCierre} className="btn btn-secondary flex-1 sm:flex-none">
            Cancelar
          </button>
          <button
            type="submit"
            form="item-taller-form"
            disabled={loading}
            className="btn btn-primary flex-1 sm:ml-auto sm:min-w-[140px] sm:flex-none"
          >
            {loading ? "Guardando..." : item ? "Guardar cambios" : "Crear item"}
          </button>
        </div>
      }
    >
      <form id="item-taller-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="t-nombre">
            Nombre <span className="text-brand-500">*</span>
          </label>
          <input
            id="t-nombre"
            value={form.nombre}
            onChange={(e) => set("nombre", e.target.value)}
            required
            className="input"
            placeholder="Ej: Taladro percutor, Escritorio"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="label" htmlFor="t-tipo">Tipo</label>
            <select id="t-tipo" value={form.tipo} onChange={(e) => set("tipo", e.target.value)} className="input">
              <option value="">Sin tipo</option>
              {TIPOS_ITEMS_TALLER.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label" htmlFor="t-marca">Marca</label>
            <input
              id="t-marca"
              value={form.marca}
              onChange={(e) => set("marca", e.target.value)}
              className="input"
              placeholder="Ej: Bosch, Stanley"
            />
          </div>
          <div>
            <label className="label" htmlFor="t-cantidad">Cantidad</label>
            <NumberInput
              id="t-cantidad"
              integer
              value={form.cantidad}
              onValueChange={(v) => set("cantidad", v != null && v < 0 ? 0 : (v as number))}
            />
          </div>
          <div>
            <label className="label" htmlFor="t-ubicacion">Ubicación</label>
            <input
              id="t-ubicacion"
              value={form.ubicacion}
              onChange={(e) => set("ubicacion", e.target.value)}
              className="input"
              placeholder="Ej: Box 1"
              list="ubicaciones-taller"
            />
            <datalist id="ubicaciones-taller">
              {ubicaciones.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>
        </div>
      </form>
    </Modal>
  );
}
