import { describe, it, expect, vi, beforeEach } from "vitest";

const { execute, getAll } = vi.hoisted(() => ({
  execute: vi.fn().mockResolvedValue(undefined),
  getAll: vi.fn().mockResolvedValue([{ n: 0 }])
}));
vi.mock("../../lib/powersync", () => ({ powersync: { execute, getAll } }));

import { crearContratoEmpresa, ContratoSolapadoError, ContratoEmpresaSchema } from "./crearContratoEmpresa";

const empresaId = crypto.randomUUID();

describe("ContratoEmpresaSchema", () => {
  it("rechaza headcount cero o negativo", () => {
    expect(() =>
      ContratoEmpresaSchema.parse({ empresaId, vigenciaDesde: "2026-01-01", headcount: 0, tarifaConvenida: 20000 })
    ).toThrow();
  });

  it("rechaza tarifa negativa", () => {
    expect(() =>
      ContratoEmpresaSchema.parse({ empresaId, vigenciaDesde: "2026-01-01", headcount: 10, tarifaConvenida: -1 })
    ).toThrow();
  });
});

describe("crearContratoEmpresa (HU-02)", () => {
  beforeEach(() => {
    execute.mockClear();
    getAll.mockReset().mockResolvedValue([{ n: 0 }]);
  });

  it("crea el contrato cuando no hay vigencia solapada", async () => {
    await crearContratoEmpresa("usuario-1", {
      empresaId,
      vigenciaDesde: "2026-01-01",
      headcount: 30,
      tarifaConvenida: 20000
    });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toMatch(/insert into contrato_empresa/i);
  });

  it("avisa temprano (sin escribir) si ya hay una vigencia que se cruza", async () => {
    getAll.mockResolvedValueOnce([{ n: 1 }]);
    await expect(
      crearContratoEmpresa("usuario-1", { empresaId, vigenciaDesde: "2026-01-01", headcount: 30, tarifaConvenida: 20000 })
    ).rejects.toBeInstanceOf(ContratoSolapadoError);
    expect(execute).not.toHaveBeenCalled();
  });
});
