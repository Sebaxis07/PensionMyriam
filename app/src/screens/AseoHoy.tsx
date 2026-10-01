import { useQuery } from "@powersync/react";
import { powersync } from "../lib/powersync";
import { nuevoUuidIdempotente } from "../lib/idempotencia";
import { IconBroom, IconCheck, IconCheckCircle, IconUser } from "../components/Icons";

type PendienteRow = { id: string; numero: number; huesped_actual: string | null };

const QUERY_PENDIENTES = `
with active_checkin as (
  select * from (
    select c.habitacion_id, r.huesped_nombre,
           row_number() over (partition by c.habitacion_id order by ci.fecha_hora desc) as rn
    from checkin ci
    join reserva r on r.id = ci.reserva_id
    join cama c on c.id = r.cama_id
    left join checkout co on co.checkin_id = ci.id
    where co.checkin_id is null
  ) where rn = 1
)
select h.id, h.numero, ac.huesped_nombre as huesped_actual
from habitacion h
left join active_checkin ac on ac.habitacion_id = h.id
where h.estado = 'ocupada'
  and not exists (
    select 1 from aseo a where a.habitacion_id = h.id and date(a.fecha_hora) = date('now')
  )
order by h.numero
`;

/**
 * HU-08: pantalla propia (no una insignia perdida en Inicio) con todas
 * las piezas Ocupadas que todavía no tienen su aseo de hoy. Un toque
 * por fila — nada de abrir la pieza en Inicio para resolverlo.
 */
export function AseoHoy({ usuarioId }: { usuarioId: string }) {
  const { data: pendientes } = useQuery<PendienteRow>(QUERY_PENDIENTES);

  async function marcarListo(habitacionId: string) {
    await powersync.execute(
      "insert into aseo (id, habitacion_id, tipo, responsable, fecha_hora, uuid_idempotente) values (?, ?, 'diario', ?, ?, ?)",
      [crypto.randomUUID(), habitacionId, usuarioId, new Date().toISOString(), nuevoUuidIdempotente()]
    );
  }

  if (!pendientes?.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-brand-border/70 bg-brand-card p-8 py-14 text-center shadow-card">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <IconCheckCircle className="h-9 w-9" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold text-brand-ink">
          ¡Aseos al día!
        </h2>
        <p className="mt-1.5 max-w-xs text-sm text-brand-muted">
          Todas las piezas ocupadas ya cuentan con su aseo diario registrado para hoy.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Banner de resumen */}
      <div className="flex items-center justify-between rounded-2xl border border-amber-600/30 bg-amber-50/70 p-3.5 px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <IconBroom className="h-5 w-5 text-amber-700" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
            Aseo diario obligatorio
          </span>
        </div>
        <span className="rounded-full bg-amber-600/20 px-2.5 py-0.5 text-xs font-extrabold text-amber-900">
          {pendientes.length} {pendientes.length === 1 ? "pendiente" : "pendientes"}
        </span>
      </div>

      {/* Lista de piezas con aseo pendiente (1 columna en mobile, 2 en desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {pendientes.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-brand-border/80 bg-brand-card p-3.5 shadow-card transition-all"
          >
            {/* Número de pieza estilizado */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-sand/40 font-display text-2xl font-black text-brand-ink">
              #{p.numero}
            </div>

            {/* Información del huésped */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <IconUser className="h-4 w-4 shrink-0 text-brand-muted" />
                <p className="truncate text-base font-bold text-brand-ink">
                  {p.huesped_actual ?? "Huésped sin registrar"}
                </p>
              </div>
              <p className="mt-0.5 text-xs font-medium text-amber-800">
                Aseo diario pendiente hoy
              </p>
            </div>

            {/* Botón de acción rápida con icono */}
            <button
              onClick={() => marcarListo(p.id)}
              className="inline-flex min-h-[46px] shrink-0 items-center gap-1.5 rounded-xl bg-brand-terracotta px-4 py-2.5 text-sm font-bold text-white shadow-brand transition-all hover:bg-brand-terracotta-deep active:scale-95"
            >
              <IconCheck className="h-4 w-4" />
              <span>Aseo listo</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
