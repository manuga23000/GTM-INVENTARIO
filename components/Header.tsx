"use client";

import Link from "next/link";
import { Wrench, Package, BarChart3, Settings } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-gtm-darker border-b border-gtm-lightgray sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="bg-gtm-orange p-2 rounded-lg">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">GTM Inventario</h1>
              <p className="text-xs text-gray-400">Grandoli Taller Mecánico</p>
            </div>
          </Link>

          {/* Navegación */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/lubricentro"
              className="flex items-center space-x-2 text-gray-300 hover:text-gtm-orange transition-colors"
            >
              <Package className="w-5 h-5" />
              <span>Lubricentro</span>
            </Link>
            <Link
              href="/herramientas"
              className="flex items-center space-x-2 text-gray-300 hover:text-gtm-orange transition-colors"
            >
              <Wrench className="w-5 h-5" />
              <span>Herramientas</span>
            </Link>
            <Link
              href="/reportes"
              className="flex items-center space-x-2 text-gray-300 hover:text-gtm-orange transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              <span>Reportes</span>
            </Link>
            <Link
              href="/configuracion"
              className="flex items-center space-x-2 text-gray-300 hover:text-gtm-orange transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>Config</span>
            </Link>
          </nav>

          {/* Usuario */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-white">Admin</p>
              <p className="text-xs text-gray-400">GTM</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gtm-orange flex items-center justify-center font-bold">
              A
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
