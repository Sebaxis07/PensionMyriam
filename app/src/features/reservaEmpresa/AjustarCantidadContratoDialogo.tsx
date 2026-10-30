import { useState } from "react";
import { Dialogo } from "../../components/Dialogo";
import { AvisoInterfaz, describirErrorUi } from "../../components/MensajeInterfaz";
import { fechaHoySantiago } from "../../lib/fechaNegocio";
import { ajustarCantidadContrato, previsualizarAjusteCantidad } from "./ajustarCantidadContrato";

const formatoCLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

interface ContratoActualInfo {
  id: string;
  headcount: number;
  tarifa_convenida: number;
  vigencia_desde: string;
  vigencia_hasta: string | null;
}

export function AjustarCantidadContratoDialogo({
  usuarioId,
  contrato,
  onCerrar,
  onAjustado
}: {
  usuarioId: string;
  contrato: ContratoActualInfo;
  onCerrar: () => void;
  onAjustado: (contratoNuevoId: string) => void;
}) {
  const fechaMinima = fechaHoySantiago() > contrato.vigencia_desde ? fechaHoySantiago() : contrato.vigencia_desde;
  const [nuevaCantidad, setNuevaCantidad] = useState(contrato.headcount);
  const [fechaEfectiva, setFechaEfectiva] = useState(fechaMinima);
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let previsualizacion: ReturnType<typeof previsualizarAjusteCantidad> | null = null;
  try {
    previsualizacion = previsualizarAjusteCantidad(contrato, Number(nuevaCantidad) || 0, fechaEfectiva);
  } catch {
    previsualizacion = null;
  }

  async function confirmar() {
    setError(null);
    if (!motivo.trim()) {
      setError("Indica el motivo del ajuste.");
      return;
    }
    setGuardando(true);
    try {
      const resultado = await ajustarCantidadContrato(usuarioId, {
        contratoActualId: contrato.id,
        nuevaCantidad: Number(nuevaCantidad),
        fechaEfectiva,
        motivo
      });
      onAjustado(resultado.contratoNuevoId);
    } catch (e) {
      setError(describirErrorUi(e instanceof Error ? e.message : "No se pudo registrar el ajuste de contrato."));
    } finally {
      setGuardando(false);
    }
  }

  const diferencia =
    previsualizacion && previsualizacion.estimacionAnterior.totalEstimado !== null && previsualizacion.estimacionNueva.totalEstimado !== null
      ? previsualizacion.estimacionNueva.totalEstimado - previsualizacion.estimacionAnterior.totalEstimado
      : null;

  return (
    <Dialogo
      titulo="Ajustar cantidad contratada"
      onCerrar={() => { if (!guardando) onCerrar(); }}
      className="ui-operativa fixed inset-0 z-[70] flex items-center justify-center bg-brand-ink/60 p-3"
    >
      <div className="w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl border border-brand-border bg-brand-card p-5 max-h-[90vh]">
        <h2 className="font-display text-xl font-bold text-brand-ink">Ajustar cantidad contratada</h2>
        <p className="text-sm text-brand-ink/80">
          Cambia la cantidad de trabajadores contratados desde una fecha efectiva. El período anterior conserva
          su cantidad y su estimación; esto no se corrige retroactivamente.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-bold uppercase tracking-wider text-brand-ink/80">
              Cantidad anterior
            </label>
            <p className="rounded-xl border border-brand-border bg-brand-sand/40 px-3.5 py-2.5 text-base font-bold text-brand-ink">
              {contrato.headcount}
            </p>
          </div>
          <div>
            <label htmlFor="ajuste-cantidad-nueva" className="mb-1.5 block text-sm font-bold uppercase tracking-wider text-brand-ink/80">
              Cantidad nueva
            </label>
            <input id="ajuste-cantidad-nueva" type="number" min="1" disabled={guardando}
              value={nuevaCantidad}
              onChange={(e) => setNuevaCantidad(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-base font-bold text-brand-ink"
            />
          </div>
        </div>

        <div>
          <label htmlFor="ajuste-fecha-efectiva" className="mb-1.5 block text-sm font-bold uppercase tracking-wider text-brand-ink/80">
            Fecha efectiva del cambio
          </label>
          <input id="ajuste-fecha-efectiva" type="date" disabled={guardando}
            min={fechaMinima}
            max={contrato.vigencia_hasta ?? undefined}
            value={fechaEfectiva}
            onChange={(e) => setFechaEfectiva(e.target.value)}
            className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink"
          />
          <p className="mt-1 text-xs text-brand-ink/80">
            Tarifa aplicable: {formatoCLP.format(contrato.tarifa_convenida)} por persona y día (no cambia con este ajuste).
          </p>
        </div>

        <div>
          <label htmlFor="ajuste-motivo" className="mb-1.5 block text-sm font-bold uppercase tracking-wider text-brand-ink/80">
            Motivo del ajuste
          </label>
          <textarea id="ajuste-motivo" required disabled={guardando} rows={2}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: La empresa redujo su dotación en faena"
            className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink"
          />
        </div>

        {previsualizacion && (
          <div className="rounded-2xl border border-brand-border/70 bg-brand-sand/30 p-3.5 text-sm">
            <p className="font-bold text-brand-ink">Estimación anterior vs. actualizada</p>
            <p className="mt-1 text-brand-ink/80">
              Antes: {previsualizacion.estimacionAnterior.esAbierto
                ? `${formatoCLP.format(previsualizacion.estimacionAnterior.costoDiario)} / día (contrato abierto)`
                : formatoCLP.format(previsualizacion.estimacionAnterior.totalEstimado ?? 0)}
            </p>
            <p className="text-brand-ink/80">
              Después: {previsualizacion.estimacionNueva.esAbierto
                ? `${formatoCLP.format(previsualizacion.estimacionNueva.costoDiario)} / día (contrato abierto)`
                : formatoCLP.format(previsualizacion.estimacionNueva.totalEstimado ?? 0)}
            </p>
            {diferencia !== null && (
              <p className={`mt-1 font-bold ${diferencia < 0 ? "text-red-700" : "text-emerald-800"}`}>
                Diferencia: {diferencia >= 0 ? "+" : ""}{formatoCLP.format(diferencia)}
              </p>
            )}
          </div>
        )}

        {error && <AvisoInterfaz tono="error">{error}</AvisoInterfaz>}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" disabled={guardando} onClick={onCerrar}
            className="rounded-xl border border-brand-border bg-white px-4 py-3 font-bold text-brand-ink">
            Cancelar
          </button>
          <button type="button" disabled={guardando} onClick={confirmar}
            className="rounded-xl bg-brand-terracotta-deep px-4 py-3 font-bold text-white disabled:opacity-50">
            {guardando ? "Guardando ajuste…" : "Confirmar ajuste"}
          </button>
        </div>
      </div>
    </Dialogo>
  );
}
