import { useQuery } from "@powersync/react";
import { powersync } from "../../lib/powersync";

export type OperacionRechazadaRow = {
  id: string;
  tabla: string;
  operacion: string;
  motivo: string;
  datos_json: string;
  fecha_hora: string;
  resuelta: number | null;
  resuelta_por: string | null;
  resuelta_en: string | null;
};

/**
 * HU-42: "la Administradora revisa el resumen y ve el registro del
 * rechazo" — lee la tabla local-only que ya llena connector.ts cuando
 * el servidor rechaza una operación de forma permanente (no la cola
 * normal de PowerSync, que es de operaciones PENDIENTES, no rechazadas).
 */
export function useOperacionesRechazadas(soloPendientes = true) {
  const { data } = useQuery<OperacionRechazadaRow>(
    soloPendientes
      ? "select * from operacion_rechazada where resuelta is null or resuelta = 0 order by fecha_hora desc"
      : "select * from operacion_rechazada order by fecha_hora desc"
  );
  return data ?? [];
}

/** HU-42: marca manual de que la Administradora ya se hizo cargo del rechazo. */
export async function resolverOperacionRechazada(id: string, usuarioId: string): Promise<void> {
  await powersync.execute(
    "update operacion_rechazada set resuelta = 1, resuelta_por = ?, resuelta_en = ? where id = ?",
    [usuarioId, new Date().toISOString(), id]
  );
}
