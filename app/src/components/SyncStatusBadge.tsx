import { useEffect, useState } from "react";
import { powersync } from "../lib/powersync";
import { IconRefresh, IconWifiOff } from "./Icons";

/**
 * HU-27/28/29: la usuaria nunca debe ver un error de red — solo un
 * indicador simple de si hay operaciones esperando salir. Se actualiza
 * con el propio stream de estado de PowerSync, sin polling manual.
 */
export function SyncStatusBadge({ onClick }: { onClick?: () => void }) {
  const [connected, setConnected] = useState(powersync.currentStatus?.connected ?? false);
  const [pendingCount, setPendingCount] = useState(
    powersync.currentStatus?.dataFlowStatus?.uploading ? 1 : 0
  );

  useEffect(() => {
    const unsubscribe = powersync.registerListener({
      statusChanged: (status) => {
        setConnected(status.connected);
        setPendingCount(status.dataFlowStatus.uploading ? 1 : 0);
      }
    });
    return () => unsubscribe();
  }, []);

  const badgeContent = (() => {
    if (!connected && pendingCount === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-400/40 bg-stone-200/80 px-2.5 py-1 text-[11px] font-semibold text-stone-700 shadow-sm">
          <IconWifiOff className="h-3.5 w-3.5 shrink-0 text-stone-600" />
          <span className="truncate">Sin red · Guardado local</span>
        </span>
      );
    }

    if (pendingCount > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-100/90 px-2.5 py-1 text-[11px] font-semibold text-amber-900 shadow-sm">
          <IconRefresh className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-700" />
          <span>Enviando pendientes…</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-50/90 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 shadow-sm">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
        </span>
        <span>Sincronizado</span>
      </span>
    );
  })();

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title="Toca para ver el estado detallado de sincronización y conectividad"
        className="transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 rounded-full cursor-pointer"
      >
        {badgeContent}
      </button>
    );
  }

  return badgeContent;
}
