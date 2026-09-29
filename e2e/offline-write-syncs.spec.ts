// Criterio de cierre del Sprint 0: un registro creado offline aparece
// en Postgres al reconectar. NO EJECUTADO TODAVÍA — depende de que
// infra/docker-compose.yml esté arriba (falta Docker en esta máquina).
// Se deja aquí para no perder el diseño del test mientras se resuelve
// eso; falta: instalar @playwright/test en package.json, un cliente pg
// (o llamada REST) para el assert final, y credenciales de un usuario
// de prueba seedeado.
import { test, expect } from "@playwright/test";
import { Client } from "pg";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const DB_URL = process.env.E2E_DB_URL ?? "postgres://postgres:devpassword@localhost:5432/postgres";

test("un cambio hecho sin conexión llega a Postgres al reconectar", async ({ page, context }) => {
  await page.goto(BASE_URL);

  // 1) login online normal
  await page.getByPlaceholder("Correo").fill("encargada@test.local");
  await page.getByPlaceholder("Contraseña").fill("password-de-prueba");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("Habitaciones")).toBeVisible();

  // esperar a que PowerSync termine la sincronización inicial antes de
  // cortar la red, para no confundir "aún no llegó" con "está offline"
  await expect(page.getByText("Todo sincronizado")).toBeVisible({ timeout: 15_000 });

  // 2) cortar la red (emulación de corte de señal en Paposo)
  await context.setOffline(true);

  // 3) escribir: debe verse al instante (Optimistic UI, RNF-02), sin
  //    mensajes de error
  await page.getByText("#1").click();
  await expect(page.getByText("en aseo")).toBeVisible();
  await expect(page.getByText("Sin conexión")).toBeVisible();

  // 4) reconectar y esperar a que la cola suba sola (RNF-06/HU-28)
  await context.setOffline(false);
  await expect(page.getByText("Todo sincronizado")).toBeVisible({ timeout: 30_000 });

  // 5) verificar directo en Postgres: el cambio llegó de verdad, no
  //    solo se ve "sincronizado" en la UI
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  try {
    const { rows } = await db.query(
      "select estado from habitacion where numero = 1"
    );
    expect(rows[0]?.estado).toBe("en_aseo");
  } finally {
    await db.end();
  }
});
