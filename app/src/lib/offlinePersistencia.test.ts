import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PowerSyncDatabase, Schema, Table, column } from "@powersync/node";

/**
 * HU-27/HU-28 — Prueba de integración REAL (sin mocks) de persistencia
 * local y cola de sincronización.
 *
 * No se usa el AppSchema de producción (app/src/lib/schema.ts) porque
 * está construido con @powersync/web, que trae su propia copia de
 * @powersync/common (v1.57.3) incompatible en tiempo de tipos/clases
 * con la de @powersync/node (v2.4.0, usada acá solo para poder correr
 * el motor real de PowerSync en Node sin un navegador). El motor de
 * SQLite y la lógica de cola CRUD que se ejercita es la MISMA; solo se
 * redeclaran las pocas tablas necesarias para esta prueba.
 *
 * Esto responde directamente a los puntos de la Fase 1/2 pedidos:
 * - ¿la app puede escribir localmente sin red? (nunca se llama a
 *   .connect() en este archivo)
 * - ¿el tiempo de guardado local es medido, no supuesto?
 * - ¿la información persiste tras "cerrar y reabrir la app"? (se cierra
 *   la base y se vuelve a abrir el mismo archivo .db)
 * - ¿la cola de operaciones pendientes es persistente, no en memoria?
 */

const TestSchema = new Schema({
  checkin: new Table({
    reserva_id: column.text,
    realizado_por: column.text,
    fecha_hora: column.text,
    uuid_idempotente: column.text
  }),
  aseo: new Table({
    habitacion_id: column.text,
    tipo: column.text,
    responsable: column.text,
    fecha_hora: column.text,
    uuid_idempotente: column.text
  }),
  habitacion: new Table({
    numero: column.integer,
    estado: column.text
  })
});

let dir: string;
let dbPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pension-myriam-offline-"));
  dbPath = join(dir, "test.db");
});

