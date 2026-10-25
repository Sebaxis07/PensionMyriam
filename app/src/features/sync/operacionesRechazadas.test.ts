import { describe, it, expect, vi, beforeEach } from "vitest";

const { execute } = vi.hoisted(() => ({ execute: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../lib/powersync", () => ({ powersync: { execute } }));
vi.mock("@powersync/react", () => ({ useQuery: vi.fn(() => ({ data: [] })) }));

import { resolverOperacionRechazada } from "./operacionesRechazadas";

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
