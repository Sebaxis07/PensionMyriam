import { useState } from "react";
import { useConciliacion, recalcularConciliacion, type ConciliacionRow } from "../../features/conciliacion/useConciliacion";
import {
  justificarDescuadre,
  MOTIVOS_DESCUADRE,
  type MotivoDescuadre
} from "../../features/conciliacion/justificarDescuadre";
import {
  IconClipboardCheck,
  IconRefresh
} from "../../components/Icons";

const ETIQUETAS_MOTIVO: Record<MotivoDescuadre, string> = {
  turno_extra: "Turno Extra",
  almuerzo_mina: "Almuerzo en Mina",
  corte_ruta: "Corte de Ruta",
  ausencia_justificada: "Ausencia Justificada",
  otro: "Otro motivo"
};

const ETIQUETAS_TIPO: Record<string, string> = {
  cama_noche: "Noche de cama",
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  cena: "Cena"
};

export function ConciliacionScreen({
  usuarioId,
  contratoEmpresaId,
  onAbrirCierre
}: {
  usuarioId: string;
  contratoEmpresaId: string;
  onAbrirCierre?: () => void;
}) {
  const dias = useConciliacion(contratoEmpresaId);
  const [diaJustificando, setDiaJustificando] = useState<ConciliacionRow | null>(null);
  const [motivo, setMotivo] = useState<MotivoDescuadre>("ausencia_justificada");
  const [supervisorNombre, setSupervisorNombre] = useState("");
  const [recalculandoFecha, setRecalculandoFecha] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  async function handleRecalcular(fecha: string) {
    setError(null);
    setMensajeExito(null);
    setRecalculandoFecha(fecha);
    try {
      await recalcularConciliacion(contratoEmpresaId, fecha);
      setMensajeExito(`Conciliación del ${fecha} recalculada.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al recalcular.");
    } finally {
      setRecalculandoFecha(null);
    }
  }

  async function handleGuardarJustificacion() {
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
      setMensajeExito("Diferencia justificada registrada en el celular.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al justificar descuadre.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      {/* Cabecera y Regla de Facturación de Negocio */}
      <div className="rounded-3xl border border-brand-border/70 bg-brand-card p-5 md:p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <IconClipboardCheck className="h-6 w-6 text-brand-terracotta" />
            <h2 className="font-display text-2xl font-bold text-brand-ink">
              Conciliación Diaria
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRecalcular(new Date().toISOString().slice(0, 10))}
              disabled={recalculandoFecha === new Date().toISOString().slice(0, 10)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border bg-white px-3.5 py-2 text-xs font-bold text-brand-ink shadow-sm hover:bg-brand-sand/40"
            >
              <IconRefresh className="h-3.5 w-3.5" />
              <span>Conciliar Hoy</span>
            </button>

            {onAbrirCierre && (
              <button
                onClick={onAbrirCierre}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-terracotta px-3.5 py-2 text-xs font-bold text-white shadow-brand hover:bg-brand-terracotta-deep"
              >
                <span>Cierre Mensual →</span>
              </button>
            )}
          </div>
        </div>

        <p className="mt-2 text-xs text-brand-muted">
          Comparativa entre raciones esperadas según nómina y consumos reales servidos por cada servicio.
        </p>

        <div className="mt-3.5 rounded-2xl border border-emerald-600/30 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 font-medium">
          📋 <strong>Regla de negocio:</strong> La facturación se emite por el contrato completo convenido. Las diferencias se justifican formalmente pero no cambian el cobro pactado.
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
          ⚠️ {error}
        </div>
      )}

      {mensajeExito && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800">
          ✓ {mensajeExito}
        </div>
      )}

      {/* Lista de Registros Diarios */}
      <div className="flex flex-col gap-3">
        {dias.map((d) => {
          const diferencia = d.cantidad_esperada - d.cantidad_servida;
          const esConciliado = d.estado === "conciliado";
          const esJustificado = d.estado === "con_diferencia_justificada";
          const esPendiente = d.estado === "pendiente";

          return (
            <div
              key={d.id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-brand-border/80 bg-brand-card p-4 shadow-card"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-base font-bold text-brand-ink">
                    {d.fecha}
                  </span>
                  <span className="rounded-md bg-brand-sand/60 px-2 py-0.5 text-[11px] font-bold text-brand-ink">
                    {ETIQUETAS_TIPO[d.tipo] || d.tipo}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      esConciliado
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : esJustificado
                        ? "bg-blue-100 text-blue-800 border border-blue-300"
                        : "bg-amber-100 text-amber-900 border border-amber-300"
                    }`}
                  >
                    {esConciliado
                      ? "Conciliado"
                      : esJustificado
                      ? "Diferencia Justificada"
                      : "Pendiente"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-muted">
                  <span>
                    Contratados: <strong className="text-brand-ink">{d.headcount_esperado}</strong>
                  </span>
                  <span>
                    Esperadas: <strong className="text-brand-ink">{d.cantidad_esperada}</strong>
                  </span>
                  <span>
                    Servidas: <strong className="text-brand-ink">{d.cantidad_servida}</strong>
                  </span>
                  {diferencia !== 0 && (
                    <span className="font-bold text-amber-800">
                      (Diferencia: {diferencia > 0 ? `-${diferencia}` : `+${Math.abs(diferencia)}`})
                    </span>
                  )}
                </div>

                {esJustificado && (
                  <div className="rounded-lg bg-blue-50/80 border border-blue-200/80 px-2.5 py-1 text-[11px] text-blue-900 inline-flex flex-wrap items-center gap-1.5">
                    <span className="font-bold">✓ Justificado:</span>
                    <span>{ETIQUETAS_MOTIVO[d.motivo as MotivoDescuadre] || d.motivo || "Autorizado"}</span>
                    {d.supervisor_nombre && (
                      <span className="text-blue-700 font-medium">· Sup: {d.supervisor_nombre}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Botones de acción para el día */}
              <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-brand-border/40">
                {esPendiente && diferencia !== 0 && (
                  <button
                    onClick={() => {
                      setDiaJustificando(d);
                      setError(null);
                    }}
                    className="rounded-xl bg-brand-terracotta px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-terracotta-deep active:scale-95"
                  >
                    Justificar diferencia
                  </button>
                )}

                {esJustificado && (
                  <button
                    onClick={() => {
                      setDiaJustificando(d);
                      if (d.motivo) setMotivo(d.motivo as MotivoDescuadre);
                      if (d.supervisor_nombre) setSupervisorNombre(d.supervisor_nombre);
                      setError(null);
                    }}
                    className="rounded-xl border border-brand-border bg-white px-3 py-2 text-xs font-semibold text-brand-muted hover:text-brand-ink active:scale-95"
                  >
                    Modificar
                  </button>
                )}

                <button
                  onClick={() => handleRecalcular(d.fecha)}
                  disabled={recalculandoFecha === d.fecha}
                  title="Recalcula las raciones contra la base de datos (requiere conexión)"
                  className="inline-flex items-center gap-1 rounded-xl border border-brand-border bg-white px-3 py-2 text-xs font-semibold text-brand-ink hover:bg-brand-sand/30 disabled:opacity-50"
                >
                  <IconRefresh
                    className={`h-3.5 w-3.5 ${
                      recalculandoFecha === d.fecha ? "animate-spin text-brand-terracotta" : ""
                    }`}
                  />
                  <span>Recalcular</span>
                </button>
              </div>
            </div>
          );
        })}

        {!dias.length && (
          <div className="rounded-2xl border border-brand-border/70 bg-brand-card p-8 text-center text-xs text-brand-muted">
            No hay registros de conciliación generados para este contrato aún.
          </div>
        )}
      </div>

      {/* Modal para Justificar Diferencia (HU-17) */}
      {diaJustificando && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-brand-ink/45 p-4 backdrop-blur-sm"
          onClick={() => setDiaJustificando(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-brand-border/60 bg-brand-card p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-brand-border/60 pb-3">
              <h3 className="font-display text-xl font-bold text-brand-ink">
                Justificar Descuadre · {diaJustificando.fecha}
              </h3>
              <p className="text-xs text-brand-muted">
                Se factura completo por los {diaJustificando.headcount_esperado} trabajadores acordados.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-brand-muted">
                  Motivo Tipificado
                </label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value as MotivoDescuadre)}
                  className="w-full rounded-xl border border-brand-border bg-white p-3 text-sm font-semibold text-brand-ink"
                >
                  {MOTIVOS_DESCUADRE.map((m) => (
                    <option key={m} value={m}>
                      {ETIQUETAS_MOTIVO[m]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-brand-muted">
                  Nombre del Supervisor que Autorizó <span className="text-brand-terracotta">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Marcelo Gómez (Jefe de Turno)"
                  value={supervisorNombre}
                  onChange={(e) => setSupervisorNombre(e.target.value)}
                  className="w-full rounded-xl border border-brand-border bg-white p-3 text-sm text-brand-ink focus:border-brand-terracotta focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDiaJustificando(null)}
                className="flex-1 rounded-xl bg-brand-sand/60 py-2.5 text-xs font-bold text-brand-ink"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarJustificacion}
                disabled={!supervisorNombre.trim()}
                className="flex-1 rounded-xl bg-brand-terracotta py-2.5 text-xs font-bold text-white shadow-brand hover:bg-brand-terracotta-deep disabled:opacity-50"
              >
                Guardar justificación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
