import { useState } from "react";
import { Dialogo } from "../../components/Dialogo";
import { AvisoInterfaz, describirErrorUi } from "../../components/MensajeInterfaz";
import { cancelarReserva } from "./cancelarReserva";

export function CancelarReservaModal({ reservaId, nombre, usuarioId, onCerrar, onCancelada }: {
  reservaId: string; nombre: string; usuarioId: string; onCerrar: () => void; onCancelada: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uuidCancelacion] = useState(() => crypto.randomUUID());
  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true); setError(null);
    try { await cancelarReserva({ reservaId, usuarioId, motivo, uuidCancelacion }); onCancelada(); }
    catch (err) { setError(describirErrorUi(err instanceof Error ? err.message : "No se pudo cancelar la reserva.")); }
    finally { setGuardando(false); }
  }
  return <Dialogo titulo="Cancelar reserva" onCerrar={() => { if (!guardando) onCerrar(); }} className="ui-operativa fixed inset-0 z-[70] flex items-center justify-center bg-brand-ink/60 p-3">
    <form onSubmit={confirmar} className="w-full max-w-lg space-y-4 rounded-3xl border border-brand-border bg-brand-card p-5 shadow-2xl" aria-busy={guardando}>
      <h2 className="font-display text-xl font-bold">Cancelar reserva</h2>
      <p>Reserva de <strong>{nombre}</strong></p>
      <p className="text-sm">Usa esta opción si el huésped cancela antes de llegar. Sus fechas quedarán disponibles para otra reserva. No se cobra nada.</p>
      <p className="text-sm">La habitación conserva su estado de aseo o mantención. La reserva se conserva con el motivo de cancelación.</p>
      <div><label htmlFor="motivo-cancelacion" className="mb-2 block text-sm font-bold">Motivo de cancelación</label>
        <textarea id="motivo-cancelacion" autoFocus required minLength={5} maxLength={500} rows={3} disabled={guardando} value={motivo} onChange={e => setMotivo(e.target.value)} aria-describedby="ayuda-cancelacion" className="w-full rounded-xl border border-brand-border bg-white p-3"/>
        <p id="ayuda-cancelacion" className="mt-2 text-sm">Entre 5 y 500 caracteres. No incluyas información médica ni datos sensibles.</p>
      </div>
      {error && <AvisoInterfaz tono="error">{error}</AvisoInterfaz>}
      <p className="text-sm">Se guardará en este teléfono y se enviará al servidor al recuperar conexión. Revisa el indicador de sincronización por si hay un rechazo.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" disabled={guardando} onClick={onCerrar} className="rounded-xl border border-brand-border bg-white px-4 py-3 font-bold">Volver sin cancelar</button>
        <button type="submit" disabled={guardando || motivo.trim().length < 5} className="rounded-xl bg-brand-terracotta-deep px-4 py-3 font-bold text-white disabled:opacity-50">{guardando ? "Cancelando…" : "Confirmar cancelación"}</button>
      </div>
    </form>
  </Dialogo>;
}
