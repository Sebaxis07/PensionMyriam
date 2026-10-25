import { describe, it, expect, vi, beforeEach } from "vitest";

const { execute, writeTransaction } = vi.hoisted(() => {
  const execute = vi.fn().mockResolvedValue(undefined);
  const writeTransaction = vi.fn(async (cb: (tx: { execute: typeof execute }) => Promise<void>) => {
    await cb({ execute });
  });
  return { execute, writeTransaction };
});
vi.mock("../../lib/powersync", () => ({ powersync: { execute, writeTransaction } }));

import { justificarDescuadre, MOTIVOS_DESCUADRE } from "./justificarDescuadre";

describe("justificarDescuadre (HU-17)", () => {
  beforeEach(() => {
    execute.mockClear();
    writeTransaction.mockClear();
  });

  it("expone exactamente los 5 motivos tipificados de CLAUDE.md, en el mismo orden", () => {
    expect(MOTIVOS_DESCUADRE).toEqual(["turno_extra", "almuerzo_mina", "corte_ruta", "ausencia_justificada", "otro"]);
  });

  it("rechaza un motivo que no está en la lista tipificada", async () => {
    await expect(
      justificarDescuadre("usuario-1", {
        conciliacionDiariaId: crypto.randomUUID(),
        motivo: "se_me_olvido" as any,
        supervisorNombre: "Juan Pérez"
      })
    ).rejects.toThrow();
    expect(writeTransaction).not.toHaveBeenCalled();
  });

  it("exige el nombre del supervisor que autorizó", async () => {
    await expect(
      justificarDescuadre("usuario-1", {
        conciliacionDiariaId: crypto.randomUUID(),
        motivo: "corte_ruta",
        supervisorNombre: "  "
      })
    ).rejects.toThrow();
  });

  it("guarda motivo + supervisor y marca la conciliación como con_diferencia_justificada, en UNA transacción", async () => {
    const conciliacionDiariaId = crypto.randomUUID();
    await justificarDescuadre("usuario-1", {
      conciliacionDiariaId,
      motivo: "almuerzo_mina",
      supervisorNombre: "Supervisor Faena"
    });

    expect(writeTransaction).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[0][0]).toMatch(/insert into justificacion_descuadre/i);
    expect(execute.mock.calls[0][1]).toContain("almuerzo_mina");
    expect(execute.mock.calls[0][1]).toContain("Supervisor Faena");
    expect(execute.mock.calls[1][0]).toMatch(/update conciliacion_diaria/i);
    expect(execute.mock.calls[1][0]).toMatch(/con_diferencia_justificada/);
    expect(execute.mock.calls[1][1]).toContain(conciliacionDiariaId);
  });

  it("NO cambia el monto facturado — solo escribe motivo/supervisor, nunca una columna de monto", async () => {
    await justificarDescuadre("usuario-1", {
      conciliacionDiariaId: crypto.randomUUID(),
      motivo: "otro",
      supervisorNombre: "Alguien"
    });
    for (const call of execute.mock.calls) {
      expect(call[0]).not.toMatch(/monto|cantidad_esperada|cantidad_servida/i);
    }
  });
});
