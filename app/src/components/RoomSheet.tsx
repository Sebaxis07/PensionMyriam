import { CancelarReservaModal } from "../features/reservas/CancelarReservaModal";
import { Dialogo } from "./Dialogo";
import { useState } from "react";
import { powersync } from "../lib/powersync";
import { nuevoUuidIdempotente } from "../lib/idempotencia";
import type { PiezaRow } from "../lib/queries";
import {
  IconBell,
  IconBroom,
  IconDoorExit,
  IconPlus,
  IconUnlock,
  IconUsers,
  IconWrench
} from "./Icons";

const MOTIVOS_MANTENCION = ["Gas", "Baño", "Electricidad", "Otro"];

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

  async function checkin() {
    if (!pieza.reserva_id || pieza.reserva_sin_identificar) return;
    setGuardando(true);
    // El cambio de color/estado de la pieza (Disponible -> Ocupada) lo
    // hace un trigger en Postgres (app.checkin_ocupa_habitacion) — eso
    // es la verdad del servidor, pero solo corre cuando esta operación
    // sincroniza. Replicarlo acá en la escritura local (misma
    // transacción de PowerSync) es lo que hace que la pantalla se
    // actualice al instante también sin conexión (HU-27); cuando
    // sincroniza, el trigger confirma exactamente el mismo valor.
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
    // Mismo motivo que en checkin(): app.checkout_dispara_aseo en
    // Postgres deja la pieza "en_aseo" al sincronizar; se adelanta acá
    // para que se vea al instante sin conexión.
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
    // Mismo motivo: app.aseo_completado_libera_habitacion (solo para
    // tipo = post_checkout, igual que acá) libera la pieza al
    // sincronizar; se adelanta para verse al instante sin conexión.
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
    <Dialogo titulo="Acciones de habitación" onCerrar={onClose} className="ui-operativa fixed inset-0 z-30 flex items-end md:items-center justify-center bg-brand-ink/45 p-0 md:p-4 backdrop-blur-sm transition-all">
      <div
        className="w-full max-w-md md:max-w-lg rounded-t-3xl md:rounded-3xl border border-brand-border/60 bg-brand-card p-5 md:p-7 pb-8 shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tirador táctil visible en mobile */}
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-brand-border md:hidden" />

        {marcandoMantencion ? (
          <>
            <div className="flex items-center gap-2">
              <IconWrench className="h-6 w-6 text-stone-600" />
              <h2 className="font-display text-2xl font-bold text-brand-ink">
                Mantención — Pieza #{pieza.numero}
              </h2>
            </div>
            <p className="mt-1 text-sm text-brand-ink/80">
              Selecciona el motivo del bloqueo de la habitación:
            </p>

            <div className="mt-4">
              <label htmlFor="motivo-mantencion" className="mb-1 block text-sm font-bold uppercase tracking-wider text-brand-ink/80">
                Motivo
              </label>
              <select id="motivo-mantencion"
                className="w-full rounded-xl border border-brand-border bg-white p-3.5 text-base font-medium text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              >
                {MOTIVOS_MANTENCION.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>

            <BotonPrincipal disabled={guardando} onClick={confirmarMantencion}>
              <IconWrench className="h-5 w-5" />
              <span>{guardando ? "Guardando mantención…" : "Confirmar mantención"}</span>
            </BotonPrincipal>

            <button
              onClick={() => setMarcandoMantencion(false)}
              className="mt-3 w-full py-2.5 text-center text-sm font-semibold text-brand-ink/80 hover:text-brand-ink"
            >
              Volver atrás
            </button>
          </>
        ) : (
          <>
            {/* Cabecera con número e insignias */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-3xl font-extrabold text-brand-ink">
                  Pieza #{pieza.numero}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md border border-brand-border bg-brand-sand/40 px-2 py-0.5 text-sm font-bold text-brand-ink">
                    <IconUsers className="h-3.5 w-3.5 text-brand-ink/80" />
                    {pieza.capacidad} personas
                  </span>
                  <span className="text-sm font-semibold text-brand-ink/80">
                    {ESTADO_LABEL[pieza.estado] ?? pieza.estado}
                  </span>
                </div>
              </div>
            </div>

            {/* Información contextual según el estado */}
            <div className="mt-4 rounded-xl border border-brand-border/60 bg-brand-sand/20 p-3.5 text-sm">
              {pieza.huesped_actual && (
                <p className="font-bold text-brand-ink">
                  Huésped: <span className="font-semibold text-brand-terracotta-deep">{pieza.huesped_actual}</span>
                </p>
              )}

              {pieza.estado === "disponible" && pieza.reserva_id && !pieza.reserva_sin_identificar && (
                <div className="space-y-1">
                  <p className="font-semibold text-brand-ink">
                    Reserva para hoy: <strong className="text-brand-terracotta-deep">{pieza.reserva_nombre}</strong>
                  </p>
                  <p className="text-sm text-brand-ink/80">
                    Modalidad: {pieza.reserva_tipo === "empresa" ? "Trabajador de empresa" : "Turista independiente"}
                  </p>
                </div>
              )}

              {pieza.estado === "disponible" && !pieza.reserva_id && (
                <p className="text-brand-ink/80">
                  Habitación limpia y lista para recibir nuevos pasajeros.
                </p>
              )}

              {pieza.estado === "ocupada" && (
                <p className="text-brand-ink/80">
                  Habitación actualmente en uso. Al registrar la salida pasará automáticamente a estado de aseo.
                </p>
              )}

              {pieza.estado === "en_aseo" && (
                <p className="text-brand-ink/80">
                  Aseo de cambio de sábanas y desinfección pendiente tras la salida del huésped.
                </p>
              )}

              {pieza.estado === "en_mantencion" && (
                <p className="text-brand-ink/80">
                  Fuera de servicio por motivo: <strong className="text-brand-ink">{pieza.motivo_mantencion}</strong>
                </p>
              )}
            </div>

            {!!pieza.reserva_sin_identificar && <div className="mt-4 space-y-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-bold">Cama reservada · Falta identificar a la persona</p><p>Completa el nombre en Nómina y Camas antes de registrar la llegada.</p>{onIrAEmpresas && <button onClick={onIrAEmpresas} className="min-h-11 rounded-xl border border-brand-border bg-white px-4 py-2 font-bold">Ir a Empresas</button>}</div>}
            {/* Acción Primaria según Divulgación Progresiva */}
            {pieza.estado === "disponible" && pieza.reserva_id && (
              <BotonPrincipal disabled={guardando} onClick={checkin}>
                <IconBell className="h-5 w-5" />
                <span>{guardando ? "Guardando ingreso…" : "Registrar ingreso"}</span>
              </BotonPrincipal>
            )}

            {pieza.estado === "disponible" && !pieza.reserva_id && (
              <BotonPrincipal disabled={guardando} onClick={() => onIrAReservar(pieza.id)}>
                <IconPlus className="h-5 w-5" />
                <span>Crear reserva para esta pieza</span>
              </BotonPrincipal>
            )}

            {pieza.estado === "ocupada" && (
              <BotonPrincipal disabled={guardando} onClick={salio}>
                <IconDoorExit className="h-5 w-5" />
                <span>{guardando ? "Guardando salida…" : "Registrar salida"}</span>
              </BotonPrincipal>
            )}

            {pieza.estado === "en_aseo" && (
              <BotonPrincipal disabled={guardando} onClick={aseoListo}>
                <IconBroom className="h-5 w-5" />
                <span>{guardando ? "Guardando aseo…" : "Completar aseo"}</span>
              </BotonPrincipal>
            )}

            {pieza.estado === "en_mantencion" && (
              <BotonPrincipal disabled={guardando} onClick={liberarMantencion}>
                <IconUnlock className="h-5 w-5" />
                <span>{guardando ? "Guardando…" : "Liberar pieza a disponible"}</span>
              </BotonPrincipal>
            )}

            {/* Acción secundaria para marcar mantención */}
            {(pieza.estado === "disponible" || pieza.estado === "en_aseo") && (
              <button
                className="mt-3 flex w-full items-center justify-center gap-1.5 py-2.5 text-sm font-bold uppercase tracking-wider text-brand-ink/80 hover:text-brand-ink"
                onClick={() => setMarcandoMantencion(true)}
              >
                <IconWrench className="h-3.5 w-3.5" />
                <span>Marcar en mantención</span>
              </button>
            )}

      {!pieza.checkin_activo_id && pieza.reserva_id && pieza.reserva_tipo === "turista" && <button onClick={() => setCancelando(true)} className="mt-3 w-full rounded-xl border border-brand-terracotta-deep bg-brand-card px-4 py-3 text-sm font-bold text-brand-terracotta-deep">Cancelar reserva</button>}
            <button
              onClick={onClose}
              className="mt-2 w-full py-2.5 text-center text-sm font-semibold text-brand-ink/80 hover:text-brand-ink"
            >
              Cerrar
            </button>
          </>
        )}

      </div>

      {cancelando && pieza.reserva_id && <CancelarReservaModal reservaId={pieza.reserva_id} nombre={pieza.reserva_nombre ?? "Huésped"} usuarioId={usuarioId} onCerrar={() => setCancelando(false)} onCancelada={onClose}/>}
    </Dialogo>
  );
}

const ESTADO_LABEL: Record<string, string> = {
  disponible: "Disponible",
  ocupada: "Ocupada",
  en_aseo: "En aseo",
  en_mantencion: "En mantención"
};

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
      className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-brand-terracotta-deep px-4 py-3.5 text-base font-bold text-white shadow-brand transition-all duration-150 hover:bg-brand-terracotta-deep active:scale-[0.98] disabled:opacity-50"
    >
      {children}
    </button>
  );
}
