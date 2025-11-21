import { getInventoryCounts } from "@/actions/getInventoryCounts";
import Link from "next/link";
import { Package, Wrench, AlertCircle, TrendingUp, FileText } from "lucide-react";

export default async function Home() {
  const {
    lubricentroProductos,
    tallerItems,
    lowStockItems,
    totalInventoryValue,
  } = await getInventoryCounts();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-black min-h-screen">
      {/* Hero Section */}
      <div className="mb-12 border-b border-red-600 pb-6">
        <h1 className="text-4xl font-bold text-white mb-2">
          Sistema de Inventario <span className="text-red-600">GTM</span>
        </h1>
        <p className="text-gray-400">
          Gestión completa de lubricentro y taller mecánico
        </p>
      </div>

      {/* Cards de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-neutral-900 border border-red-600/30 rounded-lg p-6 hover:scale-105 transition-transform cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-600/20 p-3 rounded-lg">
              <Package className="w-6 h-6 text-red-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-red-600 opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">
            {lubricentroProductos}
          </h3>
          <p className="text-gray-400 text-sm">Productos Lubricentro</p>
        </div>

        <div className="bg-neutral-900 border border-red-600/30 rounded-lg p-6 hover:scale-105 transition-transform cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-600/20 p-3 rounded-lg">
              <Wrench className="w-6 h-6 text-red-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-red-600 opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{tallerItems}</h3>
          <p className="text-gray-400 text-sm">Items de Taller</p>
        </div>

        <div className="bg-neutral-900 border border-red-600/30 rounded-lg p-6 hover:scale-105 transition-transform cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-600/20 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">
            {lowStockItems}
          </h3>
          <p className="text-gray-400 text-sm">Stock Bajo</p>
        </div>

        <div className="bg-neutral-900 border border-red-600/30 rounded-lg p-6 hover:scale-105 transition-transform cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-600/20 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">
            {formatCurrency(totalInventoryValue)}
          </h3>
          <p className="text-gray-400 text-sm">Valor Total Inventario</p>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/lubricentro"
          className="bg-neutral-900 border border-red-600/30 rounded-lg p-6 hover:border-red-600 transition-all group flex items-center space-x-6"
        >
          <div className="bg-red-600 p-4 rounded-lg group-hover:scale-110 transition-transform">
            <Package className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Lubricentro</h2>
            <p className="text-gray-400">
              Gestionar productos, stock y precios
            </p>
          </div>
        </Link>

        <Link
          href="/inventario-taller"
          className="bg-neutral-900 border border-red-600/30 rounded-lg p-6 hover:border-red-600 transition-all group flex items-center space-x-6"
        >
          <div className="bg-red-600 p-4 rounded-lg group-hover:scale-110 transition-transform">
            <Wrench className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              Inventario Taller
            </h2>
            <p className="text-gray-400">
              Herramientas, equipos, oficina y más
            </p>
          </div>
        </Link>

        <Link
          href="/anotaciones"
          className="bg-neutral-900 border border-red-600/30 rounded-lg p-6 hover:border-red-600 transition-all group flex items-center space-x-6"
        >
          <div className="bg-red-600 p-4 rounded-lg group-hover:scale-110 transition-transform">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Anotaciones</h2>
            <p className="text-gray-400">Crear y ver anotaciones</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
