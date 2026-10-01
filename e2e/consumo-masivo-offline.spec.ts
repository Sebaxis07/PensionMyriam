// HU-14: registrar consumo masivo sin conexión, recargar, reconectar,
// sin duplicados en Postgres. NO EJECUTADO TODAVÍA — igual que
// offline-write-syncs.spec.ts (Sprint 0), depende de:
//   1) instalar @playwright/test y pg en app/package.json,
//   2) que ConsumoScreen (o su reemplazo de Antigravity) esté montada
//      en una ruta real de la app — hoy solo existe como pantalla
//      mínima sin estilo en app/src/screens/sprint2/, sin navegación.
// Se deja el diseño del test para no perderlo; el flujo que ejercita
// (consumoRapido -> N escrituras independientes) ya está probado por
// separado con Vitest (mocks) en
// app/src/features/consumo/consumoRapido.test.ts.
import { test, expect } from "@playwright/test";
import { Client } from "pg";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const DB_URL = process.env.E2E_DB_URL ?? "postgres://postgres:changeme_dev_password@localhost:5432/postgres";

test("consumo masivo offline: recarga, reconecta, sin duplicados", async ({ page, context }) => {
  await page.goto(BASE_URL);

  await page.getByPlaceholder("Correo").fill("encargada@pension-myriam.local");
  await page.getByPlaceholder("Contraseña").fill("Paposo2026!");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("Todo sincronizado")).toBeVisible({ timeout: 15_000 });

  // Ir al panel de consumo rápido de una empresa de demo (ver
  // db/seed-demo-empresa.sh) y elegir "almuerzo".
  await page.getByRole("link", { name: "Consumo" }).click();
  await page.getByRole("combobox").selectOption("almuerzo");

  // Cortar la red antes de marcar (emulación de corte de señal).
  await context.setOffline(true);

  // Marcar a los 4 trabajadores de demo de una vez — sin mensajes de
  // error ni tiempos de espera visibles (RNF-02).
  const nombres = ["Pedro Almonte", "Luis Vergara", "Manuel Rojas", "Sergio Cortés"];
  for (const nombre of nombres) {
    await page.getByRole("checkbox", { name: nombre }).check();
  }
  await page.getByRole("button", { name: /Marcar almuerzo/ }).click();

  // Debe verse guardado al instante, offline.
  for (const nombre of nombres) {
    await expect(page.getByText(`${nombre} (ya registrado)`)).toBeVisible();
  }

  // Recargar la página mientras sigue offline: no debe perderse el
  // estado (quedó en la base local, no en memoria de React).
  await page.reload();
  await expect(page.getByText("Sin conexión")).toBeVisible();
  for (const nombre of nombres) {
    await expect(page.getByText(`${nombre} (ya registrado)`)).toBeVisible();
  }

  // Reconectar: la cola sube sola (HU-28).
  await context.setOffline(false);
  await expect(page.getByText("Todo sincronizado")).toBeVisible({ timeout: 30_000 });

  // Verificar directo en Postgres: exactamente 4 filas de almuerzo hoy
  // para esos trabajadores — nunca 8 (si hubiera duplicado el envío al
  // reconectar) ni menos de 4 (si se hubiera perdido alguna).
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  try {
    const { rows } = await db.query(
      `select count(*)::int as n from consumo c
       join trabajador t on t.id = c.trabajador_id
       where t.nombre = any($1) and tipo_racion = 'almuerzo' and date(fecha_hora) = current_date`,
      [nombres]
    );
    expect(rows[0].n).toBe(4);
  } finally {
    await db.end();
  }
});
