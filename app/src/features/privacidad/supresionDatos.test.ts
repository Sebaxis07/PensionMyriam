import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * HU-34 — "una función protegida para atender solicitudes individuales
 * de eliminación de datos".
 *
 * Lo que se verifica acá es QUE LA SUPRESIÓN PASE POR EL SERVIDOR. Antes
 * de Sprint 5 la pantalla la resolvía con un `powersync.execute("update
 * trabajador set …")` local: no dejaba constancia, no pedía motivo y no
 * bloqueaba a la Encargada (el único freno era que la pestaña estuviera
 * oculta). Si alguien vuelve a mover esta operación a la cola local,
 * estas pruebas fallan.
 *
 * El bloqueo por rol y la escritura de la bitácora se verifican donde
 * realmente ocurren: db/pgtap/15_supresion_arco.sql (contra Postgres,
 * con RLS activa) y e2e/sprint5-cuentas-seguridad.spec.ts.
 */

const rpcMock = vi.fn();

vi.mock("../../lib/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args)
  }
}));

// Si el módulo volviera a importar powersync para escribir la supresión,
// este mock lo registra y la prueba correspondiente lo detecta.
const powersyncExecuteMock = vi.fn();
vi.mock("../../lib/powersync", () => ({
  powersync: {
    execute: (...args: unknown[]) => powersyncExecuteMock(...args),
    getAll: vi.fn().mockResolvedValue([])
  }
}));

import {
  solicitarSupresionDatos,
  registrarExportacionFichaTitular
} from "./supresionDatos";

const SOLICITUD = {
  tipoTitular: "trabajador" as const,
  titularId: "40000000-0000-0000-0000-000000000001",
  motivo: "Solicitud escrita del titular recibida el 2026-10-20"
};

describe("HU-34 — la supresión va por el servidor, no por la cola local", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    powersyncExecuteMock.mockReset();
    vi.stubGlobal("navigator", { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("invoca el RPC autorizado con el tipo de titular, el id y el motivo", async () => {
    rpcMock.mockResolvedValue({
      data: {
        ok: true,
        tipo_titular: "trabajador",
        titular_id: SOLICITUD.titularId,
        ya_estaba_anonimizado: false,
        filas_afectadas: 1
      },
      error: null
    });

    const resultado = await solicitarSupresionDatos(SOLICITUD);

    expect(rpcMock).toHaveBeenCalledWith("atender_derecho_supresion", {
      p_tipo_titular: "trabajador",
      p_titular_id: SOLICITUD.titularId,
      p_motivo: SOLICITUD.motivo
    });
    expect(resultado.ok).toBe(true);
    expect(resultado.filas_afectadas).toBe(1);
  });

  it("NUNCA escribe la anonimización en la réplica local", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true }, error: null });
    await solicitarSupresionDatos(SOLICITUD);
    // Una escritura local se aceptaría sin autorización y sin bitácora:
    // es exactamente el defecto que esta historia corrige.
    expect(powersyncExecuteMock).not.toHaveBeenCalled();
  });

  it("traduce el rechazo por rol (42501) al mensaje que exige el criterio", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: {
        code: "42501",
        message:
          "La supresión de datos personales es facultad exclusiva de la Administradora (Ley 21.719)."
      }
    });

    await expect(solicitarSupresionDatos(SOLICITUD)).rejects.toThrow(
      /facultad exclusiva de la Administradora/i
    );
  });

  it("propaga cualquier otro error del servidor con su mensaje", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: "22023", message: "No existe el trabajador indicado." }
    });
    await expect(solicitarSupresionDatos(SOLICITUD)).rejects.toThrow(/No existe el trabajador/);
  });

  it("sin conexión avisa y no intenta nada: el plazo legal es de 30 días, no de minutos", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    await expect(solicitarSupresionDatos(SOLICITUD)).rejects.toThrow(/conexión a Internet/i);
    expect(rpcMock).not.toHaveBeenCalled();
    expect(powersyncExecuteMock).not.toHaveBeenCalled();
  });

  it("valida antes de salir a la red: sin motivo no se llama al servidor", async () => {
    await expect(solicitarSupresionDatos({ ...SOLICITUD, motivo: "" })).rejects.toThrow();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("valida que el id del titular sea un identificador real", async () => {
    await expect(
      solicitarSupresionDatos({ ...SOLICITUD, titularId: "no-es-un-uuid" })
    ).rejects.toThrow();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("si el registro ya estaba anonimizado lo informa sin tratarlo como error (idempotencia)", async () => {
    rpcMock.mockResolvedValue({
      data: {
        ok: true,
        tipo_titular: "trabajador",
        titular_id: SOLICITUD.titularId,
        ya_estaba_anonimizado: true,
        filas_afectadas: 1
      },
      error: null
    });
    const resultado = await solicitarSupresionDatos(SOLICITUD);
    expect(resultado.ya_estaba_anonimizado).toBe(true);
  });
});

describe("HU-34 — la entrega de una copia de datos queda en la bitácora", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    vi.stubGlobal("navigator", { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registra la exportación como acción de acceso y portabilidad", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    const ok = await registrarExportacionFichaTitular({
      tipo_titular: "trabajador",
      titular_id: "40000000-0000-0000-0000-000000000001"
    });

    expect(ok).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith("registrar_acceso_datos_personales", {
      p_accion: "exportacion_pdf",
      p_detalle: {
        tipo_derecho: "acceso_portabilidad",
        tipo_titular: "trabajador",
        titular_id: "40000000-0000-0000-0000-000000000001"
      }
    });
  });

  it("sin conexión devuelve false en vez de dar por registrada una constancia que no existe", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const ok = await registrarExportacionFichaTitular({
      tipo_titular: "turista",
      titular_id: "40000000-0000-0000-0000-000000000001"
    });
    expect(ok).toBe(false);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("si el servidor rechaza el registro devuelve false y no lanza: la copia ya se entregó", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: "42501", message: "no autorizado" } });
    const ok = await registrarExportacionFichaTitular({
      tipo_titular: "trabajador",
      titular_id: "40000000-0000-0000-0000-000000000001"
    });
    expect(ok).toBe(false);
  });
});
