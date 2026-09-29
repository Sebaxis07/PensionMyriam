import { useEffect, useState } from "react";
import { powersync } from "../lib/powersync";

/**
 * HU-27/28/29: la usuaria nunca debe ver un error de red — solo un
 * indicador simple de si hay operaciones esperando salir. Se actualiza
 * con el propio stream de estado de PowerSync, sin polling manual.
 */
export function SyncStatusBadge() {
  const [connected, setConnected] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubscribe = powersync.registerListener({
      statusChanged: (status) => {
        setConnected(status.connected);
        setPendingCount(status.dataFlowStatus.uploading ? 1 : 0);
      }
    });
    return () => unsubscribe();
  }, []);

  if (!connected && pendingCount === 0) {
    return (
      <span className="rounded-full bg-slate-500 px-3 py-1 text-sm font-medium text-white">
        Sin conexión — guardando en el celular
      </span>
    );
  }
  if (pendingCount > 0) {
    return (
      <span className="rounded-full bg-amber-500 px-3 py-1 text-sm font-medium text-white">
        Enviando datos pendientes…
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-medium text-white">
      Todo sincronizado
    </span>
  );
}
