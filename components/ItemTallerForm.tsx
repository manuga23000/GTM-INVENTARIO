"use client";
import { useState } from "react";
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

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 
      animate-fade-in"
    >
      <div
        className="bg-neutral-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto
        transform transition-all duration-300 
        scale-95 opacity-0 
        animate-scale-in"
      >
        {/* Header con animación */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-800">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {item ? "Editar Item" : "Nuevo Item"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors transform hover:scale-110"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Form con ajustes responsive */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Campos originales con mejoras de responsive */}
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

          {/* Resto de campos igual, con transiciones y hover */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cantidad
              </label>
              <input
                type="number"
                name="cantidad"
                value={formData.cantidad}
                onChange={handleChange}
                min="0"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white 
                focus:outline-none focus:ring-2 focus:ring-red-600
                transition-all hover:border-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ubicación
              </label>
              <input
                type="text"
                name="ubicacion"
                value={formData.ubicacion}
                onChange={handleChange}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white 
                focus:outline-none focus:ring-2 focus:ring-red-600
                transition-all hover:border-red-500"
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
    </div>
  );
}
