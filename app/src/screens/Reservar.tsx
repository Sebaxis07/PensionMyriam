import { FormEvent, useState } from "react";
import { useQuery } from "@powersync/react";
import { powersync } from "../lib/powersync";
import { nuevoUuidIdempotente } from "../lib/idempotencia";
import { QUERY_CAMAS_LIBRES, type CamaLibreRow } from "../lib/queries";
import { IconBed, IconCalendar, IconCheck, IconFileText, IconUser } from "../components/Icons";
import { descargarVoucherTuristaPdf, type DatosVoucherTurista } from "../features/reportes/generarVoucherTuristaPdf";
import { abrirEnlaceWhatsApp } from "../features/reservas/compartirWhatsApp";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export function Reservar({
  usuarioId,
  preseleccion,
  fechaPreseleccionada,
  onListo
}: {
  usuarioId: string;
  preseleccion: string | null;
  fechaPreseleccionada?: string;
  onListo: () => void;
}) {
  const { data: camasLibres } = useQuery<CamaLibreRow>(QUERY_CAMAS_LIBRES);
  const [camaId, setCamaId] = useState<string>("");
  const [nombre, setNombre] = useState("");
  const [desde, setDesde] = useState(fechaPreseleccionada || hoyISO());
  const [hasta, setHasta] = useState("");
  const [telefono, setTelefono] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservaConfirmada, setReservaConfirmada] = useState<DatosVoucherTurista | null>(null);

  const camaSeleccionada = camaId || camasLibres?.find((c) => c.habitacion_id === preseleccion)?.cama_id || "";
  const camaObj = camasLibres?.find((c) => c.cama_id === (camaSeleccionada || camasLibres?.[0]?.cama_id));

  async function confirmar(e: FormEvent) {
    e.preventDefault();
    const cama = camaSeleccionada || camasLibres?.[0]?.cama_id;
    if (!cama || !nombre.trim()) return;
    setError(null);
    setGuardando(true);
    const nuevoId = crypto.randomUUID();
    try {
      await powersync.execute(
        `insert into reserva
           (id, tipo_cliente, cama_id, huesped_nombre, fecha_inicio, fecha_fin, estado, creado_por, uuid_idempotente, created_at)
         values (?, 'turista', ?, ?, ?, ?, 'confirmada', ?, ?, ?)`,
        [
          nuevoId,
          cama,
          nombre.trim(),
          desde,
          hasta || null,
          usuarioId,
          nuevoUuidIdempotente(),
          new Date().toISOString()
        ]
      );

      // Calcular noches si hay fecha fin
      let noches = 1;
      if (hasta && hasta > desde) {
        const diffMs = new Date(hasta).getTime() - new Date(desde).getTime();
        noches = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      }

      setReservaConfirmada({
        reservaId: nuevoId,
        huespedNombre: nombre.trim(),
        habitacionNumero: camaObj?.numero ?? 1,
        fechaInicio: desde,
        fechaFin: hasta || null,
        nochesEstimadas: noches,
        tarifaNoche: 15000
      });
    } catch {
      setError("No se pudo guardar la reserva. Revisa los datos e intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  if (reservaConfirmada) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-brand-border/80 bg-brand-card p-6 md:p-8 shadow-card text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white">
          <IconCheck className="h-7 w-7" />
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800">
            Reserva Confirmada
          </p>
          <h2 className="font-display text-2xl font-bold text-brand-ink">
            ¡Reserva de Turista Guardada!
          </h2>
          <p className="mt-1 text-xs text-brand-muted">
            Pieza #{reservaConfirmada.habitacionNumero} asignada a {reservaConfirmada.huespedNombre} para el {reservaConfirmada.fechaInicio}.
          </p>
        </div>

        <div className="rounded-2xl border border-brand-border bg-white p-4 text-xs text-left space-y-1.5">
          <div className="flex justify-between">
            <span className="text-brand-muted">Tarifa por noche:</span>
            <span className="font-bold text-brand-ink">$15.000 CLP</span>
          </div>
          <div className="flex justify-between">
            <span className="text-brand-muted">Estadía:</span>
            <span className="font-bold text-brand-ink">{reservaConfirmada.nochesEstimadas} noche(s)</span>
          </div>
          <div className="flex justify-between border-t border-brand-border/60 pt-1.5">
            <span className="font-bold text-brand-terracotta">Total Estimado:</span>
            <span className="font-bold text-brand-terracotta text-sm">
              ${((reservaConfirmada.nochesEstimadas ?? 1) * 15000).toLocaleString("es-CL")} CLP
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => descargarVoucherTuristaPdf(reservaConfirmada)}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-terracotta hover:bg-brand-terracotta-deep px-4 py-3 text-xs font-bold text-white shadow-brand transition-all"
          >
            <IconFileText className="h-4 w-4" />
            <span>Descargar Comprobante (PDF)</span>
          </button>

          <button
            onClick={() =>
              abrirEnlaceWhatsApp({
                huespedNombre: reservaConfirmada.huespedNombre,
                habitacionNumero: reservaConfirmada.habitacionNumero,
                fechaInicio: reservaConfirmada.fechaInicio,
                fechaFin: reservaConfirmada.fechaFin,
                nochesEstimadas: reservaConfirmada.nochesEstimadas,
                telefonoDestino: telefono
              })
            }
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-3 text-xs font-bold text-white shadow-sm transition-all"
          >
            <span>💬 Compartir por WhatsApp</span>
          </button>
        </div>

        <div className="pt-2">
          <button
            onClick={onListo}
            className="rounded-xl px-5 py-2 text-xs font-bold text-brand-muted hover:text-brand-ink underline"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
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

        {/* Teléfono para WhatsApp */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-muted">
            <span>Teléfono / WhatsApp (opcional)</span>
          </label>
          <input
            type="tel"
            placeholder="Ej: +56912345678"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
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
