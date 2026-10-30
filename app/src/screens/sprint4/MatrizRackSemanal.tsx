import { useState } from "react";
import {
  DiaSemanaInfo,
  CeldaRackSemanal,
  EstadoCeldaRack
} from "./useDashboardAdminMetricas";
import {
  IconBed,
  IconBriefcase,
  IconBroom,
  IconWrench
} from "../../components/Icons";
import { BotonExplicacion } from "../../components/BotonExplicacion";

interface MatrizRackSemanalProps {
  diasSemana: DiaSemanaInfo[];
  matriz: Record<number, CeldaRackSemanal[]>;
  onIrACalendario?: () => void;
}

const CONFIG_ESTADOS: Record<
  EstadoCeldaRack,
  { bg: string; border: string; label: string }
> = {
  disponible: {
    bg: "bg-emerald-500 hover:bg-emerald-600 text-white",
    border: "border-emerald-600",
    label: "Libre"
  },
  empresa: {
    bg: "bg-amber-400 hover:bg-amber-500 text-amber-950",
    border: "border-amber-500",
    label: "Empresa"
  },
  turista: {
    bg: "bg-orange-400 hover:bg-orange-500 text-white",
    border: "border-orange-500",
    label: "Turista"
  },
  aseo: {
    bg: "bg-rose-500 hover:bg-rose-600 text-white motion-safe:animate-pulse",
    border: "border-rose-600",
    label: "Aseo Pendiente"
  },
  mantencion: {
    bg: "bg-stone-400 text-white",
    border: "border-stone-500",
    label: "Mantención"
  }
};

