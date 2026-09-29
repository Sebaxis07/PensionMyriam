import { useMemo, useState } from "react";
import { useQuery } from "@powersync/react";
import { SyncStatusBadge } from "../components/SyncStatusBadge";
import { RoomCard } from "../components/RoomCard";
import { RoomSheet } from "../components/RoomSheet";
import { AseoHoy } from "./AseoHoy";
import { Reservar } from "./Reservar";
import { QUERY_PIEZAS, type PiezaRow } from "../lib/queries";
import { useUsuarioActual } from "../lib/useUsuarioActual";
import { IconBroom, IconHome, IconPlus } from "../components/Icons";
import { Header, type TabType } from "../components/Header";
import logo from "../assets/logo.webp";

export function Piezas({ onLogout }: { onLogout?: () => void }) {
  const usuario = useUsuarioActual();
  const { data: piezas } = useQuery<PiezaRow>(QUERY_PIEZAS);
  const [tab, setTab] = useState<TabType>("inicio");
  const [piezaAbierta, setPiezaAbierta] = useState<PiezaRow | null>(null);
  const [preseleccionReserva, setPreseleccionReserva] = useState<string | null>(null);

  const stats = useMemo(() => {
    const disponibles = piezas?.filter((p) => p.estado === "disponible").length ?? 0;
    const checkinPronto = piezas?.filter((p) => p.reserva_id).length ?? 0;
    const ocupadas = piezas?.filter((p) => p.estado === "ocupada").length ?? 0;
    return { disponibles, checkinPronto, ocupadas };
  }, [piezas]);

  const pendientesAseo = piezas?.filter((p) => p.estado === "ocupada" && p.aseo_hoy_count === 0).length ?? 0;

  if (!usuario) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-brand-sand p-6 text-center">
        <img src={logo} alt="Pensión Señora Miriam" className="mb-4 h-16 w-16 opacity-80" />
        <p className="font-display text-lg font-bold text-brand-ink">Pensión Señora Miriam</p>
        <p className="mt-1 text-sm text-brand-muted">Cargando datos locales…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-brand-sand text-brand-ink">
      {/* ========================================================= */}
      {/* SIDEBAR DESKTOP (visible solo en >= 768px / md:)           */}
      {/* ========================================================= */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:justify-between border-r border-brand-border/70 bg-brand-card p-5 shrink-0 shadow-sm">
        <div>
          {/* Marca / Identidad */}
          <div className="flex items-center gap-3 pb-6 border-b border-brand-border/60">
            <img src={logo} alt="Logo" className="h-11 w-11 object-contain" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-terracotta">
                Pensión Familiar
              </p>
              <h2 className="font-display text-lg font-black leading-tight text-brand-ink">
                Señora Miriam
              </h2>
              <p className="text-[11px] text-brand-muted">Paposo, Antofagasta</p>
            </div>
          </div>

          {/* Menú de Navegación Vertical */}
          <nav className="mt-6 flex flex-col gap-2">
            <SidebarButton
              activo={tab === "inicio"}
              icon={<IconHome className="h-5 w-5" />}
              label="Habitaciones"
              onClick={() => setTab("inicio")}
            />
            <SidebarButton
              activo={tab === "aseo"}
              icon={<IconBroom className="h-5 w-5" />}
              label="Aseo de hoy"
              badge={pendientesAseo > 0 ? pendientesAseo : undefined}
              onClick={() => setTab("aseo")}
            />
            <SidebarButton
              activo={tab === "reservar"}
              icon={<IconPlus className="h-5 w-5" />}
              label="Nueva reserva"
              onClick={() => setTab("reservar")}
            />
          </nav>
        </div>

        {/* Pie de Sidebar con Sincronización */}
        <div className="border-t border-brand-border/60 pt-4 space-y-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
              Estado de red
            </span>
            <SyncStatusBadge />
          </div>
          <p className="text-[11px] text-brand-muted/80">
            Sprint 1 · PWA Offline-first
          </p>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* CONTENIDO PRINCIPAL (Mobile y Desktop)                    */}
      {/* ========================================================= */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Cabecera unificada y responsiva */}
        <Header tab={tab} usuario={usuario} onLogout={onLogout} />

        {/* Área scrolleable de contenido */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto w-full max-w-5xl">
            {tab === "inicio" && (
              <div className="space-y-5 md:space-y-6">
                {/* Métricas destacadas de estado */}
                <div className="grid grid-cols-3 gap-2.5 md:gap-5">
                  <StatTile
                    n={stats.disponibles}
                    label="Disponibles"
                    dotColor="bg-emerald-600"
                    numColor="text-emerald-800"
                  />
                  <StatTile
                    n={stats.checkinPronto}
                    label="Check-in hoy"
                    dotColor="bg-brand-terracotta"
                    numColor="text-brand-terracotta-deep"
                  />
                  <StatTile
                    n={stats.ocupadas}
                    label="Ocupadas"
                    dotColor="bg-amber-500"
                    numColor="text-amber-900"
                  />
                </div>

                {/* Cuadrícula de 8 habitaciones: 2 columnas en mobile, 4 columnas en desktop (4x2) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  {piezas?.map((p) => (
                    <RoomCard key={p.id} pieza={p} onTap={() => setPiezaAbierta(p)} />
                  ))}
                  {!piezas?.length && (
                    <div className="col-span-full rounded-2xl border border-brand-border/70 bg-brand-card p-6 text-center text-sm text-brand-muted">
                      Sin piezas cargadas todavía (esperando primera sincronización).
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "aseo" && <AseoHoy usuarioId={usuario.id} />}

            {tab === "reservar" && (
              <Reservar
                usuarioId={usuario.id}
                preseleccion={preseleccionReserva}
                onListo={() => {
                  setPreseleccionReserva(null);
                  setTab("inicio");
                }}
              />
            )}
          </div>
        </main>

        {/* Barra de navegación inferior (visible SOLO en mobile < md:) */}
        <nav className="sticky bottom-0 z-10 flex md:hidden border-t border-brand-border/80 bg-brand-card/95 pb-safe pt-1 shadow-lg backdrop-blur-md">
          <div className="flex w-full items-center justify-around px-2">
            <NavButton
              activo={tab === "inicio"}
              icon={<IconHome className="h-6 w-6" />}
              label="Inicio"
              onClick={() => setTab("inicio")}
            />
            <NavButton
              activo={tab === "aseo"}
              icon={<IconBroom className="h-6 w-6" />}
              label="Aseo de hoy"
              badge={pendientesAseo > 0 ? pendientesAseo : undefined}
              onClick={() => setTab("aseo")}
            />
            <NavButton
              activo={tab === "reservar"}
              icon={<IconPlus className="h-6 w-6" />}
              label="Reservar"
              onClick={() => setTab("reservar")}
            />
          </div>
        </nav>
      </div>

      {/* Modal / Bottom Sheet de Habitación */}
      {piezaAbierta && (
        <RoomSheet
          pieza={piezaAbierta}
          usuarioId={usuario.id}
          onClose={() => setPiezaAbierta(null)}
          onIrAReservar={(habitacionId) => {
            setPiezaAbierta(null);
            setPreseleccionReserva(habitacionId);
            setTab("reservar");
          }}
        />
      )}
    </div>
  );
}

function SidebarButton({
  activo,
  icon,
  label,
  badge,
  onClick
}: {
  activo: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
        activo
          ? "bg-brand-sand/60 text-brand-terracotta border-l-4 border-brand-terracotta shadow-sm"
          : "text-brand-ink/80 hover:bg-brand-sand/30 hover:text-brand-ink"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={activo ? "text-brand-terracotta" : "text-brand-muted group-hover:text-brand-ink"}>
          {icon}
        </span>
        <span>{label}</span>
      </div>
      {!!badge && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-black text-white shadow-sm">
          {badge}
        </span>
      )}
    </button>
  );
}

function StatTile({
  n,
  label,
  dotColor,
  numColor
}: {
  n: number;
  label: string;
  dotColor: string;
  numColor: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-brand-border/80 bg-brand-card p-3.5 md:p-4 shadow-card">
      <div className="flex items-center gap-1.5">
        <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
        <span className="text-[10px] md:text-xs font-extrabold uppercase tracking-tight text-brand-muted">
          {label}
        </span>
      </div>
      <p className={`mt-2 font-display text-3xl md:text-4xl font-extrabold leading-none ${numColor}`}>
        {n}
      </p>
    </div>
  );
}

function NavButton({
  activo,
  icon,
  label,
  badge,
  onClick
}: {
  activo: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 transition-all ${
        activo
          ? "font-bold text-brand-terracotta"
          : "font-medium text-brand-muted hover:text-brand-ink"
      }`}
    >
      <div className="relative">
        {icon}
        {!!badge && (
          <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white shadow-sm ring-2 ring-white">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[11px] leading-tight">{label}</span>
      {activo && (
        <span className="absolute bottom-0 h-0.5 w-6 rounded-full bg-brand-terracotta" />
      )}
    </button>
  );
}
