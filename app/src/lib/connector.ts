import type { AbstractPowerSyncDatabase, PowerSyncBackendConnector } from "@powersync/web";
import { UpdateType } from "@powersync/web";
import { supabase } from "./supabase";
import { POWERSYNC_URL } from "./env";

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

    for (const op of transaction.crud) {
      const table = supabase.from(op.table);
      switch (op.op) {
        case UpdateType.PUT:
          await table.upsert({ ...(op.opData ?? {}), id: op.id }).throwOnError();
          break;
        case UpdateType.PATCH:
          await table.update(op.opData ?? {}).eq("id", op.id).throwOnError();
          break;
        case UpdateType.DELETE:
          await table.delete().eq("id", op.id).throwOnError();
          break;
      }
    }

    await transaction.complete();
  }
}
