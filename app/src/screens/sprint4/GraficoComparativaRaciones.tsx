import {
  IconActivity,
  IconAlertTriangle,
  IconCheckCircle,
  IconClipboardCheck,
  IconUtensils
} from "../../components/Icons";
import { BotonExplicacion } from "../../components/BotonExplicacion";

interface GraficoComparativaRacionesProps {
  racionesServidas: number;
  racionesEsperadas: number;
  tasaConciliacion: number;
  pendientesJustificar: number;
  onIrAConciliacion?: () => void;
}

export function GraficoComparativaRaciones({
  racionesServidas,
  racionesEsperadas,
  tasaConciliacion,
  pendientesJustificar,
  onIrAConciliacion
}: GraficoComparativaRacionesProps) {
  // Base para el cálculo porcentual de las barras horizontales
  const maximo = Math.max(racionesServidas, racionesEsperadas, 1);
  const anchoServidas = Math.round((racionesServidas / maximo) * 100);
  const anchoEsperadas = Math.round((racionesEsperadas / maximo) * 100);

  const diferencia = racionesServidas - racionesEsperadas;

  return (
    <div className="ui-operativa flex flex-col justify-between rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold uppercase tracking-wider text-brand-ink/80">
              Comparativa de Raciones
            </span>
            <BotonExplicacion
              titulo="Comparativa de Raciones"
              queEs="Compara dos cosas clave: la cantidad de platos de comida pactados en el contrato con la minera (lo que se espera cobrar) frente a cuántos platos realmente comieron los trabajadores en el comedor."
              comoSeUsa="Compara lo contratado con lo registrado. Las diferencias se revisan y justifican; no cambian por sí solas el monto del contrato completo."
              ejemplo="Si la empresa contrató 30 almuerzos y se registraron 15, revisa y justifica la diferencia con el supervisor. El monto pactado se mantiene completo."
            />
          </div>
          <span className="text-xs font-bold text-brand-ink/80 bg-brand-sand-deep px-2.5 py-0.5 rounded-full border border-brand-border/60">
            Control de Nómina
          </span>
        </div>
        <h3 className="font-display text-base md:text-lg font-black text-brand-ink mt-1">
          Consumo Real vs. Nómina Contratada
        </h3>
        <p className="text-sm text-brand-ink/80">
          Compara las raciones servidas contra lo pactado con la empresa
        </p>

        {/* Tasa de Conciliación destacada */}
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-brand-sand-deep p-3 border border-brand-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-terracotta-deep border border-brand-border/60 shadow-sm">
              <IconActivity className="h-5 w-5 text-brand-terracotta-deep" />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-ink">Tasa de Conciliación</p>
              <p className="text-xs text-brand-ink/80">Días cerrados sin pendientes</p>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`font-display text-xl font-black ${
                tasaConciliacion >= 98
                  ? "text-emerald-700"
                  : tasaConciliacion >= 80
                  ? "text-amber-700"
                  : "text-red-700"
              }`}
            >
              {tasaConciliacion}%
            </span>
            <span className="text-xs block text-brand-ink/80 font-semibold">Meta: 98%</span>
          </div>
        </div>

        {/* Barras Comparativas Horizontales */}
        <div className="mt-5 space-y-4">
          {/* Barra 1: Raciones Servidas */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-brand-ink flex items-center gap-1.5">
                <IconUtensils className="h-3.5 w-3.5 text-brand-terracotta-deep shrink-0" />
                <span>Raciones Servidas en Comedor:</span>
              </span>
              <span className="font-display font-black text-brand-terracotta-deep text-sm">
                {racionesServidas} raciones
              </span>
            </div>
            <div className="h-5 w-full rounded-full bg-brand-sand-deep overflow-hidden border border-brand-border/60 p-0.5">
              <div
                className="h-full rounded-full bg-brand-terracotta-deep transition-all duration-700"
                style={{ width: `${anchoServidas}%` }}
              />
            </div>
          </div>

          {/* Barra 2: Raciones Contratadas por Headcount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-brand-ink flex items-center gap-1.5">
                <IconClipboardCheck className="h-3.5 w-3.5 text-brand-ink shrink-0" />
                <span>Raciones Contratadas (Nómina Facturable):</span>
              </span>
              <span className="font-display font-black text-brand-ink text-sm">
                {racionesEsperadas} raciones
              </span>
            </div>
            <div className="h-5 w-full rounded-full bg-brand-sand-deep overflow-hidden border border-brand-border/60 p-0.5">
              <div
                className="h-full rounded-full bg-brand-ink transition-all duration-700"
                style={{ width: `${anchoEsperadas}%` }}
              />
            </div>
          </div>
        </div>

        {/* Explicación de la Regla de Negocio */}
        <div className="mt-4 rounded-2xl bg-amber-50/70 p-3.5 border border-amber-200 text-sm text-amber-950 space-y-1">
          <p className="font-bold text-xs uppercase tracking-wide text-amber-900">
            Regla de Negocio:
          </p>
          {diferencia <= 0 ? (
            <p className="leading-relaxed flex items-start gap-1.5">
              <IconCheckCircle className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                <strong>Se cobra el 100% de la nómina pactada</strong> ({racionesEsperadas} raciones). Aunque hayan asistido menos trabajadores, se mantiene el monto completo del contrato.
              </span>
            </p>
          ) : (
            <p className="leading-relaxed flex items-start gap-1.5">
              <IconAlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Hubo {diferencia} raciones adicionales servidas</strong> sobre la nómina contratada. Estas raciones se facturan como recargo extra a la empresa.
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Alerta de Descuadres Pendientes */}
      <div className="mt-4 pt-3 border-t border-brand-border/60">
        {pendientesJustificar > 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-red-50 p-3 border border-red-200">
            <div className="flex items-center gap-2">
              <IconAlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-900">
                  {pendientesJustificar} servicios con diferencias
                </p>
                <p className="text-xs text-red-700">
                  Requieren motivo del supervisor para destrabar prefactura
                </p>
              </div>
            </div>
            {onIrAConciliacion && (
              <button
                type="button"
                onClick={onIrAConciliacion}
                className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-700 transition shrink-0 active:scale-95"
              >
                Justificar →
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-sm text-emerald-800 font-semibold px-1">
            <IconCheckCircle className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>Todo conciliado al día. No hay descuadres pendientes.</span>
          </div>
        )}
      </div>
    </div>
  );
}
