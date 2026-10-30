import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PowerSyncDatabase, Schema, Table, column } from "@powersync/node";
import { sqlFechaHoraNormalizada } from "./fechaNegocio";

/**
 * Prueba de integración REAL (motor SQLite real, sin mocks) del defecto
 * descubierto al verificar manualmente el módulo de aseo: una fila
 * escrita LOCALMENTE usa fecha_hora con "T" (toISOString()), pero una
 * fila que YA SINCRONIZÓ desde Postgres llega representada con un
 * ESPACIO en su lugar (confirmado inspeccionando la réplica real con
 * PowerSync — no es una suposición). Una comparación de string sin
 * normalizar (`fecha_hora >= '...T...'`) pierde en silencio cualquier
 * fila ya sincronizada, sin importar la hora real: es la causa de que,
 * por ejemplo, "Aseo hoy pendiente" vuelva a aparecer después de
 * registrarse (se ve bien un instante — con la fila local optimista —
 * y "desaparece" al confirmarse con el servidor).
 *
 * Mismo patrón que offlinePersistencia.test.ts: se usa @powersync/node
 * (no el AppSchema de producción, que trae @powersync/web) para correr
 * el motor real de SQLite en Node, con una sola tabla mínima.
 */

const TestSchema = new Schema({
  aseo: new Table({
    habitacion_id: column.text,
    fecha_hora: column.text
  })
});

let dir: string;
let dbPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pension-myriam-fecha-hora-"));
  dbPath = join(dir, "test.db");
});

afterEach(async () => {
  for (let intento = 0; intento < 5; intento++) {
    try {
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
});

describe("sqlFechaHoraNormalizada (defecto de formato T vs espacio)", () => {
  it("una fila ya sincronizada (espacio) SÍ cuenta como 'de hoy' con la comparación normalizada", async () => {
    const db = new PowerSyncDatabase({ schema: TestSchema, database: { dbFilename: dbPath } });

    const habitacionId = "hab-1";
    // Fila "local" recién escrita: formato con "T", como produce
    // `new Date().toISOString()` en el resto de la app.
    await db.execute("insert into aseo (id, habitacion_id, fecha_hora) values (?, ?, ?)", [
      "a1",
      habitacionId,
      "2026-10-30T15:01:38.099Z"
    ]);
    // Fila "ya sincronizada": mismo instante, pero con el formato que
    // realmente llega replicado desde Postgres (espacio en vez de "T").
    await db.execute("insert into aseo (id, habitacion_id, fecha_hora) values (?, ?, ?)", [
      "a2",
      habitacionId,
      "2026-10-30 15:02:26.371Z"
    ]);

    const desde = "2026-10-30T04:00:00.000Z"; // inicio del día de Santiago, formato toISOString()
    const hasta = "2026-10-31T04:00:00.000Z";

    const consultaRota = await db.getAll<{ n: number }>(
      `select count(*) as n from aseo where habitacion_id = ? and fecha_hora >= ? and fecha_hora < ?`,
      [habitacionId, desde, hasta]
    );
    // Documenta el defecto: SIN normalizar, la fila ya sincronizada
    // (con espacio) no se cuenta — solo aparece la fila local.
    expect(consultaRota[0]?.n).toBe(1);

    const consultaCorregida = await db.getAll<{ n: number }>(
      `select count(*) as n from aseo
       where habitacion_id = ?
         and ${sqlFechaHoraNormalizada("fecha_hora")} >= ${sqlFechaHoraNormalizada("?")}
         and ${sqlFechaHoraNormalizada("fecha_hora")} < ${sqlFechaHoraNormalizada("?")}`,
      [habitacionId, desde, hasta]
    );
    // Con la normalización, ambas filas (local y ya sincronizada) cuentan.
    expect(consultaCorregida[0]?.n).toBe(2);

    await db.close();
  });

  it("una fila fuera del rango del día sigue excluida después de normalizar (no se vuelve permisiva de más)", async () => {
    const db = new PowerSyncDatabase({ schema: TestSchema, database: { dbFilename: dbPath } });
    const habitacionId = "hab-2";

    // Un día antes, también con formato espacio (ya sincronizada).
    await db.execute("insert into aseo (id, habitacion_id, fecha_hora) values (?, ?, ?)", [
      "a3",
      habitacionId,
      "2026-10-29 15:02:26.371Z"
    ]);

    const desde = "2026-10-30T04:00:00.000Z";
    const hasta = "2026-10-31T04:00:00.000Z";

    const resultado = await db.getAll<{ n: number }>(
      `select count(*) as n from aseo
       where habitacion_id = ?
         and ${sqlFechaHoraNormalizada("fecha_hora")} >= ${sqlFechaHoraNormalizada("?")}
         and ${sqlFechaHoraNormalizada("fecha_hora")} < ${sqlFechaHoraNormalizada("?")}`,
      [habitacionId, desde, hasta]
    );
    expect(resultado[0]?.n).toBe(0);

    await db.close();
  });
});
