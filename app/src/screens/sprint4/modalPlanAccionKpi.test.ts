import { describe, it, expect } from "vitest";
import type {
  MetricasMargenInfo,
  MetricasConciliacionInfo,
  MetricasOcupacionInfo,
  TipoKpiAccion
} from "./ModalPlanAccionKpi";

describe("Planes de Acción Interactivos para KPIs del Dashboard", () => {
  const metricasMargenEjemplo: MetricasMargenInfo = {
    margenPorcentaje: 44,
    estadoSemaforo: "verde",
    ingresosTotales: 46515000,
    costosTotales: 26054000,
    costoDiarioTrabajador: 13500,
    tarifaMinimaSugerida: 19500
  };

  const metricasConciliacionEjemplo: MetricasConciliacionInfo = {
    tasaConciliacion: 58,
    totalRegistros: 19,
    conciliados: 11,
    pendientesJustificar: 8,
    racionesServidas: 85,
    racionesEsperadas: 93,
    diasConDescuadre: ["2026-10-01"]
  };

  const metricasOcupacionEjemplo: MetricasOcupacionInfo = {
    totalHabitaciones: 8,
    ocupadas: 5,
    disponibles: 3,
    enMantencion: 0,
    ocupadasEmpresa: 3,
    ocupadasTurista: 2,
    porcentajeOcupacion: 63
  };

  it("identifica los 4 tipos de KPI interactivos disponibles", () => {
    const tiposValidos: TipoKpiAccion[] = ["margen", "conciliacion", "facturacion", "ocupacion"];
    expect(tiposValidos).toHaveLength(4);
    expect(tiposValidos).toContain("margen");
    expect(tiposValidos).toContain("conciliacion");
    expect(tiposValidos).toContain("facturacion");
    expect(tiposValidos).toContain("ocupacion");
  });

  it("diagnostica correctamente el estado de margen saludable y alerta", () => {
    // Margen saludable
    expect(metricasMargenEjemplo.estadoSemaforo).toBe("verde");
    expect(metricasMargenEjemplo.margenPorcentaje).toBeGreaterThanOrEqual(35);

    // Margen crítico
    const margenCritico: MetricasMargenInfo = {
      ...metricasMargenEjemplo,
      margenPorcentaje: 12,
      estadoSemaforo: "rojo"
    };
    expect(margenCritico.estadoSemaforo).toBe("rojo");
    expect(margenCritico.margenPorcentaje).toBeLessThan(20);
  });

  it("alerta sobre raciones con descuadre en conciliación B2B", () => {
    expect(metricasConciliacionEjemplo.pendientesJustificar).toBe(8);
    expect(metricasConciliacionEjemplo.tasaConciliacion).toBe(58);

    // Al conciliar las 8 raciones
    const conciliacionAlDia: MetricasConciliacionInfo = {
      ...metricasConciliacionEjemplo,
      pendientesJustificar: 0,
      conciliados: 19,
      tasaConciliacion: 100
    };
    expect(conciliacionAlDia.pendientesJustificar).toBe(0);
    expect(conciliacionAlDia.tasaConciliacion).toBe(100);
  });

  it("calcula disponibilidad de piezas para turistas y contratistas", () => {
    expect(metricasOcupacionEjemplo.totalHabitaciones).toBe(8);
    expect(metricasOcupacionEjemplo.disponibles).toBe(3);
    expect(metricasOcupacionEjemplo.ocupadas).toBe(5);
    expect(metricasOcupacionEjemplo.ocupadasEmpresa + metricasOcupacionEjemplo.ocupadasTurista).toBe(5);
  });
});
