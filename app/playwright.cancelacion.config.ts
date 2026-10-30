import { defineConfig } from "@playwright/test";
export default defineConfig({testDir:"./pruebas-cancelacion",testMatch:"*.e2e.ts",workers:1,timeout:60000,reporter:[["list"]],
  outputDir:process.env.CANCELACION_EVIDENCIA ? `${process.env.CANCELACION_EVIDENCIA}/resultados` : "test-results/cancelacion",
  use:{baseURL:"http://127.0.0.1:5196",channel:"chrome",trace:"off",video:"off",screenshot:"off"}});
