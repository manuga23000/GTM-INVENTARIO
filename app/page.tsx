import { getInventoryCounts } from "@/actions/getInventoryCounts";
import Link from "next/link";
import { Package, Wrench, AlertCircle, TrendingUp } from "lucide-react";

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
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          Sistema de Inventario GTM
        </h1>
        <p className="text-gray-400">
          Gestión completa de lubricentro y taller mecánico
        </p>
      </div>

      {/* Cards de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card hover:scale-105 transition-transform cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gtm-orange/20 p-3 rounded-lg">
              <Package className="w-6 h-6 text-gtm-orange" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">
            {lubricentroProductos}
          </h3>
          <p className="text-gray-400 text-sm">Productos Lubricentro</p>
        </div>

        <div className="card hover:scale-105 transition-transform cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <Wrench className="w-6 h-6 text-blue-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{tallerItems}</h3>
          <p className="text-gray-400 text-sm">Items de Taller</p>
        </div>

        <div className="card hover:scale-105 transition-transform cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-500/20 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">
            {lowStockItems}
          </h3>
          <p className="text-gray-400 text-sm">Stock Bajo</p>
        </div>

        <div className="card hover:scale-105 transition-transform cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-500/20 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">
            {formatCurrency(totalInventoryValue)}
          </h3>
          <p className="text-gray-400 text-sm">Valor Total Inventario</p>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/lubricentro"
          className="card hover:border-gtm-orange transition-all group"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-gtm-orange p-4 rounded-lg group-hover:scale-110 transition-transform">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Lubricentro</h2>
              <p className="text-gray-400">
                Gestionar productos, stock y precios
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/inventario-taller"
          className="card hover:border-blue-400 transition-all group"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-blue-500 p-4 rounded-lg group-hover:scale-110 transition-transform">
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
          </div>
        </Link>
      </div>
    </div>
  );
}
