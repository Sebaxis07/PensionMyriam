import { describe, it, expect, vi, beforeEach } from "vitest";

const { execute } = vi.hoisted(() => ({
  execute: vi.fn().mockResolvedValue(undefined)
}));
vi.mock("../../lib/powersync", () => ({ powersync: { execute } }));

import { corregirAseo, CorreccionAseoSchema } from "./corregirAseo";

describe("CorreccionAseoSchema", () => {
  it("exige una justificación no vacía", () => {
    expect(() =>
      CorreccionAseoSchema.parse({
        aseoOriginalId: crypto.randomUUID(),
        habitacionId: crypto.randomUUID(),
        justificacion: ""
      })
    ).toThrow();
  });

  it("acepta una corrección mínima con justificación", () => {
    expect(() =>
      CorreccionAseoSchema.parse({
        aseoOriginalId: crypto.randomUUID(),
        habitacionId: crypto.randomUUID(),
        justificacion: "Se marcó la tarea equivocada"
      })
    ).not.toThrow();
  });
});

describe("corregirAseo", () => {
  beforeEach(() => execute.mockClear());

  it("inserta una fila NUEVA referenciando aseo_corregido_id, nunca un UPDATE", async () => {
    const aseoOriginalId = crypto.randomUUID();
    const habitacionId = crypto.randomUUID();
    await corregirAseo("usuario-1", {
      aseoOriginalId,
      habitacionId,
      justificacion: "Se registró la cama equivocada"
    });

    expect(execute).toHaveBeenCalledTimes(1);
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toMatch(/insert into aseo/i);
    expect(sql).not.toMatch(/update aseo/i);
    expect(params).toEqual(
      expect.arrayContaining([aseoOriginalId, "Se registró la cama equivocada", habitacionId])
    );
  });
});
