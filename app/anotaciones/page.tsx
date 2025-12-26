"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Anotacion, TIPOS_ANOTACION } from "@/types/anotaciones";
import { obtenerAnotaciones, eliminarAnotacion, cancelarAnotacion } from "@/actions/anotaciones";
import AnotacionForm from "@/components/AnotacionForm";

export default function AnotacionesPage() {
  const [anotaciones, setAnotaciones] = useState<Anotacion[]>([]);
  const [filteredAnotaciones, setFilteredAnotaciones] = useState<Anotacion[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTipo, setSelectedTipo] = useState("Todos");
  const [showForm, setShowForm] = useState(false);
  const [editingAnotacion, setEditingAnotacion] = useState<
    Anotacion | undefined
  >();
  const [loading, setLoading] = useState(true);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Cargar anotaciones
  const cargarAnotaciones = async () => {
    setLoading(true);
    const result = await obtenerAnotaciones();
    if (result.success && result.data) {
      setAnotaciones(result.data);
      setFilteredAnotaciones(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarAnotaciones();
  }, []);

  // Filtrar anotaciones
  useEffect(() => {
    let filtered = anotaciones;

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (anotacion) =>
          anotacion.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          anotacion.descripcion
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          anotacion.items.some((item) =>
            item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    // Filtrar por tipo
    if (selectedTipo !== "Todos") {
      filtered = filtered.filter(
        (anotacion) => anotacion.tipo === selectedTipo
      );
    }

    setFilteredAnotaciones(filtered);
    setCurrentPage(1);
  }, [searchTerm, selectedTipo, anotaciones]);

  // Calcular items de la página actual
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAnotaciones = filteredAnotaciones.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredAnotaciones.length / itemsPerPage);

  // Cambiar de página
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Abrir formulario para nueva anotación
  const handleNuevo = () => {
    setEditingAnotacion(undefined);
    setShowForm(true);
  };

  // Abrir formulario para editar
  const handleEditar = (anotacion: Anotacion) => {
    setEditingAnotacion(anotacion);
    setShowForm(true);
  };

  // Eliminar anotación
  const handleEliminar = async (id: string, titulo: string) => {
    // Modal simple por prompt: 1) Cancelar (restablecer stock) 2) Eliminar (sin tocar stock)
    const opcion = prompt(
      `Acción sobre "${titulo}":\n- Escribí 1 para CANCELAR (repone stock y elimina)\n- Escribí 2 para ELIMINAR (sin reponer stock)`,
      "1"
    );
    if (opcion === null) return;
    if (opcion !== "1" && opcion !== "2") {
      alert("Opción inválida. Usa 1 o 2.");
      return;
    }

    const useCancelar = opcion === "1";
    const result = useCancelar
      ? await cancelarAnotacion(id)
      : await eliminarAnotacion(id);
    if (result.success) {
      cargarAnotaciones();
    } else {
      alert(result.error || "Error al procesar la solicitud");
    }
  };

  // Cerrar formulario
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAnotacion(undefined);
  };

  // Formatear fecha
  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Formatear tipo
  const formatearTipo = (tipo: string) => {
    return tipo.replace(/_/g, " ");
  };

  // Truncar descripción larga con puntos suspensivos
  const truncarDescripcion = (texto?: string, max: number = 120) => {
    if (!texto) return "-";
    if (texto.length <= max) return texto;
    return texto.slice(0, max).trimEnd() + "…";
  };

  // Calcular total de todas las anotaciones filtradas
  const totalGeneral = filteredAnotaciones.reduce(
    (sum, anotacion) => sum + (anotacion.total || 0),
    0
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-red-600 p-2 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Anotaciones</h1>
                <p className="text-gray-400">
                  Gestión de gastos y anotaciones del negocio
                </p>
              </div>
            </div>
            <button
              onClick={handleNuevo}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nueva anotación
            </button>
          </div>

          {/* Resumen total */}
          {filteredAnotaciones.length > 0 && (
            <div className="bg-neutral-900 border border-red-600/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-red-500" />
                  <span className="text-gray-400">
                    Total{" "}
                    {selectedTipo !== "Todos"
                      ? `(${formatearTipo(selectedTipo)})`
                      : ""}
                    :{" "}
                  </span>
                </div>
                <span className="text-2xl font-bold text-red-500">
                  ${totalGeneral.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="mb-6 space-y-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por título, descripción o items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
            />
          </div>

          {/* Filtros por tipo */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedTipo("Todos")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedTipo === "Todos"
                  ? "bg-red-600 text-white"
                  : "bg-neutral-800 text-gray-300 hover:bg-neutral-700"
              }`}
            >
              Todos
            </button>
            {TIPOS_ANOTACION.map((tipo) => (
              <button
                key={tipo}
                onClick={() => setSelectedTipo(tipo)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  selectedTipo === tipo
                    ? "bg-red-600 text-white"
                    : "bg-neutral-800 text-gray-300 hover:bg-neutral-700"
                }`}
              >
                {formatearTipo(tipo)}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla de anotaciones */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Cargando anotaciones...</p>
          </div>
        ) : filteredAnotaciones.length === 0 ? (
          <div className="bg-neutral-900 rounded-lg p-12 text-center border border-neutral-800">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              {searchTerm || selectedTipo !== "Todos"
                ? "No se encontraron anotaciones con los filtros aplicados"
                : "No hay anotaciones registradas"}
            </p>
            {!searchTerm && selectedTipo === "Todos" && (
              <button
                onClick={handleNuevo}
                className="mt-4 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Crear primera anotación
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Lista móvil */}
            <div className="md:hidden space-y-3">
              {currentAnotaciones.map((anotacion) => (
                <div
                  key={anotacion.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        {formatearFecha(anotacion.fecha)}
                      </div>
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-600/20 text-red-400 border border-red-600/30">
                          {formatearTipo(anotacion.tipo)}
                        </span>
                      </div>
                      <div className="mt-2 text-white font-medium truncate">
                        {anotacion.titulo}
                      </div>
                      <div
                        className="text-sm text-gray-400 line-clamp-2"
                        title={anotacion.descripcion || "-"}
                      >
                        {truncarDescripcion(anotacion.descripcion, 160)}
                      </div>
                      <div className="mt-1 text-sm text-gray-400">
                        {anotacion.items.length} item
                        {anotacion.items.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-red-500">
                        ${(anotacion.total || 0).toFixed(2)}
                      </div>
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditar(anotacion)}
                          className="p-2 hover:bg-neutral-700 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4 text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleEliminar(anotacion.id!, anotacion.titulo)}
                          className="p-2 hover:bg-neutral-700 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabla escritorio */}
            <div className="hidden md:block bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-800 border-b border-neutral-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Título
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Descripción
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {currentAnotaciones.map((anotacion) => (
                      <tr
                        key={anotacion.id}
                        className="hover:bg-neutral-800/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            {formatearFecha(anotacion.fecha)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-600/20 text-red-400 border border-red-600/30">
                            {formatearTipo(anotacion.tipo)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-white">
                            {anotacion.titulo}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className="text-sm text-gray-400 max-w-xs truncate"
                            title={anotacion.descripcion || "-"}
                          >
                            {truncarDescripcion(anotacion.descripcion, 120)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-400">
                            {anotacion.items.length} item
                            {anotacion.items.length !== 1 ? "s" : ""}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-semibold text-red-500">
                            ${(anotacion.total || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleEditar(anotacion)}
                              className="p-2 hover:bg-neutral-700 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4 text-blue-400" />
                            </button>
                            <button
                              onClick={() =>
                                handleEliminar(anotacion.id!, anotacion.titulo)
                              }
                              className="p-2 hover:bg-neutral-700 rounded-lg transition-colors"
                              title="Eliminar"
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

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-gray-400">
                  Mostrando{" "}
                  <span className="font-medium text-white">
                    {indexOfFirstItem + 1}
                  </span>{" "}
                  a{" "}
                  <span className="font-medium text-white">
                    {Math.min(indexOfLastItem, filteredAnotaciones.length)}
                  </span>{" "}
                  de{" "}
                  <span className="font-medium text-white">
                    {filteredAnotaciones.length}
                  </span>{" "}
                  anotaciones
                </p>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <span className="text-sm text-gray-400">
                    Página{" "}
                    <span className="font-medium text-white">
                      {currentPage}
                    </span>{" "}
                    de{" "}
                    <span className="font-medium text-white">{totalPages}</span>
                  </span>

                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <AnotacionForm
          anotacion={editingAnotacion}
          onClose={handleCloseForm}
          onSuccess={cargarAnotaciones}
        />
      )}
    </div>
  );
}
