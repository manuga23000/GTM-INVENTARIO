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
  const [showForm, setShowForm] = useState(false);
  const [editingProducto, setEditingProducto] = useState<
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
      filtered = filtered.filter(
        (p) =>
          p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.marca.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== "Todos") {
      filtered = filtered.filter((p) => p.categoria === selectedCategory);
    }

    setFilteredProductos(filtered);
  }, [searchTerm, selectedCategory, productos]);

  const handleNuevoProducto = () => {
    setEditingProducto(undefined);
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
            <div className="flex space-x-2">
              <button
                onClick={handleNuevoProducto}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center space-x-2 whitespace-nowrap transform hover:scale-105"
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
                    onClick={() => setSelectedCategory(cat)}
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
              <div className="overflow-x-auto animate-fade-in">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`
                  font-semibold
                  ${
                    (producto.stock || 0) <= (producto.stockMinimo || 0)
                      ? "text-red-500"
                      : (producto.stock || 0) <=
                        (producto.stockMinimo || 0) * 1.5
                      ? "text-yellow-500"
                      : "text-green-500"
                  }
                `}
                          >
                            {producto.stock || 0} /{" "}
                            {producto.stockMinimo || 0}
                          </span>
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
            )}
          </div>
        )}
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <ProductoLubricentroForm
          producto={editingProducto}
          onClose={handleCloseForm}
          onSuccess={cargarProductos}
        />
      )}
    </div>
  );
}
