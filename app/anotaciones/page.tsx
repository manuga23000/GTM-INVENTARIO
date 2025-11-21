"use client";
import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import AnotacionForm from "@/components/AnotacionForm";

export default function AnotacionesPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8 bg-black min-h-screen">
      <div className="flex items-center justify-between mb-6 border-b border-red-600/30 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-600/20 p-3 rounded-lg">
            <FileText className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-white">Anotaciones</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva anotación
        </button>
      </div>

      {/* Aquí podríamos listar anotaciones más adelante */}
      <p className="text-gray-400">Próximamente: listado de anotaciones.</p>

      {showForm && (
        <AnotacionForm
          onClose={() => setShowForm(false)}
          onSuccess={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
