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
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-brand-border bg-white text-[11px] font-black text-brand-terracotta hover:border-brand-terracotta hover:bg-brand-sand/40 active:scale-90 shadow-2xs transition cursor-pointer ${className}`}
      >
        ?
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/50 p-4 backdrop-blur-2xs animate-fadeIn"
          onClick={(e) => {
            e.stopPropagation();
            setAbierto(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-brand-border/80 bg-brand-card p-5 shadow-2xl space-y-3.5 animate-scaleUp text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="flex items-start justify-between gap-3 border-b border-brand-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand-sand text-brand-terracotta font-black text-xs">
                  ?
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
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
                className="flex h-7 w-7 items-center justify-center rounded-xl border border-brand-border/60 bg-white text-brand-muted hover:text-brand-ink text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Contenido no técnico */}
            <div className="space-y-2.5 text-xs text-brand-ink leading-relaxed">
              <div>
                <p className="font-bold text-[11px] text-brand-terracotta uppercase tracking-wider mb-0.5">
                  ¿Qué quiere decir?
                </p>
                <p className="text-brand-ink/90 leading-relaxed">{queEs}</p>
              </div>

              {comoSeUsa && (
                <div className="rounded-xl bg-brand-sand-light p-2.5 border border-brand-border/60">
                  <p className="font-bold text-[10px] text-brand-muted uppercase tracking-wider mb-0.5">
                    ¿Para qué te sirve saberlo?
                  </p>
                  <p className="text-brand-ink text-[11px] leading-relaxed">{comoSeUsa}</p>
                </div>
              )}

              {ejemplo && (
                <div className="rounded-xl bg-amber-50/80 p-2.5 border border-amber-200/80">
                  <p className="font-bold text-[10px] text-amber-900 uppercase tracking-wider mb-0.5">
                    Ejemplo fácil:
                  </p>
                  <p className="text-amber-950 text-[11px] leading-relaxed">{ejemplo}</p>
                </div>
              )}
            </div>

            {/* Botón de cierre */}
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="w-full rounded-xl bg-brand-sand py-2.5 text-xs font-bold text-brand-ink hover:bg-brand-sand/80 transition active:scale-95"
            >
              ¡Entendido, muchas gracias!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
