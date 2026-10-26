// Auditoría de seguridad de datos financieros: tarifa_convenida de
// contrato_empresa y los costos de insumo/compra_insumo (HU-22/23) no
// deben llegar a la réplica local de un dispositivo Encargada — ni
// quedarse ocultos solo por la interfaz. Se verifica el CONTENIDO real
// de la base SQLite de cada rol (vía window.__powersync, expuesto solo
// para esta auditoría — ver app/src/lib/powersync.ts) y, por separado,
// una consulta DIRECTA a PostgREST con el JWT de cada rol, saltándose
// la app por completo.
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

/** Cierra sesión desde el menú de la app (deja el dispositivo "limpio" para el siguiente login). */
async function logout(page: Page) {
  // Playwright corre en viewport de escritorio por defecto (sin
  // override en playwright.config.ts) — ahí Header.tsx muestra el
  // header "md:flex" con el botón de logout directo (icono, sin
  // desplegable), no el header mobile ("md:hidden") con el menú.
  await page.locator('button[title="Cerrar sesión"]').click();
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
}

/** Lee directo del SQLite local vía el powersync ya conectado de esta página. */
async function leerReplicaLocal(page: Page, sql: string): Promise<any[]> {
  return page.evaluate(async (query) => {
    const ps = (window as any).__powersync;
    return ps.getAll(query);
  }, sql);
}

/** Registra una compra real de insumo vía la UI (como lo haría la Administradora). */
async function registrarCompra(page: Page, nombreInsumo: string, monto: string, cantidad: string) {
  await page.locator("#tour-nav-costos").click();
  await expect(page.getByRole("button", { name: "+ Anotar Compra" })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "+ Anotar Compra" }).click();
  await page.getByPlaceholder("Ej. Pollo entero, Papas, Gas 45kg...").fill(nombreInsumo);
  await page.getByPlaceholder("Ej. 45000").fill(monto);
  await page.getByPlaceholder("Ej. 10").fill(cantidad);
  await page.getByRole("button", { name: "Guardar Compra de Mercadería" }).click();
  await expect(page.getByText(nombreInsumo).first()).toBeVisible({ timeout: 10_000 });
}

