// HU-27/HU-28 (Sprint 1) — verificación end-to-end real contra el
// stack de infra/docker-compose.yml + `npm run dev`, con corte real de
// red simulado por Playwright. Reemplaza la versión anterior, que
// llevaba desde el Sprint 0 marcada "NO EJECUTADO TODAVÍA" y usaba
// selectores que ya no existen en el código real.
//
// Requiere, levantados a mano antes de correr `npx playwright test`:
//   1) infra/docker-compose.yml arriba.
//   2) bash db/seed-demo.sh && bash db/seed-demo-empresa.sh
//      (turistas + empresa/nómina, necesarios para los 3 flujos de
//      HU-27: check-in, consumo y cambio de estado).
//   3) `npm run dev` en app/ con app/.env apuntando a ese stack.
import { test, expect, type Route } from "@playwright/test";
import { Client } from "pg";

const DB_URL =
  process.env.E2E_DB_URL ?? "postgres://postgres:changeme_dev_password@localhost:55432/postgres";

/** Descarta el modal de bienvenida al tour (HU-40, ajeno a HU-27/28). */
async function omitirTourDeBienvenida(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem("pension_myriam_tour_completado_v1", "true");
  });
}

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator('input[type="email"]').fill("encargada@pension-myriam.local");
  await page.locator('input[type="password"]').fill("Paposo2026!");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("Habitaciones de la Pensión")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Sincronizado")).toBeVisible({ timeout: 20_000 });
}

/**
 * El badge "Sincronizado" refleja que la cola de SUBIDA está vacía,
 * no necesariamente que la DESCARGA inicial de todos los buckets ya
 * terminó (ver limitación documentada en el informe de cierre). Para
 * no confundir "todavía no bajó el dato" con un defecto de la app al
 * ir offline, se espera explícitamente a ver los datos concretos que
 * cada flujo necesita antes de cortar la red.
 */
async function esperarDatosDeSeedListos(page: import("@playwright/test").Page) {
  await expect(page.getByText("Carla Fuentes").first()).toBeVisible({ timeout: 20_000 }); // reserva pieza #1
  await expect(page.getByText("Julio Álvarez").first()).toBeVisible({ timeout: 20_000 }); // check-in activo pieza #2
}

