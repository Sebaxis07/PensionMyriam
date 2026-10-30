// Sprint 5 — EP-10 (configuración del negocio) contra el stack real.
//
// El criterio de HU-39 ("los próximos comprobantes PDF reflejan la nueva
// información") no se puede dar por cumplido con una prueba unitaria: la
// pensión opera con DOS celulares, y antes del Sprint 5 la configuración
// vivía en el localStorage de cada navegador. La Administradora cambiaba
// la CuentaRUT en su teléfono y el de la Encargada seguía emitiendo
// comprobantes con los datos de fábrica. Acá se verifica la propagación
// real entre dos dispositivos, más el comportamiento sin señal.
import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { Client } from "pg";
import { execFileSync } from "node:child_process";

const DB_URL =
  process.env.E2E_DB_URL ?? "postgres://postgres:changeme_dev_password@localhost:55432/postgres";

const VALORES_DE_FABRICA = {
  banco_nombre: "BancoEstado",
  tipo_cuenta: "CuentaRUT",
  titular_nombre: "María (Pensión Señora Miriam)",
  rut_titular: "12.345.678-9",
  correo_contacto_arco: "pension.paposo@gmail.com",
  whatsapp_contacto: "+56 9 8765 4321",
  tarifa_base_noche: 15000,
  dias_gracia_anonimizacion: 7
};

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

/** Token de la sesión activa en el navegador, para pegarle directo a la API. */
async function tokenDeLaSesion(page: Page): Promise<string> {
  const token: string | null = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (key.includes("supabase.auth.token") || key.startsWith("sb-")) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key)!);
          return parsed.access_token ?? parsed.currentSession?.access_token ?? null;
        } catch {
          continue;
        }
      }
    }
    return null;
  });
  expect(token, "no se pudo leer el token de la sesión").not.toBeNull();
  return token!;
}

async function leerReplicaLocal(page: Page, sql: string): Promise<any[]> {
  return page.evaluate(async (query) => (window as any).__powersync.getAll(query), sql);
}

async function escribirEnReplicaLocal(page: Page, sql: string): Promise<void> {
  await page.evaluate(async (query) => {
    await (window as any).__powersync.execute(query);
  }, sql);
}

const INFRA_DIR = process.env.E2E_INFRA_DIR ?? "../infra";

/**
 * Corte de señal de UN dispositivo: se desconecta su propio SDK, que es
 * lo que ocurre cuando el celular se queda sin señal en Paposo.
 *
 * POR QUÉ NO SE USA context.setOffline()
 *
 * Se intentó primero y la prueba falló revelando algo que conviene
 * dejar escrito: con `context.setOffline(true)` el valor nuevo IGUAL
 * bajaba a la réplica local. El SDK web de PowerSync mantiene el flujo
 * de sincronización en un worker compartido, que no queda sujeto a la
 * emulación de red del contexto de la página. `setOffline` sirve para
 * verificar que una ESCRITURA se encola localmente (que es lo que hacen
 * los E2E de HU-27/HU-28), pero no corta la BAJADA de datos, así que no
 * puede sostener una afirmación del tipo "el dispositivo no recibió el
 * cambio mientras estuvo sin señal".
 *
 * Esta desconexión es, declaradamente, una SIMULACIÓN del corte: es el
 * propio SDK el que suelta la conexión, no la radio del teléfono. La
 * variante con un corte real de extremo a extremo (deteniendo el
 * servicio) está más abajo, detrás de E2E_CORTE_REAL=1, porque detener
 * el contenedor afecta a toda la suite si corre en paralelo.
 */
async function simularPerdidaDeSenal(page: Page) {
  await page.evaluate(async () => {
    await (window as any).__powersync.disconnect();
  });
}

async function simularVueltaDeSenal(page: Page) {
  await page.evaluate(async () => {
    await (window as any).__powersyncReconectar();
  });
}

/** Corte REAL: deja al dispositivo sin servicio de sincronización al que hablar. */
function servicioSync(accion: "stop" | "start") {
  execFileSync("docker", ["compose", accion, "powersync"], {
    cwd: INFRA_DIR,
    stdio: "ignore"
  });
}

async function restaurarConfigDeFabrica() {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  try {
    await db.query(
      `update public.config_negocio
          set banco_nombre = $1, tipo_cuenta = $2, titular_nombre = $3, rut_titular = $4,
              correo_contacto_arco = $5, whatsapp_contacto = $6, tarifa_base_noche = $7,
              dias_gracia_anonimizacion = $8
        where id = 'singleton'`,
      [
        VALORES_DE_FABRICA.banco_nombre,
        VALORES_DE_FABRICA.tipo_cuenta,
        VALORES_DE_FABRICA.titular_nombre,
        VALORES_DE_FABRICA.rut_titular,
        VALORES_DE_FABRICA.correo_contacto_arco,
        VALORES_DE_FABRICA.whatsapp_contacto,
        VALORES_DE_FABRICA.tarifa_base_noche,
        VALORES_DE_FABRICA.dias_gracia_anonimizacion
      ]
    );
  } finally {
    await db.end();
  }
}

