import { describe, it, expect, vi, beforeEach } from "vitest";

const { throwOnError, from, updateFn, upsert } = vi.hoisted(() => {
  const throwOnError = vi.fn();
  const upsert = vi.fn(() => ({ throwOnError }));
  const eqFn = vi.fn(() => ({ throwOnError }));
  const updateFn = vi.fn(() => ({ eq: eqFn }));
  const from = vi.fn(() => ({ upsert, update: updateFn }));
  return { upsert, throwOnError, from, updateFn, eqFn };
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
    from.mockClear();
    updateFn.mockClear();
    upsert.mockClear();
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

  it("el alta de contrato ignora duplicados sin sobrescribir tarifa ni cambiar otros upserts", async () => {
    throwOnError.mockResolvedValue(undefined);
    const { database, complete } = crearDatabaseFake([
      { table: "contrato_empresa", op: UpdateType.PUT, id: "contrato-1", opData: { tarifa_convenida: 25000 } },
      { table: "empresa", op: UpdateType.PUT, id: "empresa-1", opData: { razon_social: "Empresa de prueba" } }
    ]);
    await new SupabaseConnector().uploadData(database as any);
    expect(upsert).toHaveBeenCalledWith({ id:"contrato-1", tarifa_convenida:25000 }, {onConflict:"id",ignoreDuplicates:true});
    expect(upsert).toHaveBeenCalledWith({ id:"empresa-1", razon_social:"Empresa de prueba" }, {onConflict:"id"});
    expect(complete).toHaveBeenCalledOnce();
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

/**
 * HU-22: insumo.costo_promedio/cantidad_total los recalcula EXCLUSIVAMENTE
 * el trigger de Postgres al insertar en compra_insumo (0001_init.sql); el
 * rol "authenticated" solo tiene GRANT select+insert en insumo, nunca
 * update. El PATCH local a insumo (espejo optimista en
 * registrarCompraInsumo.ts) nunca debe llegar a la red: si se enviara,
 * siempre sería rechazado (contaminando operacion_rechazada en cada
 * compra) y, si alguna vez se permitiera, el trigger duplicaría la compra
 * en el promedio ponderado.
 */
describe("SupabaseConnector.uploadData — insumo: el PATCH local nunca se sincroniza (HU-22)", () => {
  beforeEach(() => {
    throwOnError.mockReset();
    from.mockClear();
    updateFn.mockClear();
    upsert.mockClear();
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
      complete
    };
  }

  it("un PATCH a insumo se omite por completo: ni se llama a supabase.from('insumo')", async () => {
    const crud = [
      {
        table: "insumo",
        op: UpdateType.PATCH,
        id: "insumo-1",
        opData: { cantidad_total: 20, costo_promedio: 1234.5 }
      }
    ];
    const { database, complete } = crearDatabaseFake(crud);

    const connector = new SupabaseConnector();
    await connector.uploadData(database as any);

    expect(from).not.toHaveBeenCalledWith("insumo");
    expect(updateFn).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("un INSERT nuevo en insumo (catálogo, PUT) SÍ se sincroniza normalmente — solo el PATCH se omite", async () => {
    throwOnError.mockResolvedValueOnce(undefined);
    const crud = [
      { table: "insumo", op: UpdateType.PUT, id: "insumo-nuevo", opData: { nombre: "Arroz" } }
    ];
    const { database } = crearDatabaseFake(crud);

    const connector = new SupabaseConnector();
    await connector.uploadData(database as any);

    expect(from).toHaveBeenCalledWith("insumo");
  });

  it("insumo NUEVO (PUT) junto con su compra en la MISMA transacción: se sincroniza con cantidad_total/costo_promedio en CERO, no con el valor ya calculado por el cliente", async () => {
    throwOnError.mockResolvedValue(undefined);
    const crud = [
      {
        table: "insumo",
        op: UpdateType.PUT,
        id: "insumo-nuevo",
        opData: { nombre: "Pollo entero", cantidad_total: 10, costo_promedio: 2000 }
      },
      {
        table: "compra_insumo",
        op: UpdateType.PUT,
        id: "compra-1",
        opData: { insumo_id: "insumo-nuevo", cantidad: 10, monto_total: 20000 }
      }
    ];
    const { database } = crearDatabaseFake(crud);

    const connector = new SupabaseConnector();
    await connector.uploadData(database as any);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: "Pollo entero", cantidad_total: 0, costo_promedio: 0 }),
      expect.anything()
    );
  });

  it("la compra en sí (compra_insumo, PUT) se sincroniza normalmente en la misma transacción", async () => {
    throwOnError.mockResolvedValue(undefined);
    const crud = [
      { table: "insumo", op: UpdateType.PATCH, id: "insumo-1", opData: { cantidad_total: 20 } },
      { table: "compra_insumo", op: UpdateType.PUT, id: "compra-1", opData: { insumo_id: "insumo-1", cantidad: 10 } }
    ];
    const { database, complete } = crearDatabaseFake(crud);

    const connector = new SupabaseConnector();
    await connector.uploadData(database as any);

    expect(from).not.toHaveBeenCalledWith("insumo");
    expect(from).toHaveBeenCalledWith("compra_insumo");
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
