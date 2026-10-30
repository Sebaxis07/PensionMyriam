import { describe, it, expect, vi, beforeEach } from "vitest";

const { execute, getAll, crearContratoEmpresaMock } = vi.hoisted(() => ({
  execute: vi.fn().mockResolvedValue(undefined),
  getAll: vi.fn(),
  crearContratoEmpresaMock: vi.fn().mockResolvedValue("contrato-nuevo-id")
}));
vi.mock("../../lib/powersync", () => ({ powersync: { execute, getAll } }));
vi.mock("./crearContratoEmpresa", () => ({ crearContratoEmpresa: crearContratoEmpresaMock }));

import {
  ajustarCantidadContrato,
  previsualizarAjusteCantidad,
  ContratoNoEncontradoError,
  FechaEfectivaInvalidaError,
  ContratoFinalizadoError
} from "./ajustarCantidadContrato";

const contratoActualId = crypto.randomUUID();

function filaContratoActual(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    empresa_id: crypto.randomUUID(),
    headcount: 4,
    tarifa_convenida: 25000,
    vigencia_desde: "2026-03-01",
    vigencia_hasta: "2026-03-05",
    incluye_desayuno: 1,
    incluye_almuerzo: 1,
    incluye_cena: 0,
    condicion_tributaria: null,
    ...overrides
  };
}

describe("previsualizarAjusteCantidad", () => {
  it("calcula estimación anterior y nueva sin escribir nada (pura)", () => {
    const { estimacionAnterior, estimacionNueva } = previsualizarAjusteCantidad(
      { headcount: 4, tarifa_convenida: 25000, vigencia_desde: "2026-03-01", vigencia_hasta: "2026-03-05" },
      3,
      "2026-03-03"
    );
    expect(estimacionAnterior.totalEstimado).toBe(500000);
    // 3 personas, 2026-03-03 a 2026-03-05 = 3 días
    expect(estimacionNueva.totalEstimado).toBe(3 * 25000 * 3);
  });
});

describe("ajustarCantidadContrato", () => {
  beforeEach(() => {
    execute.mockClear();
    getAll.mockReset();
    crearContratoEmpresaMock.mockClear().mockResolvedValue("contrato-nuevo-id");
  });

  it("rechaza si el contrato no existe en este teléfono", async () => {
    getAll.mockResolvedValue([]);
    await expect(
      ajustarCantidadContrato("usuario-1", {
        contratoActualId,
        nuevaCantidad: 3,
        fechaEfectiva: "2026-03-03",
        motivo: "Reducción de dotación"
      })
    ).rejects.toThrow(ContratoNoEncontradoError);
  });

  it("rechaza una fecha efectiva igual o anterior al inicio del contrato actual", async () => {
    getAll.mockResolvedValue([filaContratoActual()]);
    await expect(
      ajustarCantidadContrato("usuario-1", {
        contratoActualId,
        nuevaCantidad: 3,
        fechaEfectiva: "2026-03-01",
        motivo: "Reducción de dotación"
      })
    ).rejects.toThrow(FechaEfectivaInvalidaError);
  });

  it("rechaza ajustar un contrato ya finalizado a esa fecha", async () => {
    getAll.mockResolvedValue([filaContratoActual()]);
    await expect(
      ajustarCantidadContrato("usuario-1", {
        contratoActualId,
        nuevaCantidad: 3,
        fechaEfectiva: "2026-03-06",
        motivo: "Reducción de dotación"
      })
    ).rejects.toThrow(ContratoFinalizadoError);
  });

  it("rechaza un motivo vacío", async () => {
    getAll.mockResolvedValue([filaContratoActual()]);
    await expect(
      ajustarCantidadContrato("usuario-1", {
        contratoActualId,
        nuevaCantidad: 3,
        fechaEfectiva: "2026-03-03",
        motivo: "   "
      })
    ).rejects.toThrow();
  });

  it("de 4 a 3 trabajadores: reutiliza crearContratoEmpresa conservando tarifa y servicios, y registra el ajuste", async () => {
    getAll.mockResolvedValue([filaContratoActual()]);

    const resultado = await ajustarCantidadContrato("usuario-1", {
      contratoActualId,
      nuevaCantidad: 3,
      fechaEfectiva: "2026-03-03",
      motivo: "La empresa redujo su dotación en faena"
    });

    expect(crearContratoEmpresaMock).toHaveBeenCalledWith("usuario-1", {
      empresaId: expect.any(String),
      vigenciaDesde: "2026-03-03",
      vigenciaHasta: "2026-03-05",
      headcount: 3,
      tarifaConvenida: 25000,
      incluyeDesayuno: true,
      incluyeAlmuerzo: true,
      incluyeCena: false,
      condicionTributaria: null
    });

    expect(execute).toHaveBeenCalledTimes(1);
    const [, params] = execute.mock.calls[0] as [string, unknown[]];
    expect(params).toContain(contratoActualId);
    expect(params).toContain("contrato-nuevo-id");
    expect(params).toContain(4); // cantidad_anterior
    expect(params).toContain(3); // cantidad_nueva

    expect(resultado.contratoNuevoId).toBe("contrato-nuevo-id");
    expect(resultado.estimacionAnterior.totalEstimado).toBe(500000);
    expect(resultado.estimacionNueva.totalEstimado).toBe(3 * 25000 * 3);
  });

  it("agregar trabajadores no cambia la tarifa pactada (solo el headcount)", async () => {
    getAll.mockResolvedValue([filaContratoActual({ headcount: 4 })]);
    await ajustarCantidadContrato("usuario-1", {
      contratoActualId,
      nuevaCantidad: 6,
      fechaEfectiva: "2026-03-03",
      motivo: "Llegaron más trabajadores"
    });
    expect(crearContratoEmpresaMock).toHaveBeenCalledWith(
      "usuario-1",
      expect.objectContaining({ headcount: 6, tarifaConvenida: 25000 })
    );
  });

  it("un contrato abierto (vigencia_hasta null) se puede ajustar sin fecha de término", async () => {
    getAll.mockResolvedValue([filaContratoActual({ vigencia_hasta: null })]);
    await ajustarCantidadContrato("usuario-1", {
      contratoActualId,
      nuevaCantidad: 5,
      fechaEfectiva: "2026-04-01",
      motivo: "Ajuste de dotación"
    });
    expect(crearContratoEmpresaMock).toHaveBeenCalledWith(
      "usuario-1",
      expect.objectContaining({ vigenciaHasta: undefined })
    );
  });
});
