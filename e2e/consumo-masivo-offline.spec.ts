// HU-14: registrar consumo masivo sin conexión, recargar, reconectar,
// sin duplicados en Postgres.
//
// Corregido (auditoría Sprint 3): esta spec llevaba desde el Sprint 0
// marcada "NO EJECUTADO TODAVÍA" con selectores obsoletos que ya no
// existen en el código real — placeholders "Correo"/"Contraseña" (el
// login real usa input[type=email/password]), texto "Todo sincronizado"
// (el badge real dice "Sincronizado"), un <select> de servicio (el
// real es una fila de botones), y la columna "tipo_racion" (la columna
// real es "tipo_consumo"). Reescrita contra los selectores reales,
// siguiendo el mismo patrón ya verificado en offline-write-syncs.spec.ts.
//
// Requiere, levantados a mano antes de correr `npx playwright test`:
//   1) infra/docker-compose.yml arriba.
//   2) bash db/seed-demo.sh && bash db/seed-demo-empresa.sh
//   3) `npm run dev` en app/ con app/.env apuntando a ese stack.
import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";

const DB_URL =
  process.env.E2E_DB_URL ?? "postgres://postgres:changeme_dev_password@localhost:55432/postgres";

async function omitirTourDeBienvenida(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("pension_myriam_tour_completado_v1", "true");
  });
}

test("HU-14: consumo masivo offline — recarga, reconecta, sin duplicados en Postgres", async ({
  page,
  context
}) => {
  await omitirTourDeBienvenida(page);

  await page.goto("/");
  await page.locator('input[type="email"]').fill("encargada@pension-myriam.local");
  await page.locator('input[type="password"]').fill("Paposo2026!");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("Habitaciones de la Pensión")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Sincronizado")).toBeVisible({ timeout: 20_000 });

  // Ir al panel de Consumos (nav con botón id="tour-nav-consumos", ver
  // Piezas.tsx) y elegir "Almuerzo" entre los botones de servicio.
  await page.locator("#tour-nav-consumos").click();
  await page.getByRole("button", { name: /Almuerzo/ }).click();

  const nombres = ["Pedro Almonte", "Luis Vergara", "Manuel Rojas", "Sergio Cortés"];

  // Confirmar que parten "Pendiente de servicio" (no vienen pre-seedeados
  // para hoy — ver db/seed-demo-empresa.sh, que solo llena hasta ayer).
  for (const nombre of nombres) {
    await expect(page.getByRole("heading", { name: nombre })).toBeVisible({ timeout: 10_000 });
  }

  // Cortar la red antes de marcar (emulación de corte de señal real).
  await context.setOffline(true);

  // Seleccionar la cuadrilla completa pendiente de un toque y registrar
  // en lote — el flujo real de HU-14, no 4 marcas individuales.
  await page.getByRole("button", { name: /Seleccionar toda la cuadrilla pendiente/ }).click();
  await page.getByRole("button", { name: /Registrar \d+ almuerzo\(s\) en lote/ }).click();

  // Debe verse guardado al instante, offline (optimista, local): el
  // botón de servicio pasa a mostrar 4/4 y el resumen confirma a los 4
  // trabajadores por nombre.
  await expect(page.getByRole("button", { name: /Almuerzo.*4\/4 servidos/ })).toBeVisible({
    timeout: 5_000
  });
  await expect(
    page.getByText("¡Excelente! Toda la nómina (4 trabajadores) ya tiene su almuerzo registrado hoy.")
  ).toBeVisible();

  // NOTA: no se recarga la página mientras sigue offline. El shell de
  // la PWA (vite-plugin-pwa) solo se instala contra un build de
  // producción (`vite build` + preview) — contra `npm run dev` no hay
  // Service Worker registrado, así que un reload offline aquí fallaría
  // con net::ERR_INTERNET_DISCONNECTED por el propio navegador, no por
  // un defecto de la app. La persistencia local real (que el dato
  // sigue en SQLite y no solo en memoria de React) ya la cubre
  // offlinePersistencia.test.ts cerrando y reabriendo la base de
  // verdad; acá se verifica la parte que SÍ es responsabilidad de este
  // flujo: que la UI se mantiene optimista mientras se sigue offline,
  // sin recargar.
  await expect(page.getByRole("button", { name: /Almuerzo.*4\/4 servidos/ })).toBeVisible();

  // Reconectar: la cola sube sola (HU-28), sin botón.
  await context.setOffline(false);
  await expect(page.getByText("Sincronizado")).toBeVisible({ timeout: 30_000 });

  // Verificar directo en Postgres: exactamente 4 filas de almuerzo HOY
  // (día de negocio de Santiago, no date('now')/current_date — ver
  // app.fecha_santiago, fix del defecto transversal de fechas) para
  // esos trabajadores — nunca 8 (si se hubiera duplicado al reconectar)
  // ni menos de 4 (si se hubiera perdido alguna).
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  try {
    await expect(async () => {
      const { rows } = await db.query(
        `select count(*)::int as n from consumo c
         join trabajador t on t.id = c.trabajador_id
         where t.nombre = any($1)
           and c.tipo_consumo = 'almuerzo'
           and c.consumo_corregido_id is null
           and app.fecha_santiago(c.fecha_hora) = app.fecha_santiago(now())`,
        [nombres]
      );
      expect(rows[0].n).toBe(4);
    }).toPass({ timeout: 20_000 });
  } finally {
    await db.end();
  }
});
