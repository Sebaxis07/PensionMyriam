import {
  serviciosIncluidosComoLista,
  etiquetaCondicionTributaria,
  type EstimacionContrato,
  type ServiciosIncluidosContrato,
  type CondicionTributariaContrato
} from "./estimacionContrato";

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
  const periodo = vigenciaHasta ? `${vigenciaDesde} al ${vigenciaHasta}` : `Desde ${vigenciaDesde} · contrato abierto`;

  if (compacta) {
    return (
      <div className="rounded-2xl border border-brand-border/70 bg-brand-sand/30 p-3.5 text-sm">
        <p className="font-bold text-brand-ink">
          {headcount} trabajadores · {formatoCLP.format(tarifaConvenida)} por persona y día
        </p>
        <p className="mt-0.5 text-brand-ink/80">
          {estimacion.esAbierto
            ? `Costo diario estimado: ${formatoCLP.format(estimacion.costoDiario)}`
            : `Total estimado (${estimacion.diasFacturables} días): ${formatoCLP.format(estimacion.totalEstimado ?? 0)}`}
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Estimación del contrato" className="rounded-2xl border border-brand-border bg-brand-sand/40 p-4 sm:p-5">
      <h3 className="font-display text-base font-bold text-brand-ink">Estimación del contrato</h3>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="font-semibold text-brand-ink/80">Trabajadores</dt>
          <dd className="font-bold text-brand-ink">{headcount}</dd>
        </div>
        <div>
          <dt className="font-semibold text-brand-ink/80">Período</dt>
          <dd className="font-bold text-brand-ink">{periodo}</dd>
        </div>
        <div>
          <dt className="font-semibold text-brand-ink/80">Tarifa acordada</dt>
          <dd className="font-bold text-brand-ink">{formatoCLP.format(tarifaConvenida)} / persona / día</dd>
        </div>
        <div>
          <dt className="font-semibold text-brand-ink/80">Incluido en la tarifa</dt>
          <dd className="font-bold text-brand-ink">{serviciosIncluidosComoLista(servicios).join(" · ")}</dd>
        </div>
      </dl>

      <p className="mt-2 text-xs text-brand-ink/80">{etiquetaCondicionTributaria(condicionTributaria)}</p>

      <div className="mt-4 rounded-xl border border-brand-terracotta/30 bg-white p-4">
        {estimacion.esAbierto ? (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-ink/80">Costo diario</p>
            <p className="font-display text-2xl font-bold text-brand-terracotta-deep">
              {formatoCLP.format(estimacion.costoDiario)}
            </p>
            <p className="mt-2 text-xs text-brand-ink/80">
              Este contrato no tiene fecha de término todavía, así que no existe un total definitivo. Referencia
              a 30 días (<strong>proyección mensual</strong>, no un cobro fijo): {formatoCLP.format(estimacion.proyeccionMensual ?? 0)}.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-ink/80">Total estimado</p>
            <p className="font-display text-3xl font-bold text-brand-terracotta-deep">
              {formatoCLP.format(estimacion.totalEstimado ?? 0)}
            </p>
            <p className="mt-2 text-xs text-brand-ink/80">
              {headcount} trabajadores × {estimacion.diasFacturables} días facturables × {formatoCLP.format(tarifaConvenida)}.
              Esta es una referencia contractual: el monto final de prefacturación puede ajustarse con extras
              facturables o cambios de cantidad contratada registrados durante el contrato.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
