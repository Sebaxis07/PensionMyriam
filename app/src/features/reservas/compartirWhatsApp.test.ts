import { describe, it, expect } from "vitest";
import { armarMensajeWhatsAppReserva } from "./compartirWhatsApp";

describe("armarMensajeWhatsAppReserva", () => {
  it("genera el mensaje formateado con tarifa estándar y datos de BancoEstado", () => {
    const mensaje = armarMensajeWhatsAppReserva({
      huespedNombre: "Juan Pérez",
      habitacionNumero: 3,
      fechaInicio: "2026-10-05",
      fechaFin: "2026-10-07",
      nochesEstimadas: 2,
      tarifaNoche: 15000
    });

    expect(mensaje).toContain("¡Hola Juan Pérez!");
    expect(mensaje).toContain("Pieza #3");
    expect(mensaje).toContain("2026-10-05");
    expect(mensaje).toContain("2026-10-07");
    expect(mensaje).toContain("2 noche(s) · $15.000/noche");
    expect(mensaje).toContain("$30.000");
    expect(mensaje).toContain("BancoEstado");
    expect(mensaje).toContain("CuentaRUT");
    expect(mensaje).toContain("No exigimos abono previo");
  });

  it("utiliza valores por defecto si no se especifican noches o tarifa", () => {
    const mensaje = armarMensajeWhatsAppReserva({
      huespedNombre: "Ana Silva",
      habitacionNumero: 1,
      fechaInicio: "2026-10-10"
    });

    expect(mensaje).toContain("¡Hola Ana Silva!");
    expect(mensaje).toContain("Pieza #1");
    expect(mensaje).toContain("1 noche(s) · $15.000/noche");
    expect(mensaje).toContain("$15.000");
    expect(mensaje).toContain("Por coordinar");
  });
});
