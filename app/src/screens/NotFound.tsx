import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.webp";
import { IconHome, IconCompass, IconBed, IconRefresh } from "../components/Icons";

export function NotFound() {
  const navigate = useNavigate();

  const handleVolverInicio = () => {
    navigate("/");
  };

  const handleRecargar = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-brand-sand text-brand-ink flex flex-col justify-between items-center p-4 sm:p-6 md:p-10 select-none">
      {/* Barra superior con identidad de marca */}
      <header className="w-full max-w-lg flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <img
            src={logo}
            alt="Pensión Señora Miriam"
            className="h-9 w-9 rounded-xl object-contain drop-shadow-xs p-0.5 bg-white/80 border border-brand-border/60"
          />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-terracotta leading-none">
              Pensión Miriam
            </p>
            <h1 className="font-display text-sm font-extrabold text-brand-ink leading-tight">
              Caleta Paposo
            </h1>
          </div>
        </div>

        <span className="text-[10px] font-bold text-brand-muted bg-white/70 border border-brand-border/60 px-2.5 py-1 rounded-full shadow-2xs">
          Error 404
        </span>
      </header>

      {/* Contenido principal centrado */}
      <main className="w-full max-w-md my-auto py-6">
        <div className="rounded-3xl border border-brand-border/80 bg-brand-card p-6 sm:p-8 shadow-card text-center relative overflow-hidden backdrop-blur-sm">
          {/* Adorno visual suave de fondo */}
          <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-brand-terracotta/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-brand-sand/60 blur-2xl pointer-events-none" />

          {/* Badge 404 con estilo cálido de Paposo */}
          <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-2xl bg-brand-sand-light border border-brand-border/80 px-4 py-2 shadow-inner">
            <span className="font-display text-3xl sm:text-4xl font-black text-brand-terracotta tracking-wider">
              404
            </span>
          </div>

          <h2 className="font-display text-xl sm:text-2xl font-black text-brand-ink leading-tight">
            ¡Te desviaste del camino!
          </h2>

          <p className="text-xs sm:text-sm text-brand-muted mt-2 leading-relaxed px-1">
            La habitación o página a la que intentas entrar no existe en la pensión. Quizás la dirección cambió o se escribió mal.
          </p>

          {/* Tarjeta informativa enmarcada */}
          <div className="my-5 rounded-2xl border border-brand-border/70 bg-brand-sand-light/50 p-3.5 text-left space-y-2">
            <div className="flex items-center gap-2 text-brand-ink">
              <IconBed className="h-4 w-4 text-brand-terracotta shrink-0" />
              <span className="font-display text-xs font-bold">
                Pensión Familiar Señora Miriam
              </span>
            </div>
            <p className="text-[11px] text-brand-muted leading-relaxed">
              En Paposo contamos con piezas frente al mar, registro diario de aseo, comedor y control de reservas sin necesidad de señal continua.
            </p>
          </div>

          {/* Botones de acción principales */}
          <div className="flex flex-col gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleVolverInicio}
              className="w-full py-3 px-4 rounded-xl bg-brand-terracotta text-white text-xs font-black shadow-brand hover:bg-brand-terracotta-deep active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <IconHome className="h-4 w-4" />
              <span>Volver al Inicio de la Pensión →</span>
            </button>

            <button
              type="button"
              onClick={handleRecargar}
              className="w-full py-2.5 px-4 rounded-xl border border-brand-border/80 bg-white text-brand-ink hover:bg-brand-sand-light text-xs font-bold active:scale-98 transition-all flex items-center justify-center gap-2 shadow-2xs"
            >
              <IconRefresh className="h-3.5 w-3.5 text-brand-muted" />
              <span>Recargar página principal</span>
            </button>
          </div>
        </div>
      </main>

      {/* Pie de página con ubicación y nota offline */}
      <footer className="w-full max-w-lg text-center py-2 space-y-1">
        <p className="text-[11px] font-semibold text-brand-muted flex items-center justify-center gap-1.5">
          <IconCompass className="h-3.5 w-3.5 text-brand-terracotta" />
          <span>Caleta Paposo · Comuna de Taltal, Región de Antofagasta</span>
        </p>
        <p className="text-[10px] text-stone-400">
          PWA Offline-First · Diseñada para operar incluso sin Internet
        </p>
      </footer>
    </div>
  );
}
