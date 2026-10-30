import { describe, it, expect, vi, beforeEach } from "vitest";

const { execute } = vi.hoisted(() => ({
  execute: vi.fn().mockResolvedValue(undefined)
}));
vi.mock("../../lib/powersync", () => ({ powersync: { execute } }));

import {
  registrarAseoRapido,
  registrarAseoDetallado,
  AseoRapidoSchema,
  AseoDetalladoSchema,
  TAREAS_ASEO
} from "./registrarAseo";

describe("AseoRapidoSchema / AseoDetalladoSchema", () => {
  it("un registro rápido solo exige habitacionId (tipo tiene default 'diario')", () => {
    const resultado = AseoRapidoSchema.parse({ habitacionId: crypto.randomUUID() });
    expect(resultado.tipo).toBe("diario");
  });

  it("un registro detallado es válido sin tareas, cama, observaciones ni responsable declarado", () => {
    expect(() => AseoDetalladoSchema.parse({ habitacionId: crypto.randomUUID() })).not.toThrow();
  });

  it("acepta una sola tarea seleccionada", () => {
    expect(() =>
      AseoDetalladoSchema.parse({ habitacionId: crypto.randomUUID(), tareas: ["barrer"] })
    ).not.toThrow();
  });

  it("acepta todas las tareas del catálogo a la vez", () => {
    const claves = TAREAS_ASEO.map((t) => t.clave);
    expect(() => AseoDetalladoSchema.parse({ habitacionId: crypto.randomUUID(), tareas: claves })).not.toThrow();
  });

  it("rechaza una clave de tarea que no existe en el catálogo", () => {
    expect(() =>
      AseoDetalladoSchema.parse({ habitacionId: crypto.randomUUID(), tareas: ["lavar_autos"] })
    ).toThrow();
  });
});

describe("registrarAseoRapido", () => {
  beforeEach(() => execute.mockClear());

  it("inserta un registro sin exigir ningún campo extra (HU: aseo rápido en pocos toques)", async () => {
    const habitacionId = crypto.randomUUID();
    await registrarAseoRapido("usuario-1", { habitacionId, tipo: "diario" });

    expect(execute).toHaveBeenCalledTimes(1);
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toMatch(/insert into aseo/i);
    expect(params).toEqual(expect.arrayContaining([habitacionId, "diario", "usuario-1"]));
  });

  it("cada llamada genera su propio uuid_idempotente", async () => {
    const habitacionId = crypto.randomUUID();
    await registrarAseoRapido("usuario-1", { habitacionId, tipo: "diario" });
    await registrarAseoRapido("usuario-1", { habitacionId, tipo: "diario" });

    const uuidA = execute.mock.calls[0][1].at(-1);
    const uuidB = execute.mock.calls[1][1].at(-1);
    expect(uuidA).not.toEqual(uuidB);
  });
});

describe("registrarAseoDetallado", () => {
  beforeEach(() => execute.mockClear());

  it("permite guardar solo una observación, sin tareas seleccionadas", async () => {
    const habitacionId = crypto.randomUUID();
    await registrarAseoDetallado("usuario-1", { habitacionId, observaciones: "Falta cambiar la ampolleta" });

    const [, params] = execute.mock.calls[0];
    // cama_id null, tareas null (no seleccionadas), observaciones presente
    expect(params).toEqual(expect.arrayContaining(["Falta cambiar la ampolleta"]));
  });

  it("registrar la cama 1 no debe tocar ni mencionar la cama 2 (independencia por cama)", async () => {
    const habitacionId = crypto.randomUUID();
    const cama1 = crypto.randomUUID();
    await registrarAseoDetallado("usuario-1", { habitacionId, camaId: cama1, tareas: ["cambiar_sabanas"] });

    const [, params] = execute.mock.calls[0];
    expect(params).toContain(cama1);
    expect(params.filter((p: unknown) => typeof p === "string" && p.includes("cama2"))).toHaveLength(0);
  });

  it("guarda la lista de tareas como JSON", async () => {
    const habitacionId = crypto.randomUUID();
    await registrarAseoDetallado("usuario-1", { habitacionId, tareas: ["barrer", "trapear"] });

    const [, params] = execute.mock.calls[0];
    expect(params).toContain(JSON.stringify(["barrer", "trapear"]));
  });

  it("marca pendiente=1 cuando se indica explícitamente", async () => {
    const habitacionId = crypto.randomUUID();
    await registrarAseoDetallado("usuario-1", { habitacionId, pendiente: true });

    const [, params] = execute.mock.calls[0];
    expect(params).toContain(1);
  });

  it("guarda responsableDeclarado distinto del usuario que registra", async () => {
    const habitacionId = crypto.randomUUID();
    await registrarAseoDetallado("usuario-1", { habitacionId, responsableDeclarado: "cuñada de María" });

    const [, params] = execute.mock.calls[0];
    expect(params).toEqual(expect.arrayContaining(["usuario-1", "cuñada de María"]));
  });

  it("un registro en habitación ocupada no cambia habitacion.estado: solo escribe en aseo", async () => {
    const habitacionId = crypto.randomUUID();
    await registrarAseoDetallado("usuario-1", { habitacionId, tipo: "diario" });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).not.toMatch(/update habitacion/i);
  });
});
