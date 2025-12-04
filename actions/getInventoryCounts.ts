import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export async function getInventoryCounts() {
  try {
    // Lubricentro productos
    const lubricentroRef = collection(db, "lubricentro");
    const lubricentroSnapshot = await getDocs(lubricentroRef);
    const totalLubricentroProducts = lubricentroSnapshot.size;

    // Sin umbral de stock mínimo, por ahora no calculamos "stock bajo"
    const lowStockLubricentro = 0;

    // Taller inventario
    const tallerRef = collection(db, "inventario_taller");
    const tallerSnapshot = await getDocs(tallerRef);
    const totalTallerItems = tallerSnapshot.size;

    // Calcular valor total del inventario (Lubricentro)
    let totalInventoryValue = 0;
    lubricentroSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.stock && data.precioCosto) {
        totalInventoryValue += data.stock * data.precioCosto;
      }
    });

    return {
      lubricentroProductos: totalLubricentroProducts,
      tallerItems: totalTallerItems,
      lowStockItems: lowStockLubricentro,
      totalInventoryValue: Math.round(totalInventoryValue),
    };
  } catch (error) {
    console.error("Error fetching inventory counts:", error);
    return {
      lubricentroProductos: 0,
      tallerItems: 0,
      lowStockItems: 0,
      totalInventoryValue: 0,
    };
  }
}
