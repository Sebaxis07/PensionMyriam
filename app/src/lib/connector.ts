import type { AbstractPowerSyncDatabase, PowerSyncBackendConnector } from "@powersync/web";
import { UpdateType } from "@powersync/web";
import { supabase } from "./supabase";
import { POWERSYNC_URL } from "./env";

// Tablas cuya PK real en Postgres no se llama "id" (ver comentario en
// uploadData). Se agrega una entrada acá si un sprint futuro suma otra
// tabla con el mismo patrón 1:1-sin-surrogate.
const PK_POR_TABLA: Record<string, string> = {
  checkout: "checkin_id"
};

/**
 * Conector de subida: PowerSync mantiene la cola local (offline-first,
 * RNF-02); este conector es lo único que sabe cómo empujarla al
 * backend vía PostgREST cuando hay señal. Si `uploadData` lanza, la
 * transacción se reintenta más tarde — no se pierde (RNF-06).
 */
export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      return null;
    }
    return {
      endpoint: POWERSYNC_URL,
      token: data.session.access_token
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      for (const op of transaction.crud) {
        const table = supabase.from(op.table);
        const pk = PK_POR_TABLA[op.table] ?? "id";
        try {
          switch (op.op) {
            case UpdateType.PUT:
              await table
                .upsert(pk === "id" ? { ...(op.opData ?? {}), id: op.id } : { ...(op.opData ?? {}) }, {
                  onConflict: pk
                })
                .throwOnError();
              break;
            case UpdateType.PATCH:
              await table.update(op.opData ?? {}).eq(pk, op.id).throwOnError();
              break;
            case UpdateType.DELETE:
              await table.delete().eq(pk, op.id).throwOnError();
              break;
          }
        } catch (opError: any) {
          // Si es un error irrecuperable de Postgres (código 23xxx de constraint,
          // 42xxx de esquema, PGRSTxxx de PostgREST o HTTP 4xx), no bloquear la cola:
          const status = Number(opError?.status || opError?.statusCode);
          const code = String(opError?.code ?? "");
          const esErrorPermanente =
            (status >= 400 && status < 500) ||
            code.startsWith("23") || // 23503 (FK), 23505 (Unique), 23P01 (Exclusion), 23514 (Check)
            code.startsWith("42") || // Error de esquema o sintaxis
            code.startsWith("PGRST"); // Error de validación de PostgREST

          if (esErrorPermanente) {
            console.warn(
              `[PowerSync] Descartando operación no recuperable en ${op.table} (${op.op}):`,
              opError?.message || opError
            );
          } else {
            // Error transitorio de red o 5xx del servidor: re-lanzar para reintentar
            throw opError;
          }
        }
      }
      await transaction.complete();
    } catch (err) {
      console.error("[PowerSync] Error subiendo transacción (se reintentará):", err);
      throw err;
    }
  }
}