test.describe.serial("Seguridad de datos financieros — Encargada nunca ve costos ni márgenes", () => {
  const nombreInsumo = `Arroz E2E seguridad ${Date.now()}`;

  test("Caso A: la Administradora registra una compra y su réplica local SÍ refleja tarifa_convenida e insumo/compra_insumo", async ({
    page
  }) => {
    await omitirTourDeBienvenida(page);
    await login(page, "admin@pension-myriam.local");
    await registrarCompra(page, nombreInsumo, "20000", "10");

    // Los buckets empresa_tarifas/costos_insumos son adicionales al
    // bucket "operacion" — pueden tardar un poco más en llegar que el
    // resto; se espera con reintento en vez de un timeout fijo.
    await expect(async () => {
      const contratos = await leerReplicaLocal(page, "select * from contrato_empresa");
      expect(contratos.length).toBeGreaterThan(0);
      expect(contratos.some((c) => c.tarifa_convenida != null)).toBe(true);
    }).toPass({ timeout: 20_000 });

    await expect(async () => {
      const insumos = await leerReplicaLocal(
        page,
        `select count(*) as n from insumo where nombre = '${nombreInsumo}'`
      );
      expect(insumos[0].n).toBe(1);

      const compras = await leerReplicaLocal(
        page,
        `select count(*) as n from compra_insumo ci
         join insumo i on i.id = ci.insumo_id
         where i.nombre = '${nombreInsumo}'`
      );
      expect(compras[0].n).toBe(1);
    }).toPass({ timeout: 20_000 });
  });

  test("Caso B: pese a que esa compra ya existe en Postgres, la réplica local de la Encargada NUNCA la recibe (ni tarifa_convenida)", async ({
    page
  }) => {
    await omitirTourDeBienvenida(page);
    await login(page, "encargada@pension-myriam.local");

    // Dar tiempo a que la sincronización inicial de buckets termine.
    await page.waitForTimeout(3000);

    const contratos = await leerReplicaLocal(page, "select * from contrato_empresa");
    expect(contratos.length).toBeGreaterThan(0); // los datos operativos SÍ llegan
    for (const fila of contratos) {
      // La columna existe en el esquema local (fija, ver app/src/lib/schema.ts)
      // pero ningún bucket se la entrega a este rol — su valor debe ser null,
      // nunca el monto real.
      expect(fila.tarifa_convenida).toBeNull();
    }

    const insumos = await leerReplicaLocal(page, "select count(*) as n from insumo");
    expect(insumos[0].n).toBe(0);

    const compras = await leerReplicaLocal(page, "select count(*) as n from compra_insumo");
    expect(compras[0].n).toBe(0);

    // Tampoco ve ni siquiera el nombre del insumo que la Administradora
    // acaba de registrar — no es un filtro de columna, el bucket completo
    // nunca llega a este dispositivo.
    expect(await leerReplicaLocal(page, `select 1 from insumo where nombre = '${nombreInsumo}'`)).toEqual(
      []
    );
  });

  test("Caso B (vía API directa): PostgREST con el JWT de la Encargada rechaza tarifa_convenida, saltándose la app", async ({
    page,
    request
  }) => {
    await omitirTourDeBienvenida(page);
    await login(page, "encargada@pension-myriam.local");

    const token: string | null = await page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!;
        if (key.includes("supabase.auth.token") || key.startsWith("sb-")) {
          const raw = localStorage.getItem(key);
          try {
            const parsed = JSON.parse(raw!);
            return parsed.access_token ?? parsed.currentSession?.access_token ?? null;
          } catch {
            continue;
          }
        }
      }
      return null;
    });
    expect(token).not.toBeNull();

    const apiBase = process.env.E2E_POSTGREST_URL ?? "http://localhost:3001";

    const directo = await request.get(`${apiBase}/contrato_empresa?select=tarifa_convenida`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // PostgREST traduce el 42501 (permission denied) de Postgres a 403
    // (insufficient_privilege), no 401 — 401 es para auth ausente/inválida,
    // que no es el caso: el JWT de la Encargada es válido, solo no tiene
    // el GRANT de columna.
    expect(directo.status()).toBe(403);

    const viaVista = await request.get(`${apiBase}/contrato_empresa_rest?select=tarifa_convenida`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(viaVista.ok()).toBe(true);
    const filas = await viaVista.json();
    expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      expect(fila.tarifa_convenida).toBeNull();
    }
  });

  test("Caso C: si la Administradora pasa a rol Encargada, su propio dispositivo pierde tarifa_convenida al reconectar", async ({
    page
  }) => {
    await omitirTourDeBienvenida(page);
    await login(page, "admin@pension-myriam.local");

    // Confirma el punto de partida: con rol administradora, SÍ ve la tarifa.
    await expect(async () => {
      const contratos = await leerReplicaLocal(page, "select * from contrato_empresa");
      expect(contratos.some((c) => c.tarifa_convenida != null)).toBe(true);
    }).toPass({ timeout: 20_000 });

    const db = new Client({ connectionString: DB_URL });
    await db.connect();
    try {
      await db.query(
        "update public.usuario set rol = 'encargada' where nombre = 'María (Administradora)'"
      );

      // Fuerza una reconexión explícita (equivalente a lo que ya prueba
      // "Caso C-bis" más abajo con un corte de red real, pero sin
      // depender del tiempo que tarde la reconexión automática del SDK):
      // los parámetros de los buckets (usuario.rol) se resuelven en el
      // servicio de PowerSync en CADA conexión nueva, no quedan
      // "cacheados" del lado del cliente de forma permanente.
      await page.evaluate(async () => {
        await (window as any).__powersyncReconectar();
      });

      await expect(async () => {
        const contratos = await leerReplicaLocal(page, "select * from contrato_empresa");
        expect(contratos.length).toBeGreaterThan(0);
        for (const fila of contratos) {
          expect(fila.tarifa_convenida).toBeNull();
        }
        const insumos = await leerReplicaLocal(page, "select count(*) as n from insumo");
        expect(insumos[0].n).toBe(0);
      }).toPass({ timeout: 20_000 });
    } finally {
      // Restaura el rol real ANTES de cualquier otra cosa: este usuario
      // es un fixture compartido por el resto de la suite E2E.
      await db.query(
        "update public.usuario set rol = 'administradora' where nombre = 'María (Administradora)'"
      );
      await db.end();
    }
  });

  test("Caso C-bis: un corte de red REAL (sin ningún hook de prueba) también revoca tarifa_convenida al volver la señal", async ({
    page,
    context
  }) => {
    // Responde la pregunta operativa real de Paposo (CLAUDE.md: "la
    // señal móvil se corta por horas o días"): ¿un dispositivo que YA
    // tenía tarifa_convenida en su réplica queda expuesto hasta que la
    // Administradora cierre sesión a mano, o el ciclo normal de
    // corte/reconexión de señal — sin ninguna acción especial — ya
    // revoca el dato por sí solo? Esto NO usa __powersyncReconectar.
    await omitirTourDeBienvenida(page);
    await login(page, "admin@pension-myriam.local");

    await expect(async () => {
      const contratos = await leerReplicaLocal(page, "select * from contrato_empresa");
      expect(contratos.some((c) => c.tarifa_convenida != null)).toBe(true);
    }).toPass({ timeout: 20_000 });

    const db = new Client({ connectionString: DB_URL });
    await db.connect();
    try {
      await db.query(
        "update public.usuario set rol = 'encargada' where nombre = 'María (Administradora)'"
      );

      // El mismo corte de red que simula el resto de la suite offline
      // (context.setOffline) — el SDK de PowerSync reconecta solo
      // cuando vuelve la señal, sin que la app tenga que hacer nada.
      await context.setOffline(true);
      await page.waitForTimeout(1000);
      await context.setOffline(false);

      await expect(async () => {
        const contratos = await leerReplicaLocal(page, "select * from contrato_empresa");
        expect(contratos.length).toBeGreaterThan(0);
        for (const fila of contratos) {
          expect(fila.tarifa_convenida).toBeNull();
        }
      }).toPass({ timeout: 15_000 });
    } finally {
      await db.query(
        "update public.usuario set rol = 'administradora' where nombre = 'María (Administradora)'"
      );
      await db.end();
    }
  });

  test("Caso D: cambiar de cuenta en el mismo dispositivo no deja ningún dato financiero filtrado en la réplica de la Encargada", async ({
    page
  }) => {
    await omitirTourDeBienvenida(page);
    await login(page, "admin@pension-myriam.local");

    await expect(async () => {
      const contratos = await leerReplicaLocal(page, "select * from contrato_empresa");
      expect(contratos.some((c) => c.tarifa_convenida != null)).toBe(true);
    }).toPass({ timeout: 20_000 });

    await logout(page);
    await login(page, "encargada@pension-myriam.local");
    await page.waitForTimeout(3000);

    // El dispositivo ya tuvo tarifa_convenida en SQLite bajo la sesión
    // anterior: al cambiar de cuenta, la réplica local se reconstruye
    // para el nuevo usuario (PowerSync no mezcla datos de dos cuentas
    // en el mismo bucket set) y no debe quedar ningún resto legible.
    const contratos = await leerReplicaLocal(page, "select * from contrato_empresa");
    expect(contratos.length).toBeGreaterThan(0);
    for (const fila of contratos) {
      expect(fila.tarifa_convenida).toBeNull();
    }
    const insumos = await leerReplicaLocal(page, "select count(*) as n from insumo");
    expect(insumos[0].n).toBe(0);
  });

  test("Caso E: offline, la Encargada sigue operando aseo con normalidad y sin tarifa_convenida en su réplica", async ({
    page,
    context
  }) => {
    await omitirTourDeBienvenida(page);
    await login(page, "encargada@pension-myriam.local");
    await page.waitForTimeout(2000);

    await context.setOffline(true);
    try {
      // Operación legítima de la Encargada: debe seguir funcionando
      // offline pese a la corrección de seguridad (no se tocó RLS de
      // aseo/habitacion/checkin).
      await expect(page.getByText("Habitaciones de la Pensión")).toBeVisible();

      const contratos = await leerReplicaLocal(page, "select * from contrato_empresa");
      for (const fila of contratos) {
        expect(fila.tarifa_convenida).toBeNull();
      }
    } finally {
      await context.setOffline(false);
    }
  });
});
