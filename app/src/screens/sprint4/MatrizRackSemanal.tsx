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
    bg: "bg-rose-500 hover:bg-rose-600 text-white animate-pulse",
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
    <div className="flex flex-col justify-between rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
            Ocupación Semanal
          </span>
          <span className="text-[11px] font-bold text-brand-muted bg-brand-sand-light px-2.5 py-0.5 rounded-full border border-brand-border/60">
            Vista 7 Días
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <h3 className="font-display text-base md:text-lg font-black text-brand-ink">
            Matriz Táctica de 8 Habitaciones
          </h3>
          {onIrACalendario && (
            <button
              type="button"
              onClick={onIrACalendario}
              className="text-xs font-bold text-brand-terracotta hover:underline"
            >
              Ver calendario completo →
            </button>
          )}
        </div>
        <p className="text-xs text-brand-muted">
          Mapa visual para ver de un vistazo qué piezas quedan libres en la semana
        </p>

        {/* Cuadrícula Táctil */}
        <div className="mt-4 overflow-x-auto pb-2">
          <div className="min-w-[340px]">
            {/* Cabecera de Días (Columnas) */}
            <div className="grid grid-cols-8 gap-1.5 text-center mb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-brand-muted self-end pb-1">
                Pieza
              </div>
              {diasSemana.map((d) => (
                <div
                  key={d.fechaIso}
                  className={`rounded-xl py-1 px-0.5 border ${
                    d.esHoy
                      ? "bg-brand-terracotta text-white border-brand-terracotta font-black shadow-xs"
                      : "bg-brand-sand-light text-brand-ink border-brand-border/60 font-semibold"
                  }`}
                >
                  <p className="text-[9px] uppercase leading-none">{d.nombreDia}</p>
                  <p className="text-xs leading-tight mt-0.5 font-bold">{d.numeroDia}</p>
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
                      <span className="font-display font-black text-xs text-brand-ink">
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
          <div className="mt-3 rounded-2xl bg-brand-sand-light p-3 border border-brand-border/70 flex items-center justify-between gap-3 animate-fadeIn">
            <div>
              <p className="text-xs font-bold text-brand-ink">
                Pieza {celdaSeleccionada.habitacionNumero} · Fecha: {celdaSeleccionada.fechaIso}
              </p>
              <p className="text-[11px] text-brand-muted">
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
              className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-brand-muted hover:text-brand-ink border border-brand-border/60"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Leyenda de Colores con Iconos SVG */}
        <div className="mt-4 pt-3 border-t border-brand-border/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
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
