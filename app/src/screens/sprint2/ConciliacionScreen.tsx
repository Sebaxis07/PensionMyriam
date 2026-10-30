import { describirErrorUi } from "../../components/MensajeInterfaz";
import { Dialogo } from "../../components/Dialogo";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@powersync/react";
import {
  useConciliacion,
  recalcularConciliacion,
  conciliarPeriodo,
  generarCamaNoche,
  type ConciliacionRow
} from "../../features/conciliacion/useConciliacion";
import {
  justificarDescuadre,
  MOTIVOS_DESCUADRE,
  type MotivoDescuadre
} from "../../features/conciliacion/justificarDescuadre";
import { fechaHoySantiago, sumarDiasYMD } from "../../lib/fechaNegocio";
import {
  IconCalendar,
  IconCheckCircle,
  IconChevronLeft,
  IconChevronRight,
  IconClipboardCheck,
  IconClose,
  IconRefresh
} from "../../components/Icons";

const ETIQUETAS_MOTIVO: Record<MotivoDescuadre, string> = {
  turno_extra: "Turno Extra",
  almuerzo_mina: "Almuerzo en Mina",
  corte_ruta: "Corte de Ruta",
  ausencia_justificada: "Ausencia Justificada",
  otro: "Otro motivo"
};

const METADATA_SERVICIOS: Record<
  string,
  { label: string; icon: string; desc: string }
> = {
  cama_noche: { label: "Noche de Cama", icon: "🛏️", desc: "Alojamiento en pensión" },
  desayuno: { label: "Desayuno", icon: "☕", desc: "Primer turno matutino" },
  almuerzo: { label: "Almuerzo", icon: "🍲", desc: "Comida de mediodía" },
  cena: { label: "Cena", icon: "🍽️", desc: "Servicio nocturno" }
};

function formatearFechaLegible(fechaIso: string): string {
  try {
    const [y, m, d] = fechaIso.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long"
    };
    const texto = date.toLocaleDateString("es-CL", opciones);
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  } catch {
    return fechaIso;
  }
}

