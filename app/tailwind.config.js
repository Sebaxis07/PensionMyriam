/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // codificación por color de RNF-04, un solo lugar de verdad.
        // Regla de negocio fija (CLAUDE.md): NO se reemplaza por la
        // paleta de marca de Guiaestilos/, aunque choque con ella.
        estado: {
          disponible: "#16a34a",   // verde
          ocupada: "#eab308",      // amarillo
          en_aseo: "#dc2626",      // rojo
          en_mantencion: "#6b7280" // gris
        },
        // Paleta de marca (Guiaestilos/.../styles.css del kit digital):
        // usar para chrome de la app (headers, botones, fondos, nav),
        // nunca para el color de estado de una habitación.
        brand: {
          sand: "#e1dcd2",
          "sand-deep": "#ebdcbe",
          terracotta: "#D9583B",
          "terracotta-deep": "#731D0A",
          cactus: "#1EAD50",
          ink: "#2a2418",
          card: "#fffaf1",
          border: "#ddd0b3",
          muted: "#7a6f5a"
        }
      },
      fontFamily: {
        // Georgia para títulos, DM Sans para el resto — mismo criterio
        // del kit digital de marca.
        display: ["Georgia", "serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"]
      },
      boxShadow: {
        brand: "0 12px 28px -16px rgba(160, 79, 40, 0.4)",
        card: "0 4px 14px -2px rgba(42, 36, 24, 0.06)",
        "card-hover": "0 8px 24px -4px rgba(42, 36, 24, 0.1)"
      }
    }
  },
  plugins: []
};
