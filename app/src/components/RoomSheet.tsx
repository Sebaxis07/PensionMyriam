import { CancelarReservaModal } from "../features/reservas/CancelarReservaModal";
import { RegistrarAseoModal } from "../features/aseo/RegistrarAseoModal";
import { HistorialAseoModal } from "../features/aseo/HistorialAseoModal";
import { Dialogo } from "./Dialogo";
import { useState } from "react";
import { powersync } from "../lib/powersync";
import { nuevoUuidIdempotente } from "../lib/idempotencia";
import type { PiezaRow } from "../lib/queries";
import {
  IconBell,
  IconBroom,
  IconCheckCircle,
  IconClock,
  IconClose,
  IconDoorExit,
  IconPlus,
  IconUnlock,
  IconUser,
  IconUsers,
  IconWrench
} from "./Icons";

const MOTIVOS_MANTENCION = ["Gas", "Baño", "Electricidad", "Otro"];

const CONFIG_MODAL_ESTADO: Record<
  string,
  { label: string; badge: string; icon: (cls: string) => JSX.Element; bannerBorder: string; bannerBg: string }
> = {
  disponible: {
    label: "Disponible",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-500/30",
    bannerBorder: "border-l-estado-disponible",
    bannerBg: "bg-emerald-50/40",
    icon: (cls) => <IconCheckCircle className={cls} />
  },
  ocupada: {
    label: "Ocupada",
    badge: "bg-amber-50 text-amber-900 border-amber-500/35",
    bannerBorder: "border-l-estado-ocupada",
    bannerBg: "bg-amber-50/40",
    icon: (cls) => <IconUser className={cls} />
  },
  en_aseo: {
    label: "En aseo",
    badge: "bg-rose-50 text-rose-800 border-rose-500/35",
    bannerBorder: "border-l-estado-en_aseo",
    bannerBg: "bg-rose-50/40",
    icon: (cls) => <IconBroom className={cls} />
  },
  en_mantencion: {
    label: "Mantención",
    badge: "bg-stone-100 text-stone-700 border-stone-400/35",
    bannerBorder: "border-l-estado-en_mantencion",
    bannerBg: "bg-stone-100/50",
    icon: (cls) => <IconWrench className={cls} />
  }
};

/**
 * Divulgación progresiva (HU-05..HU-10): esta hoja SOLO ofrece la
 * acción válida para el estado actual de la pieza — nunca un botón
 * deshabilitado ni una acción imposible. Check-out y aseo completado
 * son 1 toque cada uno acá adentro (2 en total desde Inicio), sin
 * confirmación: son frecuentes y reversibles por el flujo normal.
 */
