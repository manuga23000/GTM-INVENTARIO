"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  ProductoLubricentro,
  CATEGORIAS_LUBRICENTRO,
} from "@/types/lubricentro";
import {
  crearProductoLubricentro,
  actualizarProductoLubricentro,
} from "@/actions/lubricentro";

interface ProductoLubricentroFormProps {
  producto?: ProductoLubricentro;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductoLubricentroForm({
  producto,
  onClose,
  onSuccess,
}: ProductoLubricentroFormProps) {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<Element | null>(null);
  const prevBodyOverflow = useRef<string | null>(null);
  const [formData, setFormData] = useState({
    codigo: producto?.codigo || "",
    descripcion: producto?.descripcion || "",
    marca: producto?.marca || "",
    categoria: producto?.categoria || "",
    stock: producto?.stock || 0,
    stockMinimo: producto?.stockMinimo || 0,
    precioCosto: producto?.precioCosto || 0,
    precioVenta: producto?.precioVenta || 0,
    ubicacion: producto?.ubicacion || "",
  });
  const [loading, setLoading] = useState(false);

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

  // Ensure portals only render on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    previouslyFocusedElement.current = document.activeElement;
    // bloquear scroll del body usando estilo directo
    prevBodyOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        confirmClose();
      }

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
      // restaurar scroll del body
      if (prevBodyOverflow.current !== null) {
        document.body.style.overflow = prevBodyOverflow.current;
      } else {
        document.body.style.overflow = "";
      }
      (previouslyFocusedElement.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  // Focus the first interactive element on mount
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
      if (producto?.id) {
        result = await actualizarProductoLubricentro(producto.id, formData);
      } else {
        result = await crearProductoLubricentro(formData);
      }

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        alert("Error al guardar el producto");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al guardar el producto");
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
      [name]: ["stock", "stockMinimo", "precioCosto", "precioVenta"].includes(
        name
      )
        ? parseFloat(value) || 0
        : value,
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
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-800">
          <h2 id="modal-title" className="text-xl sm:text-2xl font-bold text-white">
            {producto ? "Editar Producto" : "Nuevo Producto"}
          </h2>
          <button
            onClick={confirmClose}
            className="text-gray-400 hover:text-white transition-colors transform hover:scale-110"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Código y Descripción */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Código</label>
              <input
                type="text"
                name="codigo"
                value={formData.codigo}
                onChange={handleChange}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all hover:border-red-500"
                placeholder="Ej: A-123, 5W30-XX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Descripción *</label>
              <input
                type="text"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                required
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all hover:border-red-500"
                placeholder="Ej: Aceite sintético 5W30"
              />
            </div>
          </div>

          {/* Marca y Categoría */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Marca</label>
              <input
                type="text"
                name="marca"
                value={formData.marca}
                onChange={handleChange}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all hover:border-red-500"
                placeholder="Ej: Shell, Total, YPF"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Categoría</label>
              <select
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all hover:border-red-500"
              >
                <option value="">Seleccionar categoría</option>
                {CATEGORIAS_LUBRICENTRO.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stock y Stock mínimo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Stock</label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                min="0"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all hover:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Stock mínimo</label>
              <input
                type="number"
                name="stockMinimo"
                value={formData.stockMinimo}
                onChange={handleChange}
                min="0"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all hover:border-red-500"
              />
            </div>
          </div>

          {/* Precios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Precio costo</label>
              <input
                type="number"
                name="precioCosto"
                value={formData.precioCosto}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all hover:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Precio venta</label>
              <input
                type="number"
                name="precioVenta"
                value={formData.precioVenta}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all hover:border-red-500"
              />
            </div>
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
              placeholder="Ej: Estante A, Depósito"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={confirmClose}
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
              {loading ? "Guardando..." : producto ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
