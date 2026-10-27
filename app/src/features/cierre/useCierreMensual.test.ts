// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

/**
 * HU-18: el cierre mensual debe (a) bloquear el cierre si hay días
 * pendientes de conciliar/justificar, y (b) facturar SIEMPRE por el
 * headcount contratado, nunca por lo efectivamente consumido — la
 * regla crítica confirmada en la reunión 2 ("30 contratados, 15
 * consumos reales sigue siendo 30 para el cobro").
 */
let conciliacionesMock: any[] = [];
let contratoMock: any = {
  id: "contrato-1",
  empresa_id: "empresa-1",
  vigencia_desde: "2026-10-01",
  vigencia_hasta: "2026-10-31",
  headcount: 30,
  tarifa_convenida: 25000
};

vi.mock("@powersync/react", () => ({
  useQuery: (sql: string) => {
    if (/from contrato_empresa/i.test(sql)) {
      return { data: [contratoMock], isLoading: false };
    }
    if (/from conciliacion_diaria/i.test(sql)) {
      return { data: conciliacionesMock, isLoading: false };
    }
    return { data: [], isLoading: false };
  }
}));

import { useCierreMensual } from "./useCierreMensual";

function conciliacionesMesCompletoConciliado() {
  const dias: any[] = [];
  for (let d = 1; d <= 31; d++) {
    const fecha = `2026-10-${String(d).padStart(2, "0")}`;
    for (const tipo of ["cama_noche", "desayuno", "almuerzo", "cena"]) {
      dias.push({
        id: `${fecha}-${tipo}`,
        fecha,
        tipo,
        headcount_esperado: 30,
        cantidad_esperada: 30,
        cantidad_servida: tipo === "almuerzo" ? 15 : 30, // el caso 30 vs 15
        estado: "conciliado"
      });
    }
  }
  return dias;
}

describe("useCierreMensual (HU-18)", () => {
  beforeEach(() => {
    contratoMock = {
      id: "contrato-1",
      empresa_id: "empresa-1",
      vigencia_desde: "2026-10-01",
      vigencia_hasta: "2026-10-31",
      headcount: 30,
      tarifa_convenida: 25000
    };
    conciliacionesMock = conciliacionesMesCompletoConciliado();
  });

  it("factura por el headcount contratado (30) multiplicado por días y tarifa — nunca por lo consumido (15 almuerzos)", () => {
    const { result } = renderHook(() => useCierreMensual("contrato-1", 2026, 10));

    expect(result.current.headcountContratado).toBe(30);
    expect(result.current.tarifaPactadaDiaria).toBe(25000);
    // 31 días del contrato x 30 trabajadores x $25.000 = $23.250.000,
    // sin que la columna "almuerzo" (15 servidos) reduzca este monto.
    expect(result.current.totalContratoCompleto).toBe(31 * 30 * 25000);
  });

  it("es cerrable cuando todos los días evaluables ya están conciliados", () => {
    const { result } = renderHook(() => useCierreMensual("contrato-1", 2026, 10));
    expect(result.current.diasPendientes).toHaveLength(0);
  });

  it("NO es cerrable si algún día del mes sigue 'pendiente' de conciliar", () => {
    contratoMock = {
      id: "contrato-1",
      empresa_id: "empresa-1",
      vigencia_desde: "2026-10-01",
      vigencia_hasta: "2026-10-05",
      headcount: 10,
      tarifa_convenida: 20000
    };
    conciliacionesMock = [
      {
        id: "2026-10-01-almuerzo",
        fecha: "2026-10-01",
        tipo: "almuerzo",
        headcount_esperado: 10,
        cantidad_esperada: 10,
        cantidad_servida: 10,
        estado: "pendiente"
      }
    ];

    const { result } = renderHook(() => useCierreMensual("contrato-1", 2026, 10));

    expect(result.current.estaCerrable).toBe(false);
    expect(result.current.diasPendientes.length).toBeGreaterThan(0);
  });
});
