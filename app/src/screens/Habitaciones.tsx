import { useQuery } from "@powersync/react";
import { powersync } from "../lib/powersync";
import { SyncStatusBadge } from "../components/SyncStatusBadge";

type HabitacionRow = {
  id: string;
  numero: number;
  capacidad: number;
  estado: string;
  motivo_mantencion: string | null;
};

const COLOR_POR_ESTADO: Record<string, string> = {
  disponible: "bg-estado-disponible",
  ocupada: "bg-estado-ocupada",
  en_aseo: "bg-estado-en_aseo",
  en_mantencion: "bg-estado-en_mantencion"
};

/**
 * Pantalla de prueba del Sprint 0 — NO es la implementación final de
 * HU-05 (esa exige máquina de estados completa, check-in/check-out,
 * etc., y llega en el Sprint 1). Su único propósito aquí es probar de
 * punta a punta que una escritura local sin conexión llega a Postgres
 * al reconectar: el criterio de cierre del Sprint 0.
 */
export function Habitaciones() {
  const { data: habitaciones } = useQuery<HabitacionRow>(
    "select id, numero, capacidad, estado, motivo_mantencion from habitacion order by numero"
  );

  async function marcarEnAseo(id: string) {
    // Optimistic UI (RNF-02): esto escribe en la SQLite local al
    // instante, encola el cambio y PowerSync lo sube solo cuando haya
    // señal — sin que la usuaria vea ningún error ni espera.
    await powersync.execute("update habitacion set estado = ? where id = ?", ["en_aseo", id]);
  }

  return (
    <div className="min-h-screen bg-brand-sand p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold text-brand-ink">Habitaciones</h1>
        <SyncStatusBadge />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {habitaciones?.map((h) => (
          <button
            key={h.id}
            onClick={() => marcarEnAseo(h.id)}
            className={`rounded-xl p-4 text-left text-white shadow ${COLOR_POR_ESTADO[h.estado] ?? "bg-slate-400"}`}
          >
            <p className="text-2xl font-bold">#{h.numero}</p>
            <p className="text-sm capitalize">{h.estado.replace("_", " ")}</p>
          </button>
        ))}
        {!habitaciones?.length && (
          <p className="col-span-full text-slate-500">
            Sin habitaciones cargadas todavía (esperando primera sincronización).
          </p>
        )}
      </div>
    </div>
  );
}
