import { describe, it, expect, vi, beforeEach } from "vitest";

const { throwOnError, from } = vi.hoisted(() => {
  const throwOnError = vi.fn();
  const upsert = vi.fn(() => ({ throwOnError }));
  const from = vi.fn(() => ({ upsert }));
  return { upsert, throwOnError, from };
});
vi.mock("./supabase", () => ({ supabase: { from } }));
vi.mock("./env", () => ({ POWERSYNC_URL: "http://test" }));

import { SupabaseConnector } from "./connector";
import { UpdateType } from "@powersync/web";

/**
 * HU-42: "el dato local se revierte" — cuando el servidor rechaza una
 * reserva por 23P01 (EXCLUDE, cama ya ocupada por otro dispositivo),
 * uploadData() debe borrar esa reserva local y limpiar trabajador.cama_id
 * si todavía apunta a la cama rechazada, además de dejar evidencia en
 * operacion_rechazada. No hay test previo de uploadData() completo
 * (connector.test.ts solo prueba la función pura clasificarErrorSync).
 */
describe("SupabaseConnector.uploadData — reversión local en rechazo 23P01 (HU-42)", () => {
  beforeEach(() => {
    throwOnError.mockReset();
  });

  function crearDatabaseFake(crud: any[]) {
    const txExecute = vi.fn().mockResolvedValue(undefined);
    const execute = vi.fn().mockResolvedValue(undefined);
    const complete = vi.fn().mockResolvedValue(undefined);
    const writeTransaction = vi.fn(async (cb: (tx: { execute: typeof txExecute }) => Promise<void>) => {
      await cb({ execute: txExecute });
    });
    return {
      database: {
        getNextCrudTransaction: vi.fn().mockResolvedValue({ crud, complete }),
        execute,
        writeTransaction
      },
      txExecute,
      execute,
      complete
    };
  }

  it("borra la reserva local y limpia cama_id del trabajador cuando el rechazo es 23P01", async () => {
    throwOnError.mockRejectedValueOnce({
      code: "23P01",
      message: 'conflicting key value violates exclusion constraint "reserva_no_solapa_cama"'
    });

    const crud = [
      {
        table: "reserva",
        op: UpdateType.PUT,
        id: "reserva-rechazada",
        opData: { trabajador_id: "trabajador-1", cama_id: "cama-1" }
      }
    ];
    const { database, txExecute, execute, complete } = crearDatabaseFake(crud);

    const connector = new SupabaseConnector();
    await connector.uploadData(database as any);

    // Evidencia guardada (HU-42: no desaparece sin aviso).
    expect(execute).toHaveBeenCalledWith(
      expect.stringMatching(/insert into operacion_rechazada/i),
      expect.arrayContaining(["reserva", UpdateType.PUT])
    );

    // Reversión del dato local optimista.
    expect(txExecute).toHaveBeenCalledWith("delete from reserva where id = ?", ["reserva-rechazada"]);
    expect(txExecute).toHaveBeenCalledWith(
      "update trabajador set cama_id = null where id = ? and cama_id = ?",
      ["trabajador-1", "cama-1"]
    );

    // La transacción de PowerSync igual se completa: no se reintenta
    // para siempre un rechazo permanente.
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("NO revierte nada para un rechazo permanente que no es el EXCLUDE de reserva (ej. check constraint en consumo)", async () => {
    throwOnError.mockRejectedValueOnce({ code: "23514", message: "check constraint violated" });

    const crud = [
      { table: "consumo", op: UpdateType.PUT, id: "consumo-1", opData: { trabajador_id: "trabajador-1" } }
    ];
    const { database, txExecute, execute } = crearDatabaseFake(crud);

    const connector = new SupabaseConnector();
    await connector.uploadData(database as any);

    expect(execute).toHaveBeenCalledWith(expect.stringMatching(/insert into operacion_rechazada/i), expect.anything());
    expect(txExecute).not.toHaveBeenCalled();
  });

  it("un rechazo duplicado_idempotente (reintento ya aplicado) no se guarda como rechazo ni revierte nada", async () => {
    throwOnError.mockRejectedValueOnce({
      code: "23505",
      message: 'duplicate key value violates unique constraint "checkin_uuid_idempotente_key"'
    });

    const crud = [{ table: "checkin", op: UpdateType.PUT, id: "checkin-1", opData: {} }];
    const { database, txExecute, execute, complete } = crearDatabaseFake(crud);

    const connector = new SupabaseConnector();
    await connector.uploadData(database as any);

    expect(execute).not.toHaveBeenCalled();
    expect(txExecute).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
