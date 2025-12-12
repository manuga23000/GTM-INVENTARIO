"use client";
import React, { useState, useEffect } from "react";
import { Trash2, Edit, Plus, Search, Filter, Package } from "lucide-react";
import { ProductoLubricentro } from "@/types/lubricentro";
import ProductoLubricentroForm from "@/components/ProductoLubricentroForm";
import SkeletonLoader from "@/components/SkeletonLoaders";
import {
  obtenerProductosLubricentro,
  eliminarProductoLubricentro,
} from "@/actions/lubricentro";

export default function LubricentroInventario() {
  const [productos, setProductos] = useState<ProductoLubricentro[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<
    ProductoLubricentro[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedFilterType, setSelectedFilterType] = useState(
    "Todos"
  );
  const [showForm, setShowForm] = useState(false);
  const [editingProducto, setEditingProducto] = useState<
    ProductoLubricentro | undefined
  >(undefined);
  // Guardamos el último producto creado/actualizado para autocompletar el próximo
  const [ultimoProducto, setUltimoProducto] = useState<
    ProductoLubricentro | undefined
  >(undefined);
  const [loading, setLoading] = useState(true);

  const cargarProductos = async () => {
    setLoading(true);
    const result = await obtenerProductosLubricentro();
    if (result.success && result.data) {
      setProductos(result.data);
      setFilteredProductos(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    let filtered = productos;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((p) => {
        const matchBasico =
          (p.codigo || "").toLowerCase().includes(q) ||
          (p.descripcion || "").toLowerCase().includes(q) ||
          (p.marca || "").toLowerCase().includes(q);
        const matchAplicaciones = Array.isArray((p as any).aplicaciones)
          ? ((p as any).aplicaciones as string[]).some((a) =>
              (a || "").toLowerCase().includes(q)
            )
          : false;
        // Si es categoría Filtros, considerar descripcion como lista separada por comas
        const matchAplicacionesEnDescripcion = (p.categoria === "Filtros")
          ? (p.descripcion || "")
              .split(",")
              .map((s) => s.trim().toLowerCase())
              .some((token) => token.includes(q))
          : false;
        return matchBasico || matchAplicaciones || matchAplicacionesEnDescripcion;
      });
    }

    if (selectedCategory !== "Todos") {
      filtered = filtered.filter((p) => p.categoria === selectedCategory);
    }

    // Subfiltro para la categoría Filtros
    if (selectedCategory === "Filtros" && selectedFilterType !== "Todos") {
      const type = selectedFilterType.toLowerCase();
      const includesKeyword = (p: ProductoLubricentro, keywords: string[]) => {
        const haystack = `${p.descripcion || ""} ${p.codigo || ""} ${
          p.marca || ""
        }`.toLowerCase();
        return keywords.some((kw) => haystack.includes(kw));
      };

      const mapKeywords: Record<string, string[]> = {
        aire: ["aire"],
        aceite: ["aceite", "aeite", "oil"],
        combustible: ["combustible", "nafta", "diesel"],
        habitáculo: ["habitáculo", "habitaculo", "cabina", "polen"],
        habitaculo: ["habitáculo", "habitaculo", "cabina", "polen"],
      };

      filtered = filtered.filter((p: any) => {
        const t = (p?.tipoFiltro || "").toString().toLowerCase();
        if (t) {
          // comparar normalizando acentos sencillamente
          const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
          return norm(t) === norm(type);
        }
        const keywords = mapKeywords[type] || mapKeywords["aire"]; // fallback por si acaso
        return includesKeyword(p, keywords);
      });
    }

    setFilteredProductos(filtered);
  }, [searchTerm, selectedCategory, selectedFilterType, productos]);

  const handleNuevoProducto = () => {
    // Si hay un último producto, usamos sus datos como base pero SIN id para que sea un nuevo registro
    if (ultimoProducto) {
      const { id, ...resto } = ultimoProducto;
      setEditingProducto(resto as ProductoLubricentro);
    } else {
      setEditingProducto(undefined);
    }
    setShowForm(true);
  };

  const handleEditarProducto = (producto: ProductoLubricentro) => {
    setEditingProducto(producto);
    setShowForm(true);
  };

  const handleEliminarProducto = async (id: string, descripcion: string) => {
    if (confirm(`¿Estás seguro de eliminar "${descripcion}"?`)) {
      const result = await eliminarProductoLubricentro(id);
      if (result.success) {
        cargarProductos();
      } else {
        alert("Error al eliminar el producto");
      }
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProducto(undefined);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-red-600 p-2 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Inventario Lubricentro
            </h1>
          </div>
          <p className="text-gray-400 text-sm sm:text-base">
            Gestión de productos, stock y precios del lubricentro
          </p>
        </div>

        {/* Barra de Acciones */}
        <div className="bg-neutral-900 rounded-lg p-4 sm:p-6 mb-6 border border-neutral-800 animate-scale-in">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            {/* Búsqueda */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nombre, marca o ubicación..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Botones de Acción */}
            <div className="flex w-full sm:w-auto space-x-2">
              <button
                onClick={handleNuevoProducto}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center space-x-2 whitespace-nowrap transform hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm sm:text-base">Nuevo Producto</span>
              </button>
            </div>
          </div>

          {/* Categorías */}
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-400 mb-2">
              CATEGORÍA:
            </p>
            <div className="flex flex-wrap gap-2">
              {["Todos", "Aceites", "Filtros", "Lubricantes", "Aditivos"].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      if (cat !== "Filtros") {
                        setSelectedFilterType("Todos");
                      }
                    }}
                    className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${
                      selectedCategory === cat
                        ? "bg-red-600 text-white"
                        : "bg-neutral-800 text-gray-300 hover:bg-neutral-700"
                    }
                  `}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>

            {/* Subfiltro visible solo para Filtros */}
            {selectedCategory === "Filtros" && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-400 mb-2">
                  TIPO DE FILTRO:
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Todos", "Aire", "Aceite", "Combustible", "Habitáculo"].map(
                    (tipo) => (
                      <button
                        key={tipo}
                        onClick={() => setSelectedFilterType(tipo)}
                        className={`
                          px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                          ${
                            selectedFilterType === tipo
                              ? "bg-blue-600 text-white"
                              : "bg-neutral-800 text-gray-300 hover:bg-neutral-700"
                          }
                        `}
                      >
                        {tipo}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabla de Productos */}
        {loading ? (
          <div className="p-6 animate-fade-in">
            <SkeletonLoader />
          </div>
        ) : filteredProductos.length === 0 ? (
          <div className="bg-neutral-900 rounded-lg p-12 text-center border border-neutral-800 animate-scale-in">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              {searchTerm || selectedCategory !== "Todos"
                ? "No se encontraron productos con esos filtros"
                : "No hay productos registrados"}
            </p>
            <button
              onClick={handleNuevoProducto}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors transform hover:scale-105"
            >
              Agregar Primer Producto
            </button>
          </div>
        ) : (
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden animate-fade-in">
            {/* Tabla existente */}
            {loading ? (
              <div className="p-6 animate-fade-in">
                <SkeletonLoader />
              </div>
            ) : filteredProductos.length === 0 ? (
              <div className="bg-neutral-900 rounded-lg p-12 text-center border border-neutral-800 animate-scale-in">
                <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">
                  {searchTerm || selectedCategory !== "Todos"
                    ? "No se encontraron productos con esos filtros"
                    : "No hay productos registrados"}
                </p>
                <button
                  onClick={handleNuevoProducto}
                  className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors transform hover:scale-105"
                >
                  Agregar Primer Producto
                </button>
              </div>
            ) : (
              <>
                {/* Lista móvil */}
                <div className="md:hidden divide-y divide-neutral-800">
                  {filteredProductos.map((producto) => (
                    <div key={producto.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-gray-400 font-mono">{producto.codigo || "-"}</div>
                          <div className="text-white font-medium mt-0.5 truncate">{producto.descripcion || "-"}</div>
                          <div className="text-sm text-gray-300 mt-0.5">{producto.marca || "-"}</div>
                          <div className="mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              producto.categoria === "Aceites"
                                ? "bg-blue-500/20 text-blue-400"
                                : producto.categoria === "Aditivos"
                                ? "bg-green-500/20 text-green-400"
                                : producto.categoria === "Refrigerantes"
                                ? "bg-purple-500/20 text-purple-400"
                                : "bg-neutral-700 text-neutral-300"
                            }`}>
                              {producto.categoria || "-"}
                            </span>
                          </div>
                          <div className="mt-2 text-sm text-gray-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>
                              Stock: <span className="text-white font-semibold">{producto.stock || 0}</span>
                            </span>
                            <span className="whitespace-nowrap">
                              Costo: {producto.precioCosto ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(producto.precioCosto) : "-"}
                            </span>
                            <span className="whitespace-nowrap">
                              Venta: {producto.precioVenta ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(producto.precioVenta) : "-"}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => handleEditarProducto(producto)}
                            className="p-2 hover:bg-neutral-800 rounded-lg text-blue-400"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEliminarProducto(producto.id!, producto.descripcion || "Producto")}
                            className="p-2 hover:bg-neutral-800 rounded-lg text-red-400"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tabla escritorio */}
                <div className="hidden md:block overflow-x-auto animate-fade-in">
                  <table className="w-full">
                  <thead className="bg-neutral-800 border-b border-neutral-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Descripción
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Marca
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Categoría
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        P. Costo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        P. Venta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {filteredProductos.map((producto) => (
                      <tr
                        key={producto.id}
                        className="hover:bg-neutral-800/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-300">
                          {producto.codigo || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-white font-medium">
                            {producto.descripcion || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {producto.marca || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`
                  inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${
                    producto.categoria === "Aceites"
                      ? "bg-blue-500/20 text-blue-400"
                      : producto.categoria === "Aditivos"
                      ? "bg-green-500/20 text-green-400"
                      : producto.categoria === "Refrigerantes"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-neutral-700 text-neutral-300"
                  }
                `}
                          >
                            {producto.categoria || "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          <span className="font-semibold">{producto.stock || 0}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {producto.precioCosto
                            ? new Intl.NumberFormat("es-AR", {
                                style: "currency",
                                currency: "ARS",
                                minimumFractionDigits: 0,
                              }).format(producto.precioCosto)
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {producto.precioVenta
                            ? new Intl.NumberFormat("es-AR", {
                                style: "currency",
                                currency: "ARS",
                                minimumFractionDigits: 0,
                              }).format(producto.precioVenta)
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditarProducto(producto)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleEliminarProducto(
                                  producto.id!,
                                  producto.descripcion || "Producto"
                                )
                              }
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <ProductoLubricentroForm
          producto={editingProducto}
          onClose={handleCloseForm}
          onSuccess={(productoGuardado) => {
            setUltimoProducto(productoGuardado);
            cargarProductos();
          }}
        />
      )}
    </div>
  );
}
