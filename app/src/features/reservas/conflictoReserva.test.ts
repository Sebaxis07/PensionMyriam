import { describe, it, expect } from "vitest";
import { formatearMensajeConflicto } from "./conflictoReserva";

describe("formatearMensajeConflicto (HU-01: indicar con qué reserva choca)", () => {
  it("nombra al huésped y el rango de fechas de la reserva en conflicto", () => {
    const msg = formatearMensajeConflicto({
      huesped_nombre: "Carla Fuentes",
      fecha_inicio: "2026-10-24",
      fecha_fin: "2026-10-26"
    });
    expect(msg).toContain("Carla Fuentes");
    expect(msg).toContain("24/10/2026");
    expect(msg).toContain("26/10/2026");
  });

  it("usa 'indefinido' cuando la reserva en conflicto no tiene fecha de salida", () => {
    const msg = formatearMensajeConflicto({
      huesped_nombre: "Julio Álvarez",
      fecha_inicio: "2026-10-24",
      fecha_fin: null
    });
    expect(msg).toContain("indefinido");
  });

  it("usa un nombre genérico si la reserva en conflicto no tiene huésped registrado", () => {
    const msg = formatearMensajeConflicto({
      huesped_nombre: null,
      fecha_inicio: "2026-10-24",
      fecha_fin: "2026-10-25"
    });
    expect(msg).toContain("otro pasajero");
  });

  it("devuelve cadena vacía si no hay conflicto (no debe fabricar texto)", () => {
    expect(formatearMensajeConflicto(null)).toBe("");
    expect(formatearMensajeConflicto(undefined)).toBe("");
  });
});
