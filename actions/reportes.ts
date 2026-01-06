"use server";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ProductoLubricentro } from "@/types/lubricentro";

export interface FiltrosPorTipo {
  aceite: ProductoFiltro[];
  combustible: ProductoFiltro[];
  aire: ProductoFiltro[];
  habitaculo: ProductoFiltro[];
}

export interface ProductoFiltro {
  codigo: string;
  marca: string;
  descripcion: string;
  stock: number;
  tipoFiltro?: string;
}

export async function obtenerFiltrosOrganizados(): Promise<{
  success: boolean;
  data?: FiltrosPorTipo;
  error?: string;
}> {
  try {
    // Obtener todos los productos de la categoría "Filtros"
    const q = query(
      collection(db, "lubricentro"),
      where("categoria", "==", "Filtros")
    );
    const querySnapshot = await getDocs(q);

    const filtrosAceite: ProductoFiltro[] = [];
    const filtrosCombustible: ProductoFiltro[] = [];
    const filtrosAire: ProductoFiltro[] = [];
    const filtrosHabitaculo: ProductoFiltro[] = [];

    querySnapshot.forEach((doc) => {
      const producto = doc.data() as ProductoLubricentro;

      const filtro: ProductoFiltro = {
        codigo: producto.codigo || "",
        marca: producto.marca || "",
        descripcion: producto.descripcion || "",
        stock: producto.stock || 0,
        tipoFiltro: producto.tipoFiltro,
      };

      // Organizar por tipo de filtro
      if (producto.tipoFiltro === "Aceite") {
        filtrosAceite.push(filtro);
      } else if (producto.tipoFiltro === "Combustible") {
        filtrosCombustible.push(filtro);
      } else if (producto.tipoFiltro === "Aire") {
        filtrosAire.push(filtro);
      } else if (producto.tipoFiltro === "Habitáculo") {
        filtrosHabitaculo.push(filtro);
      } else {
        // Si no tiene tipo especificado, intentar determinar por la descripción
        const desc = producto.descripcion?.toLowerCase() || "";
        if (desc.includes("aceite")) {
          filtrosAceite.push(filtro);
        } else if (
          desc.includes("combustible") ||
          desc.includes("nafta") ||
          desc.includes("diesel")
        ) {
          filtrosCombustible.push(filtro);
        } else if (desc.includes("aire")) {
          filtrosAire.push(filtro);
        } else {
          // Por defecto, lo ponemos en aire si no está claro
          filtrosAire.push(filtro);
        }
      }
    });

    // Ordenar cada grupo alfabéticamente por descripción
    const ordenar = (a: ProductoFiltro, b: ProductoFiltro) =>
      a.descripcion.localeCompare(b.descripcion);

    filtrosAceite.sort(ordenar);
    filtrosCombustible.sort(ordenar);
    filtrosAire.sort(ordenar);
    filtrosHabitaculo.sort(ordenar);

    return {
      success: true,
      data: {
        aceite: filtrosAceite,
        combustible: filtrosCombustible,
        aire: filtrosAire,
        habitaculo: filtrosHabitaculo,
      },
    };
  } catch (error) {
    console.error("Error al obtener filtros:", error);
    return {
      success: false,
      error: "Error al obtener los filtros",
    };
  }
}
