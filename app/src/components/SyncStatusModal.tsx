import { AvisoInterfaz, describirErrorUi } from "./MensajeInterfaz";
import { useConexionInterfaz } from "./useConexionInterfaz";
import { reintentarContratoRechazado } from "../features/reservaEmpresa/reintentarContratoRechazado";
import { RegistroRechazado } from "./RegistroRechazado";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { Dialogo } from "./Dialogo";
import { useEffect, useState } from "react";
import { powersync, connectPowerSync } from "../lib/powersync";
import { useQuery } from "@powersync/react";
import { useOperacionesRechazadas, resolverOperacionRechazada } from "../features/sync/operacionesRechazadas";
import {
  IconClose,
  IconRefresh,
  IconUser
} from "./Icons";

interface UsuarioRow {
  id: string;
  nombre: string;
  rol: string;
}

interface SyncStatusModalProps {
  usuarioId: string;
  onCerrar: () => void;
}

export function SyncStatusModal({ usuarioId, onCerrar }: SyncStatusModalProps) {
  const rechazos = useOperacionesRechazadas();
  const [errorRevision, setErrorRevision] = useState<string | null>(null);
  const [resolviendoId, setResolviendoId] = useState<string | null>(null);
  const [mensajeRecuperacion, setMensajeRecuperacion] = useState<string | null>(null);
  const online = useConexionInterfaz();

  async function handleResolver(id: string) {
    setResolviendoId(id);
    try {
      await resolverOperacionRechazada(id, usuarioId);
    } finally {
      setResolviendoId(null);
    }
  }

  const [conectado, setConectado] = useState(powersync.currentStatus?.connected ?? false);
  const [tienePendientes, setTienePendientes] = useState(
    Boolean(powersync.currentStatus?.dataFlowStatus?.uploading)
  );
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Date | undefined>(
    powersync.currentStatus?.lastSyncedAt
  );
  const [operacionesEnCola, setOperacionesEnCola] = useState<number>(0);
  const [comprobando, setComprobando] = useState(false);

  // Consultar miembros del equipo
  const { data: usuarios } = useQuery<UsuarioRow>(
    "select id, nombre, rol from usuario order by rol asc"
  );

  // Consultar últimas acciones registradas por usuario para ver actividad
  const { data: ultimasAcciones } = useQuery<{ usuario_id: string; fecha_hora: string }>(
    `select registrado_por as usuario_id, max(fecha_hora) as fecha_hora
     from consumo
     group by registrado_por
     union all
     select realizado_por as usuario_id, max(fecha_hora) as fecha_hora
     from checkin
     group by realizado_por`
  );

  useEffect(() => {
    async function actualizarCola() {
      try {
        const crud = await powersync.getAll<{ n: number }>(
          "select count(*) as n from ps_crud"
        );
        setOperacionesEnCola(crud[0]?.n ?? 0);
      } catch {
        // En caso de que ps_crud no sea consultable directamente
        setOperacionesEnCola(powersync.currentStatus?.dataFlowStatus?.uploading ? 1 : 0);
      }
    }

    actualizarCola();

    const disposable = powersync.registerListener({
      statusChanged: (status) => {
        setConectado(status.connected);
        setTienePendientes(Boolean(status.dataFlowStatus?.uploading));
        setUltimaSincronizacion(status.lastSyncedAt);
        actualizarCola();
      }
    });

    return () => {
      disposable?.();
    };
  }, []);

  async function handleComprobarConexion() {
    setComprobando(true);
    try {
      await connectPowerSync();
    } catch {
      // Ignorar error para no romper la UI
    } finally {
      setComprobando(false);
    }
  }

  // Mapa de última actividad por usuario
  const mapaActividad = new Map<string, string>();
  (ultimasAcciones ?? []).forEach((a) => {
    const prev = mapaActividad.get(a.usuario_id);
    if (!prev || a.fecha_hora > prev) {
      mapaActividad.set(a.usuario_id, a.fecha_hora);
    }
  });

  return (
    <Dialogo titulo="Estado de tus registros" onCerrar={onCerrar} className="ui-operativa fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-brand-border bg-brand-card p-6 shadow-2xl space-y-5">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-terracotta-deep">
              Guardado en este celular
            </p>
            <h3 className="font-display text-xl font-bold text-brand-ink">
              Estado de tus registros
            </h3>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar estado de tus registros"
            className="rounded-full p-2 text-brand-ink/80 hover:bg-brand-sand hover:text-brand-ink"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        {/* Estado del propio dispositivo */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-brand-ink/80">
            Este Dispositivo
          </h4>
          <SyncStatusBadge />

          <div className="rounded-2xl border border-brand-border/80 bg-white p-4 space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-brand-ink/80">Conexión:</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    conectado ? "bg-emerald-500 motion-safe:animate-pulse" : "bg-stone-400"
                  }`}
                />
                <span className="text-sm font-bold text-brand-ink">
                  {conectado ? "Conectado" : "Sin conexión"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-border/50 pt-2.5">
              <span className="text-sm text-brand-ink/80">Cambios por enviar:</span>
              <span
                className={`text-sm font-bold ${
                  tienePendientes || operacionesEnCola > 0
                    ? "text-amber-700"
                    : "text-emerald-700"
                }`}
              >
                {operacionesEnCola > 0
                  ? `${operacionesEnCola} pendiente(s)`
                  : tienePendientes
                  ? "Sincronizando…"
                  : "Sin envíos pendientes"}
              </span>
            </div>

            {ultimaSincronizacion && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-border/50 pt-2.5 text-sm text-brand-ink/80">
                <span>Última actualización:</span>
                <span className="whitespace-nowrap font-semibold text-brand-ink">
                  {ultimaSincronizacion.toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        <p className="text-sm leading-relaxed text-brand-ink">
          Sin internet puedes seguir trabajando. Los cambios quedan en este celular y se envían automáticamente cuando vuelve la conexión.
        </p>

        {/* Estado del Equipo */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-brand-ink/80">
            Dispositivos del Equipo
          </h4>

          <div className="rounded-2xl border border-brand-border/80 bg-white p-3 divide-y divide-brand-border/40 shadow-sm">
            {(usuarios ?? []).map((u) => {
              const act = mapaActividad.get(u.id);
              const esAdmin = u.rol === "administradora";

              return (
                <div key={u.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <IconUser className="h-4 w-4 text-brand-terracotta-deep" />
                    <div>
                      <span className="font-bold text-brand-ink block">{u.nombre}</span>
                      <span className="text-xs text-brand-ink/80 uppercase">
                        {esAdmin ? "Administradora" : "Encargada de Registro"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-brand-ink/80 block">Última actividad:</span>
                    <span className="text-sm font-semibold text-brand-ink">
                      {act
                        ? new Date(act).toLocaleDateString("es-CL", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : "Sin registros hoy"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <section aria-label="Registros que necesitan atención" className="space-y-3">
          <h4 className="font-display text-lg font-bold text-brand-ink">
            {rechazos.length > 0 ? `${rechazos.length} registros necesitan revisión` : "Sin registros rechazados por revisar"}
          </h4>
          {rechazos.length > 0 && <p className="text-sm leading-relaxed text-brand-ink/80">Estos registros no fueron aceptados. No están sincronizados, aunque no queden cambios por enviar.</p>}
          {errorRevision && <AvisoInterfaz tono="error">{errorRevision}</AvisoInterfaz>}
          {mensajeRecuperacion && <AvisoInterfaz tono="exito">{mensajeRecuperacion}</AvisoInterfaz>}
          {rechazos.map((r) => (
            <RegistroRechazado key={r.id} registro={r} resolviendo={resolviendoId === r.id}
              sinConexion={!online}
              onReintentar={r.tabla === "contrato_empresa" && r.operacion === "PUT" && usuarios?.find(u => u.id === usuarioId)?.rol === "administradora" ? async () => {
                setErrorRevision(null); setMensajeRecuperacion(null); setResolviendoId(r.id);
                try {
                  await reintentarContratoRechazado(r, usuarioId);
                  setMensajeRecuperacion("Contrato confirmado en el servidor. El aviso queda conservado como resuelto.");
                } catch (err) { setErrorRevision(describirErrorUi(err instanceof Error ? err.message : "No se pudo reintentar el contrato.")); }
                finally { setResolviendoId(null); }
              } : undefined}
              onResolver={(id) => {
                setErrorRevision(null);
                handleResolver(id).catch(() => setErrorRevision("No se pudo guardar la revisión. El registro sigue pendiente; intenta nuevamente."));
              }} />
          ))}
        </section>

        {/* Botón de Comprobación */}
        <div className="flex justify-between items-center pt-2">
          <button
            onClick={handleComprobarConexion}
            disabled={comprobando}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm font-bold text-brand-ink hover:bg-brand-sand/40 disabled:opacity-50"
          >
            <IconRefresh className={`h-3.5 w-3.5 ${comprobando ? "motion-safe:animate-spin" : ""}`} />
            <span>{comprobando ? "Comprobando…" : "Reconectar"}</span>
          </button>

          <button
            onClick={onCerrar}
            className="rounded-xl bg-brand-terracotta-deep hover:bg-brand-terracotta-deep px-4 py-2 text-sm font-bold text-white shadow-brand"
          >
            Aceptar
          </button>
        </div>
      </div>
    </Dialogo>
  );
}
