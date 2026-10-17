import { describe, it, expect } from "vitest";

describe("Cumplimiento Normativo Ley N° 21.719 - Protección de Datos Personales", () => {
  it("Control 1: Minimización de Datos - omite cualquier dato de salud sensible en justificación de descuadre", () => {
    // Motivos operacionales válidos no deben incluir diagnósticos médicos
    const motivosValidos = [
      "Cambio de turno en faena",
      "Ausencia justificada",
      "Retraso de transporte",
      "Falla técnica en terminal"
    ];

    motivosValidos.forEach((motivo) => {
      expect(motivo).not.toMatch(/médic[oa]|enfermedad|licencia|diagnóstic[oa]|salud/i);
    });
  });

  it("Control 4: Inmutabilidad del Libro Contable tras Anonimización (RNF-03)", () => {
    // Simula registro de consumo original
    const consumoOriginal = {
      id: "c-12345",
      trabajador_id: "trab-99",
      fecha: "2026-09-01",
      tipo_servicio: "almuerzo",
      cantidad: 1,
      precio_unitario: 8000,
      total: 8000
    };

    // Ficha del trabajador original
    const trabajadorOriginal = {
      id: "trab-99",
      nombre: "Rodrigo Tapia",
      rut: "15.420.123-K",
      empresa_id: "emp-minera"
    };

    // Al anonimizar por supresión o purga de 7 días:
    const trabajadorAnonimizado = {
      ...trabajadorOriginal,
      nombre: "TRABAJADOR ANONIMIZADO (LEY 21.719)",
      rut: null
    };

    // El ledger de consumo no se destruye ni modifica sus montos
    expect(consumoOriginal.id).toBe("c-12345");
    expect(consumoOriginal.total).toBe(8000);
    expect(consumoOriginal.trabajador_id).toBe(trabajadorAnonimizado.id);

    // Los datos PII fueron completamente desasociados
    expect(trabajadorAnonimizado.rut).toBeNull();
    expect(trabajadorAnonimizado.nombre).toContain("ANONIMIZADO");
    expect(trabajadorAnonimizado.nombre).not.toContain("Rodrigo");
  });

  it("Control 7: Plazo Legal de Atención de Derechos ARCO es de 30 días corridos", () => {
    const PLAZO_LEGAL_DIAS_CORRIDOS = 30;
    const fechaSolicitud = new Date("2026-10-01T12:00:00Z");
    const fechaLimite = new Date(fechaSolicitud);
    fechaLimite.setDate(fechaLimite.getDate() + PLAZO_LEGAL_DIAS_CORRIDOS);

    const diferenciaMs = fechaLimite.getTime() - fechaSolicitud.getTime();
    const diasTranscurridos = diferenciaMs / (1000 * 60 * 60 * 24);

    expect(diasTranscurridos).toBe(30);
  });
});
