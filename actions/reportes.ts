"use server";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ProductoLubricentro } from "@/types/lubricentro";
import { tipoFiltroDe } from "@/lib/stock";

export interface ProductoFiltro {
  codigo: string;
  marca: string;
  descripcion: string;
  stock: number;
  tipoFiltro?: string;
}

export interface FiltrosPorTipo {
  aceite: ProductoFiltro[];
  combustible: ProductoFiltro[];
  aire: ProductoFiltro[];
  habitaculo: ProductoFiltro[];
  /** Filtros cuyo tipo no se pudo determinar (antes se mezclaban con "aire"). */
  sinClasificar: ProductoFiltro[];
}

export async function obtenerFiltrosOrganizados(): Promise<{
  success: boolean;
  data?: FiltrosPorTipo;
  error?: string;
}> {
  try {
    const snap = await getDocs(
      query(collection(db, "lubricentro"), where("categoria", "==", "Filtros"))
    );

    const data: FiltrosPorTipo = {
      aceite: [],
      combustible: [],
      aire: [],
      habitaculo: [],
      sinClasificar: [],
    };

    snap.forEach((d) => {
      const producto = d.data() as ProductoLubricentro;
      const tipo = tipoFiltroDe(producto);
      const filtro: ProductoFiltro = {
        codigo: producto.codigo || "",
        marca: producto.marca || "",
        descripcion: producto.descripcion || "",
        stock: typeof producto.stock === "number" ? producto.stock : 0,
        tipoFiltro: tipo,
      };
      if (tipo === "Aceite") data.aceite.push(filtro);
      else if (tipo === "Combustible") data.combustible.push(filtro);
      else if (tipo === "Aire") data.aire.push(filtro);
      else if (tipo === "Habitáculo") data.habitaculo.push(filtro);
      else data.sinClasificar.push(filtro);
    });

    const ordenar = (a: ProductoFiltro, b: ProductoFiltro) =>
      (a.codigo || a.descripcion).localeCompare(b.codigo || b.descripcion, "es", {
        numeric: true,
      });
    Object.values(data).forEach((lista: ProductoFiltro[]) => lista.sort(ordenar));

    return { success: true, data };
  } catch (error) {
    console.error("Error al obtener filtros:", error);
    return { success: false, error: "Error al obtener los filtros" };
  }
}
