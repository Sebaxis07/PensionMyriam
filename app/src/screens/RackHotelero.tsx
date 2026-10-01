import { useState, useMemo } from "react";
import { useQuery } from "@powersync/react";
import {
  IconBed,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconUser
} from "../components/Icons";

const NOMBRES_MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DIAS_SEMANA_ABREV = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

interface HabitacionRow {
  id: string;
  numero: number;
  capacidad: number;
  estado: string;
}

interface ReservaRow {
  id: string;
  cama_id: string;
  habitacion_id: string;
  huesped_nombre: string;
  tipo_cliente: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: string;
}

interface RackHoteleroProps {
  onSeleccionarParaReservar: (habitacionId: string, fecha: string) => void;
  onVolver?: () => void;
}

export function RackHotelero({
  onSeleccionarParaReservar,
  onVolver
}: RackHoteleroProps) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1); // 1-12
  const [celdaDetalle, setCeldaDetalle] = useState<{
    piezaNumero: number;
    fecha: string;
    estado: "disponible" | "ocupada" | "en_mantencion";
    huesped?: string;
    habitacionId: string;
  } | null>(null);

  // Consultar las 8 piezas
  const { data: habitacionesRaw } = useQuery<HabitacionRow>(
    "select id, numero, capacidad, estado from habitacion order by numero asc"
  );
  const habitaciones = habitacionesRaw ?? [];

  // Calcular rango del mes
  const mesPadded = String(mes).padStart(2, "0");
  const primerDiaMes = `${anio}-${mesPadded}-01`;
  const cantDias = new Date(anio, mes, 0).getDate();
  const ultimoDiaMes = `${anio}-${mesPadded}-${String(cantDias).padStart(2, "0")}`;

  // Consultar reservas del mes
  const { data: reservasRaw } = useQuery<ReservaRow>(
    `select r.id, r.cama_id, c.habitacion_id, r.huesped_nombre, r.tipo_cliente,
            r.fecha_inicio, r.fecha_fin, r.estado
     from reserva r
     join cama c on c.id = r.cama_id
     where r.estado in ('confirmada', 'en_curso')
       and date(r.fecha_inicio) <= date(?)
       and (r.fecha_fin is null or date(r.fecha_fin) >= date(?))`,
    [ultimoDiaMes, primerDiaMes]
  );
  const reservas = reservasRaw ?? [];

  // Navegación de meses
  function mesAnterior() {
    if (mes === 1) {
      setMes(12);
      setAnio(anio - 1);
    } else {
      setMes(mes - 1);
    }
    setCeldaDetalle(null);
  }

  function mesSiguiente() {
    if (mes === 12) {
      setMes(1);
      setAnio(anio + 1);
    } else {
      setMes(mes + 1);
    }
    setCeldaDetalle(null);
  }

  function irAHoy() {
    setAnio(hoy.getFullYear());
    setMes(hoy.getMonth() + 1);
    setCeldaDetalle(null);
  }

  // Generar lista de días del mes
  const diasMes = useMemo(() => {
    const arr = [];
    for (let d = 1; d <= cantDias; d++) {
      const dPadded = String(d).padStart(2, "0");
      const fStr = `${anio}-${mesPadded}-${dPadded}`;
      const dt = new Date(anio, mes - 1, d);
      arr.push({
        numero: d,
        fechaStr: fStr,
        diaSemana: DIAS_SEMANA_ABREV[dt.getDay()],
        esFinDeSemana: dt.getDay() === 0 || dt.getDay() === 6,
        esHoy: fStr === hoy.toISOString().slice(0, 10)
      });
    }
    return arr;
  }, [anio, mes, cantDias, mesPadded]);

  // Mapa de ocupación rápida: habitacion_id -> fechaStr -> reserva
  const mapaOcupacion = useMemo(() => {
    const mapa = new Map<string, Map<string, ReservaRow>>();

    reservas.forEach((r) => {
      if (!mapa.has(r.habitacion_id)) {
        mapa.set(r.habitacion_id, new Map());
      }
      const mapPieza = mapa.get(r.habitacion_id)!;
      const fIni = r.fecha_inicio > primerDiaMes ? r.fecha_inicio : primerDiaMes;
      const fFin = r.fecha_fin && r.fecha_fin < ultimoDiaMes ? r.fecha_fin : ultimoDiaMes;

      const act = new Date(fIni + "T00:00:00");
      const fin = new Date(fFin + "T00:00:00");

      while (act <= fin) {
        mapPieza.set(act.toISOString().slice(0, 10), r);
        act.setDate(act.getDate() + 1);
      }
    });

    return mapa;
  }, [reservas, primerDiaMes, ultimoDiaMes]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      {onVolver && (
        <button
          onClick={onVolver}
          className="inline-flex w-fit items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-muted hover:text-brand-ink"
        >
          <IconChevronLeft className="h-4 w-4" />
          <span>Volver al inicio</span>
        </button>
      )}

      {/* Cabecera y Navegación de Mes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <IconCalendar className="h-6 w-6 text-brand-terracotta" />
            <h2 className="font-display text-2xl font-bold text-brand-ink">
              Calendario de Ocupación
            </h2>
          </div>
          <p className="mt-1 text-xs text-brand-muted">
            Matriz de disponibilidad mensual de las 8 piezas. Toca un día disponible para registrar una reserva.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={mesAnterior}
            className="rounded-xl border border-brand-border bg-white p-2 text-brand-ink hover:bg-brand-sand/50 shadow-sm"
            title="Mes anterior"
          >
            <IconChevronLeft className="h-4 w-4" />
          </button>

          <span className="min-w-[140px] text-center font-display text-base font-bold text-brand-ink">
            {NOMBRES_MESES[mes - 1]} {anio}
          </span>

          <button
            onClick={mesSiguiente}
            className="rounded-xl border border-brand-border bg-white p-2 text-brand-ink hover:bg-brand-sand/50 shadow-sm"
            title="Mes siguiente"
          >
            <IconChevronRight className="h-4 w-4" />
          </button>

          <button
            onClick={irAHoy}
            className="rounded-xl bg-brand-sand/60 px-3 py-2 text-xs font-bold text-brand-ink hover:bg-brand-sand shadow-sm"
          >
            Hoy
          </button>
        </div>
      </div>

      {/* Leyenda de Colores */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-brand-border/60 bg-white px-4 py-2.5 text-xs text-brand-muted shadow-sm">
        <span className="font-bold uppercase tracking-wider text-[10px]">Estados:</span>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="font-medium text-brand-ink">Disponible (tocar para reservar)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="font-medium text-brand-ink">Ocupada / Reservada</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-stone-400" />
          <span className="font-medium text-brand-ink">En Mantención</span>
        </div>
      </div>

      {/* Matriz Scrollable Horizontal */}
      <div className="rounded-3xl border border-brand-border/80 bg-brand-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-brand-border bg-brand-sand/30">
                <th className="sticky left-0 z-20 bg-brand-sand/90 px-3 py-3 text-left font-bold uppercase tracking-wider text-brand-ink min-w-[120px] shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                  Habitación
                </th>
                {diasMes.map((d) => (
                  <th
                    key={d.numero}
                    className={`px-1.5 py-2 text-center font-bold min-w-[34px] border-l border-brand-border/40 ${
                      d.esHoy
                        ? "bg-brand-terracotta text-white font-extrabold"
                        : d.esFinDeSemana
                        ? "bg-brand-sand/50 text-brand-muted"
                        : "text-brand-ink"
                    }`}
                  >
                    <div className="text-[10px] uppercase">{d.diaSemana}</div>
                    <div className="text-xs">{d.numero}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {habitaciones.map((h) => {
                const mapPieza = mapaOcupacion.get(h.id);
                const enMantencionGeneral = h.estado === "en_mantencion";

                return (
                  <tr key={h.id} className="border-b border-brand-border/40 hover:bg-brand-sand/10">
                    <td className="sticky left-0 z-10 bg-brand-card px-3 py-3 font-display font-bold text-brand-ink shadow-[2px_0_5px_rgba(0,0,0,0.05)] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <IconBed className="h-4 w-4 text-brand-terracotta" />
                        <span>Pieza #{h.numero}</span>
                      </div>
                      <span className="text-[10px] text-brand-muted font-normal">
                        ({h.capacidad} camas)
                      </span>
                    </td>

                    {diasMes.map((d) => {
                      const res = mapPieza?.get(d.fechaStr);
                      const ocupada = !!res;
                      const mantencion = enMantencionGeneral;

                      let bgColor = "bg-emerald-100 hover:bg-emerald-200 text-emerald-900";
                      let tooltip = `Pieza #${h.numero} - Disponible`;

                      if (mantencion) {
                        bgColor = "bg-stone-200 text-stone-600";
                        tooltip = `Pieza #${h.numero} - En Mantención`;
                      } else if (ocupada) {
                        bgColor = "bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold";
                        tooltip = `Pieza #${h.numero} - Ocupada: ${res?.huesped_nombre || "Ocupada"}`;
                      }

                      return (
                        <td
                          key={d.numero}
                          onClick={() => {
                            if (!mantencion && !ocupada) {
                              onSeleccionarParaReservar(h.id, d.fechaStr);
                            } else {
                              setCeldaDetalle({
                                piezaNumero: h.numero,
                                fecha: d.fechaStr,
                                estado: mantencion ? "en_mantencion" : "ocupada",
                                huesped: res?.huesped_nombre || "Ocupada",
                                habitacionId: h.id
                              });
                            }
                          }}
                          className={`h-11 border-l border-brand-border/40 text-center transition-colors cursor-pointer select-none ${bgColor} ${
                            d.esHoy ? "ring-1 ring-inset ring-brand-terracotta/40" : ""
                          }`}
                          title={tooltip}
                        >
                          {ocupada && (
                            <span className="block truncate px-0.5 text-[9px] max-w-[34px]">
                              {(res?.huesped_nombre || "Ocupada").slice(0, 3)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Popover de detalle si toca una celda ocupada */}
      {celdaDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-brand-border bg-brand-card p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                  Detalle de Ocupación
                </p>
                <h3 className="font-display text-lg font-bold text-brand-ink">
                  Pieza #{celdaDetalle.piezaNumero}
                </h3>
                <p className="text-xs text-brand-muted">{celdaDetalle.fecha}</p>
              </div>
              <button
                onClick={() => setCeldaDetalle(null)}
                className="rounded-full p-1 text-brand-muted hover:bg-brand-sand"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl border border-brand-border/70 bg-white p-3.5 space-y-2 text-xs">
              {celdaDetalle.estado === "ocupada" ? (
                <>
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                    <IconUser className="h-4 w-4" />
                    <span>Huésped registrado:</span>
                  </div>
                  <p className="text-sm font-bold text-brand-ink pl-5">
                    {celdaDetalle.huesped}
                  </p>
                </>
              ) : (
                <p className="text-stone-700 italic">
                  Esta habitación se encuentra fuera de servicio por mantención.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setCeldaDetalle(null)}
                className="rounded-xl bg-brand-sand/70 hover:bg-brand-sand px-4 py-2 text-xs font-bold text-brand-ink"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
