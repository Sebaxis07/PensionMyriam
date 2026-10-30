// Registro opcional de aseo por habitación y cama (0027_aseo_detallado.sql).
// Cubre: aseo rápido y detallado desde RoomSheet, historial, y que un
// registro offline sincroniza sin duplicar ni cambiar el estado de la
// habitación. Mismo patrón que e2e/offline-write-syncs.spec.ts.
//
// Requiere, levantados a mano antes de correr `npx playwright test`:
//   1) infra/docker-compose.yml arriba.
//   2) bash db/seed-demo.sh (turistas) — alcanza para estos flujos.
//   3) `npm run dev` en app/ con app/.env apuntando a ese stack.
import { test, expect } from "@playwright/test";
import { Client } from "pg";

const DB_URL =
  process.env.E2E_DB_URL ?? "postgres://postgres:changeme_dev_password@localhost:55432/postgres";

async function omitirTourDeBienvenida(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem("pension_myriam_tour_completado_v1", "true");
  });
}

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator('input[type="email"]').fill("admin@pension-myriam.local");
  await page.locator('input[type="password"]').fill("Paposo2026!");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("Habitaciones de la Pensión")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Sincronizado")).toBeVisible({ timeout: 20_000 });
}

test("registrar aseo rápido no cambia el estado de la habitación", async ({ page }) => {
  await omitirTourDeBienvenida(page);
  await login(page);

  // Pieza #5 (seed-demo.sh): Disponible, sin reserva — el registro de
  // aseo debe poder completarse igual, sin importar el estado.
  await page.getByRole("button", { name: /^#5 /, exact: false }).click();
  await expect(page.getByText("Disponible").first()).toBeVisible();

  await page.getByRole("button", { name: "Registrar aseo" }).click();
  await page.getByRole("button", { name: "Aseo realizado" }).click();

  await expect(page.getByText(/Aseo de Pieza #5 registrado/)).toBeVisible({ timeout: 5_000 });
  // El estado de la pieza no debe haber cambiado por el registro.
  await expect(page.getByRole("button", { name: /^#5 Disponible/ })).toBeVisible();
});

test("registrar aseo detallado con tareas, observación y marca de pendiente; verlo en el historial", async ({
  page
}) => {
  await omitirTourDeBienvenida(page);
  await login(page);

  // Pieza #2 (seed-demo.sh): Ocupada — una habitación ocupada también
  // puede recibir el registro detallado sin cambiar su estado.
  await page.getByRole("button", { name: /^#2 /, exact: false }).click();
  await expect(page.getByText("Ocupada").first()).toBeVisible();

  await page.getByRole("button", { name: "Registrar aseo" }).click();
  await page.getByRole("button", { name: "Agregar detalles (opcional)" }).click();
  await page.getByRole("checkbox", { name: "Barrer" }).check();
  await page.getByPlaceholder(/Falta cambiar sábana/).fill("Falta revisar la llave del baño");
  await page.getByPlaceholder("Ej: cuñada de María").fill("cuñada de María");
  await page.getByRole("checkbox", { name: /Marcar como pendiente/ }).check();
  await page.getByRole("button", { name: "Guardar detalle" }).click();

  await expect(page.getByText(/Detalle de aseo de Pieza #2 guardado/)).toBeVisible({ timeout: 5_000 });
  // Sigue Ocupada: el registro detallado no toca la máquina de estados.
  await expect(page.getByRole("button", { name: /^#2 Ocupada/ })).toBeVisible();

  // La ficha de la pieza #2 sigue abierta (cerrar solo el modal de
  // registro la deja ahí) — se consulta el historial directamente.
  await page.getByRole("button", { name: "Historial de aseo" }).click();

  await expect(page.getByText("Aseo detallado").first()).toBeVisible();
  await expect(page.getByText("Barrer").first()).toBeVisible();
  await expect(page.getByText('"Falta revisar la llave del baño"')).toBeVisible();
  await expect(page.getByText("cuñada de María").first()).toBeVisible();
  await expect(page.getByText("Pendiente").first()).toBeVisible();
});

test("una pieza sin ningún registro muestra 'Sin registros de aseo', nunca 'Sucio'", async ({ page }) => {
  await omitirTourDeBienvenida(page);
  await login(page);

  // Pieza #1 (seed-demo.sh): nunca tocada por ningún otro flujo de esta
  // suite ni por los seeds (los demás tests usan #2, #5 y #7).
  await page.getByRole("button", { name: /^#1 /, exact: false }).click();
  await page.getByRole("button", { name: "Historial de aseo" }).click();

  await expect(page.getByText("Sin registros de aseo para esta pieza.")).toBeVisible();
  await expect(page.getByText(/no significa que la pieza esté sucia/)).toBeVisible();
  await expect(page.getByText("Sucio", { exact: true })).toHaveCount(0);
});

test("un registro de aseo offline sincroniza a Postgres sin duplicar y sin cambiar el estado", async ({
  page,
  context
}) => {
  await omitirTourDeBienvenida(page);
  await login(page);

  await page.getByRole("button", { name: /^#7 /, exact: false }).click();
  await expect(page.getByText("Disponible").first()).toBeVisible();

  await context.setOffline(true);

  await page.getByRole("button", { name: "Registrar aseo" }).click();
  await page.getByRole("button", { name: "Aseo realizado" }).click();
  await expect(page.getByText(/Aseo de Pieza #7 registrado/)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(/error/i)).toHaveCount(0);

  await context.setOffline(false);

  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  try {
    const LIMITE_MS = 60_000;
    const inicio = Date.now();
    let n = 0;
    while (Date.now() - inicio < LIMITE_MS) {
      const { rows } = await db.query(
        `select count(*)::int as n from aseo a
         join habitacion h on h.id = a.habitacion_id
         where h.numero = 7`
      );
      n = rows[0]?.n ?? 0;
      if (n > 0) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    expect(n).toBe(1);

    const { rows: estado } = await db.query("select estado as v from habitacion where numero = 7");
    expect(estado[0]?.v).toBe("disponible");
  } finally {
    await db.end();
  }
});
