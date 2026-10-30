import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./pruebas-ui-sprint5", testMatch: "*.visual.ts", workers: 1,
  timeout: 30000, reporter: [["list"]],
  outputDir: process.env.UI_EVIDENCIA ? `${process.env.UI_EVIDENCIA}/resultados` : "test-results",
  use: { baseURL: process.env.UI_URL ?? "http://127.0.0.1:5195", channel: "chrome", trace: "off" }
});
