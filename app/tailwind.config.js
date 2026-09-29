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
          ocupada: "#eab308",      // ama