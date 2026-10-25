// HU-22/HU-23 (Sprint 4): registrar una compra de insumo real contra el
// stack completo y confirmar que el costo promedio ponderado (PMP) se
// actualiza — y que la fila nunca se duplica ni genera un rechazo
// permanente al sincronizar (ver connector.ts: el PATCH local a insumo
// se omite a propósito, solo el insert en compra_insumo sincroniza).
import { test, expect } from "@playwright/test";
import { Client } from "pg";

const DB_URL =
  process.env.E2E_DB_URL ?? "postgres://postgres:changeme_dev_password@localhost:55432/postgres";

async function omitirTourDeBienvenida(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem("pension_myriam_tour_completado_v1", "true");
  });
}

test("HU-22/HU-23: registrar una compra de insumo actualiza el costo promedio ponderado, sin duplicar ni quedar rechazada", async ({
  page
}) => {
  await omitirTourDeBienvenida(page);

  await page.goto("/");
  // Solo la Administradora ve el módulo de Costos (HU-22 a HU-26 son
  // financieros — la Encargada ni siquiera tiene el botón de navegación).
  await page.locator('input[type="email"]').fill("admin@pension-myriam.local");
  await page.locator('input[type="password"]').fill("Paposo2026!");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("Habitaciones de la Pensión")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Sincronizado")).toBeVisible({ timeout: 20_000 });

  await page.locator("#tour-nav-costos").click();
  await expect(page.getByRole("button", { name: "+ Anotar Compra" })).toBeVisible({ timeout: 10_000 });

  const nombreInsumo = `Pollo entero E2E ${Date.now()}`;

  await page.getByRole("button", { name: "+ Anotar Compra" }).click();
  await page.getByPlaceholder("Ej. Pollo entero, Papas, Gas 45kg...").fill(nombreInsumo);
  await page.getByPlaceholder("Ej. 45000").fill("20000");
  await page.getByPlaceholder("Ej. 10").fill("10");
  await page.getByRole("button", { name: "Guardar Compra de Mercadería" }).click();

  // La compra queda visible al instante (optimista, local).
  await expect(page.getByText(nombreInsumo).first()).toBeVisible({ timeout: 10_000 });

  // Confirmar en Postgres: exactamente 1 compra, costo_promedio correcto
  // para un insumo nuevo ($20.000 / 10 = $2.000) — ni duplicado por un
  // reintento de sincronización, ni inflado por el PATCH optimista a
  // insumo que connector.ts omite a propósito (ver HU-22).
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  try {
    await expect(async () => {
      const { rows } = await db.query(
        `select i.costo_promedio::float as costo, i.cantidad_total::float as cantidad,
                (select count(*)::int from compra_insumo where insumo_id = i.id) as n_compras
         from insumo i
         where i.nombre = $1`,
        [nombreInsumo]
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].costo).toBe(2000);
      expect(rows[0].cantidad).toBe(10);
      expect(rows[0].n_compras).toBe(1);
    }).toPass({ timeout: 20_000 });
  } finally {
    await db.end();
  }
});
