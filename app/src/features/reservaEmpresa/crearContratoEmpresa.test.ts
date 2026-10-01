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
    getAll.mockReset().mockResolvedValue([]);
  });

  it("crea el contrato cuando no hay vigencia previa", async () => {
    await crearContratoEmpresa("usuario-1", {
      empresaId,
      vigenciaDesde: "2026-01-01",
      headcount: 30,
      tarifaConvenida: 20000
    });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toMatch(/insert into contrato_empresa/i);
  });

  it("cierra la vigencia del contrato anterior (vigencia_hasta = ayer) y crea el nuevo", async () => {
    getAll.mockResolvedValueOnce([
      { id: "contrato-previo", vigencia_desde: "2025-01-01", vigencia_hasta: null }
    ]);
    await crearContratoEmpresa("usuario-1", {
      empresaId,
      vigenciaDesde: "2026-02-01",
      headcount: 25,
      tarifaConvenida: 22000
    });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[0][0]).toMatch(/update contrato_empresa set vigencia_hasta = \? where id = \?/i);
    expect(execute.mock.calls[0][1]).toEqual(["2026-01-31", "contrato-previo"]);
    expect(execute.mock.calls[1][0]).toMatch(/insert into contrato_empresa/i);
  });

  it("avisa temprano si el nuevo contrato intenta iniciar en o antes del inicio del contrato existente", async () => {
    getAll.mockResolvedValueOnce([
      { id: "contrato-previo", vigencia_desde: "2026-05-01", vigencia_hasta: null }
    ]);
    await expect(
      crearContratoEmpresa("usuario-1", {
        empresaId,
        vigenciaDesde: "2026-05-01",
        headcount: 30,
        tarifaConvenida: 20000
      })
    ).rejects.toBeInstanceOf(ContratoSolapadoError);
    expect(execute).not.toHaveBeenCalled();
  });
});
