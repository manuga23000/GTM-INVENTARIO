"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2 } from "lucide-react";
import { Anotacion, ItemAnotacion, TIPOS_ANOTACION } from "@/types/anotaciones";
import { crearAnotacion, actualizarAnotacion } from "@/actions/anotaciones";

interface AnotacionFormProps {
  anotacion?: Anotacion;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AnotacionForm({
  anotacion,
  onClose,
  onSuccess,
}: AnotacionFormProps) {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    fecha: anotacion?.fecha || new Date().toISOString().split("T")[0],
    tipo: anotacion?.tipo || "LUBRICENTRO",
    titulo: anotacion?.titulo || "",
    descripcion: anotacion?.descripcion || "",
    items: anotacion?.items || [{ descripcion: "", cantidad: 0, precio: 0 }],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Prevent body scroll while modal is open
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const calcularTotal = () => {
    return formData.items.reduce((sum, item) => {
      return sum + (item.cantidad || 0) * (item.precio || 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSend = {
        ...formData,
        total: calcularTotal(),
      };

      let result;
      if (anotacion?.id) {
        result = await actualizarAnotacion(anotacion.id, dataToSend);
      } else {
        result = await crearAnotacion(dataToSend);
      }

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        alert("Error al guardar la anotación");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al guardar la anotación");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const agregarItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { descripcion: "", cantidad: 0, precio: 0 }],
    }));
  };

  const eliminarItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const actualizarItem = (
    index: number,
    field: keyof ItemAnotacion,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]:
                field === "cantidad" || field === "precio"
                  ? parseFloat(value as string) || 0
                  : value,
            }
          : item
      ),
    }));
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-neutral-900 rounded-lg max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {anotacion ? "Editar Anotación" : "Nueva Anotación"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors transform hover:scale-110"
            type="button"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Fecha, Tipo y Título */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fecha *
              </label>
              <input
                type="date"
                name="fecha"
                value={formData.fecha}
                onChange={handleChange}
                required
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all hover:border-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipo *
              </label>
              <select
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                required
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all hover:border-red-500"
              >
                {TIPOS_ANOTACION.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Título *
              </label>
              <input
                type="text"
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                required
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all hover:border-red-500"
                placeholder="Ej: Compra Aceites Noviembre"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descripción
            </label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              rows={2}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all hover:border-red-500"
              placeholder="Detalles adicionales..."
            />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-300">
                Items *
              </label>
              <button
                type="button"
                onClick={agregarItem}
                className="inline-flex items-center gap-1 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-1 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar item
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div
                  key={index}
                  className="bg-neutral-800 border border-neutral-700 rounded-lg p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-400 mb-1">
                          Descripción *
                        </label>
                        <input
                          type="text"
                          value={item.descripcion}
                          onChange={(e) =>
                            actualizarItem(index, "descripcion", e.target.value)
                          }
                          required
                          className="w-full bg-neutral-900 border border-neutral-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                          placeholder="Ej: Aceite Castrol 5W30"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          value={item.cantidad || ""}
                          onChange={(e) =>
                            actualizarItem(index, "cantidad", e.target.value)
                          }
                          step="0.01"
                          className="w-full bg-neutral-900 border border-neutral-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Precio
                        </label>
                        <input
                          type="number"
                          value={item.precio || ""}
                          onChange={(e) =>
                            actualizarItem(index, "precio", e.target.value)
                          }
                          step="0.01"
                          className="w-full bg-neutral-900 border border-neutral-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarItem(index)}
                        className="mt-6 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Subtotal del item */}
                  {item.cantidad && item.precio && (
                    <div className="mt-2 text-right text-sm text-gray-400">
                      Subtotal: $
                      {((item.cantidad || 0) * (item.precio || 0)).toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-white">Total:</span>
              <span className="text-2xl font-bold text-red-500">
                ${calcularTotal().toFixed(2)}
              </span>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-neutral-700 text-gray-300 rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Guardando..."
                : anotacion
                ? "Actualizar"
                : "Crear anotación"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
