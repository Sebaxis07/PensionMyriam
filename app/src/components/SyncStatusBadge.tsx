import { useEffect, useState } from "react";
import { powersync } from "../lib/powersync";
import { IconAlertTriangle, IconRefresh, IconWifiOff } from "./Icons";

/**
 * HU-27/28/29: la usuaria nunca debe ver un error de red — solo un
 * indicador simple de si hay operaciones esperando salir. Se actualiza
 * con el propio stream de estado de PowerSync, sin polling manual.
 */
export function SyncStatusBadge({
  onClick,
  compact = false
}: {
  onClick?: () => void;
  compact?: boolean;
}) {
  const [connected, setConnected] = useState(powersync.currentStatus?.connected ?? false);
  // Estado de presentación del SDK: no interviene en la cola ni en los reintentos.
  const [enviando, setEnviando] = useState(Boolean(powersync.currentStatus?.dataFlowStatus?.uploading));
  const [huboError, setHuboError] = useState(Boolean(
    powersync.currentStatus?.dataFlowStatus?.uploadError || powersync.currentStatus?.dataFlowStatus?.downloadError
  ));
  const [pendingCount, setPendingCount] = useState(
    powersync.currentStatus?.dataFlowStatus?.uploading ? 1 : 0
  );

  // HU-29: "uploading" solo es verdadero mientras PowerSync está subiendo
  // en este instante — hay ventanas (reconexión recién lograda, pausas
  // entre reintentos) donde la cola en ps_crud sigue teniendo filas sin
  // que "uploading" esté activo, y el indicador mostraba "Sincronizado"
  // de forma engañosa. Se consulta la cola real, igual que ya hace
  // SyncStatusModal, en vez de depender solo de ese flag transitorio.
  useEffect(() => {
    async function actualizarPendientes() {
      try {
        const crud = await powersync.getAll<{ n: number }>("select count(*) as n from ps_crud");
        setPendingCount(crud[0]?.n ?? 0);
      } catch {
        setPendingCount(powersync.currentStatus?.dataFlowStatus?.uploading ? 1 : 0);
      }
    }

    actualizarPendientes();

    const unsubscribe = powersync.registerListener({
      statusChanged: (status) => {
        setConnected(status.connected);
        setEnviando(Boolean(status.dataFlowStatus?.uploading));
        setHuboError(Boolean(status.dataFlowStatus?.uploadError || status.dataFlowStatus?.downloadError));
        actualizarPendientes();
      }
    });
    return () => unsubscribe();
  }, []);

  const badgeContent = (() => {
    if (!connected) {
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border border-stone-400/40 bg-stone-200/90 text-stone-700 shadow-sm ${
          compact ? "px-2 py-1 text-xs font-bold" : "px-2.5 py-1 text-xs font-semibold"
        }`}>
          <IconWifiOff className="h-3.5 w-3.5 shrink-0 text-stone-600" />
          <span>{compact ? "Sin red" : pendingCount > 0 ? "Sin red · Cambios guardados en este celular" : "Sin red · Guardado local"}</span>
        </span>
      );
    }

    if (huboError) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-600/30 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800">
          <IconAlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{compact ? "Revisar conexión" : "No se pudo actualizar · Revisa la conexión"}</span>
        </span>
      );
    }

    if (pendingCount > 0 || enviando) {
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-100/90 text-amber-900 shadow-sm ${
          compact ? "px-2 py-1 text-xs font-bold" : "px-2.5 py-1 text-xs font-semibold"
        }`}>
          <IconRefresh className={`h-3.5 w-3.5 shrink-0 text-amber-700 ${enviando ? "motion-safe:animate-spin" : ""}`} />
          <span>{enviando ? compact ? "Enviando…" : "Enviando pendientes…" : compact ? "Pendientes" : "Cambios pendientes de envío"}</span>
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-50/90 text-emerald-800 shadow-sm ${
        compact ? "px-2 py-1 text-xs font-bold" : "px-2.5 py-1 text-xs font-semibold"
      }`}>
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
        </span>
        <span>{compact ? "Al día" : "Sincronizado"}</span>
      </span>
    );
  })();

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title="Toca para ver el estado detallado de sincronización y conectividad"
        aria-label={connected ? huboError ? "Ver problema de conexión" : pendingCount > 0 || enviando ? "Ver cambios pendientes de envío" : "Ver estado: registros al día" : "Ver estado: sin conexión, registros guardados en este celular"}
        className="ui-operativa inline-flex min-h-11 items-center transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 rounded-full cursor-pointer"
      >
        <span role="status" aria-live="polite">{badgeContent}</span>
      </button>
    );
  }

  return <span className="ui-operativa" role="status" aria-live="polite">{badgeContent}</span>;
}
