"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ItemTaller, TIPOS_ITEMS_TALLER } from "@/types/inventario-taller";
import {
  obtenerItemsTaller,
  eliminarItemTaller,
} from "@/actions/inventario-taller";
import ItemTallerForm from "@/components/ItemTallerForm";

export default function InventarioTallerPage() {
  const [items, setItems] = useState<ItemTaller[]>([]);
  const [filteredItems, setFilteredItems] = useState<ItemTaller[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTipo, setSelectedTipo] = useState("Todos");
  const [selectedUbicacion, setSelectedUbicacion] = useState("Todos");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemTaller | undefined>();
  const [loading, setLoading] = useState(true);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Obtener ubicaciones únicas de los items (filtrar vacíos)
  const ubicaciones = [
    "Todos",
    ...new Set(
      items.filter((item) => item.ubicacion).map((item) => item.ubicacion!)
    ),
  ];

  // Cargar items
  const cargarItems = async () => {
    setLoading(true);
    const result = await obtenerItemsTaller();
    if (result.success && result.data) {
      setItems(result.data);
      setFilteredItems(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarItems();
  }, []);

  // Filtrar items
  useEffect(() => {
    let filtered = items;

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.marca &&
            item.marca.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.ubicacion &&
            item.ubicacion.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtrar por tipo
    if (selectedTipo !== "Todos") {
      filtered = filtered.filter((item) => item.tipo === selectedTipo);
    }

    // Filtrar por ubicación
    if (selectedUbicacion !== "Todos") {
      filtered = filtered.filter(
        (item) => item.ubicacion === selectedUbicacion
      );
    }

    setFilteredItems(filtered);
    setCurrentPage(1); // Reset a página 1 cuando cambian los filtros
  }, [searchTerm, selectedTipo, selectedUbicacion, items]);

  // Calcular items de la página actual
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

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

  // Abrir formulario para nuevo item
  const handleNuevo = () => {
    setEditingItem(undefined);
    setShowForm(true);
  };

  // Abrir formulario para editar
  const handleEditar = (item: ItemTaller) => {
    setEditingItem(item);
    setShowForm(true);
  };

  // Eliminar item
  const handleEliminar = async (id: string, nombre: string) => {
    if (confirm(`¿Estás seguro de eliminar "${nombre}"?`)) {
      const result = await eliminarItemTaller(id);
      if (result.success) {
        cargarItems();
      } else {
        alert("Error al eliminar el item");
      }
    }
  };

  // Cerrar formulario
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(undefined);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-red-600 p-2 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">
              Inventario de Taller
            </h1>
          </div>
          <p className="text-gray-400">
            Herramientas, equipos, oficina y todo lo del taller
          </p>
        </div>

        {/* Barra de acciones */}
        <div className="bg-neutral-900 rounded-lg p-6 mb-6 border border-neutral-800">
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

            {/* Botón agregar */}
            <button
              onClick={handleNuevo}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Item</span>
            </button>
          </div>

          {/* Filtros por Tipo */}
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-400 mb-2">TIPO:</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedTipo("Todos")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedTipo === "Todos"
                    ? "bg-red-600 text-white"
                    : "bg-neutral-800 text-gray-300 hover:bg-neutral-700"
                }`}
              >
                Todos
              </button>
              {TIPOS_ITEMS_TALLER.map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setSelectedTipo(tipo)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedTipo === tipo
                      ? "bg-red-600 text-white"
                      : "bg-neutral-800 text-gray-300 hover:bg-neutral-700"
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Filtros por Ubicación */}
          {ubicaciones.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2">
                UBICACIÓN:
              </p>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {ubicaciones.map((ubicacion) => (
                  <button
                    key={ubicacion}
                    onClick={() => setSelectedUbicacion(ubicacion)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedUbicacion === ubicacion
                        ? "bg-blue-600 text-white"
                        : "bg-neutral-800 text-gray-300 hover:bg-neutral-700"
                    }`}
                  >
                    {ubicacion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabla de items */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Cargando inventario...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-neutral-900 rounded-lg p-12 text-center border border-neutral-800">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              {searchTerm ||
              selectedTipo !== "Todos" ||
              selectedUbicacion !== "Todos"
                ? "No se encontraron items con esos filtros"
                : "No hay items registrados"}
            </p>
            <button
              onClick={handleNuevo}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Agregar Primer Item
            </button>
          </div>
        ) : (
          <>
            {/* Lista móvil */}
            <div className="md:hidden space-y-3">
              {currentItems.map((item) => (
                <div key={item.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-white font-medium truncate">{item.nombre}</div>
                      <div className="mt-1 flex items-center gap-2">
                        {item.tipo ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-700 text-gray-300">{item.tipo}</span>
                        ) : (
                          <span className="text-xs text-gray-500">-</span>
                        )}
                        <span className="text-sm text-gray-400">{item.marca || "-"}</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-300">
                        Ubicación: {item.ubicacion ? (
                          <span className="text-blue-400 font-medium">{item.ubicacion}</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-300">Cantidad: <span className="text-white font-semibold">{item.cantidad || 0}</span></div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => handleEditar(item)}
                        className="p-2 hover:bg-neutral-800 rounded-lg"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4 text-blue-400" />
                      </button>
                      <button
                        onClick={() => handleEliminar(item.id!, item.nombre)}
                        className="p-2 hover:bg-neutral-800 rounded-lg"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabla escritorio */}
            <div className="hidden md:block bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Marca
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Ubicación
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {currentItems.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-neutral-800/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-white">
                            {item.nombre}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.tipo ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-700 text-gray-300">
                              {item.tipo}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-white">
                            {item.marca || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.ubicacion ? (
                            <span className="text-sm text-blue-400 font-medium">
                              {item.ubicacion}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-white">
                            {item.cantidad || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditar(item)}
                              className="p-2 hover:bg-neutral-700 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4 text-blue-400" />
                            </button>
                            <button
                              onClick={() =>
                                handleEliminar(item.id!, item.nombre)
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
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-gray-400">
                Mostrando{" "}
                <span className="font-medium text-white">
                  {indexOfFirstItem + 1}
                </span>{" "}
                a{" "}
                <span className="font-medium text-white">
                  {Math.min(indexOfLastItem, filteredItems.length)}
                </span>{" "}
                de{" "}
                <span className="font-medium text-white">
                  {filteredItems.length}
                </span>{" "}
                items
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
                  <span className="font-medium text-white">{currentPage}</span>{" "}
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
          </>
        )}
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <ItemTallerForm
          item={editingItem}
          onClose={handleCloseForm}
          onSuccess={cargarItems}
        />
      )}
    </div>
  );
}