export function MatrizRackSemanal({
  diasSemana,
  matriz,
  onIrACalendario
}: MatrizRackSemanalProps) {
  const [celdaSeleccionada, setCeldaSeleccionada] = useState<CeldaRackSemanal | null>(null);

  return (
    <div className="ui-operativa flex flex-col justify-between rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold uppercase tracking-wider text-brand-ink/80">
              Ocupación Semanal
            </span>
            <BotonExplicacion
              titulo="Matriz Semanal de Habitaciones"
              queEs="Es un mapa visual que te muestra el estado de todas las piezas para los próximos 7 días de la semana."
              comoSeUsa="Cada cuadrito de color es una pieza en un día (amarillo = empresa, naranja = turista, verde = libre, rojo = aseo). Te ayuda a planificar la semana y saber qué días tendrás camas libres sin riesgo de prometer piezas ya ocupadas."
              ejemplo="Un cuadrito verde en el día viernes significa que esa pieza está 100% disponible para recibir a un turista de fin de semana."
            />
          </div>
          <span className="text-xs font-bold text-brand-ink/80 bg-brand-sand-deep px-2.5 py-0.5 rounded-full border border-brand-border/60">
            Vista 7 Días
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <h3 className="font-display text-base md:text-lg font-black text-brand-ink">
            Disponibilidad de las habitaciones
          </h3>
          {onIrACalendario && (
            <button
              type="button"
              onClick={onIrACalendario}
              className="text-sm font-bold text-brand-terracotta-deep hover:underline"
            >
              Ver calendario completo →
            </button>
          )}
        </div>
        <p className="text-sm text-brand-ink/80">
          Mapa visual para ver de un vistazo qué piezas quedan libres en la semana
        </p>

        {/* Cuadrícula Táctil */}
        <div className="mt-4 overflow-x-auto pb-2">
          <div className="min-w-[440px]">
            {/* Cabecera de Días (Columnas) */}
            <div className="grid grid-cols-8 gap-1.5 text-center mb-2">
              <div className="text-xs font-bold uppercase tracking-wider text-brand-ink/80 self-end pb-1">
                Pieza
              </div>
              {diasSemana.map((d) => (
                <div
                  key={d.fechaIso}
                  className={`rounded-xl py-1 px-0.5 border ${
                    d.esHoy
                      ? "bg-brand-terracotta-deep text-white border-brand-terracotta font-black shadow-sm"
                      : "bg-brand-sand-deep text-brand-ink border-brand-border/60 font-semibold"
                  }`}
                >
                  <p className="text-xs uppercase leading-none">{d.nombreDia}</p>
                  <p className="text-sm leading-tight mt-0.5 font-bold">{d.numeroDia}</p>
                </div>
              ))}
            </div>

            {/* Filas: Piezas 1 a 8 */}
            <div className="space-y-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((numPieza) => {
                const celdas = matriz[numPieza] || [];
                return (
                  <div key={numPieza} className="grid grid-cols-8 gap-1.5 items-center">
                    {/* Etiqueta de la Pieza */}
                    <div className="flex items-center justify-center rounded-xl bg-brand-sand/60 py-2 border border-brand-border/60">
                      <span className="font-display font-black text-sm text-brand-ink">
                        P{numPieza}
                      </span>
                    </div>

                    {/* 7 Bloques de los 7 Días con Iconos SVG */}
                    {celdas.map((celda, idx) => {
                      const cfg = CONFIG_ESTADOS[celda.estado];
                      const esSeleccionada =
                        celdaSeleccionada?.habitacionNumero === celda.habitacionNumero &&
                        celdaSeleccionada?.fechaIso === celda.fechaIso;

                      return (
                        <button
                          key={`${numPieza}-${idx}`}
                          type="button"
                          onClick={() => setCeldaSeleccionada(celda)}
                          aria-label={`Pieza ${numPieza}, ${celda.fechaIso}: ${cfg.label}`}
                          title={`Pieza ${numPieza} - ${celda.fechaIso}: ${cfg.label}`}
                          className={`h-8 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                            cfg.bg
                          } ${cfg.border} ${
                            esSeleccionada ? "ring-2 ring-brand-ink ring-offset-1 scale-105" : ""
                          }`}
                        >
                          {celda.estado === "disponible" && (
                            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                          )}
                          {celda.estado === "empresa" && (
                            <IconBriefcase className="h-3 w-3 text-amber-950" />
                          )}
                          {celda.estado === "turista" && (
                            <IconBed className="h-3 w-3 text-white" />
                          )}
                          {celda.estado === "aseo" && (
                            <IconBroom className="h-3.5 w-3.5 text-white" />
                          )}
                          {celda.estado === "mantencion" && (
                            <IconWrench className="h-3 w-3 text-white" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detalle de la celda pulsada */}
        {celdaSeleccionada && (
          <div className="mt-3 rounded-2xl bg-brand-sand-deep p-3 border border-brand-border/70 flex items-center justify-between gap-3 animate-fadeIn">
            <div>
              <p className="text-sm font-bold text-brand-ink">
                Pieza {celdaSeleccionada.habitacionNumero} · Fecha: {celdaSeleccionada.fechaIso}
              </p>
              <p className="text-xs text-brand-ink/80">
                Estado:{" "}
                <span className="font-bold text-brand-ink">
                  {CONFIG_ESTADOS[celdaSeleccionada.estado].label}
                </span>
                {celdaSeleccionada.huesped && ` · Huésped: ${celdaSeleccionada.huesped}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCeldaSeleccionada(null)}
              className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-brand-ink/80 hover:text-brand-ink border border-brand-border/60"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Leyenda de Colores con Iconos SVG */}
        <div className="mt-4 pt-3 border-t border-brand-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-brand-ink">
            <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block border border-emerald-600" />
            <span>Libre</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-brand-ink">
            <span className="h-3 w-3 rounded-full bg-amber-400 inline-block border border-amber-500" />
            <span>Empresa</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-brand-ink">
            <span className="h-3 w-3 rounded-full bg-orange-400 inline-block border border-orange-500" />
            <span>Turista</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-brand-ink">
            <span className="h-3 w-3 rounded-full bg-rose-500 inline-block border border-rose-600" />
            <span>Aseo</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-brand-ink">
            <span className="h-3 w-3 rounded-full bg-stone-400 inline-block border border-stone-500" />
            <span>Mantención</span>
          </div>
        </div>
      </div>
    </div>
  );
}
