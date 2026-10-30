// Sprint 5 — EP-07 (protección de datos) y EP-08 (gestión de cuentas)
// contra el stack real: Postgres + GoTrue + PostgREST + PowerSync.
//
// Lo que se verifica acá NO se puede verificar en ninguna otra capa:
//
//  * HU-35: que la cuenta creada quede realmente usable (credencial +
//    identidad de GoTrue). Esa parte no entra en pgTAP porque las
//    columnas de auth.users y la tabla auth.identities las crea GoTrue
//    al arrancar, no la imagen de Postgres (ver
//    db/pgtap/16_seguridad_cuentas.sql).
//  * HU-35: que la Encargada no pueda crear cuentas invocando el RPC
//    DIRECTAMENTE con su JWT, saltándose la app por completo. Era un
//    escalamiento de privilegios real: el chequeo usaba `current_user`,
//    que dentro de un SECURITY DEFINER es el dueño de la función.
//  * HU-36: que el directorio de cuentas NO llegue a la réplica local
//    del dispositivo de la Encargada. PowerSync bypassa la RLS de
//    Postgres al replicar, así que esto solo se ve inspeccionando el
//    SQLite del celular.
//  * HU-34: que la supresión quede registrada en la bitácora y que la
//    Encargada reciba una denegación real del servidor.
import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { Client } from "pg";

const DB_URL =
  process.env.E2E_DB_URL ?? "postgres://postgres:changeme_dev_password@localhost:55432/postgres";
const API_BASE = process.env.E2E_POSTGREST_URL ?? "http://localhost:3001";
const GOTRUE_URL = process.env.E2E_GOTRUE_URL ?? "http://localhost:9999";
const ANON_KEY = process.env.E2E_ANON_KEY ?? "";

async function omitirTourDeBienvenida(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("pension_myriam_tour_completado_v1", "true");
  });
}

