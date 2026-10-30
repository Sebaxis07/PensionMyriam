import { describe, it, expect, vi, beforeEach } from "vitest";

const { getOptional, execute } = vi.hoisted(() => ({
  getOptional: vi.fn(),
  execute: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../../lib/powersync", () => ({
  powersync: {
    writeTransaction: async (fn: (tx: { getOptional: typeof getOptional; execute: typeof execute }) => Promise<void>) =>
      fn({ getOptional, execute })
  }
}));

import { registrarCompraInsumo } from "./registrarCompraInsumo";

describe("registrarCompraInsumo — detalle de comprobante (migración 0024)", () => {
  beforeEach(() => {
    getOptional.mockReset();
    execute.mockReset().mockResolvedValue(undefined);
  });

  it("registra el caso real de la boleta de combustible: proveedor, medio de pago y N° de comprobante, sin forzar un desglose de IVA que no cuadra", async () => {
    // La boleta real (ev/boleta.jpg) trae Subtotal neto $14.144 + IVA
    // $2.687 pero un Total a pagar de $15.000, no $16.831: el
    // combustible en Chile lleva además el Impuesto Específico a los
    // Combustibles (IEF/IEV, con un componente variable que puede ser
    // negativo), que esta tabla no modela como un campo aparte. Por
    // eso el neto/IVA de un comprobante de combustible NO se cargan
    // aquí (quedarían inconsistentes con el check de la migración
    // 0024) — se registra solo lo que sí es inequívoco: proveedor,
    // medio de pago y N° de comprobante.
    getOptional.mockResolvedValueOnce(null); // no existe el insumo "Diesel" aún

    await registrarCompraInsumo({
      nombreInsumo: "Diesel",
      categoria: "gas_combustible",
      unidadMedida: "litros",
      montoTotal: 15000,
      cantidad: 9.572,
      registradoPor: "admin-1",
      proveedor: "Estación de servicio Copec",
      medioPago: "tarjeta_debito",
      referenciaComprobante: "223505"
    });

    const insertCompra = execute.mock.calls.find(([sql]) => /insert into compra_insumo/i.test(sql));
    expect(insertCompra).toBeDefined();
    const [, params] = insertCompra!;
    expect(params).toContain("Estación de servicio Copec");
    expect(params).toContain("tarjeta_debito");
    expect(params).toContain("223505");
  });

  it("acepta un comprobante simple (no combustible) donde neto + IVA sí cuadra con el total", async () => {
    getOptional.mockResolvedValueOnce(null);

    // Compra de abarrotes con boleta que sí trae el desglose estándar:
    // neto $10.084 + IVA 19% $1.916 = total $12.000.
    await registrarCompraInsumo({
      nombreInsumo: "Arroz",
      categoria: "abarrotes",
      unidadMedida: "kg",
      montoTotal: 12000,
      cantidad: 10,
      registradoPor: "admin-1",
      proveedor: "Distribuidora Paposo",
      montoNeto: 10084,
      montoIva: 1916
    });

    const insertCompra = execute.mock.calls.find(([sql]) => /insert into compra_insumo/i.test(sql));
    const [, params] = insertCompra!;
    expect(params).toContain(10084);
    expect(params).toContain(1916);
  });

  it("rechaza un comprobante cuyo neto + IVA no cuadra con el total pagado", async () => {
    await expect(
      registrarCompraInsumo({
        nombreInsumo: "Diesel",
        categoria: "gas_combustible",
        unidadMedida: "litros",
        montoTotal: 15000,
        cantidad: 9.572,
        registradoPor: "admin-1",
        montoNeto: 10000,
        montoIva: 2687 // 10000 + 2687 != 15000
      })
    ).rejects.toThrow(/no coincide/i);
    expect(execute).not.toHaveBeenCalled();
  });

  it("permite registrar una compra sin ningún dato de comprobante (caso común, sin boleta detallada)", async () => {
    getOptional.mockResolvedValueOnce(null);

    await registrarCompraInsumo({
      nombreInsumo: "Papas",
      categoria: "verduras",
      unidadMedida: "kg",
      montoTotal: 12000,
      cantidad: 20,
      registradoPor: "admin-1"
    });

    const insertCompra = execute.mock.calls.find(([sql]) => /insert into compra_insumo/i.test(sql));
    const [, params] = insertCompra!;
    // proveedor, medio_pago, referencia, neto, iva, observaciones -> todos null
    expect(params.slice(-7)).toEqual([null, null, null, null, null, null, null]);
  });
});
