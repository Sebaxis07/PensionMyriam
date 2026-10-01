import { SyncStatusBadge } from "./SyncStatusBadge";
import { IconCalendar, IconDoorExit, IconUser } from "./Icons";
import logo from "../assets/logo.webp";

export type TabType = "inicio" | "aseo" | "reservar" | "consumo" | "empresas" | "rack";

interface HeaderProps {
  tab: TabType;
  usuario?: { nombre: string; rol: string } | null;
  modoActivo?: "operativo" | "admin";
  onCambiarModo?: (modo: "operativo" | "admin") => void;
  onLogout?: () => void;
  onAbrirSyncModal?: () => void;
}

const META_VISTAS: Record<TabType, { titulo: string; descripcion: string }> = {
  inicio: {
    titulo: "Habitaciones",
    descripcion: "Disponibilidad y estado de las 8 piezas en tiempo real"
  },
  aseo: {
    titulo: "Aseo de hoy",
    descripcion: "Registro de aseos diarios obligatorios para piezas ocupadas"
  },
  consumo: {
    titulo: "Consumos de Raciones",
    descripcion: "Registro rápido de desayuno, almuerzo, cena y extras"
  },
  empresas: {
    titulo: "Empresas y Contratos",
    descripcion: "Gestión de empresas contratistas, nómina y conciliación diaria"
  },
  rack: {
    titulo: "Calendario de Ocupación",
    descripcion: "Disponibilidad mensual de las 8 piezas estilo rack hotelero"
  },
  reservar: {
    titulo: "Nueva reserva",
    descripcion: "Registro de reservas para turistas y pasajeros independientes"
  }
};

function fechaHoyTexto() {
  try {
    const ahora = new Date();
    const formato = ahora.toLocaleDateString("es-CL", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
    return formato.charAt(0).toUpperCase() + formato.slice(1);
  } catch {
    return "Hoy · Paposo";
  }
}

export function Header({
  tab,
  usuario,
  modoActivo = "operativo",
  onCambiarModo,
  onLogout,
  onAbrirSyncModal
}: HeaderProps) {
  const metaBase = META_VISTAS[tab] ?? META_VISTAS.inicio;
  const esAdmin = usuario?.rol === "administradora";
  const labelRol = esAdmin ? "Administradora" : "Encargada";

  // Si estamos en la pestaña inicio y en modo admin, cambiar título
  const tituloHeader =
    tab === "inicio" && modoActivo === "admin"
      ? "Panel de Administración"
      : metaBase.titulo;

  const descHeader =
    tab === "inicio" && modoActivo === "admin"
      ? "Control de ganancias, costos de mercadería y tarifas mínimas"
      : metaBase.descripcion;

  return (
    <>
      {/* ========================================================= */}
      {/* CABECERA MOBILE (< 768px / md:)                           */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-20 flex md:hidden flex-col border-b border-brand-border/60 bg-brand-sand/95 px-3.5 py-2.5 backdrop-blur-md gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={logo} alt="Pensión Señora Miriam" className="h-9 w-9 shrink-0 object-contain drop-shadow-sm" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-terracotta truncate">
                Pensión Señora Miriam
              </p>
              <h1 className="font-display text-lg font-extrabold leading-tight text-brand-ink truncate">
                {tituloHeader}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <SyncStatusBadge onClick={onAbrirSyncModal} />
            {onLogout && (
              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-border/80 bg-brand-card text-brand-muted hover:text-brand-terracotta active:scale-95 transition-all shadow-sm"
              >
                <IconDoorExit className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Switch de Doble Modo en Mobile (solo visible para Administradora en inicio) */}
        {esAdmin && tab === "inicio" && onCambiarModo && (
          <div className="flex items-center rounded-xl bg-white p-1 border border-brand-border/70 shadow-xs">
            <button
              type="button"
              onClick={() => onCambiarModo("operativo")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                modoActivo === "operativo"
                  ? "bg-brand-sand-light text-brand-ink shadow-xs"
                  : "text-brand-muted hover:text-brand-ink"
              }`}
            >
              🛠️ Modo Día a Día
            </button>
            <button
              type="button"
              onClick={() => onCambiarModo("admin")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                modoActivo === "admin"
                  ? "bg-brand-terracotta text-white shadow-xs"
                  : "text-brand-muted hover:text-brand-ink"
              }`}
            >
              📊 Modo Administración
            </button>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* CABECERA DESKTOP (>= 768px / md:)                         */}
      {/* ========================================================= */}
      <header className="hidden md:flex items-center justify-between border-b border-brand-border/60 bg-brand-sand/80 px-8 py-5 backdrop-blur-md">
        <div>
          <h1 className="font-display text-2xl font-black text-brand-ink">
            {tituloHeader}
          </h1>
          <p className="mt-0.5 text-xs text-brand-muted">
            {descHeader}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Switch de Doble Modo (solo Administradora en inicio) */}
          {esAdmin && tab === "inicio" && onCambiarModo && (
            <div className="inline-flex items-center rounded-xl bg-brand-sand-light/90 p-1 border border-brand-border/70 shadow-xs">
              <button
                type="button"
                onClick={() => onCambiarModo("operativo")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  modoActivo === "operativo"
                    ? "bg-white text-brand-ink shadow-xs"
                    : "text-brand-muted hover:text-brand-ink"
                }`}
              >
                🛠️ Modo Día a Día
              </button>
              <button
                type="button"
                onClick={() => onCambiarModo("admin")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  modoActivo === "admin"
                    ? "bg-brand-terracotta text-white shadow-xs"
                    : "text-brand-muted hover:text-brand-ink"
                }`}
              >
                📊 Modo Administración
              </button>
            </div>
          )}

          {/* Chip de fecha actual en Paposo */}
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border/70 bg-brand-card/90 px-3 py-1.5 text-xs font-semibold text-brand-muted shadow-sm">
            <IconCalendar className="h-3.5 w-3.5 text-brand-terracotta" />
            <span>{fechaHoyTexto()} · Paposo</span>
          </div>

          {/* Tarjeta de usuario en sesión */}
          {usuario && (
            <div className="inline-flex items-center gap-2.5 rounded-xl border border-brand-border/80 bg-brand-card p-1.5 pr-3 shadow-sm">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-sand/60 text-brand-ink">
                <IconUser className="h-4 w-4" />
              </div>
              <div className="flex flex-col text-left leading-none">
                <span className="text-xs font-bold text-brand-ink">
                  {usuario.nombre}
                </span>
                <span
                  className={`mt-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
                    esAdmin ? "text-brand-terracotta" : "text-emerald-700"
                  }`}
                >
                  {labelRol}
                </span>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Cerrar sesión"
                  className="ml-2 rounded-lg p-1 text-brand-muted hover:bg-brand-sand/50 hover:text-brand-terracotta transition-colors"
                >
                  <IconDoorExit className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
}
