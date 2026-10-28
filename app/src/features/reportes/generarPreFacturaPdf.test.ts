// Estas pruebas puras no abren SQLite WASM ni conectan servicios.
vi.mock("../../lib/powersync", () => ({ powersync: { execute: vi.fn(), getAll: vi.fn() } }));
import { vi, describe, it, expect } from "vitest";
import { construirDocDefinicionPreFactura } from "./generarPreFacturaPdf";
import type { EstadoCierreMensual } from "../cierre/useCierreMensual";

function cierreBase(overrides: Partial<EstadoCierreMensual> = {}): EstadoCierreMensual {
  return {
    estaCerrable: true,
    diasPendientes: [],
    totalDiasContrato: 30,
    diasConciliados: 30,
    headcountContratado: 30,
    tarifaPactadaDiaria: 25000,
    totalContratoCompleto: 30 * 30 * 25000,
    totalColacionesExtras: 0,
    granTotal: 30 * 30 * 25000,
    colacionesDetalle: [],
    trabajadoresDetalle: [],
    justificacionesMes: [],
    isLoading: false,
    ...overrides
  };
}

describe("construirDocDefinicionPreFactura (HU-19)", () => {
  it("incluye membrete, desglose por trabajador y espacio de firma para ambas partes", () => {
    const docDef = construirDocDefinicionPreFactura({
      razonSocialEmpresa: "Minera Los Cóndores SpA",
      rutEmpresa: "76.123.456-7",
      periodoMes: "Octubre 2026",
      folioContrato: "C-001",
      cierre: cierreBase({
        trabajadoresDetalle: [
          { trabajadorId: "t1", nombre: "Pedro Almonte", camaNoche: 30, desayuno: 28, almuerzo: 15, cena: 29, colaciones: 0 }
        ]
      })
    });

    const contentStr = JSON.stringify(docDef.content);
    expect(contentStr).toContain("PENSIÓN SEÑORA MIRIAM");
    expect(contentStr).toContain("PRE-FACTURA MENSUAL");
    expect(contentStr).toContain("Minera Los Cóndores SpA");
    expect(contentStr).toContain("Pedro Almonte");
    // Espacio de firma para ambas partes (Administradora y empresa).
    expect(contentStr).toContain("María (Administradora)");
    expect(contentStr).toContain("Supervisor de Faena");
    expect(contentStr).toContain("Minera Los Cóndores SpA");
  });

  it("regla contractual crítica: 30 contratados y solo 15 almuerzos reales SIGUE facturando por 30, nunca por 15", () => {
    const docDef = construirDocDefinicionPreFactura({
      razonSocialEmpresa: "Minera Los Cóndores SpA",
      periodoMes: "Octubre 2026",
      folioContrato: "C-001",
      cierre: cierreBase({
        headcountContratado: 30,
        totalDiasContrato: 30,
        tarifaPactadaDiaria: 25000,
        totalContratoCompleto: 30 * 30 * 25000, // $22.500.000 — por los 30 contratados
        granTotal: 30 * 30 * 25000,
        trabajadoresDetalle: Array.from({ length: 30 }, (_, i) => ({
          trabajadorId: `t${i}`,
          nombre: `Trabajador ${i}`,
          camaNoche: 30,
          desayuno: 30,
          almuerzo: i < 15 ? 1 : 0, // solo 15 almorzaron un día cualquiera
          cena: 30,
          colaciones: 0
        })),
        justificacionesMes: [
          {
            fecha: "2026-10-12",
            tipo: "almuerzo",
            diferencia: 15,
            motivo: "turno_extra",
            supervisor_nombre: "Juan Pérez"
          }
        ]
      })
    });

    const contentStr = JSON.stringify(docDef.content);
    // El total facturado es por los 30 contratados, no por los 15 que almorzaron.
    expect(contentStr).toContain("30 trabajadores");
    expect(contentStr).toContain("$22.500.000");
    // La diferencia queda como auditoría/justificación, no como descuento.
    expect(contentStr).toContain("Turno Extra");
    expect(contentStr).toContain("Juan Pérez");
    expect(contentStr).not.toContain("$11.250.000"); // la mitad (si se hubiera facturado por 15) nunca aparece
  });

  it("sin justificaciones en el período, lo dice explícitamente (nunca una tabla vacía ambigua)", () => {
    const docDef = construirDocDefinicionPreFactura({
      razonSocialEmpresa: "Empresa X",
      periodoMes: "Octubre 2026",
      folioContrato: "C-002",
      cierre: cierreBase({ justificacionesMes: [] })
    });

    const contentStr = JSON.stringify(docDef.content);
    expect(contentStr).toContain("No se registraron diferencias de consumo en el período.");
  });

  it("incluye las colaciones/extras fuera de convenio como un bloque separado del contrato completo", () => {
    const docDef = construirDocDefinicionPreFactura({
      razonSocialEmpresa: "Empresa X",
      periodoMes: "Octubre 2026",
      folioContrato: "C-003",
      cierre: cierreBase({
        totalContratoCompleto: 22_500_000,
        totalColacionesExtras: 15_000,
        granTotal: 22_515_000,
        colacionesDetalle: [{ nombre: "Sándwich de terreno", cantidad: 3, precioUnitario: 5000, subtotal: 15000 }]
      })
    });

    const contentStr = JSON.stringify(docDef.content);
    expect(contentStr).toContain("COLACIONES Y EXTRAS FUERA DE CONVENIO");
    expect(contentStr).toContain("Sándwich de terreno");
    expect(contentStr).toContain("$22.515.000"); // gran total = contrato completo + extras
  });
});
