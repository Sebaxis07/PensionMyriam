import { useEffect, useState } from "react";
import { powersync, connectPowerSync } from "../lib/powersync";
import { useQuery } from "@powersync/react";
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
  onCerrar: () => void;
}

export function SyncStatusModal({ onCerrar }: SyncStatusModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-brand-border bg-brand-card p-6 shadow-2xl space-y-5">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-terracotta">
              Conectividad y Offline
            </p>
            <h3 className="font-display text-xl font-bold text-brand-ink">
              Estado de Sincronización
            </h3>
          </div>
          <button
            onClick={onCerrar}
            className="rounded-full p-2 text-brand-muted hover:bg-brand-sand hover:text-brand-ink"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        {/* Estado del propio dispositivo */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted">
            Este Dispositivo
          </h4>

          <div className="rounded-2xl border border-brand-border/80 bg-white p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-brand-muted">Conexión con el servidor:</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    conectado ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
                  }`}
                />
                <span className="text-xs font-bold text-brand-ink">
                  {conectado ? "En línea (Conectado)" : "Sin conexión (Modo Offline)"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-brand-border/50 pt-2.5">
              <span className="text-xs text-brand-muted">Operaciones pendientes en cola:</span>
              <span
                className={`text-xs font-bold ${
                  tienePendientes || operacionesEnCola > 0
                    ? "text-amber-700"
                    : "text-emerald-700"
                }`}
              >
                {operacionesEnCola > 0
                  ? `${operacionesEnCola} pendiente(s)`
                  : tienePendientes
                  ? "Sincronizando…"
                  : "Todo al día"}
              </span>
            </div>

            {ultimaSincronizacion && (
              <div className="flex items-center justify-between border-t border-brand-border/50 pt-2.5 text-xs text-brand-muted">
                <span>Último contacto exitoso:</span>
                <span className="font-semibold text-brand-ink">
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

        {/* Estado del Equipo */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted">
            Dispositivos del Equipo
          </h4>

          <div className="rounded-2xl border border-brand-border/80 bg-white p-3 divide-y divide-brand-border/40 shadow-sm">
            {(usuarios ?? []).map((u) => {
              const act = mapaActividad.get(u.id);
              const esAdmin = u.rol === "administradora";

              return (
                <div key={u.id} className="flex items-center justify-between py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <IconUser className="h-4 w-4 text-brand-terracotta" />
                    <div>
                      <span className="font-bold text-brand-ink block">{u.nombre}</span>
                      <span className="text-[10px] text-brand-muted uppercase">
                        {esAdmin ? "Administradora" : "Encargada de Registro"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-brand-muted block">Última actividad:</span>
                    <span className="text-xs font-semibold text-brand-ink">
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

        {/* Botón de Comprobación */}
        <div className="flex justify-between items-center pt-2">
          <button
            onClick={handleComprobarConexion}
            disabled={comprobando}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border bg-white px-3.5 py-2 text-xs font-bold text-brand-ink hover:bg-brand-sand/40 disabled:opacity-50"
          >
            <IconRefresh className={`h-3.5 w-3.5 ${comprobando ? "animate-spin" : ""}`} />
            <span>{comprobando ? "Comprobando…" : "Reconectar"}</span>
          </button>

          <button
            onClick={onCerrar}
            className="rounded-xl bg-brand-terracotta hover:bg-brand-terracotta-deep px-4 py-2 text-xs font-bold text-white shadow-brand"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
