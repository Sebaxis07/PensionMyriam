import { useState } from "react";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { IconCalendar, IconDoorExit, IconUser, IconHelpCircle, IconBed, IconChartBar } from "./Icons";
import logo from "../assets/logo.webp";

export type TabType = "inicio" | "aseo" | "reservar" | "consumo" | "empresas" | "rack" | "costos";

interface HeaderProps {
  tab: TabType;
  usuario?: { nombre: string; rol: string } | null;
  modoActivo?: "operativo" | "admin";
  onCambiarModo?: (modo: "operativo" | "admin") => void;
  onLogout?: () => void;
  onAbrirSyncModal?: () => void;
  onAbrirGuia?: () => void;
  onAbrirPerfil?: () => void;
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
  costos: {
    titulo: "Compras y Costos PMP",
    descripcion: "Registro de mercadería, cálculo de precios promedio y gastos"
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
  onAbrirSyncModal,
  onAbrirGuia,
  onAbrirPerfil
}: HeaderProps) {
  const metaBase = META_VISTAS[tab] ?? META_VISTAS.inicio;
  const esAdmin = usuario?.rol === "administradora";
  const labelRol = esAdmin ? "Administradora" : "Encargada";

  // Si estamos en la pestaña inicio y en modo admin, cambiar título
  const tituloHeader =
    tab === "inicio" && modoActivo === "admin"
      ? "Panel de Administración"
      : metaBase.titulo;

  const [mostrarMenuUsuario, setMostrarMenuUsuario] = useState(false);

  const descHeader =
    tab === "inicio" && modoActivo === "admin"
      ? "Control de ganancias, costos de mercadería y tarifas mínimas"
      : metaBase.descripcion;

  return (
    <>
      {/* ========================================================= */}
      {/* CABECERA MOBILE (< 768px / md:)                           */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-30 flex md:hidden flex-col border-b border-brand-border/60 bg-brand-sand/95 px-3.5 py-2 backdrop-blur-md shadow-2xs gap-2">
        {/* Fila Principal */}
        <div className="flex items-center justify-between gap-2">
          {/* Identidad de Marca y Sección */}
          <div className="flex items-center gap-2.5 min-w-0" id="tour-logo-identidad">
            <div className="relative shrink-0">
              <img
                src={logo}
                alt="Pensión Señora Miriam"
                className="h-9 w-9 rounded-xl object-contain drop-shadow-xs p-0.5 bg-white/70 border border-brand-border/50"
              />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-terracotta truncate">
                  Pensión Miriam
                </span>
                <span className="text-stone-300">·</span>
                <span className="text-[10px] font-semibold text-brand-muted truncate">
                  {fechaHoyTexto()}
                </span>
              </div>
              <h1 className="font-display text-base sm:text-lg font-black leading-tight text-brand-ink truncate mt-0.5">
                {tituloHeader}
              </h1>
            </div>
          </div>

          {/* Acciones Rápidas en Mobile */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Estado de Sincronización Compacto */}
            <div id="tour-sync-status">
              <SyncStatusBadge onClick={onAbrirSyncModal} compact={true} />
            </div>

            {/* Botón de Ayuda / Tour */}
            {onAbrirGuia && (
              <button
                id="tour-btn-ayuda-mobile"
                type="button"
                onClick={onAbrirGuia}
                title="¿Cómo funciona el sistema?"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand-border/80 bg-white/90 text-brand-ink hover:text-brand-terracotta active:scale-90 transition-all shadow-2xs"
              >
                <IconHelpCircle className="h-4 w-4 text-brand-terracotta" />
              </button>
            )}

            {/* Avatar / Menú de Usuario */}
            {usuario ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMostrarMenuUsuario(!mostrarMenuUsuario)}
                  title={`Usuario: ${usuario.nombre} (${labelRol})`}
                  className="flex h-8 items-center gap-1.5 rounded-xl border border-brand-border/80 bg-white/90 pl-1 pr-2 py-0.5 shadow-2xs active:scale-95 transition"
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-black text-white shadow-2xs ${
                      esAdmin ? "bg-brand-terracotta" : "bg-emerald-700"
                    }`}
                  >
                    {usuario.nombre.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[65px] truncate text-[11px] font-bold text-brand-ink text-left">
                    {usuario.nombre.split(" ")[0]}
                  </span>
                </button>

                {/* Popover / Menú Desplegable de Usuario en Celular */}
                {mostrarMenuUsuario && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xs"
                      onClick={() => setMostrarMenuUsuario(false)}
                    />
                    <div className="absolute right-0 top-10 z-50 w-60 rounded-2xl border border-brand-border/80 bg-brand-card p-3 shadow-xl animate-fadeIn space-y-3">
                      <div className="border-b border-brand-border/60 pb-2">
                        <p className="text-xs font-bold text-brand-ink truncate">
                          {usuario.nombre}
                        </p>
                        <span
                          className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            esAdmin
                              ? "bg-brand-terracotta/15 text-brand-terracotta"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {labelRol}
                        </span>
                        <p className="text-[10px] text-brand-muted mt-1">
                          Caleta Paposo · Turno activo
                        </p>
                      </div>

                      <div className="space-y-1.5 pt-0.5">
                        {onAbrirPerfil && (
                          <button
                            type="button"
                            onClick={() => {
                              setMostrarMenuUsuario(false);
                              onAbrirPerfil();
                            }}
                            className="w-full flex items-center gap-2.5 rounded-xl border border-brand-border/70 bg-brand-sand-light/60 px-3 py-2 text-xs font-bold text-brand-ink hover:bg-brand-sand transition active:scale-95 text-left"
                          >
                            <IconUser className="h-4 w-4 text-brand-terracotta" />
                            <span>Mi Perfil y Ajustes</span>
                          </button>
                        )}

                        {onAbrirGuia && (
                          <button
                            type="button"
                            onClick={() => {
                              setMostrarMenuUsuario(false);
                              onAbrirGuia();
                            }}
                            className="w-full flex items-center gap-2.5 rounded-xl border border-brand-border/70 bg-brand-sand-light/60 px-3 py-2 text-xs font-bold text-brand-ink hover:bg-brand-sand transition active:scale-95 text-left"
                          >
                            <IconHelpCircle className="h-4 w-4 text-brand-terracotta" />
                            <span>¿Cómo funciona? (Tour)</span>
                          </button>
                        )}
                      </div>

                      {onLogout && (
                        <button
                          type="button"
                          onClick={() => {
                            setMostrarMenuUsuario(false);
                            onLogout();
                          }}
                          className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition active:scale-95"
                        >
                          <IconDoorExit className="h-4 w-4" />
                          <span>Cerrar sesión</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              onLogout && (
                <button
                  onClick={onLogout}
                  title="Cerrar sesión"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand-border/80 bg-white text-brand-muted hover:text-brand-terracotta active:scale-95 transition-all shadow-2xs"
                >
                  <IconDoorExit className="h-4 w-4" />
                </button>
              )
            )}
          </div>
        </div>

        {/* Switch de Doble Modo en Mobile (Segmented Control moderno) */}
        {esAdmin && tab === "inicio" && onCambiarModo && (
          <div
            id="tour-switch-modo-mobile"
            className="flex items-center rounded-2xl bg-brand-sand-light/90 p-1 border border-brand-border/70 shadow-2xs"
          >
            <button
              type="button"
              onClick={() => onCambiarModo("operativo")}
              className={`flex-1 min-h-[36px] rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                modoActivo === "operativo"
                  ? "bg-white text-brand-ink shadow-xs border border-brand-border/60"
                  : "text-brand-muted hover:text-brand-ink"
              }`}
            >
              <IconBed className="h-3.5 w-3.5" />
              <span>Día a Día</span>
            </button>
            <button
              type="button"
              onClick={() => onCambiarModo("admin")}
              className={`flex-1 min-h-[36px] rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                modoActivo === "admin"
                  ? "bg-brand-terracotta text-white shadow-xs"
                  : "text-brand-muted hover:text-brand-ink"
              }`}
            >
              <IconChartBar className="h-3.5 w-3.5" />
              <span>Administración</span>
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

        <div className="flex items-center gap-3">
          {/* Switch de Doble Modo (solo Administradora en inicio) */}
          {esAdmin && tab === "inicio" && onCambiarModo && (
            <div id="tour-switch-modo" className="inline-flex items-center rounded-xl bg-brand-sand-light/90 p-1 border border-brand-border/70 shadow-xs">
              <button
                type="button"
                onClick={() => onCambiarModo("operativo")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  modoActivo === "operativo"
                    ? "bg-white text-brand-ink shadow-xs"
                    : "text-brand-muted hover:text-brand-ink"
                }`}
              >
                <IconBed className="h-3.5 w-3.5" />
                <span>Modo Día a Día</span>
              </button>
              <button
                type="button"
                onClick={() => onCambiarModo("admin")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  modoActivo === "admin"
                    ? "bg-brand-terracotta text-white shadow-xs"
                    : "text-brand-muted hover:text-brand-ink"
                }`}
              >
                <IconChartBar className="h-3.5 w-3.5" />
                <span>Modo Administración</span>
              </button>
            </div>
          )}

          {/* Botón ¿Cómo funciona? / Guía Rápida */}
          {onAbrirGuia && (
            <button
              id="tour-btn-ayuda"
              onClick={onAbrirGuia}
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border/80 bg-brand-sand-light/80 px-3 py-1.5 text-xs font-bold text-brand-ink hover:bg-brand-sand hover:text-brand-terracotta active:scale-95 transition-all shadow-xs"
              title="Abrir Centro de Ayuda y Recorrido Guiado"
            >
              <IconHelpCircle className="h-4 w-4 text-brand-terracotta" />
              <span>¿Cómo funciona?</span>
            </button>
          )}

          {/* Chip de fecha actual en Paposo */}
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border/70 bg-brand-card/90 px-3 py-1.5 text-xs font-semibold text-brand-muted shadow-sm">
            <IconCalendar className="h-3.5 w-3.5 text-brand-terracotta" />
            <span>{fechaHoyTexto()} · Paposo</span>
          </div>

          {/* Tarjeta de usuario en sesión */}
          {usuario && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-brand-border/80 bg-brand-card p-1.5 pr-2.5 shadow-sm">
              <button
                type="button"
                onClick={onAbrirPerfil}
                className="flex items-center gap-2 rounded-lg hover:bg-brand-sand/40 p-1 transition text-left"
                title="Abrir Mi Perfil y Configuración"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-sand/60 text-brand-ink">
                  <IconUser className="h-4 w-4" />
                </div>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-xs font-bold text-brand-ink hover:text-brand-terracotta transition-colors">
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
              </button>

              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Cerrar sesión"
                  className="ml-1 rounded-lg p-1 text-brand-muted hover:bg-brand-sand/50 hover:text-rose-600 transition-colors"
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
