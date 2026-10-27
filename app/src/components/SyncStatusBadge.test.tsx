// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, act, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

/**
 * HU-29: cobertura real de comportamiento del indicador (no solo de la
 * lógica interna) — exactamente lo que pedía la auditoría: confirmar
 * que nunca muestra "Sincronizado" con operaciones pendientes reales,
 * que reacciona a los cambios de estado de PowerSync, y el
 * comportamiento sin conexión / mientras sincroniza / ante reconexión.
 */
const { getAll, registerListener, listeners, currentStatus } = vi.hoisted(() => {
  const listeners: Array<(status: any) => void> = [];
  const currentStatus = { connected: false, dataFlowStatus: { uploading: false, uploadError: undefined as Error | undefined, downloadError: undefined as Error | undefined } };
  const getAll = vi.fn().mockResolvedValue([{ n: 0 }]);
  const registerListener = vi.fn((handlers: { statusChanged: (s: any) => void }) => {
    listeners.push(handlers.statusChanged);
    return () => {
      const i = listeners.indexOf(handlers.statusChanged);
      if (i >= 0) listeners.splice(i, 1);
    };
  });
  return { getAll, registerListener, listeners, currentStatus };
});

vi.mock("../lib/powersync", () => ({
  powersync: {
    get currentStatus() {
      return currentStatus;
    },
    getAll,
    registerListener
  }
}));

import { SyncStatusBadge } from "./SyncStatusBadge";

function emitirEstado(connected: boolean, uploading: boolean) {
  currentStatus.connected = connected;
  currentStatus.dataFlowStatus.uploading = uploading;
  listeners.forEach((fn) => fn({ connected, dataFlowStatus: { ...currentStatus.dataFlowStatus, uploading } }));
}

describe("SyncStatusBadge (HU-29)", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    getAll.mockReset();
    getAll.mockResolvedValue([{ n: 0 }]);
    listeners.length = 0;
    currentStatus.connected = false;
    currentStatus.dataFlowStatus.uploading = false;
    currentStatus.dataFlowStatus.uploadError = undefined;
    currentStatus.dataFlowStatus.downloadError = undefined;
  });

  it("sin conexión y sin pendientes: muestra 'Sin red' (nunca 'Sincronizado' en offline)", async () => {
    render(<SyncStatusBadge />);
    await waitFor(() => expect(screen.getByText("Sin red · Guardado local")).toBeInTheDocument());
    expect(screen.queryByText("Sincronizado")).not.toBeInTheDocument();
  });

  it("conectado y con operaciones reales pendientes en ps_crud: NUNCA muestra 'Sincronizado', aunque uploading esté en false", async () => {
    // Exactamente el defecto corregido: uploading=false pero la cola
    // real tiene filas (pausa entre reintentos, o reconexión recién
    // lograda antes de que arranque la subida).
    getAll.mockResolvedValue([{ n: 3 }]);
    await act(async () => {
      render(<SyncStatusBadge />);
    });
    await act(async () => {
      emitirEstado(true, false);
    });
    await waitFor(() => expect(screen.getByText("Cambios pendientes de envío")).toBeInTheDocument());
    expect(screen.queryByText("Sincronizado")).not.toBeInTheDocument();
  });

  it("conectado, sin pendientes reales: muestra 'Sincronizado'", async () => {
    getAll.mockResolvedValue([{ n: 0 }]);
    await act(async () => {
      render(<SyncStatusBadge />);
    });
    await act(async () => {
      emitirEstado(true, false);
    });
    await waitFor(() => expect(screen.getByText("Sincronizado")).toBeInTheDocument());
  });

  it("mientras PowerSync sube activamente (uploading=true): muestra 'Enviando pendientes…'", async () => {
    getAll.mockResolvedValue([{ n: 1 }]);
    await act(async () => {
      render(<SyncStatusBadge />);
    });
    await act(async () => {
      emitirEstado(true, true);
    });
    await waitFor(() => expect(screen.getByText("Enviando pendientes…")).toBeInTheDocument());
  });

  it("reacciona a statusChanged: offline sin pendientes -> reconecta con pendientes -> termina de sincronizar", async () => {
    // Offline y sin nada en cola todavía (recién se abrió la app).
    getAll.mockResolvedValue([{ n: 0 }]);
    await act(async () => {
      render(<SyncStatusBadge />);
    });
    await waitFor(() => expect(screen.getByText("Sin red · Guardado local")).toBeInTheDocument());

    // Se registra una operación offline (la cola real pasa a tener 2) y
    // vuelve la señal: debe pasar a "enviando", nunca directo a "Sincronizado".
    getAll.mockResolvedValue([{ n: 2 }]);
    await act(async () => {
      emitirEstado(true, false);
    });
    await waitFor(() => expect(screen.getByText("Cambios pendientes de envío")).toBeInTheDocument());

    // La cola ya se vació de verdad.
    getAll.mockResolvedValue([{ n: 0 }]);
    await act(async () => {
      emitirEstado(true, false);
    });
    await waitFor(() => expect(screen.getByText("Sincronizado")).toBeInTheDocument());
  });

  it("si la consulta a ps_crud falla, usa el flag transitorio como respaldo en vez de romper el indicador", async () => {
    getAll.mockRejectedValue(new Error("ps_crud no disponible todavía"));
    await act(async () => {
      render(<SyncStatusBadge />);
    });
    await act(async () => {
      emitirEstado(true, true);
    });
    await waitFor(() => expect(screen.getByText("Enviando pendientes…")).toBeInTheDocument());
  });

  it("sin red con pendientes: informa guardado local y nunca simula un envío", async () => {
    getAll.mockResolvedValue([{ n: 3 }]);
    render(<SyncStatusBadge />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Sin red · Cambios guardados en este celular"));
    expect(screen.queryByText("Enviando pendientes…")).not.toBeInTheDocument();
    expect(screen.queryByText("Sincronizado")).not.toBeInTheDocument();
  });

  it("la versión compacta comunica sus estados en español", async () => {
    render(<SyncStatusBadge compact onClick={() => {}} />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Sin red"));
    expect(screen.getByRole("button")).toHaveAccessibleName(/sin conexión/);
    await act(async () => { emitirEstado(true, false); });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Al día"));
    expect(screen.getByRole("button")).toHaveAccessibleName(/registros al día/);
  });

  it("actualiza la presentación al empezar el envío sin cambiar la cantidad pendiente", async () => {
    getAll.mockResolvedValue([{ n: 3 }]);
    render(<SyncStatusBadge />);
    await act(async () => { emitirEstado(true, false); });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Cambios pendientes de envío"));
    await act(async () => { emitirEstado(true, true); });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Enviando pendientes…"));
  });

  it("muestra un problema comunicado por el SDK sin revelar detalles técnicos ni marcar al día", async () => {
    render(<SyncStatusBadge />);
    await act(async () => {
      currentStatus.dataFlowStatus.uploadError = new Error("detalle técnico privado");
      emitirEstado(true, false);
    });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("No se pudo actualizar · Revisa la conexión"));
    expect(screen.queryByText("Sincronizado")).not.toBeInTheDocument();
    expect(screen.queryByText("detalle técnico privado")).not.toBeInTheDocument();
  });

  it("es táctil: con onClick, responde a un click real del usuario", async () => {
    const onClick = vi.fn();
    render(<SyncStatusBadge onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("se desuscribe del listener de PowerSync al desmontar (sin fugas de memoria)", async () => {
    const { unmount } = render(<SyncStatusBadge />);
    await waitFor(() => expect(listeners.length).toBe(1));
    unmount();
    expect(listeners.length).toBe(0);
  });
});
