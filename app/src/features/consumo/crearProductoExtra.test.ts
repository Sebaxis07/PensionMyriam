import { describe, it, expect, vi, beforeEach } from "vitest";

const { execute } = vi.hoisted(() => ({
  execute: vi.fn().mockResolvedValue(undefined)
}));
vi.mock("../../lib/powersync", () => ({ powersync: { execute } }));

import { crearProductoExtra, ProductoExtraSchema } from "./crearProductoExtra";

describe("ProductoExtraSchema", () => {
  it("acepta un producto válido", () => {
    expect(() =>
      ProductoExtraSchema.parse({
        nombre: "Colación de terreno",
        precioUnitario: 3500
      })
    ).not.toThrow();
  });

  it("rechaza si el nombre está vacío", () => {
    expect(() =>
      ProductoExtraSchema.parse({
        nombre: "   ",
        precioUnitario: 3500
      })
    ).toThrow();
  });

  it("rechaza si el precio es negativo", () => {
    expect(() =>
      ProductoExtraSchema.parse({
        nombre: "Plato especial",
        precioUnitario: -500
      })
    ).toThrow();
  });
});

describe("crearProductoExtra", () => {
  beforeEach(() => {
    execute.mockClear();
  });

  it("inserta el producto extra en la base de datos", async () => {
    const id = await crearProductoExtra({
      nombre: "Colación faena",
      precioUnitario: 4000
    });

    expect(id).toBeDefined();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("insert into producto_extra"),
      expect.arrayContaining([id, "Colación faena", 4000])
    );
  });
});
