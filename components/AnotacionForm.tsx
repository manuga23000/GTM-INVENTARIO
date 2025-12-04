"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2 } from "lucide-react";
import { Anotacion, ItemAnotacion, TIPOS_ANOTACION } from "@/types/anotaciones";
import { crearAnotacion, actualizarAnotacion } from "@/actions/anotaciones";
import { obtenerProductosLubricentro } from "@/actions/lubricentro";
import { ProductoLubricentro } from "@/types/lubricentro";

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
    items: anotacion?.items || [{ descripcion: "", cantidad: 1 }],
  });
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState<ProductoLubricentro[]>([]);
  // Estado para buscador en selector de productos por línea
  const [queryByIndex, setQueryByIndex] = useState<Record<number, string>>({});
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);

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

  // Cargar productos de lubricentro para el autocomplete cuando el tipo sea LUBRICENTRO
  useEffect(() => {
    const load = async () => {
      if (formData.tipo !== "LUBRICENTRO") return;
      const res = await obtenerProductosLubricentro();
      if (res.success && res.data) {
        setProductos(res.data);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.tipo]);

  // Sincronizar el texto del buscador con el producto ya seleccionado (edición o al cargar)
  useEffect(() => {
    if (formData.tipo !== "LUBRICENTRO") return;
    setQueryByIndex((prev) => {
      const next: Record<number, string> = { ...prev };
      formData.items.forEach((it, i) => {
        if (!it.productoId) return;
        const p = productos.find((pp) => pp.id === it.productoId);
        if (p) next[i] = `${p.codigo} - ${p.descripcion} (${p.marca})`;
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos]);

  // Cerrar dropdown al clickear fuera
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!modalRef.current) return;
      const el = modalRef.current;
      if (openDropdownIndex === null) return;
      // Si el click no fue dentro del contenedor del modal, igual cerramos por seguridad
      if (!el.contains(e.target as Node)) {
        setOpenDropdownIndex(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenDropdownIndex(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [openDropdownIndex]);

  const calcularTotal = () => {
    return formData.items.reduce((sum, item) => {
      return sum + (item.cantidad || 0) * (item.precio || 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Normalizamos items: nos aseguramos de no enviar precio 0 por accidente
      const itemsNormalizados = formData.items.map((it) => {
        const precioNum = typeof it.precio === "number" ? it.precio : NaN;
        const cantidadNum = typeof it.cantidad === "number" ? it.cantidad : NaN;
        return {
          ...it,
          ...(Number.isFinite(precioNum) ? { precio: precioNum } : {}),
          ...(Number.isFinite(cantidadNum) ? { cantidad: cantidadNum } : { cantidad: 1 }),
        };
      });

      const dataToSend = {
        ...formData,
        items: itemsNormalizados,
        total: itemsNormalizados.reduce(
          (sum, it) => sum + (it.cantidad || 0) * (it.precio || 0),
          0
        ),
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
        alert(result.error || "Error al guardar la anotación");
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
    setFormData((prev) => {
      const last = prev.items[prev.items.length - 1];
      // Copiamos la línea anterior según preferencia del usuario
      const nuevo: ItemAnotacion = last
        ? {
            descripcion: last.descripcion || "",
            cantidad: last.cantidad || 0,
            precio: last.precio || 0,
            unidad: last.unidad,
            productoId: last.productoId,
          }
        : { descripcion: "", cantidad: 0, precio: 0 };
      return {
        ...prev,
        items: [...prev.items, nuevo],
      };
    });
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
      items: prev.items.map((item, i) => {
        if (i !== index) return item;
        if (field === "cantidad" || field === "precio") {
          const raw = String(value);
          // Normalizamos formatos: eliminamos separadores de miles y usamos coma como decimal
          const normalized = raw.replace(/\./g, "").replace(",", ".");
          const parsed = normalized.trim() === "" ? NaN : Number(normalized);
          // Si no es número válido, mantenemos el valor anterior (no lo forzamos a 0)
          const prevNum = (item[field] as number) ?? 0;
          const finalNum = Number.isFinite(parsed) ? parsed : prevNum;
          return {
            ...item,
            [field]: finalNum,
          };
        }
        return {
          ...item,
          [field]: value,
        };
      }),
    }));
  };

  const onSeleccionarProducto = (index: number, productoId: string) => {
    const prod = productos.find((p) => p.id === productoId);
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              productoId,
              descripcion: prod?.descripcion || item.descripcion,
              // Si no hay cantidad cargada, por usabilidad dejamos 1 por defecto
              cantidad: item.cantidad && item.cantidad > 0 ? item.cantidad : 1,
              // Si el producto tiene precioVenta numérico, lo usamos.
              // Si NO lo tiene, NO pisamos con 0: dejamos el precio que el usuario haya escrito.
              ...(typeof prod?.precioVenta === "number"
                ? { precio: prod!.precioVenta }
                : {}),
            }
          : item
      ),
    }));
    // Reflejar selección en el campo de búsqueda y cerrar dropdown
    setQueryByIndex((q) => ({
      ...q,
      [index]: prod ? `${prod.codigo} - ${prod.descripcion} (${prod.marca})` : "",
    }));
    setOpenDropdownIndex(null);
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-9999 p-4 animate-fade-in overflow-y-auto"
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
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
                      {formData.tipo === "LUBRICENTRO" ? (
                        <div className="md:col-span-2 relative">
                          <label className="block text-xs text-gray-400 mb-1">
                            Producto (Lubricentro)
                          </label>
                          <input
                            type="text"
                            value={queryByIndex[index] ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setQueryByIndex((q) => ({ ...q, [index]: v }));
                              setOpenDropdownIndex(index);
                            }}
                            onFocus={() => setOpenDropdownIndex(index)}
                            placeholder="Buscar por código, descripción o marca"
                            className="w-full bg-neutral-900 border border-neutral-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                          />
                          {openDropdownIndex === index && (
                            <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto bg-neutral-900 border border-neutral-700 rounded-md shadow-lg">
                              {productos
                                .filter((p) => {
                                  const q = (queryByIndex[index] ?? "").toLowerCase();
                                  if (!q) return true;
                                  const hay = `${p.codigo} ${p.descripcion} ${p.marca}`.toLowerCase();
                                  return hay.includes(q);
                                })
                                .slice(0, 100)
                                .map((p) => (
                                  <button
                                    type="button"
                                    key={p.id}
                                    onClick={() => onSeleccionarProducto(index, p.id!)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-800"
                                  >
                                    {p.codigo} - {p.descripcion} ({p.marca})
                                    <span className="text-xs text-gray-400">  • Stock: {p.stock}</span>
                                  </button>
                                ))}
                              {productos.filter((p) => {
                                const q = (queryByIndex[index] ?? "").toLowerCase();
                                if (!q) return true;
                                const hay = `${p.codigo} ${p.descripcion} ${p.marca}`.toLowerCase();
                                return hay.includes(q);
                              }).length === 0 && (
                                <div className="px-3 py-2 text-sm text-gray-400">No hay resultados</div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
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
                      )}

                      {/* Siempre mostramos descripción editable por si quiere sobreescribir */}
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-400 mb-1">
                          Descripción
                        </label>
                        <input
                          type="text"
                          value={item.descripcion}
                          onChange={(e) =>
                            actualizarItem(index, "descripcion", e.target.value)
                          }
                          className="w-full bg-neutral-900 border border-neutral-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                          placeholder="Detalle del item"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          value={item.cantidad ?? ""}
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
                          value={item.precio ?? ""}
                          onChange={(e) =>
                            actualizarItem(index, "precio", e.target.value)
                          }
                          step="0.01"
                          className="w-full bg-neutral-900 border border-neutral-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {formData.tipo === "LUBRICENTRO" && item.productoId && (
                      <div className="mt-6 text-xs text-gray-400 min-w-[140px]">
                        {(() => {
                          const p = productos.find((pp) => pp.id === item.productoId);
                          return p ? `Stock actual: ${p.stock}` : null;
                        })()}
                      </div>
                    )}

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
                  {typeof item.cantidad === "number" && item.cantidad > 0 &&
                    typeof item.precio === "number" && item.precio >= 0 && (
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
