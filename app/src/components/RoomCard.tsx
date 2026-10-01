import type { PiezaRow } from "../lib/queries";
import {
  IconBell,
  IconBroom,
  IconCheck,
  IconCheckCircle,
  IconChevronRight,
  IconUser,
  IconUsers,
  IconWrench
} from "./Icons";

// RNF-04: codificación por color de estado. Colores fijos por regla de
// negocio — NO se reemplazan por la paleta de marca. El color nunca es
// la única señal: siempre va con ícono + texto (accesibilidad).
interface EstadoConfig {
  label: string;
  badgeBg: string;
  accentBorder: string;
  cardBg: string;
  renderIcon: (className: string) => JSX.Element;
}

const CONFIG_POR_ESTADO: Record<string, EstadoConfig> = {
  disponible: {
    label: "Disponible",
    badgeBg: "bg-emerald-50 border-emerald-600/30 text-emerald-800",
    accentBorder: "border-l-emerald-600",
    cardBg: "hover:bg-emerald-50/20",
    renderIcon: (cls) => <IconCheckCircle className={cls} />
  },
  ocupada: {
    label: "Ocupada",
    badgeBg: "bg-amber-50 border-amber-600/30 text-amber-900",
    accentBorder: "border-l-amber-500",
    cardBg: "hover:bg-amber-50/20",
    renderIcon: (cls) => <IconUser className={cls} />
  },
  en_aseo: {
    label: "En aseo",
    badgeBg: "bg-red-50 border-red-600/30 text-red-800",
    accentBorder: "border-l-red-600",
    cardBg: "hover:bg-red-50/20",
    renderIcon: (cls) => <IconBroom className={cls} />
  },
  en_mantencion: {
    label: "Mantención",
    badgeBg: "bg-stone-100 border-stone-400/30 text-stone-700",
    accentBorder: "border-l-stone-500",
    cardBg: "hover:bg-stone-100/20",
    renderIcon: (cls) => <IconWrench className={cls} />
  }
};

export function RoomCard({ pieza, onTap }: { pieza: PiezaRow; onTap: () => void }) {
  const config = CONFIG_POR_ESTADO[pieza.estado] ?? CONFIG_POR_ESTADO.disponible;
  const aseoPendiente = pieza.estado === "ocupada" && pieza.aseo_hoy_count === 0;

  return (
    <button
      onClick={onTap}
      className={`group relative flex min-h-[140px] md:min-h-[175px] flex-col justify-between rounded-2xl md:rounded-3xl border border-brand-border/80 border-l-[6px] ${config.accentBorder} bg-brand-card p-4 md:p-5 text-left shadow-card hover:shadow-card-hover transition-all duration-200 active:scale-[0.98] ${config.cardBg}`}
    >
      {/* Fila Superior: Número de pieza + Insignia de estado */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-3xl md:text-4xl font-black tracking-tight text-brand-ink">
          #{pieza.numero}
        </p>

        <div className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold leading-none shadow-sm ${config.badgeBg}`}>
          {config.renderIcon("h-3.5 w-3.5 shrink-0")}
          <span>{config.label}</span>
        </div>
      </div>

      {/* Cuerpo Central: Información Contextual del Pasajero y Operativa */}
      <div className="my-2.5 flex flex-col gap-1 min-w-0">
        {/* Caso: Ocupada */}
        {pieza.estado === "ocupada" && (
          <>
            <div className="flex items-center gap-1.5 min-w-0">
              <IconUser className="h-4 w-4 shrink-0 text-brand-terracotta" />
              <p className="truncate text-xs md:text-sm font-bold text-brand-ink">
                {pieza.huesped_actual ?? "Huésped alojado"}
              </p>
            </div>
            {aseoPendiente ? (
              <span className="inline-flex w-fit items-center gap-1 rounded-md bg-amber-100/90 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                <IconBroom className="h-3 w-3 text-amber-700" />
                <span>Aseo hoy pendiente</span>
              </span>
            ) : (
              <span className="inline-flex w-fit items-center gap-1 text-[10px] font-semibold text-emerald-800">
                <IconCheck className="h-3 w-3 text-emerald-600" />
                <span>Aseo de hoy al día</span>
              </span>
            )}
          </>
        )}

        {/* Caso: Disponible con Reserva para hoy */}
        {pieza.estado === "disponible" && pieza.reserva_id && (
          <>
            <div className="flex items-center gap-1.5 min-w-0">
              <IconBell className="h-4 w-4 shrink-0 text-brand-terracotta" />
              <p className="truncate text-xs md:text-sm font-bold text-brand-ink">
                {pieza.reserva_nombre}
              </p>
            </div>
            <span className="text-[10px] font-semibold text-brand-terracotta-deep">
              Check-in pendiente ({pieza.reserva_tipo === "empresa" ? "Empresa" : "Turista"})
            </span>
          </>
        )}

        {/* Caso: Disponible limpia sin reserva */}
        {pieza.estado === "disponible" && !pieza.reserva_id && (
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-emerald-800">
              Lista para recibir pasajeros
            </p>
            <p className="text-[10px] text-brand-muted hidden md:block">
              Sin reserva asignada para hoy
            </p>
          </div>
        )}

        {/* Caso: En aseo */}
        {pieza.estado === "en_aseo" && (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-red-800 font-bold text-xs">
              <IconBroom className="h-3.5 w-3.5 shrink-0" />
              <span>Aseo post-salida</span>
            </div>
            <p className="text-[10px] text-brand-muted">
              Pendiente cambio de sábanas
            </p>
          </div>
        )}

        {/* Caso: En mantención */}
        {pieza.estado === "en_mantencion" && (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-stone-700 font-bold text-xs">
              <IconWrench className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Motivo: {pieza.motivo_mantencion ?? "Bloqueada"}</span>
            </div>
            <p className="text-[10px] text-brand-muted">
              Fuera de servicio
            </p>
          </div>
        )}
      </div>

      {/* Pie de la tarjeta: Capacidad y Llamado a la acción */}
      <div className="flex items-center justify-between border-t border-brand-border/40 pt-2.5 text-xs text-brand-muted">
        <div className="flex items-center gap-1 font-semibold text-brand-muted">
          <IconUsers className="h-3.5 w-3.5 text-brand-muted" />
          <span>{pieza.capacidad} pers.</span>
        </div>

        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-brand-terracotta group-hover:translate-x-0.5 transition-transform">
          <span>Gestionar</span>
          <IconChevronRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
}
