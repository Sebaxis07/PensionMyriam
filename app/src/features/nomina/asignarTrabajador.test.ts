import { describe, it, expect, vi, beforeEach } from "vitest";

const { execute, getAll, writeTransaction } = vi.hoisted(() => {
  const execute = vi.fn().mockResolvedValue(undefined);
  const getAll = vi.fn().mockResolvedValue([]);
  const writeTransaction = vi.fn(async (cb: (tx: { execute: typeof execute }) => Promise<void>) => {
    await cb({ execute });
  });
  return { execute, getAll, writeTransaction };
});
vi.mock("../../lib/powersync", () => ({ powersync: { execute, getAll, writeTransaction } }));

import {
  crearTrabajadores,
  camasLibresParaContrato,
  asignarTrabajador,
  desasignarTrabajador,
  eliminarTrabajador,
  CamaOcupadaError
} from "./asignarTrabajador";

describe("crearTrabajadores (HU-02/HU-12: nómina de la empresa)", () => {
  beforeEach(() => {
    execute.mockClear();
  });

  it("crea un trabajador por cada nombre no vacío", async () => {
    const ids = await crearTrabajadores("contrato-1", ["Pedro Almonte", "Luis Vergara"]);
    expect(ids).toHaveLength(2);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("descarta nombres vacíos o solo espacios (no crea trabajadores basura)", async () => {
    const ids = await crearTrabajadores("contrato-1", ["Pedro Almonte", "   ", ""]);
    expect(ids).toHaveLength(1);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe("camasLibresParaContrato (HU-10: mantención bloquea asignación)", () => {
  it("la consulta excluye explícitamente las habitaciones en mantención", async () => {
    getAll.mockResolvedValueOnce([]);
    await camasLibresParaContrato("2026-11-01", null);
    const [sql] = getAll.mock.calls[0];
    expect(sql).toMatch(/estado\s*<>\s*'en_mantencion'/);
  });

  it("usa 9999-12-31 como horizonte cuando el contrato no tiene fecha de término", async () => {
    getAll.mockResolvedValueOnce([]);
    await camasLibresParaContrato("2026-11-01", null);
    const [, params] = getAll.mock.calls[0];
    expect(params[0]).toBe("9999-12-31");
  });
});

describe("asignarTrabajador (HU-02/HU-06: asigna cama en la misma transacción)", () => {
  beforeEach(() => {
    execute.mockClear();
    writeTransaction.mockClear();
    getAll.mockReset();
    getAll.mockResolvedValue([]);
  });

  it("inserta la reserva tipo_cliente='empresa' y actualiza trabajador.cama_id en UNA sola transacción", async () => {
    await asignarTrabajador("usuario-1", {
      trabajadorId: crypto.randomUUID(),
      camaId: crypto.randomUUID(),
      contratoEmpresaId: crypto.randomUUID(),
      fechaInicio: "2026-11-01"
    });

    expect(writeTransaction).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[0][0]).toMatch(/insert into reserva/i);
    expect(execute.mock.calls[0][0]).toMatch(/'empresa'/);
    expect(execute.mock.calls[1][0]).toMatch(/update trabajador set cama_id/i);
  });

  it("rechaza un input inválido (uuid mal formado) antes de escribir", async () => {
    await expect(
      asignarTrabajador("usuario-1", {
        trabajadorId: "no-es-un-uuid",
        camaId: crypto.randomUUID(),
        contratoEmpresaId: crypto.randomUUID(),
        fechaInicio: "2026-11-01"
      })
    ).rejects.toThrow();
    expect(execute).not.toHaveBeenCalled();
  });

  it("rechaza asignar una cama ya ocupada por OTRO trabajador en fechas que se cruzan, sin escribir nada", async () => {
    getAll.mockResolvedValueOnce([{ id: "reserva-existente" }]);
    await expect(
      asignarTrabajador("usuario-1", {
        trabajadorId: crypto.randomUUID(),
        camaId: crypto.randomUUID(),
        contratoEmpresaId: crypto.randomUUID(),
        fechaInicio: "2026-11-01"
      })
    ).rejects.toThrow(CamaOcupadaError);
    expect(writeTransaction).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("permite reasignar la MISMA cama al MISMO trabajador (reintento idempotente, no es un choque)", async () => {
    const trabajadorId = crypto.randomUUID();
    await asignarTrabajador("usuario-1", {
      trabajadorId,
      camaId: crypto.randomUUID(),
      contratoEmpresaId: crypto.randomUUID(),
      fechaInicio: "2026-11-01"
    });
    const [, params] = getAll.mock.calls[0];
    expect(params[1]).toBe(trabajadorId);
    expect(writeTransaction).toHaveBeenCalledTimes(1);
  });
});

describe("desasignarTrabajador / eliminarTrabajador", () => {
  beforeEach(() => {
    execute.mockClear();
  });

  it("desasignarTrabajador cancela la reserva activa y limpia cama_id, sin borrar al trabajador", async () => {
    await desasignarTrabajador("trabajador-1");
    expect(execute.mock.calls[0][0]).toMatch(/update reserva set estado = 'cancelada'/i);
    expect(execute.mock.calls[1][0]).toMatch(/update trabajador set cama_id = null/i);
  });

  it("eliminarTrabajador cancela la reserva y SÍ elimina al trabajador de la nómina", async () => {
    await eliminarTrabajador("trabajador-1");
    expect(execute.mock.calls[0][0]).toMatch(/update reserva set estado = 'cancelada'/i);
    expect(execute.mock.calls[1][0]).toMatch(/delete from trabajador/i);
  });
});