test("HU-27: check-in, registro de consumo y cambio de estado funcionan sin conexión, medidos, sin errores", async ({
  page,
  context
}) => {
  await omitirTourDeBienvenida(page);
  await login(page);
  await esperarDatosDeSeedListos(page);

  // Pieza #1 (seed-demo.sh): "Disponible" con reserva de Carla Fuentes
  // lista para check-in. Pieza #2: "Ocupada" con check-in activo de
  // Julio Álvarez, lista para check-out. Trabajador "Pedro Almonte"
  // (seed-demo-empresa.sh): sin consumo registrado hoy todavía. Se
  // confirma que su nómina también bajó ANTES de ir offline — es un
  // bucket de sync distinto al de habitaciones/reservas.
  await page.locator("#tour-nav-consumos").click();
  await expect(page.getByText("Pedro Almonte").first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Habitaciones" }).click();

  await context.setOffline(true);

  // ---------------------------------------------------------------
  // Flujo 1: Check-in sin conexión (pieza #1).
  // ---------------------------------------------------------------
  const inicioCheckin = Date.now();
  await page.getByRole("button", { name: /^#1 /, exact: false }).click();
  await page.getByRole("button", { name: "Registrar ingreso" }).click();
  await expect(page.getByRole("button", { name: /^#1 Ocupada/ })).toBeVisible({ timeout: 2_000 });
  const tiempoCheckinMs = Date.now() - inicioCheckin;
  console.log(`[HU-27] Check-in: ${tiempoCheckinMs} ms`);
  expect(tiempoCheckinMs).toBeLessThan(1000);

  // ---------------------------------------------------------------
  // Flujo 2: Registro de consumo sin conexión (Pedro Almonte,
  // desayuno — NO almuerzo: consumo-masivo-offline.spec.ts (HU-14)
  // registra el almuerzo de toda la nómina, Pedro Almonte incluido,
  // así que si esta suite corre completa en el mismo seed, "Almuerzo"
  // ya no tendría un botón "Servir" pendiente para él. Desayuno es un
  // tipo que ningún otro E2E de la suite toca.
  // ---------------------------------------------------------------
  await page.locator("#tour-nav-consumos").click();
  await page.getByRole("button", { name: /Desayuno/ }).click();
  // "Todos" en vez del filtro por defecto ("pendientes"): así la
  // tarjeta sigue visible después de marcarla y se puede medir el
  // cambio de estado en pantalla, en vez de que desaparezca del filtro.
  await page.getByRole("button", { name: /^Todos/ }).click();
  await page.getByPlaceholder("Buscar trabajador por nombre…").fill("Pedro Almonte");

  const inicioConsumo = Date.now();
  await page.getByRole("button", { name: "Servir" }).click();
  await expect(page.getByText("✓ Ya comió")).toBeVisible({ timeout: 2_000 });
  const tiempoConsumoMs = Date.now() - inicioConsumo;
  console.log(`[HU-27] Registro de consumo: ${tiempoConsumoMs} ms`);
  expect(tiempoConsumoMs).toBeLessThan(1000);

  // ---------------------------------------------------------------
  // Flujo 3: Cambio de estado sin conexión (check-out, pieza #2).
  // ---------------------------------------------------------------
  await page.getByRole("button", { name: "Habitaciones" }).click();
  const inicioCheckout = Date.now();
  await page.getByRole("button", { name: /^#2 /, exact: false }).click();
  await page.getByRole("button", { name: "Registrar salida" }).click();
  await expect(page.getByRole("button", { name: /^#2 En aseo/ })).toBeVisible({ timeout: 2_000 });
  const tiempoCheckoutMs = Date.now() - inicioCheckout;
  console.log(`[HU-27] Cambio de estado (check-out): ${tiempoCheckoutMs} ms`);
  expect(tiempoCheckoutMs).toBeLessThan(1000);

  // Ningún mensaje de error de conexión en ninguno de los 3 flujos.
  await expect(page.getByText(/error/i)).toHaveCount(0);

  // ---------------------------------------------------------------
  // Reconectar y confirmar en Postgres (no solo en la UI) que los 3
  // cambios llegaron, sin duplicados.
  // ---------------------------------------------------------------
  await context.setOffline(false);

  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  try {
    const LIMITE_MS = 60_000;
    const inicioReconexion = Date.now();

    async function esperarHasta(consulta: string, params: unknown[], esperado: unknown) {
      while (Date.now() - inicioReconexion < LIMITE_MS) {
        const { rows } = await db.query(consulta, params as any[]);
        if (rows[0]?.v === esperado) return Date.now() - inicioReconexion;
        await new Promise((r) => setTimeout(r, 300));
      }
      throw new Error(`Tiempo agotado esperando: ${consulta}`);
    }

    const msCheckin = await esperarHasta(
      "select estado as v from habitacion where numero = 1",
      [],
      "ocupada"
    );
    console.log(`[HU-28] Check-in llegó a Postgres en ${msCheckin} ms`);

    const msConsumo = await esperarHasta(
      `select count(*)::int as v from consumo c
       join trabajador t on t.id = c.trabajador_id
       where t.nombre = 'Pedro Almonte' and c.tipo_consumo = 'almuerzo' and date(c.fecha_hora) = current_date`,
      [],
      1
    );
    console.log(`[HU-28] Consumo llegó a Postgres en ${msConsumo} ms`);

    const msCheckout = await esperarHasta(
      "select estado as v from habitacion where numero = 2",
      [],
      "en_aseo"
    );
    console.log(`[HU-28] Check-out llegó a Postgres en ${msCheckout} ms`);

    // Sin duplicados en ninguno de los 3 flujos.
    const { rows: consumos } = await db.query(
      `select count(*)::int as n from consumo c
       join trabajador t on t.id = c.trabajador_id
       where t.nombre = 'Pedro Almonte' and c.tipo_consumo = 'almuerzo' and date(c.fecha_hora) = current_date`
    );
    expect(consumos[0]?.n).toBe(1);

    const { rows: checkins } = await db.query(
      `select count(*)::int as n from checkin ci
       join reserva r on r.id = ci.reserva_id
       join cama cm on cm.id = r.cama_id
       join habitacion h on h.id = cm.habitacion_id
       where h.numero = 1`
    );
    expect(checkins[0]?.n).toBe(1);

    const { rows: checkouts } = await db.query(
      `select count(*)::int as n from checkout c
       join checkin ci on ci.id = c.checkin_id
       join reserva r on r.id = ci.reserva_id
       join cama cm on cm.id = r.cama_id
       join habitacion h on h.id = cm.habitacion_id
       where h.numero = 2`
    );
    expect(checkouts[0]?.n).toBe(1);
  } finally {
    await db.end();
  }
});

test("HU-28: un corte justo después de que Postgres recibe la operación (antes de que el cliente la confirme) no duplica", async ({
  page,
  context
}) => {
  await omitirTourDeBienvenida(page);
  await login(page);
  await expect(page.getByText("Rosa Soto").first()).toBeVisible({ timeout: 20_000 }); // check-in activo pieza #8

  let intentosInterceptados = 0;
  let primerFetchCompletado = false;
  let uuidIdempotenteEnviado: string | null = null;

  // Intercepta la subida real a PostgREST para la pieza #8. La primera
  // vez, deja que la petición viaje de verdad a Postgres (el server
  // SÍ la recibe y hace commit — eso es justo lo que pide el enunciado:
  // "después de que PostgreSQL recibe la operación"), pero en vez de
  // devolverle al navegador la respuesta real de éxito, se la corta
  // (route.abort), simulando el corte de red "antes de que el cliente
  // confirme su recepción". PowerSync, al ver la petición fallida,
  // reintenta más tarde con la MISMA fila local (mismo id/uuid) — ese
  // segundo intento sí se deja pasar normal.
  //
  // Defecto de esta prueba corregido (auditoría Sprint 3): el assert
  // de "Postgres ya comiteó" solo esperaba a que intentosInterceptados
  // se incrementara — eso ocurre ANTES del `await route.fetch()`, no
  // después. Era una carrera: el test podía consultar Postgres antes
  // de que el commit real hubiera terminado, fallando de forma
  // intermitente sin que la app tuviera ningún defecto. Se agrega un
  // flag separado que solo se marca DESPUÉS de que route.fetch()
  // efectivamente resuelve.
  await page.route("**/rest/v1/checkout**", async (route: Route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    intentosInterceptados++;
    const cuerpo = route.request().postDataJSON();
    if (intentosInterceptados === 1) {
      uuidIdempotenteEnviado = cuerpo?.uuid_idempotente ?? null;
      // Deja que la petición llegue de verdad al servidor (Postgres
      // recibe y comitea el checkout) ...
      await route.fetch();
      primerFetchCompletado = true;
      // ... pero el navegador nunca ve esa respuesta: se la corta acá,
      // como un corte de señal real a mitad de la confirmación.
      await route.abort("connectionreset");
    } else {
      await route.continue();
    }
  });

  await page.getByRole("button", { name: /^#8 /, exact: false }).click();
  await page.getByRole("button", { name: "Registrar salida" }).click();
  // La UI ya muestra el cambio al instante (optimista, local) aunque la
  // primera subida real al servidor se vaya a cortar a continuación.
  await expect(page.getByRole("button", { name: /^#8 En aseo/ })).toBeVisible({ timeout: 2_000 });

  // Esperar a que el PRIMER fetch real a Postgres haya terminado (no
  // solo a que el handler haya arrancado) antes de consultar la base.
  await expect(() => expect(primerFetchCompletado).toBe(true)).toPass({
    timeout: 15_000
  });

  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  try {
    // Confirma que Postgres SÍ recibió y comiteó la operación en el
    // primer intento (antes de que el navegador supiera del corte).
    const { rows: trasPrimerIntento } = await db.query(
      `select count(*)::int as n from checkout c
       join checkin ci on ci.id = c.checkin_id
       join reserva r on r.id = ci.reserva_id
       join cama cm on cm.id = r.cama_id
       join habitacion h on h.id = cm.habitacion_id
       where h.numero = 8`
    );
    expect(trasPrimerIntento[0]?.n).toBe(1);

    // PowerSync reintenta sola, sin botón, tras el error de red del
    // primer intento. Esperar a que el reintento (segundo intento, no
    // cortado) efectivamente ocurra.
    await expect(() => expect(intentosInterceptados).toBeGreaterThanOrEqual(2)).toPass({
      timeout: 30_000
    });

    // Lo central del criterio: sigue existiendo EXACTAMENTE 1 fila —
    // el reintento no duplicó — y su uuid_idempotente es el MISMO que
    // se envió en el intento cortado (no se regeneró uno nuevo).
    const { rows: final } = await db.query(
      `select count(*)::int as n, (array_agg(c.uuid_idempotente))[1]::text as uuid
       from checkout c
       join checkin ci on ci.id = c.checkin_id
       join reserva r on r.id = ci.reserva_id
       join cama cm on cm.id = r.cama_id
       join habitacion h on h.id = cm.habitacion_id
       where h.numero = 8`
    );
    expect(final[0]?.n).toBe(1);
    expect(uuidIdempotenteEnviado).not.toBeNull();
    expect(final[0]?.uuid).toBe(uuidIdempotenteEnviado);
  } finally {
    await db.end();
  }
});
