import { describe, it, expect, vi, beforeEach } from "vitest";

const { execute, useQuery } = vi.hoisted(() => ({
  execute: vi.fn().mockResolvedValue(undefined),
  useQuery: vi.fn((_sql: string, _params?: unknown[]) => ({ data: [] }))
}));
vi.mock("../../lib/powersync", () => ({ powersync: { execute } }));
vi.mock("@powersync/react", () => ({ useQuery }));

import { resolverOperacionRechazada, useOperacionesRechazadas } from "./operacionesRechazadas";

describe("useOperacionesRechazadas (HU-42: visible para la Administradora)", () => {
  beforeEach(() => {
    useQuery.mockClear();
  });

  it("por defecto solo pide las PENDIENTES (resuelta is null or 0), no el historial completo", () => {
    useOperacionesRechazadas();
    const [sql] = useQuery.mock.calls[0];
    expect(sql).toMatch(/resuelta is null or resuelta = 0/i);
    expect(sql).toMatch(/order by fecha_hora desc/i);
  });

  it("con soloPendientes=false devuelve también las ya resueltas (historial/auditoría)", () => {
    useOperacionesRechazadas(false);
    const [sql] = useQuery.mock.calls[0];
    expect(sql).not.toMatch(/where resuelta/i);
    expect(sql).toMatch(/select \* from operacion_rechazada order by fecha_hora desc/i);
  });
});

describe("resolverOperacionRechazada (HU-42)", () => {
  beforeEach(() => {
    execute.mockClear();
  });

  it("marca la fila como resuelta con quién y cuándo, sin borrarla", async () => {
    await resolverOperacionRechazada("rechazo-1", "usuario-1");

    expect(execute).toHaveBeenCalledTimes(1);
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toMatch(/update operacion_rechazada set resuelta = 1/i);
    expect(sql).not.toMatch(/delete/i);
    expect(params[0]).toBe("usuario-1");
    expect(params[2]).toBe("rechazo-1");
  });
});
