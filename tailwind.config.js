/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      zIndex: {
        9999: "9999", // para modales y overlays
      },
      colors: {
        "gtm-dark": "#0f0f0f",
        "gtm-darker": "#0a0a0a",
        "gtm-gray": "#1a1a1a",
        "gtm-lightgray": "#2a2a2a",
        "gtm-orange": "#ff6b35",
        "gtm-orangeLight": "#ff8555",
        "gtm-orangeDark": "#e55525",
      },
      // Añadido: Animaciones personalizadas
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