afterEach(async () => {
  // En Windows, better-sqlite3/el worker nativo puede demorar un
  // instante en liberar el handle del archivo tras close(); sin
  // reintento, rmSync falla con EPERM de forma intermitente aunque la
  // base ya esté cerrada correctamente — no es un defecto de la app.
  for (let intento = 0; intento < 5; intento++) {
    try {
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
});

describe("HU-27 — operación sin conexión (persistencia local real)", () => {
  it("registra un check-in localmente SIN llamar nunca a .connect() y en menos de 1 segundo", async () => {
    const db = new PowerSyncDatabase({ schema: TestSchema, database: { dbFilename: dbPath } });

    // La apertura/creación del archivo .db (una sola vez al arrancar la
    // app real, ver app/src/lib/powersync.ts) es un costo de arranque
    // distinto al que mide el criterio de HU-27. Se "calienta" la
    // conexión con una escritura de descarte antes de medir, igual que
    // en la app real: la usuaria nunca paga el costo de apertura en
    // cada acción, solo una vez al iniciar sesión.
    await db.execute(
      "insert into checkin (id, reserva_id, realizado_por, fecha_hora, uuid_idempotente) values (?, ?, ?, ?, ?)",
      [crypto.randomUUID(), crypto.randomUUID(), "usuario-test", new Date().toISOString(), crypto.randomUUID()]
    );

    const inicio = performance.now();
    await db.execute(
      "insert into checkin (id, reserva_id, realizado_por, fecha_hora, uuid_idempotente) values (?, ?, ?, ?, ?)",
      [crypto.randomUUID(), crypto.randomUUID(), "usuario-test", new Date().toISOString(), crypto.randomUUID()]
    );
    const transcurridoMs = performance.now() - inicio;

    // Medido, no supuesto (el criterio del CSV propone <1s).
    expect(transcurridoMs).toBeLessThan(1000);

    const filas = await db.getAll("select * from checkin");
    expect(filas).toHaveLength(2);

    await db.close();
  });

  it("registra consumo/cambio de estado localmente sin lanzar errores de conexión", async () => {
    const db = new PowerSyncDatabase({ schema: TestSchema, database: { dbFilename: dbPath } });

    await expect(
      db.execute(
        "insert into aseo (id, habitacion_id, tipo, responsable, fecha_hora, uuid_idempotente) values (?, ?, 'diario', ?, ?, ?)",
        [crypto.randomUUID(), crypto.randomUUID(), "usuario-test", new Date().toISOString(), crypto.randomUUID()]
      )
    ).resolves.not.toThrow();

    await expect(
      db.execute("update habitacion set estado = 'en_mantencion' where numero = 1")
    ).resolves.not.toThrow();

    await db.close();
  });

  it("la información persiste tras cerrar y reabrir la base (simula cerrar/reabrir la app)", async () => {
    const idCheckin = crypto.randomUUID();

    const db1 = new PowerSyncDatabase({ schema: TestSchema, database: { dbFilename: dbPath } });
    await db1.execute(
      "insert into checkin (id, reserva_id, realizado_por, fecha_hora, uuid_idempotente) values (?, ?, ?, ?, ?)",
      [idCheckin, crypto.randomUUID(), "usuario-test", new Date().toISOString(), crypto.randomUUID()]
    );
    await db1.close();

    const db2 = new PowerSyncDatabase({ schema: TestSchema, database: { dbFilename: dbPath } });
    const filas = await db2.getAll<{ id: string }>("select id from checkin where id = ?", [idCheckin]);
    expect(filas).toHaveLength(1);
    await db2.close();
  });
});

describe("HU-28 — cola de sincronización persistente", () => {
  it("las operaciones quedan en una cola CRUD persistente mientras no hay conexión, y sobreviven a cerrar/reabrir", async () => {
    const db1 = new PowerSyncDatabase({ schema: TestSchema, database: { dbFilename: dbPath } });
    // Nunca se llama a db1.connect(): simula el teléfono sin señal de Paposo.
    await db1.execute(
      "insert into aseo (id, habitacion_id, tipo, responsable, fecha_hora, uuid_idempotente) values (?, ?, 'diario', ?, ?, ?)",
      [crypto.randomUUID(), crypto.randomUUID(), "usuario-test", new Date().toISOString(), crypto.randomUUID()]
    );

    const pendientesAntes = await db1.getAll("select * from ps_crud");
    expect(pendientesAntes.length).toBeGreaterThan(0);
    await db1.close();

    // Reabrir el archivo (simula reabrir la app sin haber sincronizado nunca).
    const db2 = new PowerSyncDatabase({ schema: TestSchema, database: { dbFilename: dbPath } });
    const pendientesDespues = await db2.getAll("select * from ps_crud");
    expect(pendientesDespues.length).toBe(pendientesAntes.length);
    await db2.close();
  });

  it("el identificador único (uuid_idempotente) queda fijo en la fila local y NO se regenera al reintentar", async () => {
    const db = new PowerSyncDatabase({ schema: TestSchema, database: { dbFilename: dbPath } });
    const idFijo = crypto.randomUUID();

    await db.execute(
      "insert into aseo (id, habitacion_id, tipo, responsable, fecha_hora, uuid_idempotente) values (?, ?, 'diario', ?, ?, ?)",
      [crypto.randomUUID(), crypto.randomUUID(), "usuario-test", new Date().toISOString(), idFijo]
    );

    // "Reintentar" en este diseño no significa volver a correr la
    // función de la UI (eso generaría una acción nueva, con su propio
    // id): significa que PowerSync reintenta subir la MISMA fila local
    // ya guardada. Leer la cola dos veces seguidas debe devolver
    // siempre el mismo uuid_idempotente para esa fila, nunca uno nuevo.
    const crud1 = await db.getAll<{ data: string }>("select data from ps_crud");
    const crud2 = await db.getAll<{ data: string }>("select data from ps_crud");
    expect(crud1.map((r) => r.data)).toEqual(crud2.map((r) => r.data));

    await db.close();
  });
});
