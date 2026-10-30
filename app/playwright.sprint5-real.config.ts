import { defineConfig } from "@playwright/test";
// Dos regresiones de lectura existentes: no cambian roles, cuentas ni datos.
export default defineConfig({
  testDir: "../e2e", testMatch: "sprint5-cuentas-seguridad.spec.ts",
  grep: /HU-36: la réplica local de la Encargada|HU-36: la Administradora SÍ/,
  workers: 1, timeout: 60000, reporter: [["list"]],
  outputDir: process.env.UI_EVIDENCIA ? `${process.env.UI_EVIDENCIA}/backend` : "test-results/backend",
  use: { baseURL: "http://127.0.0.1:5196", channel: "chrome", trace: "off", video: "off", screenshot: "off" }
});
