import { IconHelpCircle, IconChartBar, IconHome, IconWifi, IconDoorExit } from "../../components/Icons";

interface TourMenuModalProps {
  onCerrar: () => void;
  onIniciarGeneral: () => void;
  onIniciarAdmin: () => void;
  esAdmin: boolean;
}

export function TourMenuModal({
  onCerrar,
  onIniciarGeneral,
  onIniciarAdmin,
  esAdmin
}: TourMenuModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-brand-border bg-brand-card p-5 sm:p-6 shadow-2xl">
        {/* Encabezado */}
        <div className="flex items-start justify-between pb-4 border-b border-brand-border/60">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-sand-light text-brand-terracotta border border-brand-border/60 shadow-xs">
              <IconHelpCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-muted">
                Centro de Ayuda y Guía
              </p>
              <h2 className="font-display text-xl font-black text-brand-ink">
                ¿Cómo funciona el sistema?
              </h2>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="rounded-full p-1.5 text-brand-muted hover:bg-brand-sand hover:text-brand-ink transition-colors"
            title="Cerrar ventana"
          >
            <IconDoorExit className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-brand-ink/80 mt-3 leading-relaxed">
          Selecciona una de las guías interactivas para que el sistema te muestre paso a paso en pantalla cómo usar cada función:
        </p>

        {/* Opciones de Tour */}
        <div className="mt-4 space-y-3">
          {/* Opción 1: Tour General */}
          <button
            onClick={() => {
              onCerrar();
              onIniciarGeneral();
            }}
            className="w-full text-left flex items-start gap-3.5 p-3.5 rounded-2xl border border-brand-border/80 bg-brand-sand-light/50 hover:bg-brand-sand-light hover:border-brand-terracotta/40 transition-all group shadow-xs"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-sand text-brand-terracotta group-hover:scale-105 transition-transform">
              <IconHome className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-extrabold text-brand-ink">
                  Recorrido General de la Pensión
                </span>
                <span className="text-[11px] font-bold text-brand-terracotta">
                  Iniciar →
                </span>
              </div>
              <p className="text-xs text-brand-muted mt-0.5 leading-normal">
                Aprende cómo ver las 8 piezas, recordar el aseo diario, registrar raciones en el comedor y contratos de empresas.
              </p>
            </div>
          </button>

          {/* Opción 2: Tour Ganancias (si es Administradora) */}
          {esAdmin && (
            <button
              onClick={() => {
                onCerrar();
                onIniciarAdmin();
              }}
              className="w-full text-left flex items-start gap-3.5 p-3.5 rounded-2xl border border-brand-border/80 bg-brand-sand-light/50 hover:bg-brand-sand-light hover:border-brand-terracotta/40 transition-all group shadow-xs"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 group-hover:scale-105 transition-transform">
                <IconChartBar className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm font-extrabold text-brand-ink">
                    Panel de Ganancias y Semáforo
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700">
                    Iniciar →
                  </span>
                </div>
                <p className="text-xs text-brand-muted mt-0.5 leading-normal">
                  Descubre cómo leer el velocímetro de margen, la tarifa mínima sugerida y el control de facturación quincenal.
                </p>
              </div>
            </button>
          )}

          {/* Opción 3: Tarjeta informativa offline */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl border border-brand-border/60 bg-white text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-sand-light text-brand-ink">
              <IconWifi className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <span className="font-display text-xs font-bold text-brand-ink block">
                ¿Qué pasa si no hay Internet en Paposo?
              </span>
              <p className="text-[11px] text-brand-muted mt-0.5 leading-relaxed">
                ¡No te preocupes! El sistema guarda todo en el equipo. Cuando regrese la señal o conectes el teléfono, todo se sincronizará automáticamente.
              </p>
            </div>
          </div>
        </div>

        {/* Pie de modal */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onCerrar}
            className="rounded-xl bg-brand-sand px-5 py-2 text-xs font-bold text-brand-ink hover:bg-brand-sand-light transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
