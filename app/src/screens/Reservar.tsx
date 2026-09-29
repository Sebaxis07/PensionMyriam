import { FormEvent, useState } from "react";
import { useQuery } from "@powersync/react";
import { powersync } from "../lib/powersync";
import { nuevoUuidIdempotente } from "../lib/idempotencia";
import { QUERY_CAMAS_LIBRES, type CamaLibreRow } from "../lib/queries";
import { IconBed, IconCalendar, IconCheck, IconUser } from "../components/Icons";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * HU-01: pantalla propia, no atada a tocar una pieza primero — sirve
 * tanto para "llega alguien ahora" (fecha desde = hoy, queda lista para
 * check-in de inmediato) como para una reserva a futuro (solo confirma,
 * sin tocar el estado de la pieza). Solo turista por ahora: la reserva
 * de empresa (HU-02, con nómina y tarifa) llega en el Sprint 2.
 */
export function Reservar({
  usuarioId,
  preseleccion,
  onListo
}: {
  usuarioId: string;
  preseleccion: string | null;
  onListo: () => void;
}) {
  const { data: camasLibres } = useQuery<CamaLibreRow>(QUERY_CAMAS_LIBRES);
  const [camaId, setCamaId] = useState<string>("");
  const [nombre, setNombre] = useState("");
  const [desde, setDesde] = useState(hoyISO());
  const [hasta, setHasta] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const camaSeleccionada = camaId || camasLibres?.find((c) => c.habitacion_id === preseleccion)?.cama_id || "";

  async function confirmar(e: FormEvent) {
    e.preventDefault();
    const cama = camaSeleccionada || camasLibres?.[0]?.cama_id;
    if (!cama || !nombre.trim()) return;
    setError(null);
    setGuardando(true);
    try {
      await powersync.execute(
        `insert into reserva
           (id, tipo_cliente, cama_id, huesped_nombre, fecha_inicio, fecha_fin, estado, creado_por, uuid_idempotente, created_at)
         values (?, 'turista', ?, ?, ?, ?, 'confirmada', ?, ?, ?)`,
        [
          crypto.randomUUID(),
          cama,
          nombre.trim(),
          desde,
          hasta || null,
          usuarioId,
          nuevoUuidIdempotente(),
          new Date().toISOString()
        ]
      );
      onListo();
    } catch {
      // Optimista: esto solo puede fallar por datos mal formados (la
      // pieza ya no aparecería en camasLibres si estuviera ocupada). Sin
      // jerga técnica ni códigos de error en pantalla.
      setError("No se pudo guardar la reserva. Revisa los datos e intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  if (!camasLibres?.length) {
    return (
      <div className="mx-auto max-w-xl flex flex-col items-center justify-center rounded-3xl border border-brand-border/70 bg-brand-card p-8 py-14 text-center shadow-card">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-sand/50 text-brand-muted">
          <IconBed className="h-8 w-8" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold text-brand-ink">
          Sin habitaciones disponibles
        </h2>
        <p className="mt-1.5 max-w-xs text-sm text-brand-muted">
          No hay piezas libres para reservar en este momento. Revisa el estado de aseos o salidas pendientes.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-brand-border/80 bg-brand-card p-6 md:p-8 shadow-card">
      <form onSubmit={confirmar} className="flex flex-col gap-4">
        {/* Selección de Pieza */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-muted">
            <IconBed className="h-4 w-4 text-brand-terracotta" />
            <span>Habitación</span>
          </label>
          <select
            className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-3 text-base font-semibold text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
            value={camaSeleccionada}
            onChange={(e) => setCamaId(e.target.value)}
          >
            {camasLibres.map((c) => (
              <option key={c.cama_id} value={c.cama_id}>
                Pieza #{c.numero} — {c.capacidad} personas
              </option>
            ))}
          </select>
        </div>

        {/* Nombre del Huésped */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-muted">
            <IconUser className="h-4 w-4 text-brand-terracotta" />
            <span>Nombre del pasajero / turista</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Juana Pérez"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-3 text-base text-brand-ink placeholder:text-stone-400 focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
          />
        </div>

        {/* Fechas de estadía */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-muted">
              <IconCalendar className="h-3.5 w-3.5 text-brand-terracotta" />
              <span>Desde</span>
            </label>
            <input
              type="date"
              required
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm font-medium text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-muted">
              <IconCalendar className="h-3.5 w-3.5 text-brand-muted" />
              <span>Hasta (opcional)</span>
            </label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm font-medium text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="mt-2 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-brand-terracotta px-4 py-3.5 text-base font-bold text-white shadow-brand transition-all hover:bg-brand-terracotta-deep active:scale-[0.98] disabled:opacity-50"
        >
          <IconCheck className="h-5 w-5" />
          <span>{guardando ? "Guardando…" : "Confirmar reserva"}</span>
        </button>
      </form>
    </div>
  );
}
