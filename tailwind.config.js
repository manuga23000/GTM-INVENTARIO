/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "gtm-dark": "#0f0f0f",
        "gtm-darker": "#0a0a0a",
        "gtm-gray": "#1a1a1a",
        "gtm-lightgray": "#2a2a2a",
        "gtm-orange": "#ff6b35",
        "gtm-orangeLight": "#ff8555",
        "gtm-orangeDark": "#e55525",
      },
    },
  },
  plugins: [],
};
