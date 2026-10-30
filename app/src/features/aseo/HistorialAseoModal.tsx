import { Dialogo } from "../../components/Dialogo";
import { useHistorialAseo } from "./useHistorialAseo";
import { TAREAS_ASEO } from "./registrarAseo";
import { IconBroom, IconClock } from "../../components/Icons";

const ETIQUETA_TAREA: Record<string, string> = Object.fromEntries(
  TAREAS_ASEO.map((t) => [t.clave, t.etiqueta])
);

function formatearFechaHora(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

/**
 * Sección 7 del encargo: historial simple por habitación, más reciente
 * primero. "Sin registro" es la ausencia de filas (texto explícito,
 * nunca "Sucio"); "Pendiente" solo aparece cuando alguien lo marcó así
 * explícitamente al registrar.
 */
export function HistorialAseoModal({
  habitacionId,
  habitacionNumero,
  onCerrar
}: {
  habitacionId: string;
  habitacionNumero: number;
  onCerrar: () => void;
}) {
  const historial = useHistorialAseo(habitacionId);

  return (
    <Dialogo
      titulo={`Historial de aseo — Pieza #${habitacionNumero}`}
      onCerrar={onCerrar}
      className="ui-operativa fixed inset-0 z-40 flex items-end md:items-center justify-center bg-brand-ink/45 p-0 md:p-4 backdrop-blur-sm transition-all"
    >
      <div
        className="w-full max-w-md md:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl md:rounded-3xl border border-brand-border/60 bg-brand-card p-5 md:p-7 pb-8 shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-brand-border md:hidden" />

        <div className="flex items-center gap-2">
          <IconClock className="h-6 w-6 text-brand-terracotta-deep" />
          <h2 className="font-display text-2xl font-bold text-brand-ink">
            Historial — Pieza #{habitacionNumero}
          </h2>
        </div>

        {historial.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-brand-border/60 bg-white p-6 text-center">
            <IconBroom className="h-8 w-8 text-brand-ink/40" />
            <p className="text-sm font-semibold text-brand-ink/80">
              Sin registros de aseo para esta pieza.
            </p>
            <p className="text-xs text-brand-ink/60">
              Esto no significa que la pieza esté sucia — solo que nadie ha registrado una limpieza todavía.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {historial.map((r) => (
              <li key={r.id} className="rounded-2xl border border-brand-border/60 bg-white p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-brand-ink">{formatearFechaHora(r.fechaHora)}</span>
                  <div className="flex gap-1.5">
                    {r.pendiente && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                        Pendiente
                      </span>
                    )}
                    {r.esCorreccion && (
                      <span className="rounded-full bg-brand-sand px-2 py-0.5 text-xs font-bold text-brand-ink/80">
                        Corrección
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-sm text-brand-ink/80">
                  {r.modalidad === "rapido" ? "Aseo rápido" : "Aseo detallado"}
                  {r.cama_numero !== null ? ` — Cama ${r.cama_numero}` : ""}
                  {" — "}
                  {r.responsableDeclarado ?? r.responsableNombre}
                </p>
                {r.tareas.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.tareas.map((clave) => (
                      <span
                        key={clave}
                        className="rounded-full bg-brand-sand-light px-2 py-0.5 text-xs font-semibold text-brand-ink"
                      >
                        {ETIQUETA_TAREA[clave] ?? clave}
                      </span>
                    ))}
                  </div>
                )}
                {r.observaciones && (
                  <p className="mt-2 text-sm italic text-brand-ink/80">"{r.observaciones}"</p>
                )}
                {r.esCorreccion && r.justificacionCorreccion && (
                  <p className="mt-1 text-xs text-brand-ink/60">Motivo: {r.justificacionCorreccion}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={onCerrar}
          className="mt-5 w-full py-2.5 text-center text-sm font-semibold text-brand-ink/80 hover:text-brand-ink"
        >
          Cerrar
        </button>
      </div>
    </Dialogo>
  );
}
