import type { PiezaRow } from "../lib/queries";
import { IconBroom, IconCheckCircle, IconUsers, IconUser, IconWrench } from "./Icons";

// RNF-04: codificación por color de estado. Colores fijos por regla de
// negocio — NO se reemplazan por la paleta de marca. El color nunca es
// la única señal: siempre va con ícono + texto (accesibilidad).
interface EstadoConfig {
  label: string;
  badgeBg: string;
  badgeText: string;
  accentBorder: string;
  cardBg: string;
  renderIcon: (className: string) => JSX.Element;
}

const CONFIG_POR_ESTADO: Record<string, EstadoConfig> = {
  disponible: {
    label: "Disponible",
    badgeBg: "bg-emerald-50 border-emerald-600/20 text-emerald-800",
    badgeText: "text-emerald-800",
    accentBorder: "border-l-emerald-600",
    cardBg: "hover:bg-emerald-50/30",
    renderIcon: (cls) => <IconCheckCircle className={cls} />
  },
  ocupada: {
    label: "Ocupada",
    badgeBg: "bg-amber-50 border-amber-600/30 text-amber-900",
    badgeText: "text-amber-900",
    accentBorder: "border-l-amber-500",
    cardBg: "hover:bg-amber-50/30",
    renderIcon: (cls) => <IconUser className={cls} />
  },
  en_aseo: {
    label: "En aseo",
    badgeBg: "bg-red-50 border-red-600/20 text-red-800",
    badgeText: "text-red-800",
    accentBorder: "border-l-red-600",
    cardBg: "hover:bg-red-50/30",
    renderIcon: (cls) => <IconBroom className={cls} />
  },
  en_mantencion: {
    label: "Mantención",
    badgeBg: "bg-stone-100 border-stone-400/30 text-stone-700",
    badgeText: "text-stone-700",
    accentBorder: "border-l-stone-500",
    cardBg: "hover:bg-stone-100/30",
    renderIcon: (cls) => <IconWrench className={cls} />
  }
};

export function RoomCard({ pieza, onTap }: { pieza: PiezaRow; onTap: () => void }) {
  const config = CONFIG_POR_ESTADO[pieza.estado] ?? CONFIG_POR_ESTADO.disponible;
  const aseoPendiente = pieza.estado === "ocupada" && pieza.aseo_hoy_count === 0;

  return (
    <button
      onClick={onTap}
      className={`group relative flex min-h-[118px] flex-col justify-between rounded-2xl border border-brand-border/80 border-l-4 ${config.accentBorder} bg-brand-card p-3.5 text-left shadow-card transition-all duration-150 active:scale-[0.97] active:shadow-sm ${config.cardBg}`}
    >
      {/* Insignia de aseo pendiente para hoy */}
      {aseoPendiente && (
        <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-brand-ink/90 px-2 py-0.5 text-[10px] font-bold tracking-tight text-white shadow-sm ring-1 ring-white/20">
          <IconBroom className="h-3 w-3 text-amber-300" />
          <span>Aseo hoy</span>
        </span>
      )}

      {/* Cabecera de la tarjeta: Número de pieza */}
      <div>
        <p className="font-display text-3xl font-extrabold tracking-tight text-brand-ink">
          #{pieza.numero}
        </p>
      </div>

      {/* Pie de la tarjeta: Estado accesible (ícono + texto) y Capacidad */}
      <div className="mt-2 flex flex-col gap-1.5">
        <div className={`inline-flex w-fit items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-bold leading-tight ${config.badgeBg}`}>
          {config.renderIcon("h-3.5 w-3.5 shrink-0")}
          <span>{config.label}</span>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-semibold text-brand-muted">
          <IconUsers className="h-3.5 w-3.5 text-brand-muted/80" />
          <span>{pieza.capacidad} pers.</span>
        </div>
      </div>
    </button>
  );
}
