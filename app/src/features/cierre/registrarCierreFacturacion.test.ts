import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * HU-33 — el cierre de facturación es el hecho que arranca el plazo tras
 * el cual se anonimiza la nómina. Antes no existía como dato: la purga
 * se disparaba con `vigencia_hasta + 7 días` y por eso anonimizaba
 * contratos terminados que nadie había facturado, incumpliendo el
 * criterio 2 ("contrato finalizado sin facturar → no se anonimiza nada").
 */

const executeMock = vi.fn();
const getAllMock = vi.fn();

vi.mock("../../lib/powersync", () => ({
  powersync: {
    execute: (...args: unknown[]) => executeMock(...args),
    getAll: (...args: unknown[]) => getAllMock(...args)
  }
}));

import {
  registrarCierreFacturacion,
  buscarCierrePeriodo,
  fechaAnonimizacionPrevista,
  CierreFacturacionSchema
} from "./registrarCierreFacturacion";

const ENTRADA = {
  contratoEmpresaId: "30000000-0000-0000-0000-000000000001",
  anio: 2026,
  mes: 10,
  totalFacturado: 7500000,
  cerradoPor: "10000000-0000-0000-0000-000000000001"
};

describe("HU-33 — registro del cierre de facturación", () => {
  beforeEach(() => {
    executeMock.mockReset();
    getAllMock.mockReset();
    getAllMock.mockResolvedValue([]);
  });

  it("escribe el cierre con su período, total y uuid idempotente", async () => {
    const fila = await registrarCierreFacturacion(ENTRADA);

    expect(executeMock).toHaveBeenCalledTimes(1);
    const [sql, params] = executeMock.mock.calls[0];
    expect(String(sql)).toMatch(/insert into cierre_facturacion/i);
    expect(params).toContain(ENTRADA.contratoEmpresaId);
    expect(params).toContain(2026);
    expect(params).toContain(10);
    expect(params).toContain(7500000);
    expect(fila.periodo_anio).toBe(2026);
    expect(fila.periodo_mes).toBe(10);
    expect(fila.cerrado_at).toBeTruthy();
  });

  it("lleva uuid_idempotente distinto del id: un reintento de red no duplica el cierre (RNF-06)", async () => {
    await registrarCierreFacturacion(ENTRADA);
    const [, params] = executeMock.mock.calls[0];
    const uuids = (params as unknown[]).filter(
      (p) => typeof p === "string" && /^[0-9a-f-]{36}$/i.test(p)
    );
    // id, contrato, cerrado_por y uuid_idempotente son todos uuid; el
    // último es el idempotente y no puede repetir el id de la fila.
    expect(new Set(uuids).size).toBe(uuids.length);
  });

  it("si el período ya estaba cerrado NO vuelve a escribir: el reloj de la retención no se mueve", async () => {
    const existente = {
      id: "90000000-0000-0000-0000-000000000001",
      contrato_empresa_id: ENTRADA.contratoEmpresaId,
      periodo_anio: 2026,
      periodo_mes: 10,
      total_facturado: 7500000,
      cerrado_por: ENTRADA.cerradoPor,
      cerrado_at: "2026-10-20T15:00:00.000Z"
    };
    getAllMock.mockResolvedValue([existente]);

    const fila = await registrarCierreFacturacion(ENTRADA);

    expect(executeMock).not.toHaveBeenCalled();
    expect(fila).toEqual(existente);
    // El botón puede volver a tocarse sin consecuencias: la usuaria no
    // tiene cómo saber si alcanzó a guardarse cuando se cortó la señal.
    expect(fila.cerrado_at).toBe("2026-10-20T15:00:00.000Z");
  });

  it("busca el cierre por contrato, año y mes", async () => {
    await buscarCierrePeriodo(ENTRADA.contratoEmpresaId, 2026, 9);
    const [sql, params] = getAllMock.mock.calls[0];
    expect(String(sql)).toMatch(/from cierre_facturacion/i);
    expect(params).toEqual([ENTRADA.contratoEmpresaId, 2026, 9]);
  });

  it("devuelve null cuando el período no tiene cierre registrado", async () => {
    getAllMock.mockResolvedValue([]);
    expect(await buscarCierrePeriodo(ENTRADA.contratoEmpresaId, 2026, 9)).toBeNull();
  });

  describe("validaciones", () => {
    it("rechaza un mes fuera del calendario", async () => {
      await expect(registrarCierreFacturacion({ ...ENTRADA, mes: 0 })).rejects.toThrow();
      await expect(registrarCierreFacturacion({ ...ENTRADA, mes: 13 })).rejects.toThrow();
      expect(executeMock).not.toHaveBeenCalled();
    });

    it("rechaza un total facturado negativo", async () => {
      await expect(
        registrarCierreFacturacion({ ...ENTRADA, totalFacturado: -1 })
      ).rejects.toThrow();
      expect(executeMock).not.toHaveBeenCalled();
    });

    it("acepta un total de cero: un período sin consumos igual se cierra", () => {
      expect(() =>
        CierreFacturacionSchema.parse({ ...ENTRADA, totalFacturado: 0 })
      ).not.toThrow();
    });

    it("rechaza identificadores que no son uuid", async () => {
      await expect(
        registrarCierreFacturacion({ ...ENTRADA, contratoEmpresaId: "contrato-1" })
      ).rejects.toThrow();
      await expect(
        registrarCierreFacturacion({ ...ENTRADA, cerradoPor: "maria" })
      ).rejects.toThrow();
    });
  });

  describe("fecha prevista de anonimización (lo que se le muestra a la Administradora)", () => {
    it("suma el plazo de gracia a la fecha de cierre", () => {
      const prevista = fechaAnonimizacionPrevista("2026-10-20T15:00:00.000Z", 7);
      expect(prevista.toISOString().slice(0, 10)).toBe("2026-10-27");
    });

    it("respeta un plazo distinto al propuesto de 7 días (es configurable, HU-39)", () => {
      const prevista = fechaAnonimizacionPrevista("2026-10-20T15:00:00.000Z", 15);
      expect(prevista.toISOString().slice(0, 10)).toBe("2026-11-04");
    });

    it("cruza bien el cambio de año", () => {
      const prevista = fechaAnonimizacionPrevista("2026-12-28T10:00:00.000Z", 7);
      expect(prevista.toISOString().slice(0, 10)).toBe("2027-01-04");
    });
  });
});
