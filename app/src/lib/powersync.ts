import { PowerSyncDatabase } from "@powersync/web";
import { AppSchema } from "./schema";
import { SupabaseConnector } from "./connector";

export const powersync = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: "pension-myriam.db" }
});

// Exposición mínima para E2E (auditoría de seguridad de datos
// financieros): permite que Playwright inspeccione el contenido REAL
// de la réplica local de SQLite por rol, en vez de solo el estado
// visual de los componentes — exactamente lo que pide verificar la
// tarea. Sin esto no hay forma de comprobar desde fuera de React qué
// llegó realmente al dispositivo. No afecta producción: es una
// referencia de solo lectura a la misma instancia ya exportada arriba.
if (typeof window !== "undefined") {
  (window as unknown as { __powersync: typeof powersync }).__powersync = powersync;
}

let connected = false;

/** Conecta la base local al servicio de PowerSync. Idempotente. */
export async function connectPowerSync() {
  if (connected) return;
  connected = true;
  await powersync.connect(new SupabaseConnector());
}

// Solo para la auditoría E2E (Caso C: cambio de rol): fuerza una
// desconexión/reconexión real para que PowerSync vuelva a resolver los
// parámetros de los buckets (usuario.rol) contra el valor ACTUAL en
// Postgres, en vez de esperar al próximo ciclo normal de reconexión de
// la app. No se usa en producción.
if (typeof window !== "undefined") {
  (window as unknown as { __powersyncReconectar: () => Promise<void> }).__powersyncReconectar =
    async () => {
      await powersync.disconnect();
      await powersync.connect(new SupabaseConnector());
    };
}