async function login(page: Page, email: string, password = "Paposo2026!") {
  await page.goto("/");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
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

/** Invoca un RPC de PostgREST con el JWT indicado, sin pasar por la app. */
async function rpcDirecto(
  request: APIRequestContext,
  token: string,
  funcion: string,
  cuerpo: Record<string, unknown>
) {
  return request.post(`${API_BASE}/rpc/${funcion}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    data: cuerpo,
    failOnStatusCode: false
  });
}

/** Limpia las cuentas que crean estas pruebas, para poder repetirlas. */
async function borrarCuentaDePrueba(correo: string) {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  try {
    await db.query("delete from public.usuario where email = $1", [correo]);
    // auth.users tiene on delete cascade hacia public.usuario, pero la
    // fila de aplicación se borra primero por claridad.
    await db.query("delete from auth.users where email = $1", [correo]);
  } finally {
    await db.end();
  }
}

test.describe.serial("Sprint 5 — cuentas y protección de datos (stack real)", () => {
  const correoNuevo = `rosa.e2e.${Date.now()}@pension-myriam.local`;
  const claveNueva = "ClaveLargaSegura2026";

  test.afterAll(async () => {
    await borrarCuentaDePrueba(correoNuevo);
  });

  // =====================================================================
  // Escenario 1 — la Administradora realiza una operación autorizada
  // =====================================================================
  test("HU-35: la Administradora crea una cuenta, su sesión sigue activa y la nueva colaboradora puede entrar", async ({
    page,
    request
  }) => {
    await omitirTourDeBienvenida(page);
    await login(page, "admin@pension-myriam.local");

    const token = await tokenDeLaSesion(page);
    const respuesta = await rpcDirecto(request, token, "crear_cuenta_usuario", {
      p_email: correoNuevo,
      p_password: claveNueva,
      p_nombre: "Rosa Alvarado E2E",
      p_rol: "encargada"
    });
    expect(respuesta.status(), await respuesta.text()).toBe(200);
    const creada = await respuesta.json();
    expect(creada.ok).toBe(true);
    expect(creada.rol).toBe("encargada");
    // La respuesta no debe devolver la contraseña ni su hash.
    expect(JSON.stringify(creada)).not.toContain(claveNueva);

    // "Dado que se crea la cuenta, cuando termina, entonces mi sesión
    // sigue activa": el token de la Administradora sigue sirviendo y la
    // app no la expulsó.
    await expect(page.getByText("Habitaciones de la Pensión")).toBeVisible();
    const sigueValido = await request.get(`${API_BASE}/usuario?select=id&limit=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(sigueValido.ok()).toBe(true);

    // "cuando la nueva colaboradora ingresa, entonces puede iniciar
    // sesión": se comprueba contra GoTrue de verdad, que es lo que la
    // prueba de base de datos no puede cubrir.
    const sesion = await request.post(`${GOTRUE_URL}/token?grant_type=password`, {
      headers: { "Content-Type": "application/json", apikey: ANON_KEY },
      data: { email: correoNuevo, password: claveNueva },
      failOnStatusCode: false
    });
    expect(sesion.status(), await sesion.text()).toBe(200);
    const datosSesion = await sesion.json();
    expect(datosSesion.access_token).toBeTruthy();
  });

  // =====================================================================
  // Escenario 2 — la Encargada intenta la misma operación y es denegada
  // =====================================================================
  test("HU-35 (regresión de escalamiento): la Encargada NO puede crear cuentas ni invocando el RPC directamente", async ({
    page,
    request
  }) => {
    await omitirTourDeBienvenida(page);
    await login(page, "encargada@pension-myriam.local");
    const token = await tokenDeLaSesion(page);

    const correoIntruso = `intrusa.e2e.${Date.now()}@pension-myriam.local`;
    const respuesta = await rpcDirecto(request, token, "crear_cuenta_usuario", {
      p_email: correoIntruso,
      p_password: claveNueva,
      p_nombre: "Intrusa",
      p_rol: "administradora"
    });

    // PostgREST traduce el 42501 de Postgres a 403 (insufficient_privilege).
    expect(respuesta.status()).toBe(403);
    expect(await respuesta.text()).toMatch(/Administradora/i);

    const db = new Client({ connectionString: DB_URL });
    await db.connect();
    try {
      const { rows } = await db.query(
        "select count(*)::int as n from public.usuario where email = $1",
        [correoIntruso]
      );
      expect(rows[0].n).toBe(0);
      const { rows: enAuth } = await db.query(
        "select count(*)::int as n from auth.users where email = $1",
        [correoIntruso]
      );
      expect(enAuth[0].n).toBe(0);
    } finally {
      await db.end();
    }
  });

  // =====================================================================
  // HU-36 — fuga por replicación: el directorio no baja al celular de
  // la Encargada
  // =====================================================================
  test("HU-36: la réplica local de la Encargada trae SOLO su propia cuenta, no el directorio", async ({
    page
  }) => {
    await omitirTourDeBienvenida(page);
    await login(page, "encargada@pension-myriam.local");

    await expect(async () => {
      const filas = await leerReplicaLocal(page, "select auth_uid, rol, nombre, email from usuario");
      // Antes del Sprint 5 el bucket "operacion" hacía `select * from
      // usuario` sin filtro: acá llegaban TODAS las cuentas.
      expect(filas.length).toBe(1);
      expect(filas[0].rol).toBe("encargada");
      expect(filas[0].email).toBe("encargada@pension-myriam.local");
    }).toPass({ timeout: 20_000 });

    const correos = await leerReplicaLocal(page, "select email from usuario");
    expect(correos.map((f) => f.email)).not.toContain("admin@pension-myriam.local");
  });

  test("HU-36: la Administradora SÍ recibe el directorio completo, con correo y fecha de registro", async ({
    page
  }) => {
    await omitirTourDeBienvenida(page);
    await login(page, "admin@pension-myriam.local");

    await expect(async () => {
      const filas = await leerReplicaLocal(
        page,
        "select rol, nombre, email, created_at from usuario order by rol"
      );
      expect(filas.length).toBeGreaterThanOrEqual(2);
      const correos = filas.map((f) => f.email);
      expect(correos).toContain("admin@pension-myriam.local");
      expect(correos).toContain("encargada@pension-myriam.local");
      // Los cuatro datos que pide el criterio deben estar disponibles sin red.
      for (const fila of filas) {
        expect(fila.nombre).toBeTruthy();
        expect(fila.rol).toBeTruthy();
        expect(fila.created_at).toBeTruthy();
      }
    }).toPass({ timeout: 20_000 });
  });

  // =====================================================================
  // Escenario 4 — un dispositivo cambia de rol: la réplica se ajusta
  // =====================================================================
  test("HU-36: si la Administradora pasa a rol Encargada, su dispositivo pierde el directorio al reconectar", async ({
    page
  }) => {
    await omitirTourDeBienvenida(page);
    await login(page, "admin@pension-myriam.local");

    await expect(async () => {
      const filas = await leerReplicaLocal(page, "select id from usuario");
      expect(filas.length).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 20_000 });

    const db = new Client({ connectionString: DB_URL });
    await db.connect();
    try {
      await db.query(
        "update public.usuario set rol = 'encargada' where email = 'admin@pension-myriam.local'"
      );
      // Los parámetros de bucket (usuario.rol) se resuelven en el
      // servicio en CADA conexión nueva, no quedan cacheados en el cliente.
      await page.evaluate(async () => {
        await (window as any).__powersyncReconectar();
      });

      await expect(async () => {
        const filas = await leerReplicaLocal(page, "select email from usuario");
        expect(filas.length).toBe(1);
        expect(filas[0].email).toBe("admin@pension-myriam.local");
      }).toPass({ timeout: 25_000 });
    } finally {
      // Fixture compartido por el resto de la suite: se restaura siempre.
      await db.query(
        "update public.usuario set rol = 'administradora' where email = 'admin@pension-myriam.local'"
      );
      await db.end();
    }
  });

  // =====================================================================
  // Escenario 8 — una operación de protección de datos se ejecuta
  // conforme a las reglas autorizadas (HU-34)
  // =====================================================================
  test("HU-34: la Administradora suprime los datos de un trabajador y queda constancia con motivo en la bitácora", async ({
    page,
    request
  }) => {
    const db = new Client({ connectionString: DB_URL });
    await db.connect();
    let trabajadorId = "";
    let contratoId = "";
    try {
      const { rows } = await db.query(
        "select id from public.contrato_empresa order by created_at desc limit 1"
      );
      expect(rows.length, "el seed de empresa debe haber corrido").toBeGreaterThan(0);
      contratoId = rows[0].id;
      const inserta = await db.query(
        `insert into public.trabajador (contrato_empresa_id, nombre, rut)
         values ($1, 'Titular E2E Supresion', '15.999.888-7') returning id`,
        [contratoId]
      );
      trabajadorId = inserta.rows[0].id;
    } finally {
      await db.end();
    }

    await omitirTourDeBienvenida(page);
    await login(page, "admin@pension-myriam.local");
    const token = await tokenDeLaSesion(page);

    const motivo = "Solicitud escrita del titular (prueba E2E)";
    const respuesta = await rpcDirecto(request, token, "atender_derecho_supresion", {
      p_tipo_titular: "trabajador",
      p_titular_id: trabajadorId,
      p_motivo: motivo
    });
    expect(respuesta.status(), await respuesta.text()).toBe(200);

    const db2 = new Client({ connectionString: DB_URL });
    await db2.connect();
    try {
      const { rows } = await db2.query(
        "select nombre, rut, anonimizado_at from public.trabajador where id = $1",
        [trabajadorId]
      );
      expect(rows[0].nombre).toBe("TRABAJADOR ANONIMIZADO (SOLICITUD TITULAR)");
      expect(rows[0].rut).toBeNull();
      expect(rows[0].anonimizado_at).not.toBeNull();

      const { rows: bitacora } = await db2.query(
        `select usuario_id, detalle from public.bitacora_acceso_datos_personales
          where accion = 'solicitud_derechos_arco'
            and detalle ->> 'titular_id' = $1`,
        [trabajadorId]
      );
      expect(bitacora.length).toBe(1);
      expect(bitacora[0].usuario_id).not.toBeNull();
      expect(bitacora[0].detalle.motivo).toBe(motivo);
      expect(bitacora[0].detalle.tipo_derecho).toBe("supresion");
      // La constancia no debe reintroducir el nombre suprimido.
      expect(JSON.stringify(bitacora[0].detalle)).not.toContain("Titular E2E Supresion");

      // El ledger no se toca: la fila del trabajador conserva su id y
      // cualquier consumo asociado sigue apuntando a él (RNF-03).
      const { rows: sigue } = await db2.query(
        "select count(*)::int as n from public.trabajador where id = $1",
        [trabajadorId]
      );
      expect(sigue[0].n).toBe(1);
    } finally {
      await db2.query("delete from public.trabajador where id = $1", [trabajadorId]).catch(() => {});
      await db2.end();
    }
  });

  test("HU-34: la Encargada recibe una denegación REAL del servidor al intentar suprimir datos", async ({
    page,
    request
  }) => {
    const db = new Client({ connectionString: DB_URL });
    await db.connect();
    let trabajadorId = "";
    try {
      const { rows: contratos } = await db.query(
        "select id from public.contrato_empresa order by created_at desc limit 1"
      );
      const inserta = await db.query(
        `insert into public.trabajador (contrato_empresa_id, nombre, rut)
         values ($1, 'Titular E2E Protegido', '14.111.222-3') returning id`,
        [contratos[0].id]
      );
      trabajadorId = inserta.rows[0].id;
    } finally {
      await db.end();
    }

    await omitirTourDeBienvenida(page);
    await login(page, "encargada@pension-myriam.local");
    const token = await tokenDeLaSesion(page);

    const respuesta = await rpcDirecto(request, token, "atender_derecho_supresion", {
      p_tipo_titular: "trabajador",
      p_titular_id: trabajadorId,
      p_motivo: "Intento no autorizado"
    });
    expect(respuesta.status()).toBe(403);
    expect(await respuesta.text()).toMatch(/facultad exclusiva de la Administradora/i);

    const db2 = new Client({ connectionString: DB_URL });
    await db2.connect();
    try {
      const { rows } = await db2.query(
        "select nombre, rut from public.trabajador where id = $1",
        [trabajadorId]
      );
      expect(rows[0].nombre).toBe("Titular E2E Protegido");
      expect(rows[0].rut).toBe("14.111.222-3");

      const { rows: bitacora } = await db2.query(
        `select count(*)::int as n from public.bitacora_acceso_datos_personales
          where detalle ->> 'titular_id' = $1`,
        [trabajadorId]
      );
      expect(bitacora[0].n).toBe(0);
    } finally {
      await db2.query("delete from public.trabajador where id = $1", [trabajadorId]).catch(() => {});
      await db2.end();
    }
  });

  test("HU-33/HU-34: la bitácora de datos personales no se puede alterar ni borrar", async () => {
    const db = new Client({ connectionString: DB_URL });
    await db.connect();
    try {
      await expect(
        db.query("update public.bitacora_acceso_datos_personales set accion = 'carga_nomina'")
      ).rejects.toThrow(/inmutable/i);
      await expect(
        db.query("delete from public.bitacora_acceso_datos_personales")
      ).rejects.toThrow(/inmutable/i);
    } finally {
      await db.end();
    }
  });
});
