"use client";
import Link from "next/link";
import { useState } from "react"; // Añadido para menú móvil
import {
  Wrench,
  Package,
  BarChart3,
  Settings,
  Menu,
  X, // Añadidos para menú móvil
} from "lucide-react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-black border-b border-neutral-800 sticky top-0 z-50 animate-fade-in">
      <div className="container mx-auto px-4 py-4 max-w-screen-xl">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center space-x-3 transform hover:scale-105 transition-transform"
          >
            <div className="bg-gtm-orange p-2 rounded-lg">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">GTM Inventario</h1>
              <p className="text-xs text-gray-400">Grandoli Taller Mecánico</p>
            </div>
          </Link>

          {/* Navegación desktop */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/lubricentro"
              className="flex items-center space-x-2 text-gray-300 hover:text-gtm-orange transition-colors transform hover:scale-105"
            >
              <Package className="w-5 h-5" />
              <span>Lubricentro</span>
            </Link>

            <Link
              href="/inventario-taller"
              className="flex items-center space-x-2 text-gray-300 hover:text-gtm-orange transition-colors transform hover:scale-105"
            >
              <Wrench className="w-5 h-5" />
              <span>Inventario Taller</span>
            </Link>

            <Link
              href="/reportes"
              className="flex items-center space-x-2 text-gray-300 hover:text-gtm-orange transition-colors transform hover:scale-105"
            >
              <BarChart3 className="w-5 h-5" />
              <span>Reportes</span>
            </Link>

            <Link
              href="/configuracion"
              className="flex items-center space-x-2 text-gray-300 hover:text-gtm-orange transition-colors transform hover:scale-105"
            >
              <Settings className="w-5 h-5" />
              <span>Config</span>
            </Link>
          </nav>

          {/* Menú móvil toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:text-gtm-orange transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Usuario */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-white">Admin</p>
              <p className="text-xs text-gray-400">GTM</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gtm-orange flex items-center justify-center font-bold transform hover:scale-110 transition-transform">
              A
            </div>
          </div>
        </div>

        {/* Menú móvil desplegable */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute left-0 right-0 top-full bg-black border-b border-neutral-800 animate-slide-in">
            <nav className="flex flex-col space-y-4 p-4">
              <Link
                href="/lubricentro"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 text-gray-300 hover:text-gtm-orange transition-colors"
              >
                <Package className="w-5 h-5" />
                <span>Lubricentro</span>
              </Link>
              <Link
                href="/inventario-taller"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 text-gray-300 hover:text-gtm-orange transition-colors"
              >
                <Wrench className="w-5 h-5" />
                <span>Inventario Taller</span>
              </Link>
              <Link
                href="/reportes"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 text-gray-300 hover:text-gtm-orange transition-colors"
              >
                <BarChart3 className="w-5 h-5" />
                <span>Reportes</span>
              </Link>
              <Link
                href="/configuracion"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 text-gray-300 hover:text-gtm-orange transition-colors"
              >
                <Settings className="w-5 h-5" />
                <span>Config</span>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
