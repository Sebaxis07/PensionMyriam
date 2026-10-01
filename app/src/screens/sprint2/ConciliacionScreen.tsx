import { useMemo, useState } from "react";
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

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function cambiarDia(fechaIso: string, delta: number): string {
  try {
    const [y, m, d] = fechaIso.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + delta);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, "0");
    const nd = String(date.getDate()).padStart(2, "0");
    return `${ny}-${nm}-${nd}`;
  } catch {
    return fechaIso;
  }
}

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
  const hoy = hoyISO();
  const diasRaw = useConciliacion(contratoEmpresaId);

  // Fecha actualmente seleccionada para revisar (por defecto HOY)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoy);

  // Estados de justificación
  const [diaJustificando, setDiaJustificando] = useState<ConciliacionRow | null>(null);
  const [motivo, setMotivo] = useState<MotivoDescuadre>("ausencia_justificada");
  const [supervisorNombre, setSupervisorNombre] = useState("");

  // Estados de carga
  const [actualizandoDia, setActualizandoDia] = useState(false);
  const [procesandoPeriodo, setProcesandoPeriodo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

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

  // Lista de todas las fechas registradas (ordenadas descendente)
  const todasLasFechas = useMemo(() => {
    return Array.from(conciliacionesPorFecha.keys()).sort((a, b) => (a < b ? 1 : -1));
  }, [conciliacionesPorFecha]);

  // Registros de la fecha seleccionada
  const registrosDelDia = useMemo(() => {
    return conciliacionesPorFecha.get(fechaSeleccionada) || [];
  }, [conciliacionesPorFecha, fechaSeleccionada]);

  // Servicios normalizados para el día seleccionado
  const serviciosDia = useMemo(() => {
    const tipos = ["cama_noche", "desayuno", "almuerzo", "cena"];
    return tipos.map((t) => {
      const fila = registrosDelDia.find((r) => r.tipo === t);
      const meta = METADATA_SERVICIOS[t] || { label: t, icon: "📋", desc: "" };
      return {
        tipo: t,
        meta,
        fila,
        esperada: fila?.cantidad_esperada ?? 0,
        servida: fila?.cantidad_servida ?? 0,
        estado: fila?.estado ?? "pendiente",
        motivo: fila?.motivo,
        supervisor: fila?.supervisor_nombre
      };
    });
  }, [registrosDelDia]);

  // Actualizar el día en pantalla
  async function handleActualizarDia() {
    setError(null);
    setMensajeExito(null);
    setActualizandoDia(true);
    try {
      await generarCamaNoche(fechaSeleccionada);
      await recalcularConciliacion(contratoEmpresaId, fechaSeleccionada);
      setMensajeExito(`Raciones de ${formatearFechaLegible(fechaSeleccionada)} actualizadas.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el día.");
    } finally {
      setActualizandoDia(false);
    }
  }

  // Procesar todo el mes en curso
  async function handleConciliarMes() {
    setError(null);
    setMensajeExito(null);
    setProcesandoPeriodo(true);
    const primerDia = `${hoy.slice(0, 7)}-01`;
    try {
      const cantidad = await conciliarPeriodo(contratoEmpresaId, primerDia, hoy);
      setMensajeExito(`¡Listo! Se actualizaron ${cantidad} días del mes.`);
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      {/* 1. Cabecera Principal Limpia */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-sand-light text-brand-terracotta border border-brand-border">
            <IconClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-black text-brand-ink leading-tight">
              Revisión de Raciones
            </h2>
            <p className="text-xs text-brand-muted">
              Compara lo consumido en el día contra los cupos contratados.
            </p>
          </div>
        </div>

        {onAbrirCierre && (
          <button
            type="button"
            onClick={onAbrirCierre}
            className="self-start sm:self-auto inline-flex items-center gap-2 rounded-2xl bg-brand-terracotta hover:bg-brand-terracotta-deep px-5 py-3 text-xs font-bold text-white shadow-brand transition active:scale-95 shrink-0"
          >
            <span>Cierre Mensual y Facturación →</span>
          </button>
        )}
      </div>

      {/* 2. Selector de Fecha Grande y Amigable */}
      <div className="rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card space-y-4">
        {/* Navegador de Fecha */}
        <div className="flex items-center justify-between gap-2 bg-brand-sand-light/60 p-2.5 rounded-2xl border border-brand-border/60">
          <button
            type="button"
            onClick={() => setFechaSeleccionada(cambiarDia(fechaSeleccionada, -1))}
            className="flex items-center gap-1 rounded-xl bg-white hover:bg-brand-sand px-3.5 py-2.5 text-xs font-bold text-brand-ink transition border border-brand-border/60 shadow-xs active:scale-95"
          >
            <IconChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Día anterior</span>
          </button>

          <div className="text-center min-w-0 px-2">
            <div className="flex items-center justify-center gap-2">
              <span className="font-display text-base md:text-lg font-black text-brand-ink truncate">
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
            </p>
          </div>

          <button
            type="button"
            disabled={esHoy}
            onClick={() => setFechaSeleccionada(cambiarDia(fechaSeleccionada, 1))}
            className="flex items-center gap-1 rounded-xl bg-white hover:bg-brand-sand px-3.5 py-2.5 text-xs font-bold text-brand-ink transition border border-brand-border/60 shadow-xs active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            <span className="hidden sm:inline">Día siguiente</span>
            <IconChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Acciones principales de actualización */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={handleActualizarDia}
            disabled={actualizandoDia}
            className="min-h-[46px] flex items-center justify-center gap-2 rounded-2xl bg-brand-ink hover:bg-black px-5 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <IconRefresh className={`h-4 w-4 ${actualizandoDia ? "animate-spin text-brand-sand" : ""}`} />
            <span>{actualizandoDia ? "Calculando raciones…" : "Actualizar raciones de este día"}</span>
          </button>

          <div className="flex items-center gap-2 text-xs">
            {!esHoy && (
              <button
                type="button"
                onClick={() => setFechaSeleccionada(hoy)}
                className="rounded-xl border border-brand-border bg-white px-3 py-2 font-bold text-brand-ink hover:bg-brand-sand/40"
              >
                Ir a Hoy
              </button>
            )}

            <button
              type="button"
              onClick={handleConciliarMes}
              disabled={procesandoPeriodo}
              className="rounded-xl border border-brand-border bg-brand-sand-light hover:bg-brand-sand px-3 py-2 font-bold text-brand-terracotta transition disabled:opacity-50"
            >
              <IconCalendar className="h-3.5 w-3.5 inline mr-1" />
              <span>{procesandoPeriodo ? "Procesando mes…" : "Actualizar mes completo"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Avisos de Éxito / Error */}
      {mensajeExito && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <IconCheckCircle className="h-5 w-5 text-emerald-700 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeExito(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-xs font-semibold text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* 3. Las 4 Tarjetas de Servicios del Día (Grandes y Visuales) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-display text-lg font-bold text-brand-ink">
            Servicios del Día ({formatearFechaLegible(fechaSeleccionada)})
          </h3>
          <span className="text-xs text-brand-muted">
            4 servicios evaluados
          </span>
        </div>

        {serviciosDia.some((s) => s.fila) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {serviciosDia.map((s) => {
              const fila = s.fila;
              const diferencia = fila ? fila.cantidad_esperada - fila.cantidad_servida : 0;
              const esConciliado = fila?.estado === "conciliado";
              const esJustificado = fila?.estado === "con_diferencia_justificada";
              const esPendiente = !esConciliado && !esJustificado && fila;

              return (
                <div
                  key={s.tipo}
                  className={`flex flex-col justify-between rounded-3xl border p-5 shadow-card transition-all ${
                    esConciliado
                      ? "border-emerald-200 bg-white"
                      : esJustificado
                      ? "border-blue-200 bg-blue-50/40"
                      : "border-amber-300 bg-amber-50/50"
                  }`}
                >
                  <div>
                    {/* Encabezado del Servicio */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{s.meta.icon}</span>
                        <div>
                          <h4 className="font-display text-base font-extrabold text-brand-ink leading-tight">
                            {s.meta.label}
                          </h4>
                          <p className="text-[11px] text-brand-muted">{s.meta.desc}</p>
                        </div>
                      </div>

                      {/* Insignia de Estado Grande */}
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-black shrink-0 ${
                          esConciliado
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : esJustificado
                            ? "bg-blue-100 text-blue-900 border border-blue-300"
                            : "bg-amber-100 text-amber-900 border border-amber-300"
                        }`}
                      >
                        {esConciliado
                          ? "✓ Al día"
                          : esJustificado
                          ? "✓ Justificado"
                          : "⚠️ Falta Justificar"}
                      </span>
                    </div>

                    {/* Conteo Grande y Claro */}
                    <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-white/80 p-3 border border-brand-border/50 text-center">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                          Servidas
                        </span>
                        <span className="font-display text-2xl font-black text-brand-ink">
                          {s.servida}
                        </span>
                        <span className="text-[10px] text-brand-muted block">consumos reales</span>
                      </div>

                      <div className="border-l border-brand-border/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                          Esperadas
                        </span>
                        <span className="font-display text-2xl font-black text-brand-terracotta">
                          {s.esperada}
                        </span>
                        <span className="text-[10px] text-brand-muted block">según contrato</span>
                      </div>
                    </div>

                    {/* Detalle si hay diferencia justificada */}
                    {esJustificado && (
                      <div className="mt-3 rounded-xl bg-blue-100/70 border border-blue-300/80 p-2.5 text-xs text-blue-950">
                        <p className="font-bold">Autorizado por: {s.supervisor || "Supervisor de faena"}</p>
                        <p className="text-[11px] text-blue-800 mt-0.5">
                          Motivo: {ETIQUETAS_MOTIVO[s.motivo as MotivoDescuadre] || s.motivo || "Diferencia autorizada"}
                        </p>
                      </div>
                    )}

                    {/* Detalle si hay diferencia pendiente */}
                    {esPendiente && diferencia !== 0 && (
                      <p className="mt-2.5 text-xs font-bold text-amber-900">
                        Hay una diferencia de {Math.abs(diferencia)} {Math.abs(diferencia) === 1 ? "ración" : "raciones"} por justificar.
                      </p>
                    )}
                  </div>

                  {/* Botón de Acción para Justificar */}
                  <div className="mt-4 pt-3 border-t border-brand-border/50 flex justify-end">
                    {esPendiente && fila && (
                      <button
                        type="button"
                        onClick={() => {
                          setDiaJustificando(fila);
                          setError(null);
                        }}
                        className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-2xl bg-brand-terracotta hover:bg-brand-terracotta-deep px-4 py-2.5 text-xs font-bold text-white shadow-sm active:scale-95 transition"
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
                        className="rounded-xl border border-brand-border bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-muted hover:text-brand-ink"
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
          <div className="rounded-3xl border border-dashed border-brand-border bg-brand-card p-10 text-center space-y-3 shadow-card">
            <span className="text-4xl">📋</span>
            <h4 className="font-display text-lg font-bold text-brand-ink">
              Este día aún no tiene raciones calculadas
            </h4>
            <p className="text-xs text-brand-muted max-w-md mx-auto">
              Presiona el botón de abajo para revisar los consumos registrados y contrastarlos contra el contrato.
            </p>
            <button
              type="button"
              onClick={handleActualizarDia}
              disabled={actualizandoDia}
              className="rounded-2xl bg-brand-terracotta px-5 py-3 text-xs font-bold text-white shadow-brand hover:bg-brand-terracotta-deep transition"
            >
              {actualizandoDia ? "Calculando…" : "Calcular raciones de esta fecha"}
            </button>
          </div>
        )}
      </div>

      {/* 4. Selector de Otros Días del Período */}
      {todasLasFechas.length > 1 && (
        <div className="rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card space-y-3">
          <h3 className="font-display text-base font-bold text-brand-ink">
            Otros Días del Período
          </h3>
          <p className="text-xs text-brand-muted">
            Toca cualquier fecha para revisar sus 4 servicios:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
            {todasLasFechas.map((f) => {
              const rows = conciliacionesPorFecha.get(f) || [];
              const tienePendiente = rows.some((r) => r.estado === "pendiente" && r.cantidad_esperada !== r.cantidad_servida);
              const seleccionada = f === fechaSeleccionada;

              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFechaSeleccionada(f)}
                  className={`flex items-center justify-between rounded-xl border p-2.5 text-xs font-bold transition text-left ${
                    seleccionada
                      ? "border-brand-terracotta bg-orange-50/60 ring-2 ring-brand-terracotta/20 text-brand-terracotta"
                      : "border-brand-border bg-white hover:bg-brand-sand-light text-brand-ink"
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

      {/* Nota de Regla de Negocio Amigable */}
      <div className="rounded-2xl border border-emerald-600/30 bg-emerald-50/70 p-4 text-xs text-emerald-950">
        💡 <strong>Recuerda:</strong> Si un trabajador no come o no usa su cama por faena, la diferencia se justifica formalmente con el nombre del supervisor, pero el valor pactado en el contrato se mantiene completo.
      </div>

      {/* 5. Modal para Justificar Diferencia */}
      {diaJustificando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-brand-border bg-brand-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-brand-border/60">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-terracotta">
                  Justificar Raciones No Consumidas
                </span>
                <h3 className="font-display text-lg font-black text-brand-ink">
                  {METADATA_SERVICIOS[diaJustificando.tipo]?.label || diaJustificando.tipo} · {diaJustificando.fecha}
                </h3>
                <p className="text-xs text-brand-muted">
                  Diferencia de {Math.abs(diaJustificando.cantidad_esperada - diaJustificando.cantidad_servida)} ración(es).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDiaJustificando(null)}
                className="rounded-full p-1.5 text-brand-muted hover:bg-brand-sand"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarJustificacion} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-muted mb-1.5">
                  Motivo de la Diferencia
                </label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value as MotivoDescuadre)}
                  className="w-full rounded-2xl border border-brand-border bg-white px-3.5 py-3 text-sm font-semibold text-brand-ink focus:border-brand-terracotta focus:outline-none"
                >
                  {MOTIVOS_DESCUADRE.map((m) => (
                    <option key={m} value={m}>
                      {ETIQUETAS_MOTIVO[m]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-muted mb-1.5">
                  Nombre del Supervisor que Autorizó <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: Don Carlos Valenzuela"
                  value={supervisorNombre}
                  onChange={(e) => setSupervisorNombre(e.target.value)}
                  className="w-full rounded-2xl border border-brand-border bg-white px-3.5 py-3 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-terracotta focus:outline-none"
                />
                <span className="mt-1 block text-[10px] text-brand-muted">
                  Este nombre aparecerá en la pre-factura oficial y en la planilla Excel.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-border/50">
                <button
                  type="button"
                  onClick={() => setDiaJustificando(null)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-brand-muted hover:text-brand-ink"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!supervisorNombre.trim()}
                  className="min-h-[44px] rounded-2xl bg-brand-terracotta px-5 py-2.5 text-xs font-bold text-white shadow-brand hover:bg-brand-terracotta-deep transition active:scale-95 disabled:opacity-50"
                >
                  Guardar Justificación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
