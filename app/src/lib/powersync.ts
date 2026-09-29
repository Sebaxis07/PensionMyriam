import { PowerSyncDatabase } from "@powersync/web";
import { AppSchema } from "./schema";
import { SupabaseConnector } from "./connector";

export const powersync = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: "pension-myriam.db" }
});

let connected = false;

/** Conecta la base local al servicio de PowerSync. Idempotente. */
export async function connectPowerSync() {
  if (connected) return;
  connected = true;
  await powersync.connect(new SupabaseConnector());
}
