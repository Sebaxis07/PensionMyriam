import { describe, it, expect } from "vitest";
import { construirDocDefinicionVoucher } from "./generarVoucherTuristaPdf";

describe("construirDocDefinicionVoucher", () => {
  it("construye la definición del documento con membrete, detalles y total calculado", () => {
    const docDef = construirDocDefinicionVoucher({
      reservaId: "abc12345-6789-abcd-ef01-23456789abcd",
      huespedNombre: "Carlos Morales",
      habitacionNumero: 5,
      fechaInicio: "2026-10-15",
      fechaFin: "2026-10-18",
      nochesEstimadas: 3,
      tarifaNoche: 15000
    });

    expect(docDef.pageSize).toBe("LETTER");
    expect(Array.isArray(docDef.content)).toBe(true);

    const contentStr = JSON.stringify(docDef.content);
    expect(contentStr).toContain("PENSIÓN SEÑORA MIRIAM");
    expect(contentStr).toContain("Caleta Paposo");
    expect(contentStr).toContain("COMPROBANTE DE RESERVA");
    expect(contentStr).toContain("ABC12345");
    expect(contentStr).toContain("Carlos Morales");
    expect(contentStr).toContain("Pieza #5");
    expect(contentStr).toContain("3 noche(s)");
    expect(contentStr).toContain("$45.000");
    expect(contentStr).toContain("BancoEstado");
    expect(contentStr).toContain("CuentaRUT");
  });

  it("calcula mínimo 1 noche si se omite", () => {
    const docDef = construirDocDefinicionVoucher({
      reservaId: "xyz-001",
      huespedNombre: "Turista Anónimo",
      habitacionNumero: 2,
      fechaInicio: "2026-10-20"
    });

    const contentStr = JSON.stringify(docDef.content);
    expect(contentStr).toContain("1 noche(s)");
    expect(contentStr).toContain("$15.000");
  });
});
