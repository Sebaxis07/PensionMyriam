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

    for (const op of transaction.crud) {
      const table = supabase.from(op.table);
      // `checkout` no tiene columna "id" propia: su PK real es
      // checkin_id (1:1 con checkin, decisión deliberada en
      // 0001_init.sql para no sumar un surrogate). Localmente igualamos
      // el id de PowerSync a ese mismo valor al escribir (ver
      // Piezas.tsx), así que acá basta con NO mandar "id" y resolver el
      // conflicto por checkin_id en vez de por id.
      const pk = PK_POR_TABLA[op.table] ?? "id";
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
    }

    await transaction.complete();
  }
}