export function ConciliacionScreen({
  usuarioId,
  contratoEmpresaId,
  onAbrirCierre
}: {
  usuarioId: string;
  contratoEmpresaId: string;
  onAbrirCierre?: () => void;
}) {
  const hoy = fechaHoySantiago();
  const diasRaw = useConciliacion(contratoEmpresaId);

  // Consultar vigencia del contrato
  const { data: contratosInfo } = useQuery<{
    id: string;
    empresa_id: string;
    vigencia_desde: string;
    vigencia_hasta: string | null;
    headcount: number;
  }>(
    "select id, empresa_id, vigencia_desde, vigencia_hasta, headcount from contrato_empresa where id = ?",
    [contratoEmpresaId]
  );
  const contrato = contratosInfo?.[0];

  // Fecha actualmente seleccionada para revisar (por defecto HOY o último día válido)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoy);

  // Ajustar fecha inicial si el contrato ya finalizó o empieza a futuro
  useEffect(() => {
    if (!contrato) return;
    setFechaSeleccionada((actual) => {
      if (contrato.vigencia_hasta && actual > contrato.vigencia_hasta) {
        return contrato.vigencia_hasta;
      }
      if (actual < contrato.vigencia_desde) {
        return contrato.vigencia_desde;
      }
      return actual;
    });
  }, [contrato]);

  // Estados de justificación
  const [diaJustificando, setDiaJustificando] = useState<ConciliacionRow | null>(null);
  const [motivo, setMotivo] = useState<MotivoDescuadre>("ausencia_justificada");
  const [supervisorNombre, setSupervisorNombre] = useState("");

  // Estados de carga
  const [actualizandoDia, setActualizandoDia] = useState(false);
  const [procesandoPeriodo, setProcesandoPeriodo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Validaciones de vigencia
  const estaFueraDeVigencia = useMemo(() => {
    if (!contrato) return false;
    if (fechaSeleccionada < contrato.vigencia_desde) return true;
    if (contrato.vigencia_hasta && fechaSeleccionada > contrato.vigencia_hasta) return true;
    return false;
  }, [contrato, fechaSeleccionada]);

  const puedeRetroceder = useMemo(() => {
    if (!contrato) return true;
    return fechaSeleccionada > contrato.vigencia_desde;
  }, [contrato, fechaSeleccionada]);

  const puedeAvanzar = useMemo(() => {
    if (fechaSeleccionada >= hoy) return false;
    if (contrato?.vigencia_hasta && fechaSeleccionada >= contrato.vigencia_hasta) return false;
    return true;
  }, [contrato, fechaSeleccionada, hoy]);

  // Agrupar filas de conciliación por fecha
  const conciliacionesPorFecha = useMemo(() => {
    const mapa = new Map<string, ConciliacionRow[]>();
    diasRaw.forEach((d) => {
      const list = mapa.get(d.fecha) || [];
      list.push(d);
      mapa.set(d.fecha, list);
    });
    return mapa;
  }, [diasRaw]);

  // Ordenar fechas disponibles descendente (más recientes primero)
  const todasLasFechas = useMemo(() => {
    return Array.from(conciliacionesPorFecha.keys()).sort().reverse();
  }, [conciliacionesPorFecha]);

  // Obtener los 4 servicios para la fecha seleccionada
  const serviciosDia = useMemo(() => {
    const filas = conciliacionesPorFecha.get(fechaSeleccionada) || [];
    const tipos = ["cama_noche", "desayuno", "almuerzo", "cena"];
    return tipos.map((t) => {
      const fila = filas.find((f) => f.tipo === t);
      return {
        tipo: t,
        meta: METADATA_SERVICIOS[t] || { label: t, icon: "📌", desc: "" },
        fila,
        servida: fila?.cantidad_servida ?? 0,
        esperada: fila?.cantidad_esperada ?? (contrato?.headcount ?? 0),
        estado: fila?.estado ?? "sin_datos",
        motivo: fila?.motivo,
        supervisor: fila?.supervisor_nombre
      };
    });
  }, [conciliacionesPorFecha, fechaSeleccionada, contrato?.headcount]);

  // Recalcular raciones del día seleccionado
  async function handleActualizarDia() {
    setError(null);
    setMensajeExito(null);
    setActualizandoDia(true);
    try {
      if (estaFueraDeVigencia) {
        throw new Error("Esta fecha está fuera de la vigencia del contrato.");
      }
      await generarCamaNoche(fechaSeleccionada);
      await recalcularConciliacion(contratoEmpresaId, fechaSeleccionada);
      setMensajeExito(`¡Raciones del día ${fechaSeleccionada} actualizadas con éxito!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar raciones.");
    } finally {
      setActualizandoDia(false);
    }
  }

  // Procesar todo el mes en curso
  async function handleConciliarMes() {
    setError(null);
    setMensajeExito(null);
    setProcesandoPeriodo(true);
    try {
      const mesInicio = `${fechaSeleccionada.slice(0, 7)}-01`;
      let desde = mesInicio;
      let hasta = hoy;
      if (contrato) {
        if (desde < contrato.vigencia_desde) desde = contrato.vigencia_desde;
        if (contrato.vigencia_hasta && hasta > contrato.vigencia_hasta) hasta = contrato.vigencia_hasta;
      }
      if (desde > hasta) {
        throw new Error("Este contrato no tiene días activos dentro de este mes.");
      }
      const cantidad = await conciliarPeriodo(contratoEmpresaId, desde, hasta);
      setMensajeExito(`¡Listo! Se actualizaron ${cantidad} días del período (${desde} al ${hasta}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar el mes.");
    } finally {
      setProcesandoPeriodo(false);
    }
  }

  // Guardar justificación de descuadre
  async function handleGuardarJustificacion(e: React.FormEvent) {
    e.preventDefault();
    if (!diaJustificando || !supervisorNombre.trim()) return;
    setError(null);
    try {
      await justificarDescuadre(usuarioId, {
        conciliacionDiariaId: diaJustificando.id,
        motivo,
        supervisorNombre: supervisorNombre.trim()
      });
      setDiaJustificando(null);
      setSupervisorNombre("");
      setMensajeExito("Diferencia justificada guardada exitosamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar justificación.");
    }
  }

  const esHoy = fechaSeleccionada === hoy;

  return (
    <div className="ui-operativa mx-auto flex w-full max-w-5xl flex-col gap-4">
      {/* 1. Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border-brand-border/80 bg-brand-card p-5 sm:p-6 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-sand-deep text-brand-terracotta border border-brand-border/70">
            <IconClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-black text-brand-ink leading-tight">
              Revisión de Raciones
            </h2>
            <p className="text-xs sm:text-sm text-brand-muted">
              Compara lo que la empresa contrató con lo registrado hoy. Las diferencias se justifican y no alteran la tarifa.
            </p>
          </div>
        </div>

        {onAbrirCierre && (
          <button
            type="button"
            onClick={onAbrirCierre}
            className="self-start sm:self-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand-terracotta-deep hover:brightness-110 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-brand transition active:scale-95 shrink-0"
          >
            <span>Cierre Mensual y Facturación →</span>
          </button>
        )}
      </div>

      {/* 2. Selector de Fecha Limpio y Compacto */}
      <div className="rounded-3xl border border-brand-border/80 bg-brand-card p-4 sm:p-5 shadow-card space-y-3.5">
        <div className="flex items-center justify-between gap-2 bg-brand-sand/35 p-2 rounded-2xl border border-brand-border/60">
          <button
            type="button"
            disabled={!puedeRetroceder || actualizandoDia}
            onClick={() => setFechaSeleccionada(sumarDiasYMD(fechaSeleccionada, -1))}
            className="flex items-center gap-1 rounded-xl bg-white hover:bg-brand-sand px-3 py-2 text-xs sm:text-sm font-bold text-brand-ink transition border border-brand-border/70 shadow-2xs active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            <IconChevronLeft aria-label="Día anterior" className="h-4 w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          <div className="text-center min-w-0 px-2">
            <div className="flex items-center justify-center gap-2">
              <span className="font-display text-sm sm:text-base md:text-lg font-black text-brand-ink">
                {formatearFechaLegible(fechaSeleccionada)}
              </span>
              {esHoy && (
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 border border-emerald-300 shrink-0">
                  HOY
                </span>
              )}
            </div>
            <p className="text-[11px] text-brand-muted mt-0.5">
              Fecha: {fechaSeleccionada}
              {contrato && ` · Vigencia: ${contrato.vigencia_desde} al ${contrato.vigencia_hasta ?? "vigente"} (${contrato.headcount} cupos)`}
            </p>
          </div>

          <button
            type="button"
            disabled={!puedeAvanzar || actualizandoDia}
            onClick={() => setFechaSeleccionada(sumarDiasYMD(fechaSeleccionada, 1))}
            className="flex items-center gap-1 rounded-xl bg-white hover:bg-brand-sand px-3 py-2 text-xs sm:text-sm font-bold text-brand-ink transition border border-brand-border/70 shadow-2xs active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <IconChevronRight aria-label="Día siguiente" className="h-4 w-4" />
          </button>
        </div>

        {/* Advertencia si la fecha está fuera de la vigencia del contrato */}
        {estaFueraDeVigencia && contrato && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-3 text-xs font-semibold text-amber-900 flex items-start gap-2">
            <span className="text-sm shrink-0">⚠️</span>
            <div>
              <p className="font-bold">Fecha fuera de la vigencia de este contrato</p>
              <p className="text-amber-800 mt-0.5">
                Este contrato abarca del {contrato.vigencia_desde} al {contrato.vigencia_hasta ?? "la actualidad"}.
              </p>
            </div>
          </div>
        )}

        {/* Barra de Acciones de Actualización */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleActualizarDia}
            disabled={actualizandoDia || estaFueraDeVigencia}
            className="min-h-[42px] flex items-center justify-center gap-2 rounded-xl bg-brand-ink hover:bg-brand-terracotta-deep px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-2xs transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <IconRefresh className={`h-4 w-4 ${actualizandoDia ? "motion-safe:animate-spin text-brand-sand" : ""}`} />
            <span>{actualizandoDia ? "Calculando raciones…" : "Actualizar raciones de este día"}</span>
          </button>

          <div className="flex items-center gap-2 text-xs sm:text-sm">
            {!esHoy && !estaFueraDeVigencia && (
              <button
                type="button"
                onClick={() => setFechaSeleccionada(hoy)}
                className="rounded-xl border border-brand-border bg-white px-3 py-2 font-bold text-brand-ink hover:bg-brand-sand/40 transition shadow-2xs"
              >
                Ir a Hoy
              </button>
            )}

            <button
              type="button"
              onClick={handleConciliarMes}
              disabled={procesandoPeriodo}
              className="rounded-xl border border-brand-border/80 bg-brand-sand-deep hover:bg-brand-sand px-3 py-2 font-bold text-brand-terracotta-deep transition disabled:opacity-50 shadow-2xs"
            >
              <IconCalendar className="h-3.5 w-3.5 inline mr-1" />
              <span>{procesandoPeriodo ? "Procesando período…" : "Actualizar mes completo"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Avisos de Éxito / Error */}
      {mensajeExito && (
        <div role="status" aria-live="polite" className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs sm:text-sm font-semibold text-emerald-900 shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2.5 min-w-0">
            <IconCheckCircle className="h-5 w-5 text-emerald-700 shrink-0" />
            <span className="truncate">{mensajeExito}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeExito(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 font-bold shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-3.5 text-xs sm:text-sm font-semibold text-red-700">
          ⚠️ {describirErrorUi(error)}
        </div>
      )}

      {/* 3. Las 4 Tarjetas de Servicios del Día */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-display text-base sm:text-lg font-bold text-brand-ink">
            Servicios del Día ({formatearFechaLegible(fechaSeleccionada)})
          </h3>
          <span className="text-xs text-brand-muted">
            4 servicios contratados
          </span>
        </div>

        {serviciosDia.some((s) => s.fila) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {serviciosDia.map((s) => {
              const fila = s.fila;
              const diferencia = fila ? fila.cantidad_esperada - fila.cantidad_servida : 0;
              const esConciliado = fila?.estado === "conciliado";
              const esJustificado = fila?.estado === "con_diferencia_justificada";
              const esPendiente = !esConciliado && !esJustificado && fila;

              return (
                <div
                  key={s.tipo}
                  className={`flex flex-col justify-between rounded-2xl border p-4 sm:p-5 shadow-card transition-all ${
                    esConciliado
                      ? "border-emerald-200/80 bg-white"
                      : esJustificado
                      ? "border-blue-200/80 bg-blue-50/30"
                      : "border-amber-300 bg-amber-50/40"
                  }`}
                >
                  <div>
                    {/* Encabezado del Servicio */}
                    <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-brand-border/40">
                      <div className="flex items-center gap-2">
                        <span className="text-xl sm:text-2xl">{s.meta.icon}</span>
                        <div>
                          <h4 className="font-display text-sm sm:text-base font-extrabold text-brand-ink leading-tight">
                            {s.meta.label}
                          </h4>
                          <p className="text-[11px] text-brand-muted">{s.meta.desc}</p>
                        </div>
                      </div>

                      {/* Insignia de Estado */}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold shrink-0 ${
                          esConciliado
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300/80"
                            : esJustificado
                            ? "bg-blue-100 text-blue-900 border border-blue-300/80"
                            : "bg-amber-100 text-amber-900 border border-amber-300/80"
                        }`}
                      >
                        {!fila ? "Sin revisar" : esConciliado
                          ? "✓ Al día"
                          : esJustificado
                          ? "✓ Justificado"
                          : "⚠️ Falta Justificar"}
                      </span>
                    </div>

                    {/* Conteo de Servidas vs Contratadas */}
                    {fila ? (
                      <>
                        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-brand-sand/30 p-2.5 border border-brand-border/50 text-center">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                              Servidas
                            </span>
                            <span className="font-display text-2xl font-black text-brand-ink">
                              {s.servida}
                            </span>
                            <span className="text-[10px] text-brand-muted block">Reales</span>
                          </div>

                          <div className="border-l border-brand-border/60">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                              Contratadas
                            </span>
                            <span className="font-display text-2xl font-black text-brand-terracotta-deep">
                              {s.esperada}
                            </span>
                            <span className="text-[10px] text-brand-muted block">Contrato</span>
                          </div>
                        </div>

                        <p className="mt-2 text-xs text-brand-ink/80 leading-relaxed">
                          La empresa contrató <strong>{s.esperada}</strong> de este servicio. Se registraron <strong>{s.servida}</strong>.
                        </p>
                      </>
                    ) : (
                      <p className="mt-3 text-xs text-brand-muted">
                        Este servicio todavía no tiene un resumen para la fecha. Presiona «Actualizar raciones de este día».
                      </p>
                    )}

                    {/* Detalle si hay diferencia justificada */}
                    {esJustificado && (
                      <div className="mt-2.5 rounded-xl bg-blue-100/70 border border-blue-200 p-2 text-xs text-blue-950">
                        <p className="font-bold">Autorizado por: {s.supervisor || "Supervisor de faena"}</p>
                        <p className="text-blue-800 mt-0.5">
                          Motivo: {ETIQUETAS_MOTIVO[s.motivo as MotivoDescuadre] || s.motivo || "Diferencia autorizada"}
                        </p>
                      </div>
                    )}

                    {/* Detalle si hay diferencia pendiente */}
                    {esPendiente && diferencia !== 0 && (
                      <p className="mt-2 text-xs font-bold text-amber-900">
                        Diferencia de {Math.abs(diferencia)} {Math.abs(diferencia) === 1 ? "ración" : "raciones"} por justificar.
                      </p>
                    )}
                  </div>

                  {/* Botón de Acción para Justificar */}
                  <div className="mt-3 pt-2.5 border-t border-brand-border/40 flex justify-end">
                    {esPendiente && fila && (
                      <button
                        type="button"
                        onClick={() => {
                          setDiaJustificando(fila);
                          setError(null);
                        }}
                        className="w-full min-h-[40px] flex items-center justify-center gap-1.5 rounded-xl bg-brand-terracotta-deep hover:brightness-110 px-4 py-2 text-xs font-bold text-white shadow-2xs active:scale-95 transition"
                      >
                        <span>✍️ Justificar Diferencia ({Math.abs(diferencia)})</span>
                      </button>
                    )}

                    {esJustificado && fila && (
                      <button
                        type="button"
                        onClick={() => {
                          setDiaJustificando(fila);
                          if (fila.motivo) setMotivo(fila.motivo as MotivoDescuadre);
                          if (fila.supervisor_nombre) setSupervisorNombre(fila.supervisor_nombre);
                          setError(null);
                        }}
                        className="rounded-xl border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold text-brand-ink/90 hover:bg-brand-sand transition shadow-2xs"
                      >
                        Modificar justificación
                      </button>
                    )}

                    {esConciliado && (
                      <span className="text-xs text-emerald-800 font-bold py-1">
                        ✓ Raciones coinciden con el contrato
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-brand-border bg-brand-card p-8 sm:p-10 text-center space-y-3 shadow-card">
            <span className="text-3xl sm:text-4xl">📋</span>
            <h4 className="font-display text-base sm:text-lg font-bold text-brand-ink">
              Este día aún no tiene raciones calculadas
            </h4>
            <p className="text-xs sm:text-sm text-brand-muted max-w-md mx-auto">
              Presiona el botón de abajo para contrastar los consumos registrados contra el contrato.
            </p>
            <button
              type="button"
              onClick={handleActualizarDia}
              disabled={actualizandoDia || estaFueraDeVigencia}
              className="rounded-xl bg-brand-terracotta-deep px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-brand hover:brightness-110 transition disabled:opacity-50 disabled:pointer-events-none"
            >
              {actualizandoDia ? "Calculando…" : "Calcular raciones de esta fecha"}
            </button>
          </div>
        )}
      </div>

      {/* 4. Selector de Otros Días del Período */}
      {todasLasFechas.length > 1 && (
        <div className="rounded-3xl border border-brand-border/80 bg-brand-card p-4 sm:p-5 shadow-card space-y-2.5">
          <h3 className="font-display text-sm sm:text-base font-bold text-brand-ink">
            Otros Días del Período
          </h3>
          <p className="text-xs text-brand-muted">
            Toca cualquier fecha para revisar sus 4 servicios:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1 max-h-48 overflow-y-auto pr-1">
            {todasLasFechas.map((f) => {
              const rows = conciliacionesPorFecha.get(f) || [];
              const tienePendiente = rows.some((r) => r.estado === "pendiente" && r.cantidad_esperada !== r.cantidad_servida);
              const seleccionada = f === fechaSeleccionada;

              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFechaSeleccionada(f)}
                  className={`flex items-center justify-between rounded-xl border p-2 text-xs font-bold transition text-left ${
                    seleccionada
                      ? "border-brand-terracotta bg-orange-50/60 ring-2 ring-brand-terracotta/20 text-brand-terracotta-deep"
                      : "border-brand-border bg-white hover:bg-brand-sand-deep text-brand-ink"
                  }`}
                >
                  <span className="truncate">{f}</span>
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      tienePendiente ? "bg-amber-500" : "bg-emerald-600"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Nota de Regla de Negocio */}
      <div className="rounded-2xl border border-emerald-600/30 bg-emerald-50/80 p-3.5 text-xs text-emerald-950 flex items-start gap-2">
        <span className="text-sm shrink-0">💡</span>
        <p>
          <strong>Regla de negocio:</strong> Si un trabajador no come o no usa su cama por faena, la diferencia se justifica formalmente con el nombre del supervisor, pero el valor pactado en el contrato se mantiene completo.
        </p>
      </div>

      {/* 5. Modal para Justificar Diferencia */}
      {diaJustificando && (
        <Dialogo titulo="Justificar diferencia" onCerrar={() => setDiaJustificando(null)} className="ui-operativa fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/50 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-brand-border bg-brand-card p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-brand-border/60">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-terracotta-deep">
                  Justificar diferencia del día
                </span>
                <h3 className="font-display text-base sm:text-lg font-black text-brand-ink">
                  {METADATA_SERVICIOS[diaJustificando.tipo]?.label || diaJustificando.tipo} · {diaJustificando.fecha}
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">
                  Diferencia de {Math.abs(diaJustificando.cantidad_esperada - diaJustificando.cantidad_servida)} ración(es).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDiaJustificando(null)}
                aria-label="Cerrar diálogo"
                className="rounded-lg p-1.5 text-brand-muted hover:bg-brand-sand transition"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarJustificacion} className="space-y-4">
              <div>
                <label htmlFor="motivo-descuadre" className="mb-1 block text-xs font-bold uppercase tracking-wider text-brand-muted">
                  Motivo
                </label>
                <select
                  id="motivo-descuadre"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value as MotivoDescuadre)}
                  className="w-full rounded-xl border border-brand-border bg-white p-3 text-sm font-semibold text-brand-ink focus:border-brand-terracotta focus:outline-none"
                >
                  {MOTIVOS_DESCUADRE.map((m) => (
                    <option key={m} value={m}>
                      {ETIQUETAS_MOTIVO[m]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="supervisor-nombre" className="mb-1 block text-xs font-bold uppercase tracking-wider text-brand-muted">
                  Nombre del supervisor que autorizó
                </label>
                <input
                  id="supervisor-nombre"
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={supervisorNombre}
                  onChange={(e) => setSupervisorNombre(e.target.value)}
                  className="w-full rounded-xl border border-brand-border bg-white p-3 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-terracotta focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDiaJustificando(null)}
                  className="flex-1 rounded-xl border border-brand-border bg-white py-2.5 text-xs font-bold text-brand-muted hover:text-brand-ink"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!supervisorNombre.trim()}
                  className="flex-1 rounded-xl bg-brand-terracotta-deep py-2.5 text-xs font-bold text-white shadow-brand hover:brightness-110 disabled:opacity-50"
                >
                  Guardar justificación
                </button>
              </div>
            </form>
          </div>
        </Dialogo>
      )}
    </div>
  );
}
