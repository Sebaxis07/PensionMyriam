import { useState } from "react";
import { Dialogo } from "../../components/Dialogo";
import { useCamasDeHabitacion } from "./useHistorialAseo";
import { registrarAseoRapido, registrarAseoDetallado, TAREAS_ASEO, type ClaveTareaAseo } from "./registrarAseo";
import { IconBroom, IconCheck, IconChevronRight, IconSparkles } from "../../components/Icons";

/**
 * Sección 10 del encargo: "Registrar aseo" ofrece Aseo rápido (un
 * toque) y, opcionalmente, Detalle de limpieza. Ningún campo del
 * detalle es obligatorio — se puede guardar con una sola tarea, con
 * ninguna (solo observación), o con observación y sin tareas. No
 * cambia el estado de la habitación: eso lo sigue haciendo solo el
 * botón "Completar aseo" / "Registrar salida" de RoomSheet.
 */
export function RegistrarAseoModal({
  habitacionId,
  habitacionNumero,
  usuarioId,
  onCerrar,
  onGuardado
}: {
  habitacionId: string;
  habitacionNumero: number;
  usuarioId: string;
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
}) {
  const camas = useCamasDeHabitacion(habitacionId);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [tareasSeleccionadas, setTareasSeleccionadas] = useState<ClaveTareaAseo[]>([]);
  const [camaId, setCamaId] = useState<string>("");
  const [observaciones, setObservaciones] = useState("");
  const [pendiente, setPendiente] = useState(false);
  const [responsableDeclarado, setResponsableDeclarado] = useState("");
  const [guardando, setGuardando] = useState(false);

  function alternarTarea(clave: ClaveTareaAseo) {
    setTareasSeleccionadas((actual) =>
      actual.includes(clave) ? actual.filter((c) => c !== clave) : [...actual, clave]
    );
  }

  async function guardarRapido() {
    setGuardando(true);
    try {
      await registrarAseoRapido(usuarioId, { habitacionId, tipo: "diario" });
      onGuardado(`✓ Aseo de Pieza #${habitacionNumero} registrado.`);
    } catch (err) {
      console.error(err);
      alert("No se pudo registrar el aseo. Intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  }

  async function guardarDetallado() {
    setGuardando(true);
    try {
      await registrarAseoDetallado(usuarioId, {
        habitacionId,
        tipo: "diario",
        camaId: camaId || undefined,
        tareas: tareasSeleccionadas.length > 0 ? tareasSeleccionadas : undefined,
        observaciones: observaciones.trim() || undefined,
        pendiente,
        responsableDeclarado: responsableDeclarado.trim() || undefined
      });
      onGuardado(`✓ Detalle de aseo de Pieza #${habitacionNumero} guardado.`);
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar el detalle de aseo. Intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialogo
      titulo={`Registrar aseo — Pieza #${habitacionNumero}`}
      onCerrar={onCerrar}
      className="ui-operativa fixed inset-0 z-40 flex items-end md:items-center justify-center bg-brand-ink/45 p-0 md:p-4 backdrop-blur-sm transition-all"
    >
      <div
        className="w-full max-w-md md:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl border border-brand-border/60 bg-brand-card p-5 md:p-7 pb-8 shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-brand-border md:hidden" />

        <div className="flex items-center gap-2">
          <IconBroom className="h-6 w-6 text-brand-terracotta-deep" />
          <h2 className="font-display text-2xl font-bold text-brand-ink">
            Registrar aseo — Pieza #{habitacionNumero}
          </h2>
        </div>
        <p className="mt-1 text-sm text-brand-ink/80">
          Registrar el aseo es opcional. No cambia el estado de la habitación ni afecta reservas.
        </p>

        <button
          disabled={guardando}
          onClick={guardarRapido}
          className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-brand-terracotta-deep px-4 py-3.5 text-base font-bold text-white shadow-brand transition-all duration-150 hover:bg-brand-terracotta-deep active:scale-[0.98] disabled:opacity-50"
        >
          <IconCheck className="h-5 w-5" />
          <span>{guardando ? "Guardando…" : "Aseo realizado"}</span>
        </button>

        <button
          type="button"
          onClick={() => setDetalleAbierto((v) => !v)}
          className="mt-3 flex w-full items-center justify-between rounded-xl border border-brand-border/60 bg-white px-4 py-3 text-sm font-bold text-brand-ink/80 hover:text-brand-ink"
        >
          <span>Agregar detalles (opcional)</span>
          <IconChevronRight className={`h-4 w-4 transition-transform ${detalleAbierto ? "rotate-90" : ""}`} />
        </button>

        {detalleAbierto && (
          <div className="mt-3 space-y-4 rounded-2xl border border-brand-border/60 bg-brand-sand/20 p-4">
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-wider text-brand-ink/80">
                Tareas realizadas (opcional — marca las que correspondan)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TAREAS_ASEO.map((t) => (
                  <label
                    key={t.clave}
                    className="flex items-center gap-2 rounded-xl border border-brand-border/60 bg-white px-3 py-2.5 text-sm font-medium text-brand-ink cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={tareasSeleccionadas.includes(t.clave)}
                      onChange={() => alternarTarea(t.clave)}
                      className="h-4 w-4 accent-brand-terracotta-deep"
                    />
                    {t.etiqueta}
                  </label>
                ))}
              </div>
            </div>

            {camas.length > 1 && (
              <div>
                <label htmlFor="cama-aseo" className="mb-1 block text-sm font-bold uppercase tracking-wider text-brand-ink/80">
                  ¿A qué cama corresponde? (opcional)
                </label>
                <select
                  id="cama-aseo"
                  className="w-full rounded-xl border border-brand-border bg-white p-3 text-base font-medium text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
                  value={camaId}
                  onChange={(e) => setCamaId(e.target.value)}
                >
                  <option value="">General (toda la pieza)</option>
                  {camas.map((c) => (
                    <option key={c.id} value={c.id}>
                      Cama {c.numero}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-brand-ink/60">
                  Si quieres registrar varias camas, guarda este registro y repite para la siguiente.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="observaciones-aseo" className="mb-1 block text-sm font-bold uppercase tracking-wider text-brand-ink/80">
                Observaciones (opcional)
              </label>
              <textarea
                id="observaciones-aseo"
                rows={2}
                className="w-full rounded-xl border border-brand-border bg-white p-3 text-base text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
                placeholder='Ej: "Falta cambiar sábana de la cama 2"'
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="responsable-declarado" className="mb-1 block text-sm font-bold uppercase tracking-wider text-brand-ink/80">
                ¿Quién hizo la limpieza? (opcional)
              </label>
              <input
                id="responsable-declarado"
                type="text"
                className="w-full rounded-xl border border-brand-border bg-white p-3 text-base text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
                placeholder="Ej: cuñada de María"
                value={responsableDeclarado}
                onChange={(e) => setResponsableDeclarado(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-brand-ink cursor-pointer">
              <input
                type="checkbox"
                checked={pendiente}
                onChange={(e) => setPendiente(e.target.checked)}
                className="h-4 w-4 accent-brand-terracotta-deep"
              />
              Marcar como pendiente (queda algo por hacer)
            </label>

            <button
              disabled={guardando}
              onClick={guardarDetallado}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-brand-terracotta-deep bg-white px-4 py-3 text-base font-bold text-brand-terracotta-deep transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <IconSparkles className="h-5 w-5" />
              <span>{guardando ? "Guardando…" : "Guardar detalle"}</span>
            </button>
          </div>
        )}

        <button
          onClick={onCerrar}
          className="mt-4 w-full py-2.5 text-center text-sm font-semibold text-brand-ink/80 hover:text-brand-ink"
        >
          Cerrar
        </button>
      </div>
    </Dialogo>
  );
}