export function RoomSheet({
  pieza,
  usuarioId,
  onClose,
  onIrAReservar,
  onIrAEmpresas
}: {
  pieza: PiezaRow;
  usuarioId: string;
  onClose: () => void;
  onIrAReservar: (habitacionId: string) => void;
  onIrAEmpresas?: () => void;
}) {
  const [cancelando, setCancelando] = useState(false);
  const [marcandoMantencion, setMarcandoMantencion] = useState(false);
  const [motivo, setMotivo] = useState(MOTIVOS_MANTENCION[0]);
  const [guardando, setGuardando] = useState(false);
  const [registrandoAseo, setRegistrandoAseo] = useState(false);
  const [verHistorialAseo, setVerHistorialAseo] = useState(false);
  const [avisoAseo, setAvisoAseo] = useState<string | null>(null);

  const estadoCfg = CONFIG_MODAL_ESTADO[pieza.estado] ?? CONFIG_MODAL_ESTADO.disponible;

  async function checkin() {
    if (!pieza.reserva_id || pieza.reserva_sin_identificar) return;
    setGuardando(true);
    await powersync.writeTransaction(async (tx) => {
      await tx.execute(
        "insert into checkin (id, reserva_id, realizado_por, fecha_hora, uuid_idempotente) values (?, ?, ?, ?, ?)",
        [crypto.randomUUID(), pieza.reserva_id, usuarioId, new Date().toISOString(), nuevoUuidIdempotente()]
      );
      await tx.execute("update habitacion set estado = 'ocupada' where id = ?", [pieza.id]);
    });
    onClose();
  }

  async function salio() {
    if (!pieza.checkin_activo_id) return;
    setGuardando(true);
    await powersync.writeTransaction(async (tx) => {
      await tx.execute(
        "insert into checkout (id, checkin_id, realizado_por, fecha_hora, uuid_idempotente) values (?, ?, ?, ?, ?)",
        [pieza.checkin_activo_id, pieza.checkin_activo_id, usuarioId, new Date().toISOString(), nuevoUuidIdempotente()]
      );
      await tx.execute("update habitacion set estado = 'en_aseo' where id = ?", [pieza.id]);
    });
    onClose();
  }

  async function aseoListo() {
    setGuardando(true);
    await powersync.writeTransaction(async (tx) => {
      await tx.execute(
        "insert into aseo (id, habitacion_id, tipo, responsable, fecha_hora, uuid_idempotente) values (?, ?, 'post_checkout', ?, ?, ?)",
        [crypto.randomUUID(), pieza.id, usuarioId, new Date().toISOString(), nuevoUuidIdempotente()]
      );
      await tx.execute(
        "update habitacion set estado = 'disponible' where id = ? and estado = 'en_aseo'",
        [pieza.id]
      );
    });
    onClose();
  }

  async function confirmarMantencion() {
    setGuardando(true);
    await powersync.execute(
      "update habitacion set estado = 'en_mantencion', motivo_mantencion = ? where id = ?",
      [motivo, pieza.id]
    );
    onClose();
  }

  async function liberarMantencion() {
    setGuardando(true);
    await powersync.execute(
      "update habitacion set estado = 'disponible', motivo_mantencion = null where id = ?",
      [pieza.id]
    );
    onClose();
  }

  return (
    <Dialogo titulo="Acciones de habitación" onCerrar={onClose} className="ui-operativa fixed inset-0 z-30 flex items-end md:items-center justify-center bg-brand-ink/50 p-0 md:p-4 backdrop-blur-xs transition-all">
      <div
        className="w-full max-w-md md:max-w-lg rounded-t-3xl md:rounded-3xl border border-brand-border/70 bg-brand-card p-5 md:p-6 shadow-2xl animate-in slide-in-from-bottom-5 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tirador táctil visible en mobile */}
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-brand-border md:hidden" />

        {marcandoMantencion ? (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                  <IconWrench className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl md:text-2xl font-bold text-brand-ink">
                    Mantención — Pieza #{pieza.numero}
                  </h2>
                  <p className="text-xs text-brand-muted">Bloqueo temporal de habitación</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMarcandoMantencion(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-muted hover:bg-brand-sand/50 transition"
                aria-label="Volver atrás"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4">
              <label htmlFor="motivo-mantencion" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-brand-muted">
                Motivo del bloqueo
              </label>
              <select
                id="motivo-mantencion"
                className="w-full rounded-xl border border-brand-border bg-white p-3 text-sm font-semibold text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20 shadow-2xs"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              >
                {MOTIVOS_MANTENCION.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="mt-5 space-y-2">
              <BotonPrincipal disabled={guardando} onClick={confirmarMantencion}>
                <IconWrench className="h-5 w-5 shrink-0" />
                <span>{guardando ? "Guardando mantención…" : "Confirmar mantención"}</span>
              </BotonPrincipal>

              <button
                type="button"
                onClick={() => setMarcandoMantencion(false)}
                className="w-full py-2.5 text-center text-xs font-bold text-brand-muted hover:text-brand-ink transition"
              >
                Volver atrás
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Cabecera con número, insignias y botón cerrar */}
            <div className="flex items-start justify-between pb-3 border-b border-brand-border/50">
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <h2 className="font-display text-2xl md:text-3xl font-black text-brand-ink tracking-tight">
                    Pieza #{pieza.numero}
                  </h2>
                  <span className="text-xs font-semibold text-brand-muted">
                    Habitación
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border/70 bg-brand-sand/50 px-2.5 py-0.5 text-xs font-semibold text-brand-ink">
                    <IconUsers className="h-3 w-3 text-brand-muted" />
                    <span>{pieza.capacidad} {pieza.capacidad === 1 ? "cama" : "camas"}</span>
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${estadoCfg.badge}`}>
                    {estadoCfg.icon("h-3 w-3")}
                    <span>{estadoCfg.label}</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-muted hover:text-brand-ink hover:bg-brand-sand/50 transition"
                aria-label="Cerrar ventana"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            {/* Información contextual con acento de estado */}
            <div className={`mt-3.5 rounded-xl border border-brand-border/70 border-l-[4px] ${estadoCfg.bannerBorder} ${estadoCfg.bannerBg} p-3.5 text-sm`}>
              {pieza.huesped_actual && (
                <div className="flex items-center gap-2">
                  <IconUser className="h-4 w-4 text-brand-terracotta shrink-0" />
                  <p className="font-semibold text-brand-ink">
                    Huésped: <strong className="text-brand-ink font-bold">{pieza.huesped_actual}</strong>
                  </p>
                </div>
              )}

              {pieza.estado === "disponible" && pieza.reserva_id && !pieza.reserva_sin_identificar && (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-semibold text-brand-ink">
                    <IconBell className="h-4 w-4 text-brand-terracotta shrink-0" />
                    <span>Reserva para hoy: <strong className="text-brand-ink font-bold">{pieza.reserva_nombre}</strong></span>
                  </div>
                  <p className="text-xs text-brand-muted pl-5.5">
                    Modalidad: {pieza.reserva_tipo === "empresa" ? "Trabajador de empresa" : "Turista independiente"}
                  </p>
                </div>
              )}

              {pieza.estado === "disponible" && !pieza.reserva_id && (
                <p className="text-xs text-brand-muted">
                  Habitación limpia y lista para recibir nuevos pasajeros.
                </p>
              )}

              {pieza.estado === "ocupada" && (
                <p className="text-xs text-brand-muted mt-1">
                  Habitación actualmente en uso. Al registrar la salida pasará automáticamente a estado de aseo.
                </p>
              )}

              {pieza.estado === "en_aseo" && (
                <p className="text-xs text-brand-muted">
                  Aseo de cambio de sábanas y desinfección pendiente tras la salida del huésped.
                </p>
              )}

              {pieza.estado === "en_mantencion" && (
                <p className="text-xs text-brand-muted">
                  Fuera de servicio por motivo: <strong className="text-brand-ink font-bold">{pieza.motivo_mantencion}</strong>
                </p>
              )}
            </div>

            {!!pieza.reserva_sin_identificar && (
              <div className="mt-3 space-y-1.5 rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950">
                <p className="font-bold">Cama reservada · Falta identificar a la persona</p>
                <p className="text-amber-900">Completa el nombre en Nómina y Camas antes de registrar la llegada.</p>
                {onIrAEmpresas && (
                  <button
                    type="button"
                    onClick={onIrAEmpresas}
                    className="mt-1 inline-flex items-center rounded-lg border border-brand-border bg-white px-3 py-1.5 text-xs font-bold text-brand-ink hover:bg-brand-sand transition"
                  >
                    Ir a Empresas
                  </button>
                )}
              </div>
            )}

            {/* Acción Primaria según Divulgación Progresiva */}
            <div className="mt-4">
              {pieza.estado === "disponible" && pieza.reserva_id && (
                <BotonPrincipal disabled={guardando} onClick={checkin}>
                  <IconBell className="h-5 w-5 shrink-0" />
                  <span>{guardando ? "Guardando ingreso…" : "Registrar ingreso"}</span>
                </BotonPrincipal>
              )}

              {pieza.estado === "disponible" && !pieza.reserva_id && (
                <BotonPrincipal disabled={guardando} onClick={() => onIrAReservar(pieza.id)}>
                  <IconPlus className="h-5 w-5 shrink-0" />
                  <span>Crear reserva para esta pieza</span>
                </BotonPrincipal>
              )}

              {pieza.estado === "ocupada" && (
                <BotonPrincipal disabled={guardando} onClick={salio}>
                  <IconDoorExit className="h-5 w-5 shrink-0" />
                  <span>{guardando ? "Guardando salida…" : "Registrar salida"}</span>
                </BotonPrincipal>
              )}

              {pieza.estado === "en_aseo" && (
                <BotonPrincipal disabled={guardando} onClick={aseoListo}>
                  <IconBroom className="h-5 w-5 shrink-0" />
                  <span>{guardando ? "Guardando aseo…" : "Completar aseo"}</span>
                </BotonPrincipal>
              )}

              {pieza.estado === "en_mantencion" && (
                <BotonPrincipal disabled={guardando} onClick={liberarMantencion}>
                  <IconUnlock className="h-5 w-5 shrink-0" />
                  <span>{guardando ? "Guardando…" : "Liberar pieza a disponible"}</span>
                </BotonPrincipal>
              )}
            </div>

            {/* Barra de Acciones Complementarias (Aseo e Historial) */}
            <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-brand-border/40">
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-brand-border/70 bg-brand-sand/30 py-2.5 px-2 text-xs font-bold text-brand-ink hover:bg-brand-sand/60 transition"
                onClick={() => setRegistrandoAseo(true)}
              >
                <IconBroom className="h-3.5 w-3.5 text-brand-terracotta" />
                <span>Registrar aseo</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-brand-border/70 bg-brand-sand/30 py-2.5 px-2 text-xs font-bold text-brand-ink hover:bg-brand-sand/60 transition"
                onClick={() => setVerHistorialAseo(true)}
              >
                <IconClock className="h-3.5 w-3.5 text-brand-muted" />
                <span>Historial de aseo</span>
              </button>
            </div>

            {/* Acción de Mantención secundaria */}
            {(pieza.estado === "disponible" || pieza.estado === "en_aseo") && (
              <button
                type="button"
                className="mt-2 flex w-full items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-brand-muted hover:text-brand-ink transition"
                onClick={() => setMarcandoMantencion(true)}
              >
                <IconWrench className="h-3 w-3" />
                <span>Marcar en mantención</span>
              </button>
            )}

            {avisoAseo && (
              <p role="status" className="mt-2 text-center text-xs font-bold text-emerald-700 bg-emerald-50 py-1.5 rounded-lg border border-emerald-200">
                {avisoAseo}
              </p>
            )}

            {!pieza.checkin_activo_id && pieza.reserva_id && pieza.reserva_tipo === "turista" && (
              <button
                type="button"
                onClick={() => setCancelando(true)}
                className="mt-3 w-full rounded-xl border border-brand-terracotta-deep/40 bg-white hover:bg-rose-50/50 py-2.5 text-xs font-bold text-brand-terracotta-deep transition"
              >
                Cancelar reserva
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full py-2 text-center text-xs font-semibold text-brand-muted hover:text-brand-ink transition"
            >
              Cerrar
            </button>
          </>
        )}
      </div>

      {cancelando && pieza.reserva_id && (
        <CancelarReservaModal
          reservaId={pieza.reserva_id}
          nombre={pieza.reserva_nombre ?? "Huésped"}
          usuarioId={usuarioId}
          onCerrar={() => setCancelando(false)}
          onCancelada={onClose}
        />
      )}

      {registrandoAseo && (
        <RegistrarAseoModal
          habitacionId={pieza.id}
          habitacionNumero={pieza.numero}
          usuarioId={usuarioId}
          onCerrar={() => setRegistrandoAseo(false)}
          onGuardado={(mensaje) => {
            setRegistrandoAseo(false);
            setAvisoAseo(mensaje);
            setTimeout(() => setAvisoAseo((actual) => (actual === mensaje ? null : actual)), 3500);
          }}
        />
      )}

      {verHistorialAseo && (
        <HistorialAseoModal
          habitacionId={pieza.id}
          habitacionNumero={pieza.numero}
          onCerrar={() => setVerHistorialAseo(false)}
        />
      )}
    </Dialogo>
  );
}

function BotonPrincipal({
  children,
  onClick,
  disabled
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-brand-terracotta-deep px-4 py-3 text-sm font-bold text-white shadow-brand hover:brightness-110 transition-all duration-150 active:scale-[0.985] disabled:opacity-50"
    >
      {children}
    </button>
  );
}
