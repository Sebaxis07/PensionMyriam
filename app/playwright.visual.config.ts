import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./pruebas-ui",
  testMatch: "ui-sprints-1-2.visual.ts",
  timeout: 30_000,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:5182", channel: "chrome", trace: "retain-on-failure" }
});
