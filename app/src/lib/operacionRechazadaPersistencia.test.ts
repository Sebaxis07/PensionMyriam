import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PowerSyncDatabase, Schema, Table, column } from "@powersync/node";

/**
 * HU-42 — persistencia REAL (sin mocks) de `operacion_rechazada`, igual
 * que offlinePersistencia.test.ts para HU-27/28: motor real de
 * PowerSync/SQLite sobre un archivo temporal, cerrando y reabriendo
 * para simular "cerrar y reabrir la app". Ver ese archivo para por qué
 * se usa @powersync/node con un esquema reducido en vez del AppSchema
 * de producción.
 */
const TestSchema = new Schema({
  operacion_rechazada: new Table(
    {
      tabla: column.text,
      operacion: column.text,
      motivo: column.text,
      datos_json: column.text,
      fecha_hora: column.text,
      resuelta: column.integer,
      resuelta_por: column.text,
      resuelta_en: column.text
    },
    { localOnly: true }
  ),
  reserva: new Table({
    cama_id: column.text,
    trabajador_id: column.text
  })
});

let dir: string;
let dbPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pension-myriam-rechazos-"));
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

describe("HU-42 — operacion_rechazada: visible, persistente y resoluble", () => {
  it("una operación rechazada queda visible (consultable) de inmediato, sin filtrar por 'resuelta'", async () => {
    const db = new PowerSyncDatabase({ schema: TestSchema, database: { dbFilename: dbPath } });
    const id = crypto.randomUUID();

    await db.execute(
      `insert into operacion_rechazada (id, tabla, operacion, motivo, datos_json, fecha_hora, resuelta)
       values (?, 'reserva', 'PUT', 'cama ya ocupada', '{}', ?, 0)`,
      [id, new Date().toISOString()]
    );

    const pendientes = await db.getAll(
      "select * from operacion_rechazada where resuelta is null or resuelta = 0"
    );
    expect(pendientes).toHaveLength(1);

    await db.close();
  });

  it("sobrevive a cerrar y reabrir la app (local-only: no sincroniza, pero sí persiste en disco)", async () => {
    const id = crypto.randomUUID();

    const db1 = new PowerSyncDatabase({ schema: TestSchema, database: { dbFilename: dbPath } });
    await db1.execute(
      `insert into operacion_rechazada (id, tabla, operacion, motivo, datos_json, fecha_hora, resuelta)
       values (?, 'reserva', 'PUT', 'cama ya ocupada', '{}', ?, 0)`,
      [id, new Date().toISOString()]
    );
    await db1.close();

    const db2 = new PowerSyncDatabase({ schema: TestSchema, database: { dbFilename: dbPath } });
    const filas = await db2.getAll<{ id: string; motivo: string }>(
      "select id, motivo from operacion_rechazada where id = ?",
      [id]
    );
    expect(filas).toHaveLength(1);
    expect(filas[0].motivo).toBe("cama ya ocupada");
    await db2.close();
  });

  it("marcar como resuelto NO borra el registro: el historial queda conservado para auditoría", async () => {
    const db = new PowerSyncDatabase({ schema: TestSchema, database: { dbFilename: dbPath } });
    const id = crypto.randomUUID();

    await db.execute(
      `insert into operacion_rechazada (id, tabla, operacion, motivo, datos_json, fecha_hora, resuelta)
       values (?, 'reserva', 'PUT', 'cama ya ocupada', '{}', ?, 0)`,
      [id, new Date().toISOString()]
    );

    await db.execute(
      "update operacion_rechazada set resuelta = 1, resuelta_por = ?, resuelta_en = ? where id = ?",
      ["usuario-admin", new Date().toISOString(), id]
    );

    const todas = await db.getAll("select * from operacion_rechazada where id = ?", [id]);
    expect(todas).toHaveLength(1); // sigue existiendo

    const pendientes = await db.getAll(
      "select * from operacion_rechazada where resuelta is null or resuelta = 0"
    );
    expect(pendientes).toHaveLength(0); // pero ya no aparece como pendiente

    await db.close();
  });

  it("local-only: NO genera ninguna fila en ps_crud (nunca intenta sincronizar la evidencia del rechazo)", async () => {
    const db = new PowerSyncDatabase({ schema: TestSchema, database: { dbFilename: dbPath } });

    await db.execute(
      `insert into operacion_rechazada (id, tabla, operacion, motivo, datos_json, fecha_hora, resuelta)
       values (?, 'reserva', 'PUT', 'cama ya ocupada', '{}', ?, 0)`,
      [crypto.randomUUID(), new Date().toISOString()]
    );

    const cola = await db.getAll("select * from ps_crud");
    expect(cola).toHaveLength(0);

    await db.close();
  });
});
