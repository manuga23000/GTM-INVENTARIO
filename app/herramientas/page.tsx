"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Filter, Edit2, Trash2, Wrench } from "lucide-react";
import { Herramienta, CATEGORIAS_HERRAMIENTAS } from "@/types/herramienta";
import {
  obtenerHerramientas,
  eliminarHerramienta,
} from "@/actions/herramientas";
import HerramientaForm from "@/components/HerramientaForm";

export default function HerramientasPage() {
  const [herramientas, setHerramientas] = useState<Herramienta[]>([]);
  const [filteredHerramientas, setFilteredHerramientas] = useState<
    Herramienta[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [showForm, setShowForm] = useState(false);
  const [editingHerramienta, setEditingHerramienta] = useState<
    Herramienta | undefined
  >();
  const [loading, setLoading] = useState(true);

  // Cargar herramientas
  const cargarHerramientas = async () => {
    setLoading(true);
    const result = await obtenerHerramientas();
    if (result.success && result.data) {
      setHerramientas(result.data);
      setFilteredHerramientas(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarHerramientas();
  }, []);

  // Filtrar herramientas
  useEffect(() => {
    let filtered = herramientas;

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (h) =>
          h.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          h.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
          h.modelo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por categoría
    if (selectedCategory !== "Todos") {
      filtered = filtered.filter((h) => h.categoria === selectedCategory);
    }

    setFilteredHerramientas(filtered);
  }, [searchTerm, selectedCategory, herramientas]);

  // Abrir formulario para nueva herramienta
  const handleNueva = () => {
    setEditingHerramienta(undefined);
    setShowForm(true);
  };

  // Abrir formulario para editar
  const handleEditar = (herramienta: Herramienta) => {
    setEditingHerramienta(herramienta);
    setShowForm(true);
  };

  // Eliminar herramienta
  const handleEliminar = async (id: string, nombre: string) => {
    if (confirm(`¿Estás seguro de eliminar "${nombre}"?`)) {
      const result = await eliminarHerramienta(id);
      if (result.success) {
        cargarHerramientas();
      } else {
        alert("Error al eliminar la herramienta");
      }
    }
  };

  // Cerrar formulario
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingHerramienta(undefined);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-red-600 p-2 rounded-lg">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">
              Inventario de Herramientas
            </h1>
          </div>
          <p className="text-gray-400">Gestión de herramientas del taller</p>
        </div>

        {/* Barra de acciones */}
        <div className="bg-neutral-900 rounded-lg p-6 mb-6 border border-neutral-800">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Búsqueda */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nombre, marca o modelo..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Botones */}
            <div className="flex flex-wrap gap-3">
              <button className="bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center space-x-2">
                <Filter className="w-4 h-4" />
                <span>Filtros</span>
              </button>
              <button
                onClick={handleNueva}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Herramienta</span>
              </button>
            </div>
          </div>

          {/* Categorías */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setSelectedCategory("Todos")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === "Todos"
                  ? "bg-red-600 text-white"
                  : "bg-neutral-800 text-gray-300 hover:bg-neutral-700"
              }`}
            >
              Todos
            </button>
            {CATEGORIAS_HERRAMIENTAS.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-red-600 text-white"
                    : "bg-neutral-800 text-gray-300 hover:bg-neutral-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla de herramientas */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Cargando herramientas...</p>
          </div>
        ) : filteredHerramientas.length === 0 ? (
          <div className="bg-neutral-900 rounded-lg p-12 text-center border border-neutral-800">
            <Wrench className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              No hay herramientas registradas
            </p>
            <button
              onClick={handleNueva}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Agregar Primera Herramienta
            </button>
          </div>
        ) : (
          <div className="bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Marca / Modelo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Ubicación
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {filteredHerramientas.map((herramienta) => (
                    <tr
                      key={herramienta.id}
                      className="hover:bg-neutral-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">
                          {herramienta.nombre}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">
                          {herramienta.marca}
                        </div>
                        <div className="text-xs text-gray-400">
                          {herramienta.modelo}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-700 text-gray-300">
                          {herramienta.categoria}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-white">
                          {herramienta.cantidad}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-300">
                          {herramienta.ubicacion}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditar(herramienta)}
                            className="p-2 hover:bg-neutral-700 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-blue-400" />
                          </button>
                          <button
                            onClick={() =>
                              handleEliminar(
                                herramienta.id!,
                                herramienta.nombre
                              )
                            }
                            className="p-2 hover:bg-neutral-700 rounded-lg transition-colors"
                          >
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
        )}

        {/* Contador */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Mostrando{" "}
            <span className="font-medium text-white">
              {filteredHerramientas.length}
            </span>{" "}
            de{" "}
            <span className="font-medium text-white">
              {herramientas.length}
            </span>{" "}
            herramientas
          </p>
        </div>
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <HerramientaForm
          herramienta={editingHerramienta}
          onClose={handleCloseForm}
          onSuccess={cargarHerramientas}
        />
      )}
    </div>
  );
}
