"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { ItemTaller, TIPOS_ITEMS_TALLER } from "@/types/inventario-taller";
import {
  crearItemTaller,
  actualizarItemTaller,
} from "@/actions/inventario-taller";

interface ItemTallerFormProps {
  item?: ItemTaller;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ItemTallerForm({
  item,
  onClose,
  onSuccess,
}: ItemTallerFormProps) {
  const [formData, setFormData] = useState({
    nombre: item?.nombre || "",
    tipo: item?.tipo || "",
    marca: item?.marca || "",
    cantidad: item?.cantidad || 1,
    ubicacion: item?.ubicacion || "",
  });
  const [loading, setLoading] = useState(false);

  // Modal lifecycle and accessibility helpers
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<Element | null>(null);
  const prevBodyOverflow = useRef<string | null>(null);
  const initialDataRef = useRef(formData);
  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialDataRef.current);
  }, [formData]);

  const confirmClose = () => {
    if (loading) return; // no cerrar mientras guarda
    if (!isDirty || confirm("Hay cambios sin guardar. ¿Deseás salir igualmente?")) {
      onClose();
    }
  };

  useEffect(() => {
    setMounted(true);
    // Save the element that was focused before opening the modal
    previouslyFocusedElement.current = document.activeElement;

    // Prevent body scroll while modal is open (avoid Tailwind purge issues)
    prevBodyOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        confirmClose();
      }

      // Simple focus trap
      if (e.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'a, button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Restore body scroll
      if (prevBodyOverflow.current !== null) {
        document.body.style.overflow = prevBodyOverflow.current;
      } else {
        document.body.style.overflow = "";
      }
      // Restore focus to the previously focused element
      (previouslyFocusedElement.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  // Focus first input on mount
  useEffect(() => {
    if (!mounted) return;
    const firstInput = modalRef.current?.querySelector<HTMLElement>(
      "input, select, textarea, button"
    );
    firstInput?.focus();
  }, [mounted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (item?.id) {
        // Actualizar
        result = await actualizarItemTaller(item.id, formData);
      } else {
        // Crear
        result = await crearItemTaller(formData);
      }

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        alert("Error al guardar el item");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al guardar el item");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "cantidad" ? parseInt(value) || 0 : value,
    }));
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) confirmClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-neutral-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in"
      >
        {/* Header con animación */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-800">
          <h2 id="modal-title" className="text-xl sm:text-2xl font-bold text-white">
            {item ? "Editar Item" : "Nuevo Item"}
          </h2>
          <button
            onClick={confirmClose}
            className="text-gray-400 hover:text-white transition-colors transform hover:scale-110"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Form con ajustes responsive */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre *
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white 
              focus:outline-none focus:ring-2 focus:ring-red-600
              transition-all hover:border-red-500"
              placeholder="Ej: Taladro, Escritorio, Equipo de Música"
            />
          </div>

          {/* Grid 2x2: Tipo, Marca, Cantidad, Ubicación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
              <select
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all hover:border-red-500"
              >
                <option value="">Seleccionar tipo</option>
                {TIPOS_ITEMS_TALLER.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Marca */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Marca</label>
              <input
                type="text"
                name="marca"
                value={formData.marca}
                onChange={handleChange}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all hover:border-red-500"
                placeholder="Ej: Bosch, Samsung, HP"
              />
            </div>

            {/* Cantidad */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Cantidad</label>
              <input
                type="number"
                name="cantidad"
                value={formData.cantidad}
                onChange={handleChange}
                min="0"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all hover:border-red-500"
              />
            </div>

            {/* Ubicación */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Ubicación</label>
              <input
                type="text"
                name="ubicacion"
                value={formData.ubicacion}
                onChange={handleChange}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all hover:border-red-500"
                placeholder="Ej: Oficina, Box 1"
              />
            </div>
          </div>

          {/* Botones con hover y transiciones */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold 
              py-2 px-4 rounded-lg transition-colors transform hover:scale-105"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold 
              py-2 px-4 rounded-lg transition-colors disabled:opacity-50 transform hover:scale-105"
            >
              {loading ? "Guardando..." : item ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
