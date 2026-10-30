import { Dialogo } from "./Dialogo";
import { useState } from "react";

interface BotonExplicacionProps {
  titulo: string;
  queEs: string;
  comoSeUsa?: string;
  ejemplo?: string;
  className?: string;
}

export function BotonExplicacion({
  titulo,
  queEs,
  comoSeUsa,
  ejemplo,
  className = ""
}: BotonExplicacionProps) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setAbierto(true);
        }}
        title={`¿Qué significa "${titulo}"?`}
        aria-label={`Explicación de ${titulo}`}
        className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-brand-border bg-white text-xs font-black text-brand-terracotta-deep hover:border-brand-terracotta hover:bg-brand-sand/40 active:scale-90 shadow-sm transition cursor-pointer ${className}`}
      >
        ?
      </button>

      {abierto && (
        <Dialogo titulo="Explicación" onCerrar={() => setAbierto(false)} className="ui-operativa fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/50 p-4 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-sm rounded-3xl border border-brand-border/80 bg-brand-card p-5 shadow-2xl space-y-3.5 animate-scaleUp text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="flex items-start justify-between gap-3 border-b border-brand-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand-sand text-brand-terracotta-deep font-black text-sm">
                  ?
                </span>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-ink/80 block">
                    Explicación en palabras simples
                  </span>
                  <h4 className="font-display text-sm font-bold text-brand-ink leading-tight">
                    {titulo}
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar diálogo" className="flex h-7 w-7 items-center justify-center rounded-xl border border-brand-border/60 bg-white text-brand-ink/80 hover:text-brand-ink text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Contenido no técnico */}
            <div className="space-y-2.5 text-sm text-brand-ink leading-relaxed">
              <div>
                <p className="font-bold text-xs text-brand-terracotta-deep uppercase tracking-wider mb-0.5">
                  ¿Qué quiere decir?
                </p>
                <p className="text-brand-ink/90 leading-relaxed">{queEs}</p>
              </div>

              {comoSeUsa && (
                <div className="rounded-xl bg-brand-sand-deep p-2.5 border border-brand-border/60">
                  <p className="font-bold text-xs text-brand-ink/80 uppercase tracking-wider mb-0.5">
                    ¿Para qué te sirve saberlo?
                  </p>
                  <p className="text-brand-ink text-xs leading-relaxed">{comoSeUsa}</p>
                </div>
              )}

              {ejemplo && (
                <div className="rounded-xl bg-amber-50/80 p-2.5 border border-amber-200/80">
                  <p className="font-bold text-xs text-amber-900 uppercase tracking-wider mb-0.5">
                    Ejemplo fácil:
                  </p>
                  <p className="text-amber-950 text-xs leading-relaxed">{ejemplo}</p>
                </div>
              )}
            </div>

            {/* Botón de cierre */}
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="w-full rounded-xl bg-brand-sand py-2.5 text-sm font-bold text-brand-ink hover:bg-brand-sand/80 transition active:scale-95"
            >
              ¡Entendido, muchas gracias!
            </button>
          </div>
        </Dialogo>
      )}
    </>
  );
}
