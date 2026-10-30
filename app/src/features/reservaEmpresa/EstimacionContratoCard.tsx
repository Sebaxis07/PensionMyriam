import {
  serviciosIncluidosComoLista,
  etiquetaCondicionTributaria,
  type EstimacionContrato,
  type ServiciosIncluidosContrato,
  type CondicionTributariaContrato
} from "./estimacionContrato";
import { IconBed, IconUtensils, IconCalendar, IconUsers } from "../../components/Icons";

interface EstimacionContratoCardProps {
  headcount: number;
  tarifaConvenida: number;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  servicios: ServiciosIncluidosContrato;
  condicionTributaria: CondicionTributariaContrato;
  estimacion: EstimacionContrato;
  /** true para la tarjeta compacta del panel de nómina (sección 7: "sin duplicar todos los campos"). */
  compacta?: boolean;
}

const formatoCLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

/**
 * Tarjeta de "Estimación del contrato" — misma fórmula en el
 * formulario de alta (tiempo real) y en la ficha de detalle del
 * contrato. Vocabulario deliberadamente sin tecnicismos (ver sección 4
 * del alcance): nunca dice "ledger", "snapshot", "rate plan", etc.
 */
export function EstimacionContratoCard({
  headcount,
  tarifaConvenida,
  vigenciaDesde,
  vigenciaHasta,
  servicios,
  condicionTributaria,
  estimacion,
  compacta = false
}: EstimacionContratoCardProps) {
  const periodo = vigenciaHasta ? `${vigenciaDesde} al ${vigenciaHasta}` : `Desde ${vigenciaDesde} · Contrato abierto`;

  if (compacta) {
    return (
      <div className="rounded-2xl border border-brand-border/80 bg-brand-sand/30 p-3.5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <p className="font-bold text-brand-ink">
            {headcount} trabajadores · {formatoCLP.format(tarifaConvenida)} / pers. / día
          </p>
          <span className="text-xs font-semibold text-brand-muted">
            {vigenciaHasta ? `${estimacion.diasFacturables} días` : "Abierto"}
          </span>
        </div>
        <p className="mt-1 text-xs text-brand-ink/80">
          {estimacion.esAbierto
            ? `Costo diario estimado: ${formatoCLP.format(estimacion.costoDiario)}`
            : `Total estimado (${estimacion.diasFacturables} días): ${formatoCLP.format(estimacion.totalEstimado ?? 0)}`}
        </p>
      </div>
    );
  }

  const listaServicios = serviciosIncluidosComoLista(servicios);

  return (
    <section
      aria-label="Estimación del contrato"
      className="rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-brand-border/60">
        <div>
          <h3 className="font-display text-lg md:text-xl font-black text-brand-ink">
            Estimación del Contrato
          </h3>
          <p className="text-xs md:text-sm text-brand-muted">
            Condiciones pactadas y proyección económica
          </p>
        </div>
        <span className="self-start sm:self-auto rounded-full bg-brand-sand/70 border border-brand-border px-3 py-1 text-xs font-bold text-brand-ink">
          {etiquetaCondicionTributaria(condicionTributaria)}
        </span>
      </div>

      {/* Grid de 4 parámetros contractuales con tarjetas visuales limpias */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-sm">
        <div className="rounded-2xl border border-brand-border/70 bg-brand-sand/30 p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-brand-muted mb-1">
            <IconUsers className="h-4 w-4 shrink-0 text-brand-terracotta" />
            <span className="text-xs font-bold uppercase tracking-wider">Trabajadores</span>
          </div>
          <p className="font-display text-xl sm:text-2xl font-black text-brand-ink">
            {headcount}
          </p>
          <span className="text-[11px] text-brand-muted mt-0.5">Cupos acordados</span>
        </div>

        <div className="rounded-2xl border border-brand-border/70 bg-brand-sand/30 p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-brand-muted mb-1">
            <IconCalendar className="h-4 w-4 shrink-0 text-brand-terracotta" />
            <span className="text-xs font-bold uppercase tracking-wider">Período</span>
          </div>
          <p className="font-bold text-brand-ink text-xs sm:text-sm leading-snug break-words">
            {periodo}
          </p>
          <span className="text-[11px] text-brand-muted mt-0.5">
            {estimacion.esAbierto ? "Sin fin pactado" : `${estimacion.diasFacturables} días facturables`}
          </span>
        </div>

        <div className="rounded-2xl border border-brand-border/70 bg-brand-sand/30 p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-brand-muted mb-1">
            <IconBed className="h-4 w-4 shrink-0 text-brand-terracotta" />
            <span className="text-xs font-bold uppercase tracking-wider">Tarifa convenida</span>
          </div>
          <p className="font-display text-lg sm:text-xl font-black text-brand-ink">
            {formatoCLP.format(tarifaConvenida)}
          </p>
          <span className="text-[11px] text-brand-muted mt-0.5">Por persona / día</span>
        </div>

        <div className="rounded-2xl border border-brand-border/70 bg-brand-sand/30 p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-brand-muted mb-1">
            <IconUtensils className="h-4 w-4 shrink-0 text-brand-terracotta" />
            <span className="text-xs font-bold uppercase tracking-wider">Servicios</span>
          </div>
          <p className="font-bold text-brand-ink text-xs sm:text-sm line-clamp-2">
            {listaServicios.join(" · ")}
          </p>
          <span className="text-[11px] text-brand-muted mt-0.5">Incluidos en la tarifa</span>
        </div>
      </div>

      {/* Caja Destacada de Proyección Total */}
      <div className="rounded-2xl border border-brand-terracotta/40 bg-gradient-to-br from-white to-orange-50/40 p-4 sm:p-5 shadow-sm">
        {estimacion.esAbierto ? (
          <>
            <span className="text-xs font-extrabold uppercase tracking-wider text-brand-terracotta-deep">
              Costo Diario Estimado
            </span>
            <p className="font-display text-3xl sm:text-4xl font-black text-brand-terracotta-deep mt-1">
              {formatoCLP.format(estimacion.costoDiario)}
            </p>
            <p className="mt-2 text-xs sm:text-sm text-brand-muted leading-relaxed">
              Este contrato no tiene fecha de término todavía, así que no existe un total definitivo. Referencia
              a 30 días (<strong>proyección mensual</strong>, no un cobro fijo): {formatoCLP.format(estimacion.proyeccionMensual ?? 0)}.
            </p>
          </>
        ) : (
          <>
            <span className="text-xs font-extrabold uppercase tracking-wider text-brand-terracotta-deep">
              Total Estimado
            </span>
            <p className="font-display text-3xl sm:text-4xl font-black text-brand-terracotta-deep mt-1">
              {formatoCLP.format(estimacion.totalEstimado ?? 0)}
            </p>
            <p className="mt-2 text-xs sm:text-sm text-brand-muted leading-relaxed">
              {headcount} trabajadores × {estimacion.diasFacturables} días facturables × {formatoCLP.format(tarifaConvenida)}. Esta es una referencia contractual: el monto final de prefacturación puede ajustarse con extras facturables o cambios de cantidad contratada registrados durante el contrato.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
