"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  Download,
  Edit2,
  Trash2,
  Package,
} from "lucide-react";

// Datos de ejemplo
const productosEjemplo = [
  {
    id: 1,
    codigo: "AC-001",
    descripcion: "Aceite Motor 15W40 Mineral 4L",
    marca: "Shell",
    categoria: "Aceites",
    stock: 24,
    stockMinimo: 10,
    precioCosto: 38500, // $38.500
    precioVenta: 58000, // $58.000
    proveedor: "Distribuidora YPF",
  },
  {
    id: 2,
    codigo: "AC-002",
    descripcion: "Aceite Motor 5W30 Sintético 4L",
    marca: "Castrol",
    categoria: "Aceites",
    stock: 18,
    stockMinimo: 15,
    precioCosto: 62000, // $62.000
    precioVenta: 89000, // $89.000
    proveedor: "Lubricantes SA",
  },
  {
    id: 3,
    codigo: "FL-001",
    descripcion: "Filtro de Aceite Universal",
    marca: "Fram",
    categoria: "Filtros",
    stock: 45,
    stockMinimo: 20,
    precioCosto: 13500, // $13.500
    precioVenta: 21000, // $21.000
    proveedor: "Repuestos del Norte",
  },
  {
    id: 4,
    codigo: "AC-003",
    descripcion: "Aceite Transmisión ATF 1L",
    marca: "Mobil",
    categoria: "Aceites",
    stock: 8,
    stockMinimo: 12,
    precioCosto: 22000, // $22.000
    precioVenta: 35000, // $35.000
    proveedor: "Distribuidora YPF",
  },
  {
    id: 5,
    codigo: "LB-001",
    descripcion: "Grasa Multiuso Litio 500g",
    marca: "Shell",
    categoria: "Lubricantes",
    stock: 32,
    stockMinimo: 15,
    precioCosto: 9200, // $9.200
    precioVenta: 14500, // $14.500
    proveedor: "Lubricantes SA",
  },
];

export default function LubricentroPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  const calcularMargen = (costo: number, venta: number) => {
    return (((venta - costo) / venta) * 100).toFixed(1);
  };

  const formatearPrecio = (precio: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(precio);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="bg-gtm-orange p-2 rounded-lg">
            <Package className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">
            Inventario Lubricentro
          </h1>
        </div>
        <p className="text-gray-400">
          Gestión de productos, stock y precios del lubricentro
        </p>
      </div>

      {/* Barra de acciones */}
      <div className="card mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por código, descripción o marca..."
              className="input-field w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtros y acciones */}
          <div className="flex flex-wrap gap-3">
            <button className="btn-secondary flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
            </button>
            <button className="btn-secondary flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
            <button className="btn-primary flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Nuevo Producto</span>
            </button>
          </div>
        </div>

        {/* Categorías */}
        <div className="flex flex-wrap gap-2 mt-4">
          {["Todos", "Aceites", "Filtros", "Lubricantes", "Aditivos"].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-gtm-orange text-white"
                    : "bg-gtm-lightgray text-gray-300 hover:bg-gtm-gray"
                }`}
              >
                {cat}
              </button>
            )
          )}
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gtm-lightgray">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Marca
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  P. Costo
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  P. Venta
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Margen
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gtm-lightgray">
              {productosEjemplo.map((producto) => (
                <tr
                  key={producto.id}
                  className="hover:bg-gtm-lightgray/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-gray-300">
                      {producto.codigo}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white font-medium">
                      {producto.descripcion}
                    </div>
                    <div className="text-xs text-gray-400">
                      {producto.categoria}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">
                      {producto.marca}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        producto.stock < producto.stockMinimo
                          ? "bg-red-500/20 text-red-400"
                          : producto.stock < producto.stockMinimo * 1.5
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {producto.stock} uds
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">
                      {formatearPrecio(producto.precioCosto)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-white">
                      {formatearPrecio(producto.precioVenta)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gtm-orange font-semibold">
                      {calcularMargen(
                        producto.precioCosto,
                        producto.precioVenta
                      )}
                      %
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button className="p-2 hover:bg-gtm-lightgray rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4 text-blue-400" />
                      </button>
                      <button className="p-2 hover:bg-gtm-lightgray rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-gray-400">
          Mostrando <span className="font-medium text-white">5</span> de{" "}
          <span className="font-medium text-white">245</span> productos
        </p>
        <div className="flex space-x-2">
          <button className="btn-secondary">Anterior</button>
          <button className="btn-primary">Siguiente</button>
        </div>
      </div>
    </div>
  );
}
