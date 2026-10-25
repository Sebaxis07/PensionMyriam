import { describe, it, expect, vi, beforeEach } from "vitest";

const { execute } = vi.hoisted(() => ({ execute: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../lib/powersync", () => ({ powersync: { execute } }));

import { crearEmpresa, EmpresaSchema } from "./crearEmpresa";

describe("crearEmpresa (HU-11)", () => {
  beforeEach(() => {
    execute.mockClear();
  });

  it("rechaza una razón social vacía antes de escribir", async () => {
    await expect(crearEmpresa({ razonSocial: "  " })).rejects.toThrow();
    expect(execute).not.toHaveBeenCalled();
  });

  it("registra la empresa con razón social, RUT y contacto opcionales", async () => {
    const id = await crearEmpresa({
      razonSocial: "Minera Los Cóndores SpA",
      rut: "76.123.456-7",
      contacto: "+56 9 1234 5678"
    });

    expect(typeof id).toBe("string");
    expect(execute).toHaveBeenCalledTimes(1);
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toMatch(/insert into empresa/i);
    expect(params).toContain("Minera Los Cóndores SpA");
    expect(params).toContain("76.123.456-7");
  });

  it("acepta RUT y contacto ausentes (empresas que todavía no los informan)", async () => {
    await crearEmpresa({ razonSocial: "Constructora Paposo Ltda." });
    const [, params] = execute.mock.calls[0];
    expect(params).toContain(null);
  });

  it("EmpresaSchema no exige tarifa (vive en contrato_empresa, no en empresa)", () => {
    expect(() => EmpresaSchema.parse({ razonSocial: "Empresa X" })).not.toThrow();
  });
});
