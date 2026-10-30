// HU-30 (Sprint 4): Panel de Control y Rendimiento. Verifica que las
// métricas sean REALES (calculadas desde la réplica local, no datos de
// relleno) cruzándolas contra una consulta directa a Postgres hecha en
// el momento, y que el control de acceso por rol sea real: la
// Encargada ni siquiera puede llegar a ver el botón que activa este
// panel (más allá de lo ya probado en seguridad-datos-financieros.spec.ts
// sobre los datos financieros subyacentes).
import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";

const DB_URL =
  process.env.E2E_DB_URL ?? "postgres://postgres:changeme_dev_password@localhost:55432/postgres";

async function omitirTourDeBienvenida(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("pension_myriam_tour_completado_v1", "true");
  });
}

async function login(page: Page, email: string) {
  await page.goto("/");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("Paposo2026!");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("Habitaciones de la Pensión")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Sincronizado")).toBeVisible({ timeout: 20_000 });
}

test.describe("HU-30: panel ejecutivo con datos reales, no de relleno", () => {
  test("Administradora: la ocupación mostrada coincide EXACTO con el estado real de Postgres en ese instante", async ({
    page
  }) => {
    await omitirTourDeBienvenida(page);
    await login(page, "admin@pension-myriam.local");

    // Estado real de las 8 piezas, consultado en el mismo instante en
    // que se abre el panel — si el panel mostrara un número fijo de
    // demo, no coincidiría con esto (que puede variar entre corridas,
    // ya que otros E2E de la suite hacen check-in/checkout reales).
    const db = new Client({ connectionString: DB_URL });
    await db.connect();
    let ocupadasReales: number;
    let totalReales: number;
    try {
      const { rows } = await db.query(
        "select count(*) filter (where estado = 'ocupada') as ocupadas, count(*) as total from habitacion"
      );
      ocupadasReales = Number(rows[0].ocupadas);
      totalReales = Number(rows[0].total);
    } finally {
      await db.end();
    }

    await page.getByRole("button", { name: "Modo Administración" }).click();
    await expect(page.getByText("Panel de Control y Rendimiento")).toBeVisible({ timeout: 15_000 });

    await expect(async () => {
      await expect(
        page.getByText(`(${ocupadasReales} de ${totalReales} piezas)`)
      ).toBeVisible();
    }).toPass({ timeout: 15_000 });

    const porcentajeReal = Math.round((ocupadasReales / totalReales) * 100);
    await expect(page.getByText(`${porcentajeReal}%`).first()).toBeVisible();

    // El semáforo de margen (KPI-06) debe mostrar una de las 3
    // etiquetas reales calculadas por recomendarMargen.ts, nunca un
    // texto fijo ajeno a esa lógica.
    const etiquetasValidas = ["Margen Saludable", "Margen en Riesgo", "Margen Crítico"];
    let algunaVisible = false;
    for (const etiqueta of etiquetasValidas) {
      if (await page.getByText(etiqueta).isVisible().catch(() => false)) {
        algunaVisible = true;
        break;
      }
    }
    expect(algunaVisible).toBe(true);

    // Persistencia offline-first: recargar debe reconstruir el mismo
    // panel desde la réplica local, con la MISMA ocupación real (sin
    // depender de una nueva descarga de red para mostrar algo coherente).
    await page.reload();
    await expect(page.getByText("Habitaciones de la Pensión")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Modo Administración" }).click();
    await expect(page.getByText("Panel de Control y Rendimiento")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`(${ocupadasReales} de ${totalReales} piezas)`)).toBeVisible({
      timeout: 15_000
    });

    // Volver a Modo Día a Día: el toggle es reversible y la pantalla
    // operativa normal sigue intacta.
    await page.getByRole("button", { name: "Modo Día a Día" }).click();
    await expect(page.getByText("Panel de Control y Rendimiento")).not.toBeVisible();
  });

  test("Encargada: no existe ningún control para activar el panel ejecutivo (no solo los datos están ocultos, el botón tampoco se renderiza)", async ({
    page
  }) => {
    await omitirTourDeBienvenida(page);
    await login(page, "encargada@pension-myriam.local");

    await expect(page.getByRole("button", { name: "Modo Administración" })).toHaveCount(0);
    await expect(page.getByText("Panel de Control y Rendimiento")).toHaveCount(0);
  });
});
