import { describe, it, expect, vi, beforeEach } from "vitest";

const { execute, getAll } = vi.hoisted(() => ({
  execute: vi.fn().mockResolvedValue(undefined),
  getAll: vi.fn().mockResolvedValue([{ n: 0 }])
}));
vi.mock("../../lib/powersync", () => ({ powersync: { execute, getAll } }));

import { consumoRapido } from "./consumoRapido";

describe("consumoRapido (HU-14)", () => {
  beforeEach(() => {
    execute.mockClear();
    getAll.mockReset().mockResolvedValue([{ n: 0 }]);
  });

  it("genera una transacción independiente por cada trabajador marcado", async () => {
    const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
    const resultados = await consumoRapido("usuario-1", ids, "almuerzo");

    expect(execute).toHaveBeenCalledTimes(3);
    expect(resultados).toHaveLength(3);
    expect(resultados.every((r) => r.ok)).toBe(true);

    const uuids = execute.mock.calls.map((call) => call[1].at(-1));
    expect(new Set(uuids).size).toBe(3); // uuid_idempotente distinto en cada una
  });

  it("un trabajador ya registrado no bloquea el resto del panel", async () => {
    const [yaMarcado, pendienteA, pendienteB] = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
    getAll.mockImplementation(async (_sql: string, params: unknown[]) =>
      params[0] === yaMarcado ? [{ n: 1 }] : [{ n: 0 }]
    );

    const resultados = await consumoRapido("usuario-1", [yaMarcado, pendienteA, pendienteB], "cena");

    expect(resultados.find((r) => r.trabajadorId === yaMarcado)?.ok).toBe(false);
    expect(resultados.find((r) => r.trabajadorId === pendienteA)?.ok).toBe(true);
    expect(resultados.find((r) => r.trabajadorId === pendienteB)?.ok).toBe(true);
    // Solo se escribió para los dos que sí correspondía.
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
