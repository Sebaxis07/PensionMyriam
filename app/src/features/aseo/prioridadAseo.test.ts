import { describe, it, expect } from "vitest";
import { calcularPrioridadAseo, estaEnVentanaIdeal } from "./prioridadAseo";

describe("calcularPrioridadAseo (HU-08: priorización horaria)", () => {
  it("prioriza al contratista (empresa) entre 06:00 y 19:00, en faena", () => {
    expect(calcularPrioridadAseo("empresa", 6)).toBe(2);
    expect(calcularPrioridadAseo("empresa", 12)).toBe(2);
    expect(calcularPrioridadAseo("empresa", 18)).toBe(2);
  });

  it("NO prioriza al contratista fuera de 06:00-19:00 (probablemente en la pieza)", () => {
    expect(calcularPrioridadAseo("empresa", 5)).toBe(0);
    expect(calcularPrioridadAseo("empresa", 19)).toBe(0);
    expect(calcularPrioridadAseo("empresa", 22)).toBe(0);
  });

  it("prioriza al turista temprano en la mañana (07:00-11:00)", () => {
    expect(calcularPrioridadAseo("turista", 7)).toBe(2);
    expect(calcularPrioridadAseo("turista", 9)).toBe(2);
  });

  it("NO prioriza al turista fuera de la ventana temprana", () => {
    expect(calcularPrioridadAseo("turista", 11)).toBe(0);
    expect(calcularPrioridadAseo("turista", 15)).toBe(0);
    expect(calcularPrioridadAseo("turista", 6)).toBe(0);
  });

  it("da prioridad neutra cuando no se sabe el tipo de cliente (dato aún no sincronizado)", () => {
    expect(calcularPrioridadAseo(null, 10)).toBe(1);
    expect(calcularPrioridadAseo(undefined, 10)).toBe(1);
  });

  it("estaEnVentanaIdeal refleja exactamente la prioridad máxima", () => {
    expect(estaEnVentanaIdeal("empresa", 10)).toBe(true);
    expect(estaEnVentanaIdeal("empresa", 20)).toBe(false);
    expect(estaEnVentanaIdeal("turista", 8)).toBe(true);
    expect(estaEnVentanaIdeal("turista", 20)).toBe(false);
  });
});
