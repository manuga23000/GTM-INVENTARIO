"use client";
import { useState } from "react";
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
  const [formData, setFormData] = useState({
    fecha: anotacion?.fecha || new Date().toISOString().split("T")[0],
    tipo: anotacion?.tipo || "LUBRICENTRO",
    titulo: anotacion?.titulo || "",
    descripcion: anotacion?.descripcion || "",
    items: anotacion?.items || [{ descripcion: "", cantidad: 0, precio: 0 }],
  });
  const [loading, setLoading] = useState(false);

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

  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-neutral-900 rounded-lg max-w-4xl w-full my-8 transform transition-all duration-300 scale-95 opacity-0 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-800">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {anotacion ? "Editar Anotación" : "Nueva Anotación"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors transform hover:scale-110"
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
                className="flex items-center space-x-1 text-red-600 hover:text-red-500 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Item</span>
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {formData.items.map((item, index) => (
                <div
                  key={index}
                  className="bg-neutral-800 rounded-lg p-4 border border-neutral-700"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Descripción */}
                    <div className="md:col-span-6">
                      <input
                        type="text"
                        value={item.descripcion}
                        onChange={(e) =>
                          actualizarItem(index, "descripcion", e.target.value)
                        }
                        placeholder="Descripción del producto"
                        required
                        className="w-full bg-neutral-900 border border-neutral-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>

                    {/* Cantidad */}
                    <div className="md:col-span-2">
                      <input
                        type="number"
                        value={item.cantidad || ""}
                        onChange={(e) =>
                          actualizarItem(index, "cantidad", e.target.value)
                        }
                        placeholder="Cant."
                        step="0.01"
                        className="w-full bg-neutral-900 border border-neutral-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>

                    {/* Unidad */}
                    <div className="md:col-span-1">
                      <input
                        type="text"
                        value={item.unidad || ""}
                        onChange={(e) =>
                          actualizarItem(index, "unidad", e.target.value)
                        }
                        placeholder="Un."
                        className="w-full bg-neutral-900 border border-neutral-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>

                    {/* Precio */}
                    <div className="md:col-span-2">
                      <input
                        type="number"
                        value={item.precio || ""}
                        onChange={(e) =>
                          actualizarItem(index, "precio", e.target.value)
                        }
                        placeholder="Precio"
                        step="0.01"
                        className="w-full bg-neutral-900 border border-neutral-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>

                    {/* Botón eliminar */}
                    <div className="md:col-span-1 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => eliminarItem(index)}
                        disabled={formData.items.length === 1}
                        className="text-red-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subtotal */}
                  {item.cantidad && item.precio && (
                    <div className="mt-2 text-right text-sm text-gray-400">
                      Subtotal:{" "}
                      <span className="font-semibold text-white">
                        {new Intl.NumberFormat("es-AR", {
                          style: "currency",
                          currency: "ARS",
                        }).format((item.cantidad || 0) * (item.precio || 0))}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-300">
                Total:
              </span>
              <span className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat("es-AR", {
                  style: "currency",
                  currency: "ARS",
                }).format(calcularTotal())}
              </span>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors transform hover:scale-105"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 transform hover:scale-105"
            >
              {loading ? "Guardando..." : anotacion ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
