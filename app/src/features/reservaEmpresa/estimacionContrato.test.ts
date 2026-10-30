import { describe, it, expect } from "vitest";
import {
  calcularEstimacionContrato,
  RangoVigenciaInvalidoError,
  serviciosIncluidosComoLista,
  etiquetaCondicionTributaria
} from "./estimacionContrato";

describe("calcularEstimacionContrato", () => {
  it("ejemplo del alcance: 4 trabajadores, 5 días facturables, $25.000 por persona y día => $500.000", () => {
    const estimacion = calcularEstimacionContrato({
      headcount: 4,
      tarifaConvenida: 25000,
      vigenciaDesde: "2026-03-01",
      vigenciaHasta: "2026-03-05"
    });
    expect(estimacion.esAbierto).toBe(false);
    expect(estimacion.diasFacturables).toBe(5);
    expect(estimacion.costoDiario).toBe(100000);
    expect(estimacion.totalEstimado).toBe(500000);
    expect(estimacion.proyeccionMensual).toBeNull();
  });

  it("un contrato de un solo día (desde == hasta) factura exactamente 1 día", () => {
    const estimacion = calcularEstimacionContrato({
      headcount: 3,
      tarifaConvenida: 10000,
      vigenciaDesde: "2026-05-15",
      vigenciaHasta: "2026-05-15"
    });
    expect(estimacion.diasFacturables).toBe(1);
    expect(estimacion.totalEstimado).toBe(30000);
  });

  it("cruza de mes sin error de desfase (31 de enero a 2 de febrero = 3 días)", () => {
    const estimacion = calcularEstimacionContrato({
      headcount: 1,
      tarifaConvenida: 1000,
      vigenciaDesde: "2026-01-31",
      vigenciaHasta: "2026-02-02"
    });
    expect(estimacion.diasFacturables).toBe(3);
  });

  it("cruza de año sin error de desfase (30 de diciembre a 2 de enero = 4 días)", () => {
    const estimacion = calcularEstimacionContrato({
      headcount: 1,
      tarifaConvenida: 1000,
      vigenciaDesde: "2026-12-30",
      vigenciaHasta: "2027-01-02"
    });
    expect(estimacion.diasFacturables).toBe(4);
  });

  it("contrato abierto (sin vigenciaHasta): no hay total, solo costo diario y proyección mensual explícita", () => {
    const estimacion = calcularEstimacionContrato({
      headcount: 10,
      tarifaConvenida: 15000,
      vigenciaDesde: "2026-01-01"
    });
    expect(estimacion.esAbierto).toBe(true);
    expect(estimacion.diasFacturables).toBeNull();
    expect(estimacion.totalEstimado).toBeNull();
    expect(estimacion.costoDiario).toBe(150000);
    expect(estimacion.proyeccionMensual).toBe(150000 * 30);
  });

  it("vigenciaHasta vacío ('') se trata igual que abierto, no como fecha inválida", () => {
    const estimacion = calcularEstimacionContrato({
      headcount: 2,
      tarifaConvenida: 1000,
      vigenciaDesde: "2026-01-01",
      vigenciaHasta: ""
    });
    expect(estimacion.esAbierto).toBe(true);
  });

  it("rechaza una fecha de término anterior a la fecha de inicio", () => {
    expect(() =>
      calcularEstimacionContrato({
        headcount: 1,
        tarifaConvenida: 1000,
        vigenciaDesde: "2026-03-10",
        vigenciaHasta: "2026-03-01"
      })
    ).toThrow(RangoVigenciaInvalidoError);
  });

  it("actualizar headcount, tarifa o fechas recalcula de inmediato (caso de uso: formulario en tiempo real)", () => {
    const base = calcularEstimacionContrato({
      headcount: 4,
      tarifaConvenida: 25000,
      vigenciaDesde: "2026-03-01",
      vigenciaHasta: "2026-03-05"
    });
    const conMenosPersonas = calcularEstimacionContrato({
      headcount: 3,
      tarifaConvenida: 25000,
      vigenciaDesde: "2026-03-01",
      vigenciaHasta: "2026-03-05"
    });
    expect(conMenosPersonas.totalEstimado).toBeLessThan(base.totalEstimado!);
    expect(conMenosPersonas.totalEstimado).toBe(375000);
  });
});

describe("serviciosIncluidosComoLista", () => {
  it("alojamiento siempre aparece primero (es implícito al cobro base)", () => {
    expect(serviciosIncluidosComoLista({ desayuno: false, almuerzo: false, cena: false })).toEqual(["Alojamiento"]);
  });

  it("incluye solo los servicios marcados", () => {
    expect(serviciosIncluidosComoLista({ desayuno: true, almuerzo: false, cena: true })).toEqual([
      "Alojamiento",
      "Desayuno",
      "Cena"
    ]);
  });
});

describe("etiquetaCondicionTributaria", () => {
  it("nunca asume una condición cuando es null", () => {
    expect(etiquetaCondicionTributaria(null)).toBe("Condición tributaria no especificada");
  });

  it("describe neto y con_iva explícitamente", () => {
    expect(etiquetaCondicionTributaria("neto")).toContain("aparte");
    expect(etiquetaCondicionTributaria("con_iva")).toContain("incluido");
  });
});