test.describe.serial("Sprint 5 — configuración del negocio (stack real)", () => {
  test.afterAll(async () => {
    await restaurarConfigDeFabrica();
  });

  // =====================================================================
  // Escenarios 5 y 6 — se actualiza una configuración autorizada y un
  // segundo dispositivo recibe el cambio
  // =====================================================================
  test("HU-39: la Administradora cambia la CuentaRUT y la tarifa, y el celular de la Encargada recibe el cambio", async ({
    browser
  }) => {
    const contextoAdmin: BrowserContext = await browser.newContext();
    const contextoEncargada: BrowserContext = await browser.newContext();
    const paginaAdmin = await contextoAdmin.newPage();
    const paginaEncargada = await contextoEncargada.newPage();

    try {
      await omitirTourDeBienvenida(paginaAdmin);
      await omitirTourDeBienvenida(paginaEncargada);
      await login(paginaAdmin, "admin@pension-myriam.local");
      await login(paginaEncargada, "encargada@pension-myriam.local");

      const nuevoRut = `9.876.${String(Date.now()).slice(-3)}-2`;

      // La Administradora guarda desde su dispositivo (escritura normal
      // por la cola de PowerSync, igual que lo hace el modal de HU-39).
      await escribirEnReplicaLocal(
        paginaAdmin,
        `update config_negocio
            set banco_nombre = 'Banco de Chile', tipo_cuenta = 'Cuenta Vista',
                titular_nombre = 'Miriam Soto Vega', rut_titular = '${nuevoRut}',
                tarifa_base_noche = 22000
          where id = 'singleton'`
      );

      // Llegó al servidor.
      await expect(async () => {
        const db = new Client({ connectionString: DB_URL });
        await db.connect();
        try {
          const { rows } = await db.query(
            "select rut_titular, tarifa_base_noche::int as tarifa from public.config_negocio where id = 'singleton'"
          );
          expect(rows[0].rut_titular).toBe(nuevoRut);
          expect(rows[0].tarifa).toBe(22000);
        } finally {
          await db.end();
        }
      }).toPass({ timeout: 25_000 });

      // Y bajó al SEGUNDO dispositivo. Esto es lo que el localStorage
      // nunca pudo hacer: es la razón por la que la configuración pasó a
      // ser una tabla replicada.
      await expect(async () => {
        const filas = await leerReplicaLocal(
          paginaEncargada,
          "select banco_nombre, tipo_cuenta, titular_nombre, rut_titular, tarifa_base_noche from config_negocio"
        );
        expect(filas.length).toBe(1);
        expect(filas[0].rut_titular).toBe(nuevoRut);
        expect(filas[0].banco_nombre).toBe("Banco de Chile");
        expect(filas[0].tipo_cuenta).toBe("Cuenta Vista");
        expect(filas[0].titular_nombre).toBe("Miriam Soto Vega");
        expect(Number(filas[0].tarifa_base_noche)).toBe(22000);
      }).toPass({ timeout: 25_000 });
    } finally {
      await contextoAdmin.close();
      await contextoEncargada.close();
    }
  });

  // =====================================================================
  // Escenario 7 — un valor inválido no puede guardarse
  // =====================================================================
  test("HU-39: el servidor rechaza una tarifa de cero y un plazo de gracia fuera de rango", async () => {
    const db = new Client({ connectionString: DB_URL });
    await db.connect();
    try {
      await expect(
        db.query("update public.config_negocio set tarifa_base_noche = 0 where id = 'singleton'")
      ).rejects.toThrow(/check constraint/i);

      await expect(
        db.query(
          "update public.config_negocio set dias_gracia_anonimizacion = 0 where id = 'singleton'"
        )
      ).rejects.toThrow(/check constraint/i);

      await expect(
        db.query(
          "update public.config_negocio set correo_contacto_arco = 'no-es-correo' where id = 'singleton'"
        )
      ).rejects.toThrow(/check constraint/i);

      // La fila de parámetros es única y no se puede eliminar.
      await expect(
        db.query("delete from public.config_negocio where id = 'singleton'")
      ).rejects.toThrow(/fila única/i);
    } finally {
      await db.end();
    }
  });

  test("HU-39: la Encargada no puede cambiar la configuración — su escritura queda como operación rechazada", async ({
    page
  }) => {
    await restaurarConfigDeFabrica();
    await omitirTourDeBienvenida(page);
    await login(page, "encargada@pension-myriam.local");

    await expect(async () => {
      const filas = await leerReplicaLocal(page, "select tarifa_base_noche from config_negocio");
      expect(filas.length).toBe(1);
    }).toPass({ timeout: 20_000 });

    // La escritura local se acepta (optimistic UI); lo que importa es que
    // el servidor NO la aplique. Es el mismo patrón de HU-42: la fila
    // local se revierte cuando baja el valor real del servidor.
    await escribirEnReplicaLocal(
      page,
      "update config_negocio set tarifa_base_noche = 99000 where id = 'singleton'"
    );

    // El servidor conserva el valor correcto: RLS no le dejó ninguna
    // fila que actualizar a la Encargada.
    await expect(async () => {
      const db = new Client({ connectionString: DB_URL });
      await db.connect();
      try {
        const { rows } = await db.query(
          "select tarifa_base_noche::int as tarifa from public.config_negocio where id = 'singleton'"
        );
        expect(rows[0].tarifa).toBe(15000);
      } finally {
        await db.end();
      }
    }).toPass({ timeout: 20_000 });
  });

  // =====================================================================
  // Escenario 9 — un dispositivo desconectado se reconecta después de
  // una modificación relevante
  // =====================================================================
  test("HU-39: un celular sin señal recibe el cambio de configuración al reconectar", async ({
    page
  }) => {
    await restaurarConfigDeFabrica();
    await omitirTourDeBienvenida(page);
    await login(page, "encargada@pension-myriam.local");

    await expect(async () => {
      const filas = await leerReplicaLocal(page, "select tarifa_base_noche from config_negocio");
      expect(Number(filas[0].tarifa_base_noche)).toBe(15000);
    }).toPass({ timeout: 20_000 });

    await simularPerdidaDeSenal(page);

    // Mientras no hay señal, la Administradora cambia la tarifa en el
    // servidor (lo haría desde su propio teléfono, con conexión).
    const db = new Client({ connectionString: DB_URL });
    await db.connect();
    try {
      await db.query(
        "update public.config_negocio set tarifa_base_noche = 18500 where id = 'singleton'"
      );
    } finally {
      await db.end();
    }

    // El celular sigue usando lo último que tenía: puede seguir
    // emitiendo comprobantes, que es el requisito offline-first. La
    // espera es deliberada — si la desconexión no hubiera surtido
    // efecto, en estos segundos el valor nuevo ya habría bajado y esta
    // aserción fallaría.
    await page.waitForTimeout(6_000);
    const durante = await leerReplicaLocal(page, "select tarifa_base_noche from config_negocio");
    expect(Number(durante[0].tarifa_base_noche)).toBe(15000);

    // Vuelve la señal: el cambio baja solo, sin que nadie cierre sesión
    // ni reinstale nada.
    await simularVueltaDeSenal(page);
    await expect(async () => {
      const filas = await leerReplicaLocal(page, "select tarifa_base_noche from config_negocio");
      expect(Number(filas[0].tarifa_base_noche)).toBe(18500);
    }).toPass({ timeout: 40_000 });
  });

  // Variante con un corte REAL de extremo a extremo: se detiene el
  // servicio de sincronización, no solo el cliente. Queda detrás de un
  // interruptor porque detener el contenedor deja sin sincronización a
  // CUALQUIER otra prueba que corra en paralelo (se descubrió así: la
  // primera versión de esta prueba hizo fallar 6 especificaciones
  // ajenas). Ejecutar con:
  //   E2E_CORTE_REAL=1 npx playwright test --workers=1 ../e2e/sprint5-configuracion-negocio.spec.ts
  test("HU-39 (corte real, opt-in): sin el servicio de sincronización arriba, el cambio llega al reconectar", async ({
    page
  }) => {
    test.skip(
      process.env.E2E_CORTE_REAL !== "1",
      "Detiene el contenedor de PowerSync: solo con E2E_CORTE_REAL=1 y --workers=1"
    );

    await restaurarConfigDeFabrica();
    await omitirTourDeBienvenida(page);
    await login(page, "encargada@pension-myriam.local");

    await expect(async () => {
      const filas = await leerReplicaLocal(page, "select tarifa_base_noche from config_negocio");
      expect(Number(filas[0].tarifa_base_noche)).toBe(15000);
    }).toPass({ timeout: 20_000 });

    servicioSync("stop");
    let servicioDetenido = true;
    try {
      const db = new Client({ connectionString: DB_URL });
      await db.connect();
      try {
        await db.query(
          "update public.config_negocio set tarifa_base_noche = 18500 where id = 'singleton'"
        );
      } finally {
        await db.end();
      }

      await page.waitForTimeout(6_000);
      const durante = await leerReplicaLocal(page, "select tarifa_base_noche from config_negocio");
      expect(Number(durante[0].tarifa_base_noche)).toBe(15000);

      servicioSync("start");
      servicioDetenido = false;

      await expect(async () => {
        const filas = await leerReplicaLocal(page, "select tarifa_base_noche from config_negocio");
        expect(Number(filas[0].tarifa_base_noche)).toBe(18500);
      }).toPass({ timeout: 90_000 });
    } finally {
      if (servicioDetenido) servicioSync("start");
    }
  });

  // =====================================================================
  // HU-41 — "Como Encargada o Administradora, quiero dar de alta
  // productos o servicios extra con su precio"
  // =====================================================================
  test("HU-41: la Encargada da de alta un producto extra y el servidor lo acepta", async ({
    page
  }) => {
    await omitirTourDeBienvenida(page);
    await login(page, "encargada@pension-myriam.local");

    const nombreProducto = `Bebida lata E2E ${Date.now()}`;
    await escribirEnReplicaLocal(
      page,
      `insert into producto_extra (id, nombre, precio_unitario, created_at)
       values ('${crypto.randomUUID()}', '${nombreProducto}', 1500, '${new Date().toISOString()}')`
    );

    // Antes del Sprint 5 la policy exigía administradora para el INSERT:
    // esta fila se guardaba en la réplica local y el servidor la
    // rechazaba después, quedando como operación rechazada (HU-42) sin
    // que la Encargada entendiera por qué.
    await expect(async () => {
      const db = new Client({ connectionString: DB_URL });
      await db.connect();
      try {
        const { rows } = await db.query(
          "select precio_unitario::int as precio from public.producto_extra where nombre = $1",
          [nombreProducto]
        );
        expect(rows.length).toBe(1);
        expect(rows[0].precio).toBe(1500);
      } finally {
        await db.end();
      }
    }).toPass({ timeout: 25_000 });

    // Y no quedó ninguna operación rechazada por esta escritura.
    const rechazos = await leerReplicaLocal(
      page,
      "select count(*) as n from operacion_rechazada where tabla = 'producto_extra'"
    );
    expect(Number(rechazos[0].n)).toBe(0);
  });

  test("HU-41: el catálogo de extras es append-only — el precio histórico no se puede editar ni borrar", async ({
    page,
    request
  }) => {
    // Un `consumo` ya registrado apunta a un `producto_extra_id`: si su
    // precio pudiera cambiar después, cambiaría el monto de una
    // facturación ya emitida (RNF-03). Se verifica por COMPORTAMIENTO,
    // atacando la API con el JWT de la Encargada, no mirando la lista de
    // privilegios: `authenticated` sí tiene UPDATE concedido porque el
    // upsert del conector lo necesita (ver
    // db/migrations/0021_privilegios_minimos.sql), y lo que realmente
    // impide la edición es que la tabla no tiene policy de UPDATE.
    const nombreProducto = `Postre E2E ${Date.now()}`;
    const db = new Client({ connectionString: DB_URL });
    await db.connect();
    let productoId = "";
    try {
      const { rows } = await db.query(
        "insert into public.producto_extra (nombre, precio_unitario) values ($1, 2500) returning id",
        [nombreProducto]
      );
      productoId = rows[0].id;
    } finally {
      await db.end();
    }

    await omitirTourDeBienvenida(page);
    await login(page, "encargada@pension-myriam.local");
    const token = await tokenDeLaSesion(page);
    const apiBase = process.env.E2E_POSTGREST_URL ?? "http://localhost:3001";

    // Intento de cambiar el precio por la API.
    const patch = await request.patch(
      `${apiBase}/producto_extra?id=eq.${productoId}`,
      {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        data: { precio_unitario: 9999 },
        failOnStatusCode: false
      }
    );
    // RLS no le deja ninguna fila que actualizar: la petición no explota,
    // simplemente no cambia nada.
    expect([200, 204, 403, 404]).toContain(patch.status());

    // Intento de borrarlo.
    const del = await request.delete(`${apiBase}/producto_extra?id=eq.${productoId}`, {
      headers: { Authorization: `Bearer ${token}` },
      failOnStatusCode: false
    });
    expect([403, 404, 405]).toContain(del.status());

    // Lo que importa: el precio histórico sigue intacto y la fila existe.
    const db2 = new Client({ connectionString: DB_URL });
    await db2.connect();
    try {
      const { rows } = await db2.query(
        "select precio_unitario::int as precio from public.producto_extra where id = $1",
        [productoId]
      );
      expect(rows.length).toBe(1);
      expect(rows[0].precio).toBe(2500);
    } finally {
      await db2.query("delete from public.producto_extra where id = $1", [productoId]).catch(() => {});
      await db2.end();
    }
  });
});
