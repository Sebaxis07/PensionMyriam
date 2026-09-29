import { describe, it, expect, vi, beforeEach } from "vitest";

const { execute, getAll } = vi.hoisted(() => ({
  execute: vi.fn().mockResolvedValue(undefined),
  getAll: vi.fn().mockResolvedValue([{ n: 0 }])
}));
vi.mock("../../lib/powersync", () => ({ powersync: { execute, getAll } }));

import { registrarConsumo, ConsumoDuplicadoError, ConsumoSchema } from "./registrarConsumo";

describe("ConsumoSchema", () => {
  it("acepta un consumo válido", () => {
    expect(() => ConsumoSchema.parse({ trabajadorId: crypto.randomUUID(), tipoRacion: "almuerzo" })).not.toThrow();
  });

  it("rechaza un tipoRacion inválido", () => {
    expect(() => ConsumoSchema.parse({ trabajadorId: crypto.randomUUID(), tipoRacion: "brunch" })).toThrow();
  });

  it("rechaza un recargo negativo", () => {
    expect(() =>
      ConsumoSchema.parse({ trabajadorId: crypto.randomUUID(), tipoRacion: "plato_especial", recargo: -100 })
    ).toThrow();
  });
});

describe("registrarConsumo", () => {
  beforeEach(() => {
    execute.mockClear();
    getAll.mockReset().mockResolvedValue([{ n: 0 }]);
  });

  it("inserta el consumo cuando no hay uno igual registrado hoy", async () => {
    const trabajadorId = crypto.randomUUID();
    await registrarConsumo("usuario-1", { trabajadorId, tipoRacion: "almuerzo" });

    expect(execute).toHaveBeenCalledTimes(1);
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toMatch(/insert into consumo/i);
    expect(params).toEqual(
      expect.arrayContaining([trabajadorId, "almuerzo", 0, "usuario-1"])
    );
  });

  it("rechaza sin escribir si ya existe la misma ración hoy (HU-13)", async () => {
    getAll.mockResolvedValueOnce([{ n: 1 }]);
    const trabajadorId = crypto.randomUUID();

    await expect(registrarConsumo("usuario-1", { trabajadorId, tipoRacion: "cena" })).rejects.toBeInstanceOf(
      ConsumoDuplicadoError
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it("cada llamada genera su propio uuid_idempotente", async () => {
    const trabajadorId = crypto.randomUUID();
    await registrarConsumo("usuario-1", { trabajadorId, tipoRacion: "desayuno" });
    await registrarConsumo("usuario-1", { trabajadorId, tipoRacion: "almuerzo" });

    const uuidA = execute.mock.calls[0][1].at(-1);
    const uuidB = execute.mock.calls[1][1].at(-1);
    expect(uuidA).not.toEqual(uuidB);
  });
});
