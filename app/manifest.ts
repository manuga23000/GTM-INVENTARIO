import type { MetadataRoute } from "next";

// Manifiesto de la PWA: permite instalar la app en el celular o la computadora
// ("Agregar a pantalla de inicio") y abrirla en pantalla completa con el logo.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "GTM Inventario · Grandoli Taller Mecánico",
    short_name: "GTM",
    description: "Inventario de lubricentro y taller, ventas, gastos y reportes.",
    lang: "es-AR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Accesos directos al mantener presionado el ícono (Android / escritorio)
    shortcuts: [
      { name: "Nueva anotación", short_name: "Anotar", url: "/anotaciones?nueva=1", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Lubricentro", url: "/lubricentro", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Reportes", url: "/reportes", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
