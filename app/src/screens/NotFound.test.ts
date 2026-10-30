import { describe, it, expect } from "vitest";
import { NotFound } from "./NotFound";

describe("Pantalla 404 (NotFound)", () => {
  it("está definida y exportada correctamente como componente React", () => {
    expect(NotFound).toBeDefined();
    expect(typeof NotFound).toBe("function");
  });
});
