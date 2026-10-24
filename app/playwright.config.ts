import { defineConfig } from "@playwright/test";

// Fase 4 (verificación Sprint 1): corre contra el stack real de
// infra/docker-compose.yml + `npm run dev` ya levantados a mano — no
// levanta nada por sí mismo porque el stack completo (Postgres +
// GoTrue + PostgREST + PowerSync + Caddy) es responsabilidad de Docker
// Compose, no de Playwright. Ver informe de cierre para los comandos
// exactos usados en esta sesión.
export default defineConfig({
  testDir: "../e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5174",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  }
});
