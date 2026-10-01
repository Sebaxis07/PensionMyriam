import { useMemo, useState } from "react";
import { useQuery } from "@powersync/react";
import { powersync } from "../lib/powersync";
import { nuevoUuidIdempotente } from "../lib/idempotencia";
import { SyncStatusBadge } from "../components/SyncStatusBadge";
import { RoomCard } from "../components/RoomCard";
import { RoomSheet } from "../components/RoomSheet";
import { AseoHoy } from "./AseoHoy";
import { Reservar } from "./Reservar";
import { QUERY_PIEZAS, type PiezaRow } from "../lib/queries";
import { useUsuarioActual } from "../lib/useUsuarioActual";
import { IconBed, IconBriefcase, IconBroom, IconCalendar, IconChartBar, IconCheck, IconCheckCircle, IconHome, IconPlus, IconShoppingCart, IconUtensils } from "../components/Icons";
import { Header, type TabType } from "../components/Header";
import { ModuloEmpresas } from "./sprint2/ModuloEmpresas";
import { ModuloConsumos } from "./sprint2/ModuloConsumos";
import { RackHotelero } from "./RackHotelero";
import { DashboardAdmin } from "./sprint4/DashboardAdmin";
import { ModuloCostos } from "./sprint4/ModuloCostos";
import { SyncStatusModal } from "../components/SyncStatusModal";
import logo from "../assets/logo.webp";

