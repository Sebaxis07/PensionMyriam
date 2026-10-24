// HU-27/HU-28 (Sprint 1) — verificación end-to-end real contra el
// stack de infra/docker-compose.yml + `npm run dev`, con corte real de
// red simulado por Playwright (context.setOffline). Reemplaza la
// versión anterior, que llevaba desde el Sprint 0 marcada "NO
// EJECUTADO TODAVÍA" y usaba selectores que ya no existen en el código
// real (placeholders "Correo"/"Contraseña", texto "Todo sincronizado",
// rol "link" para una navegación que en realidad son botones de
// pestaña — ver Piezas.tsx, no usa react-router para estas vistas).
//
// Requiere, levantados a mano antes de correr `npx playwright test`:
//   1) infra/docker-compose.yml arriba (bash db/dev-run.sh ya corrido,
//      o `docker compose up -d` en infra/ con infra/.env presente).
//   2) bash db/seed-demo.sh (crea encargada@pension-myriam.local /
//      Paposo2026! y deja la pieza #2 "ocupada" con check-in activo).
//   3) `npm run dev` en app/ con app/.env apuntando a ese stack.
import { test, expect } from "@playwright/test";
import { Client } from "pg";

const DB_URL =
  process.env.E2E_DB_URL ?? "postgres://postgres:changeme_dev_password@localhost:55432/postgres";

test("un cambio hecho sin conexión llega a Postgres al reconectar, sin perder datos ni duplicar (HU-27/HU-28)", async ({
  page,
  context
}) => {
  // Evita el modal de bienvenida al recorrido guiado (HU-40, no
  // relacionado con HU-27/28): en un navegador limpio aparece 700ms
  // después de montar la pantalla y queda por encima de la hoja de la
  // pieza, bloqueando los clics del resto del flujo.
  await page.addInitScript(() => {
    localStorage.setItem("pension_myriam_tour_completado_v1", "true");
  });

  await page.goto("/");

  // 1) Login online normal.
  await page.locator('input[type="email"]').fill("encargada@pension-myriam.local");
  await page.locator('input[type="password"]').fill("Paposo2026!");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("Habitaciones de la Pensión")).toBeVisible({ timeout: 15_000 });

  // Esperar a que termine la sincronización inicial antes de cortar la
  // red, para no confundir "aún no llegó" con "está offline".
  await expect(page.getByText("Sincronizado")).toBeVisible({ timeout: 20_000 });

  // 2) Cortar la red (emulación de corte de señal en Paposo).
  await context.setOffline(true);

  // Nota de alcance: la emulación de red de Playwright (setOffline)
  // corta tráfico NUEVO, pero no necesariamente fuerza el cierre
  // inmediato del socket de sync ya abierto — por eso el badge
  // "Sin red · Guardado local" puede demorar más de lo esperado en
  // reflejarse (es un indicador de HU-29, no del guardado local en sí).
  // Se deja constancia del resultado sin bloquear el resto del flujo:
  // lo que HU-27 exige de verdad es que la ESCRITURA local funcione y
  // se vea al instante, que es lo que se mide en el paso 3.
  const detectoDesconexion = await page
    .getByText("Sin red · Guardado local")
    .isVisible({ timeout: 15_000 })
    .catch(() => false);
  console.log(
    `[HU-29, informativo] Badge detectó la desconexión dentro de 15s: ${detectoDesconexion}`
  );

  // 3) Escribir sin conexión: check-out de la pieza #2 (seed-demo.sh la
  //    deja "ocupada" con check-in activo) -> debe pasar a "En aseo" al
  //    instante, SIN mensaje de error de conexión. Tiempo medido, no
  //    supuesto (criterio propone <1s para el guardado local).
  const inicioEscrituraLocal = Date.now();
  await page.getByText("#2", { exact: true }).click();
  await page.getByRole("button", { name: "Registrar salida (Check-out)" }).click();

  await expect(page.getByText("En aseo").first()).toBeVisible({ timeout: 2_000 });
  const tiempoEscrituraLocalMs = Date.now() - inicioEscrituraLocal;
  console.log(`[HU-27] Tiempo de escritura local offline: ${tiempoEscrituraLocalMs} ms`);
  expect(tiempoEscrituraLocalMs).toBeLessThan(1000);

  // Ningún mensaje de error de conexión debe haber aparecido.
  await expect(page.getByText(/error/i)).toHaveCount(0);

  // 4) Reconectar. El badge "Sincronizado" NO es una señal confiable de
  //    que la subida ya terminó (ver nota de alcance más abajo), así
  //    que la medición real de HU-28 se hace consultando Postgres
  //    directamente con reintentos acotados, no confiando en la UI.
  const inicioReconexion = Date.now();
  await context.setOffline(false);

  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  try {
    const LIMITE_MS = 60_000;
    let estadoServidor: string | undefined;
    while (Date.now() - inicioReconexion < LIMITE_MS) {
      const { rows } = await db.query("select estado from habitacion where numero = 2");
      estadoServidor = rows[0]?.estado;
      if (estadoServidor === "en_aseo") break;
      await new Promise((r) => setTimeout(r, 500));
    }
    const tiempoSincronizacionMs = Date.now() - inicioReconexion;
    console.log(`[HU-28] Tiempo real hasta que el checkout llegó a Postgres: ${tiempoSincronizacionMs} ms`);

    // 5) Verificar directo en Postgres (no solo la UI): el checkout
    //    llegó de verdad y la habitación quedó en_aseo en el servidor,
    //    dentro del tiempo propuesto por el criterio (<60s).
    expect(estadoServidor).toBe("en_aseo");
    expect(tiempoSincronizacionMs).toBeLessThan(LIMITE_MS);

    const { rows: checkouts } = await db.query(
      `select count(*)::int as n from checkout c
       join checkin ci on ci.id = c.checkin_id
       join reserva r on r.id = ci.reserva_id
       join cama cm on cm.id = r.cama_id
       join habitacion h on h.id = cm.habitacion_id
       where h.numero = 2`
    );
    expect(checkouts[0]?.n).toBe(1); // exactamente 1 — sin duplicados.
  } finally {
    await db.end();
  }
});
