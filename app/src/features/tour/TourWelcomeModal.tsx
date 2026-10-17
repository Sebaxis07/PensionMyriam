import { IconCompass, IconDoorExit } from "../../components/Icons";
import logo from "../../assets/logo.webp";

interface TourWelcomeModalProps {
  onIniciar: () => void;
  onDescartar: () => void;
}

export function TourWelcomeModal({
  onIniciar,
  onDescartar
}: TourWelcomeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/60 p-4 backdrop-blur-xs animate-in fade-in duration-300">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl border border-brand-border bg-brand-card p-5 sm:p-6 shadow-2xl text-center">
        <div className="flex justify-end -mt-2 -mr-2">
          <button
            onClick={onDescartar}
            className="rounded-full p-1.5 text-brand-muted hover:bg-brand-sand hover:text-brand-ink transition-colors"
            title="Cerrar invitación"
          >
            <IconDoorExit className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-sand-light border border-brand-border/60 shadow-sm mb-3">
          <img src={logo} alt="Pensión Señora Miriam" className="h-12 w-12 object-contain" />
        </div>

        <span className="text-[11px] font-black uppercase tracking-wider text-brand-terracotta">
          Bienvenida a Paposo
        </span>
        <h2 className="font-display text-xl md:text-2xl font-black text-brand-ink mt-1">
          Pensión Señora Miriam
        </h2>

        <p className="text-xs text-brand-muted mt-2 px-2 leading-relaxed">
          Diseñamos este sistema para que sea fácil, rápido y funcione incluso sin Internet.
          <br className="hidden sm:inline" />
          ¿Deseas hacer un <strong>recorrido guiado de 1 minuto</strong> para ver cómo funciona cada parte?
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={onIniciar}
            className="w-full py-3 px-4 rounded-xl bg-brand-terracotta text-white text-xs font-black shadow-md hover:bg-brand-terracotta-deep active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <IconCompass className="h-4 w-4" />
            <span>Sí, ver recorrido guiado →</span>
          </button>

          <button
            onClick={onDescartar}
            className="w-full py-2.5 px-4 rounded-xl bg-brand-sand-light text-brand-muted hover:text-brand-ink text-xs font-bold transition-colors"
          >
            Ahora no, gracias
          </button>
        </div>
      </div>
    </div>
  );
}