export function Piezas({ onLogout }: { onLogout?: () => void }) {
  const usuario = useUsuarioActual();
  const { data: piezas } = useQuery<PiezaRow>(QUERY_PIEZAS);
  const [tab, setTab] = useState<TabType>("inicio");
  const [modo, setModo] = useState<"operativo" | "admin">("operativo");
  const [piezaAbierta, setPiezaAbierta] = useState<PiezaRow | null>(null);
  const [preseleccionReserva, setPreseleccionReserva] = useState<string | null>(null);
  const [fechaPreseleccionadaReserva, setFechaPreseleccionadaReserva] = useState<string | undefined>(undefined);
  const [mostrarSyncModal, setMostrarSyncModal] = useState(false);

  const stats = useMemo(() => {
    const disponibles = piezas?.filter((p) => p.estado === "disponible").length ?? 0;
    const checkinPronto = piezas?.filter((p) => p.reserva_id).length ?? 0;
    const ocupadas = piezas?.filter((p) => p.estado === "ocupada").length ?? 0;
    return { disponibles, checkinPronto, ocupadas };
  }, [piezas]);

  const pendientesAseo = piezas?.filter((p) => p.estado === "ocupada" && p.aseo_hoy_count === 0).length ?? 0;

  const piezasPendientesAseo = useMemo(() => {
    return piezas?.filter((p) => p.estado === "ocupada" && p.aseo_hoy_count === 0) ?? [];
  }, [piezas]);

  const porcentajeOcupacion = useMemo(() => {
    const total = piezas?.length || 8;
    return Math.round((stats.ocupadas / total) * 100);
  }, [piezas, stats.ocupadas]);

  async function handleMarcarAseoRapido(habitacionId: string) {
    if (!usuario) return;
    await powersync.execute(
      "insert into aseo (id, habitacion_id, tipo, responsable, fecha_hora, uuid_idempotente) values (?, ?, 'diario', ?, ?, ?)",
      [crypto.randomUUID(), habitacionId, usuario.id, new Date().toISOString(), nuevoUuidIdempotente()]
    );
  }

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
              activo={tab === "inicio" && modo === "operativo"}
              icon={<IconHome className="h-5 w-5" />}
              label="Habitaciones"
              onClick={() => {
                setTab("inicio");
                setModo("operativo");
              }}
            />
            {usuario.rol === "administradora" && (
              <SidebarButton
                activo={tab === "inicio" && modo === "admin"}
                icon={<IconChartBar className="h-5 w-5" />}
                label="Administración"
                onClick={() => {
                  setTab("inicio");
                  setModo("admin");
                }}
              />
            )}
            <SidebarButton
              activo={tab === "rack"}
              icon={<IconCalendar className="h-5 w-5" />}
              label="Calendario"
              onClick={() => setTab("rack")}
            />
            <SidebarButton
              activo={tab === "aseo"}
              icon={<IconBroom className="h-5 w-5" />}
              label="Aseo de hoy"
              badge={pendientesAseo > 0 ? pendientesAseo : undefined}
              onClick={() => setTab("aseo")}
            />
            <SidebarButton
              activo={tab === "consumo"}
              icon={<IconUtensils className="h-5 w-5" />}
              label="Consumos"
              onClick={() => setTab("consumo")}
            />
            {usuario.rol === "administradora" && (
              <SidebarButton
                activo={tab === "empresas"}
                icon={<IconBriefcase className="h-5 w-5" />}
                label="Empresas"
                onClick={() => setTab("empresas")}
              />
            )}
            {usuario.rol === "administradora" && (
              <SidebarButton
                activo={tab === "costos"}
                icon={<IconShoppingCart className="h-5 w-5" />}
                label="Compras y Costos"
                onClick={() => setTab("costos")}
              />
            )}
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
            <SyncStatusBadge onClick={() => setMostrarSyncModal(true)} />
          </div>
          <p className="text-[11px] text-brand-muted/80">
            PWA Offline-first · Paposo
          </p>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* CONTENIDO PRINCIPAL (Mobile y Desktop)                    */}
      {/* ========================================================= */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Cabecera unificada y responsiva */}
        <Header
          tab={tab}
          usuario={usuario}
          modoActivo={modo}
          onCambiarModo={setModo}
          onLogout={onLogout}
          onAbrirSyncModal={() => setMostrarSyncModal(true)}
        />

        {/* Área scrolleable de contenido */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1550px]">
            {tab === "inicio" && (
              modo === "admin" && usuario.rol === "administradora" ? (
                <DashboardAdmin
                  usuarioId={usuario.id}
                  onIrACostos={() => setTab("costos")}
                  onIrAConciliacion={() => setTab("empresas")}
                  onIrAEmpresas={() => setTab("empresas")}
                  onIrACalendario={() => setTab("rack")}
                />
              ) : (
                <div className="space-y-6">
                {/* Métricas destacadas de estado (2 cols en mobile, 4 cols en md/desktop) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <StatTile
                    n={stats.disponibles}
                    label="Disponibles"
                    dotColor="bg-emerald-600"
                    numColor="text-emerald-800"
                    sublabel="Listas para uso"
                  />
                  <StatTile
                    n={stats.ocupadas}
                    label="Ocupadas"
                    dotColor="bg-amber-500"
                    numColor="text-amber-900"
                    sublabel={`${porcentajeOcupacion}% ocupación`}
                  />
                  <StatTile
                    n={stats.checkinPronto}
                    label="Check-in hoy"
                    dotColor="bg-brand-terracotta"
                    numColor="text-brand-terracotta-deep"
                    sublabel="Llegadas hoy"
                  />
                  <StatTile
                    n={pendientesAseo}
                    label="Aseo pendiente"
                    dotColor="bg-red-500"
                    numColor="text-red-700"
                    sublabel={pendientesAseo === 0 ? "Al día" : "Por limpiar"}
                  />
                </div>

                {/* Layout Desktop: Habitaciones (izquierda) + Centro de Operaciones (derecha) */}
                <div className="xl:grid xl:grid-cols-12 xl:gap-6 items-start">
                  {/* Cuadrícula de 8 habitaciones */}
                  <div className="xl:col-span-8 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconBed className="h-5 w-5 text-brand-terracotta" />
                        <h2 className="font-display text-base md:text-lg font-bold text-brand-ink">
                          Habitaciones de la Pensión
                        </h2>
                        <span className="rounded-full bg-brand-sand-light px-2.5 py-0.5 text-xs font-semibold text-brand-muted border border-brand-border/70">
                          {piezas?.length ?? 8} habitaciones
                        </span>
                      </div>
                      <span className="hidden sm:inline text-xs text-brand-muted">
                        Haz clic en una habitación para ver o editar su estado
                      </span>
                    </div>

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

                  {/* Centro de Operaciones en Tiempo Real (visible en pantallas grandes desktop xl:) */}
                  <div className="hidden xl:flex xl:col-span-4 flex-col gap-4">
                    {/* Widget Aseo Rápido Diario */}
                    <div className="rounded-2xl border border-brand-border/80 bg-brand-card p-5 shadow-card">
                      <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-sand-light text-brand-terracotta">
                            <IconBroom className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-display text-sm font-bold text-brand-ink">Aseo Diario de Hoy</h3>
                            <p className="text-[11px] text-brand-muted">Habitaciones ocupadas por revisar</p>
                          </div>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          piezasPendientesAseo.length > 0
                            ? "bg-red-100 text-red-700"
                            : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {piezasPendientesAseo.length} pendientes
                        </span>
                      </div>

                      <div className="mt-3 divide-y divide-brand-border/40 max-h-64 overflow-y-auto pr-1">
                        {piezasPendientesAseo.length === 0 ? (
                          <div className="py-6 text-center">
                            <IconCheckCircle className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
                            <p className="text-xs font-semibold text-emerald-800">¡Todo el aseo de hoy está al día!</p>
                            <p className="text-[11px] text-brand-muted mt-0.5">No hay habitaciones ocupadas pendientes.</p>
                          </div>
                        ) : (
                          piezasPendientesAseo.map((p) => (
                            <div key={p.id} className="py-2.5 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-brand-ink">
                                  Pieza {p.numero}
                                  <span className="ml-1.5 font-normal text-brand-muted text-[11px]">
                                    ({p.capacidad} camas)
                                  </span>
                                </p>
                                <p className="text-[11px] text-brand-muted truncate">
                                  {p.huesped_actual ? `Huésped: ${p.huesped_actual}` : "Ocupada"}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleMarcarAseoRapido(p.id)}
                                className="shrink-0 flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 transition active:scale-95 shadow-xs"
                              >
                                <IconCheck className="h-3.5 w-3.5" />
                                <span>Listo</span>
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {piezasPendientesAseo.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-brand-border/50">
                          <button
                            type="button"
                            onClick={() => setTab("aseo")}
                            className="w-full text-center text-xs font-semibold text-brand-terracotta hover:underline"
                          >
                            Ver módulo completo de Aseo →
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Widget Resumen de Capacidad */}
                    <div className="rounded-2xl border border-brand-border/80 bg-brand-card p-5 shadow-card">
                      <h3 className="font-display text-sm font-bold text-brand-ink mb-2">
                        Ocupación General
                      </h3>
                      <div className="flex items-end justify-between mb-1.5">
                        <span className="text-xs font-medium text-brand-muted">Capacidad ocupada</span>
                        <span className="font-display text-lg font-black text-brand-ink">{porcentajeOcupacion}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-brand-sand-light rounded-full overflow-hidden border border-brand-border/60">
                        <div
                          className="h-full bg-brand-terracotta transition-all duration-500 rounded-full"
                          style={{ width: `${porcentajeOcupacion}%` }}
                        />
                      </div>
                      <div className="mt-3.5 grid grid-cols-3 gap-2 text-center text-xs pt-3 border-t border-brand-border/50">
                        <div className="rounded-xl bg-brand-sand-light p-2 border border-brand-border/40">
                          <p className="font-bold text-emerald-800 text-sm">{stats.disponibles}</p>
                          <p className="text-[10px] text-brand-muted font-medium">Libres</p>
                        </div>
                        <div className="rounded-xl bg-brand-sand-light p-2 border border-brand-border/40">
                          <p className="font-bold text-amber-900 text-sm">{stats.ocupadas}</p>
                          <p className="text-[10px] text-brand-muted font-medium">Ocupadas</p>
                        </div>
                        <div className="rounded-xl bg-brand-sand-light p-2 border border-brand-border/40">
                          <p className="font-bold text-brand-terracotta-deep text-sm">{stats.checkinPronto}</p>
                          <p className="text-[10px] text-brand-muted font-medium">Reservas</p>
                        </div>
                      </div>
                    </div>

                    {/* Acciones Rápidas */}
                    <div className="rounded-2xl border border-brand-border/80 bg-brand-card p-5 shadow-card">
                      <h3 className="font-display text-sm font-bold text-brand-ink mb-2.5">
                        Accesos Directos
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setTab("reservar")}
                          className="flex items-center gap-2 rounded-xl border border-brand-border/80 bg-brand-sand-light p-3 text-left hover:border-brand-terracotta/40 hover:bg-brand-sand transition"
                        >
                          <IconPlus className="h-4 w-4 text-brand-terracotta shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-brand-ink">Nueva Reserva</p>
                            <p className="text-[10px] text-brand-muted">Asignar pasajero</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTab("consumo")}
                          className="flex items-center gap-2 rounded-xl border border-brand-border/80 bg-brand-sand-light p-3 text-left hover:border-brand-terracotta/40 hover:bg-brand-sand transition"
                        >
                          <IconUtensils className="h-4 w-4 text-brand-terracotta shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-brand-ink">Consumos</p>
                            <p className="text-[10px] text-brand-muted">Colaciones de hoy</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          )
        )}

            {tab === "rack" && (
              <RackHotelero
                onSeleccionarParaReservar={(habitacionId, fecha) => {
                  setPreseleccionReserva(habitacionId);
                  setFechaPreseleccionadaReserva(fecha);
                  setTab("reservar");
                }}
                onVolver={() => setTab("inicio")}
              />
            )}

            {tab === "aseo" && <AseoHoy usuarioId={usuario.id} />}

            {tab === "consumo" && <ModuloConsumos usuarioId={usuario.id} usuarioRol={usuario.rol} />}

            {tab === "empresas" && usuario.rol === "administradora" && (
              <ModuloEmpresas usuarioId={usuario.id} />
            )}

            {tab === "costos" && usuario.rol === "administradora" && (
              <ModuloCostos usuarioId={usuario.id} />
            )}

            {tab === "reservar" && (
              <Reservar
                usuarioId={usuario.id}
                preseleccion={preseleccionReserva}
                fechaPreseleccionada={fechaPreseleccionadaReserva}
                onListo={() => {
                  setPreseleccionReserva(null);
                  setFechaPreseleccionadaReserva(undefined);
                  setTab("inicio");
                }}
              />
            )}
          </div>
        </main>

        {/* Barra de navegación inferior (visible SOLO en mobile < md:) */}
        <nav className="sticky bottom-0 z-10 flex md:hidden border-t border-brand-border/80 bg-brand-card/95 pb-safe pt-1 shadow-lg backdrop-blur-md">
          <div className="flex w-full items-center justify-around px-1">
            <NavButton
              activo={tab === "inicio"}
              icon={<IconHome className="h-5 w-5" />}
              label="Inicio"
              onClick={() => setTab("inicio")}
            />
            <NavButton
              activo={tab === "rack"}
              icon={<IconCalendar className="h-5 w-5" />}
              label="Rack"
              onClick={() => setTab("rack")}
            />
            <NavButton
              activo={tab === "aseo"}
              icon={<IconBroom className="h-5 w-5" />}
              label="Aseo"
              badge={pendientesAseo > 0 ? pendientesAseo : undefined}
              onClick={() => setTab("aseo")}
            />
            <NavButton
              activo={tab === "consumo"}
              icon={<IconUtensils className="h-5 w-5" />}
              label="Consumos"
              onClick={() => setTab("consumo")}
            />
            {usuario.rol === "administradora" && (
              <NavButton
                activo={tab === "empresas"}
                icon={<IconBriefcase className="h-5 w-5" />}
                label="Empresas"
                onClick={() => setTab("empresas")}
              />
            )}
            {usuario.rol === "administradora" && (
              <NavButton
                activo={tab === "costos"}
                icon={<IconShoppingCart className="h-5 w-5" />}
                label="Costos"
                onClick={() => setTab("costos")}
              />
            )}
            <NavButton
              activo={tab === "reservar"}
              icon={<IconPlus className="h-5 w-5" />}
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

      {/* Modal Centro de Sincronización y Cola de Operaciones */}
      {mostrarSyncModal && (
        <SyncStatusModal onCerrar={() => setMostrarSyncModal(false)} />
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
  numColor,
  sublabel
}: {
  n: number;
  label: string;
  dotColor: string;
  numColor: string;
  sublabel?: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-brand-border/80 bg-brand-card p-3.5 md:p-4 shadow-card">
      <div className="flex items-center gap-1.5">
        <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
        <span className="text-[10px] md:text-xs font-extrabold uppercase tracking-tight text-brand-muted">
          {label}
        </span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-1">
        <p className={`font-display text-3xl md:text-4xl font-extrabold leading-none ${numColor}`}>
          {n}
        </p>
        {sublabel && (
          <span className="text-[10px] md:text-xs text-brand-muted font-medium truncate">
            {sublabel}
          </span>
        )}
      </div>
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
