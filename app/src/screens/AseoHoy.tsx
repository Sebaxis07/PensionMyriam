import { Dialogo } from "../components/Dialogo";
import { useState, useMemo } from "react";
import { useQuery } from "@powersync/react";
import { powersync } from "../lib/powersync";
import { nuevoUuidIdempotente } from "../lib/idempotencia";
import { calcularPrioridadAseo, estaEnVentanaIdeal, type TipoClienteAseo } from "../features/aseo/prioridadAseo";
import { rangoHoySantiagoUTC } from "../lib/fechaNegocio";
import {
  IconBroom,
  IconCheck,
  IconCheckCircle,
  IconClock,
  IconSearch,
  IconSparkles,
  IconUser,
  IconWrench,
  IconAlertTriangle
} from "../components/Icons";

interface HabitacionAseoRow {
  id: string;
  numero: number;
  capacidad: number;
  estado: "disponible" | "ocupada" | "en_aseo" | "en_mantencion" | string;
  motivo_mantencion: string | null;
  huesped_actual: string | null;
  tipo_cliente_actual: TipoClienteAseo;
  checkin_fecha: string | null;
  ultimo_huesped: string | null;
  checkout_fecha: string | null;
  aseo_hoy_count: number;
  ultimo_aseo_fecha: string | null;
}

interface RegistroAseoHistorial {
  id: string;
  habitacion_id: string;
  tipo: string;
  fecha_hora: string;
  habitacion_numero: number;
  responsable_nombre: string;
}

const QUERY_HABITACIONES_ASEO = `
with active_checkin as (
  select * from (
    select c.habitacion_id, ci.id as checkin_id, r.huesped_nombre, r.tipo_cliente as tipo_cliente_actual,
           ci.fecha_hora as checkin_fecha,
           row_number() over (partition by c.habitacion_id order by ci.fecha_hora desc) as rn
    from checkin ci
    join reserva r on r.id = ci.reserva_id
    join cama c on c.id = r.cama_id
    left join checkout co on co.checkin_id = ci.id
    where co.checkin_id is null
  ) where rn = 1
),
ultimo_checkout as (
  select * from (
    select c.habitacion_id, co.fecha_hora as checkout_fecha, r.huesped_nombre,
           row_number() over (partition by c.habitacion_id order by co.fecha_hora desc) as rn
    from checkout co
    join checkin ci on ci.id = co.checkin_id
    join reserva r on r.id = ci.reserva_id
    join cama c on c.id = r.cama_id
  ) where rn = 1
),
aseos_resumen as (
  select habitacion_id, count(*) as aseo_hoy_count, max(fecha_hora) as ultimo_aseo_fecha
  from aseo
  where fecha_hora >= ? and fecha_hora < ?
  group by habitacion_id
)
select
  h.id,
  h.numero,
  h.capacidad,
  h.estado,
  h.motivo_mantencion,
  ac.huesped_nombre as huesped_actual,
  ac.tipo_cliente_actual,
  ac.checkin_fecha,
  uc.huesped_nombre as ultimo_huesped,
  uc.checkout_fecha,
  coalesce(ar.aseo_hoy_count, 0) as aseo_hoy_count,
  ar.ultimo_aseo_fecha
from habitacion h
left join active_checkin ac on ac.habitacion_id = h.id
left join ultimo_checkout uc on uc.habitacion_id = h.id
left join aseos_resumen ar on ar.habitacion_id = h.id
order by h.numero asc
`;

const QUERY_HISTORIAL_HOY = `
select
  a.id,
  a.habitacion_id,
  a.tipo,
  a.fecha_hora,
  h.numero as habitacion_numero,
  coalesce(u.nombre, 'Personal de turno') as responsable_nombre
from aseo a
join habitacion h on h.id = a.habitacion_id
left join usuario u on u.id = a.responsable
where a.fecha_hora >= ? and a.fecha_hora < ?
order by a.fecha_hora desc
limit 30
`;

function formatearHora(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

type FiltroTab = "pendientes" | "recambio" | "diarios" | "limpias" | "todas";

export function AseoHoy({ usuarioId }: { usuarioId: string }) {
  const { desde: desdeHoy, hasta: hastaHoy } = rangoHoySantiagoUTC();
  const { data: habitaciones = [] } = useQuery<HabitacionAseoRow>(QUERY_HABITACIONES_ASEO, [desdeHoy, hastaHoy]);
  const { data: historialHoy = [] } = useQuery<RegistroAseoHistorial>(QUERY_HISTORIAL_HOY, [desdeHoy, hastaHoy]);

  const [filtro, setFiltro] = useState<FiltroTab>("pendientes");
  const [busqueda, setBusqueda] = useState("");
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [guardandoMasivo, setGuardandoMasivo] = useState(false);
  const [mostrarConfirmacionMasiva, setMostrarConfirmacionMasiva] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [notificacionExito, setNotificacionExito] = useState<string | null>(null);

  // Clasificación de habitaciones
  const piezasRecambio = useMemo(
    () => habitaciones.filter((h) => h.estado === "en_aseo"),
    [habitaciones]
  );

  // HU-08: priorizar el horario en que el huésped está fuera de la
  // pieza (contratista en faena 06:00-19:00, turista temprano en la
  // mañana) — antes se mostraban todas las pendientes en el mismo
  // orden sin importar si el huésped probablemente seguía adentro.
  const horaActual = new Date().getHours();
  const piezasDiariasPendientes = useMemo(() => {
    return habitaciones
      .filter((h) => h.estado === "ocupada" && h.aseo_hoy_count === 0)
      .slice()
      .sort(
        (a, b) =>
          calcularPrioridadAseo(b.tipo_cliente_actual, horaActual) -
          calcularPrioridadAseo(a.tipo_cliente_actual, horaActual)
      );
  }, [habitaciones, horaActual]);

  const piezasLimpiasHoy = useMemo(
    () => habitaciones.filter((h) => h.aseo_hoy_count > 0 && h.estado !== "en_aseo"),
    [habitaciones]
  );

  const totalPendientes = piezasRecambio.length + piezasDiariasPendientes.length;

  // Cálculo de progreso general
  const totalRequeridas = piezasRecambio.length + piezasDiariasPendientes.length + piezasLimpiasHoy.length;
  const porcentajeAvance = totalRequeridas > 0 ? Math.round((piezasLimpiasHoy.length / totalRequeridas) * 100) : 100;

  // Filtrado reactivo de tarjetas
  const habitacionesFiltradas = useMemo(() => {
    return habitaciones.filter((h) => {
      // 1. Filtro por tab
      if (filtro === "pendientes") {
        const esRecambio = h.estado === "en_aseo";
        const esDiarioPendiente = h.estado === "ocupada" && h.aseo_hoy_count === 0;
        if (!esRecambio && !esDiarioPendiente) return false;
      } else if (filtro === "recambio") {
        if (h.estado !== "en_aseo") return false;
      } else if (filtro === "diarios") {
        if (h.estado !== "ocupada" || h.aseo_hoy_count > 0) return false;
      } else if (filtro === "limpias") {
        if (h.aseo_hoy_count === 0 || h.estado === "en_aseo") return false;
      }

      // 2. Filtro por buscador
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const coincideNumero = `pieza ${h.numero}`.includes(q) || `#${h.numero}`.includes(q) || `${h.numero}` === q;
        const coincideHuesped = h.huesped_actual?.toLowerCase().includes(q) ?? false;
        const coincideSalida = h.ultimo_huesped?.toLowerCase().includes(q) ?? false;
        return coincideNumero || coincideHuesped || coincideSalida;
      }

      return true;
    });
  }, [habitaciones, filtro, busqueda]);

  function mostrarAviso(mensaje: string) {
    setNotificacionExito(mensaje);
    setTimeout(() => {
      setNotificacionExito((prev) => (prev === mensaje ? null : prev));
    }, 3500);
  }

  // 1. Marcar aseo diario listo (la pieza sigue ocupada pero con aseo registrado hoy)
  async function marcarAseoDiario(habitacion: HabitacionAseoRow) {
    setProcesandoId(habitacion.id);
    try {
      await powersync.execute(
        "insert into aseo (id, habitacion_id, tipo, responsable, fecha_hora, uuid_idempotente) values (?, ?, 'diario', ?, ?, ?)",
        [crypto.randomUUID(), habitacion.id, usuarioId, new Date().toISOString(), nuevoUuidIdempotente()]
      );
      mostrarAviso(`✓ Aseo diario de Pieza #${habitacion.numero} registrado con éxito.`);
    } catch (err) {
      console.error(err);
      alert("No se pudo registrar el aseo diario. Intenta nuevamente.");
    } finally {
      setProcesandoId(null);
    }
  }

  // 2. Marcar aseo post checkout listo (libera la habitación a disponible)
  async function marcarAseoPostCheckout(habitacion: HabitacionAseoRow) {
    setProcesandoId(habitacion.id);
    try {
      await powersync.execute(
        "insert into aseo (id, habitacion_id, tipo, responsable, fecha_hora, uuid_idempotente) values (?, ?, 'post_checkout', ?, ?, ?)",
        [crypto.randomUUID(), habitacion.id, usuarioId, new Date().toISOString(), nuevoUuidIdempotente()]
      );
      // Para retroalimentación inmediata en la base de datos local SQLite:
      await powersync.execute(
        "update habitacion set estado = 'disponible' where id = ? and estado = 'en_aseo'",
        [habitacion.id]
      );
      mostrarAviso(`✨ Pieza #${habitacion.numero} desinfectada y liberada para nuevos huéspedes.`);
    } catch (err) {
      console.error(err);
      alert("No se pudo completar el aseo de salida. Intenta nuevamente.");
    } finally {
      setProcesandoId(null);
    }
  }

  // 3. Marcar todos los aseos diarios pendientes de una sola vez
  async function confirmarTodosLosDiarios() {
    if (!piezasDiariasPendientes.length) return;
    setGuardandoMasivo(true);
    try {
      for (const p of piezasDiariasPendientes) {
        await powersync.execute(
          "insert into aseo (id, habitacion_id, tipo, responsable, fecha_hora, uuid_idempotente) values (?, ?, 'diario', ?, ?, ?)",
          [crypto.randomUUID(), p.id, usuarioId, new Date().toISOString(), nuevoUuidIdempotente()]
        );
      }
      mostrarAviso(`✓ Se completó la ronda de aseo diario en ${piezasDiariasPendientes.length} habitaciones.`);
      setMostrarConfirmacionMasiva(false);
    } catch (err) {
      console.error(err);
      alert("Hubo un error al marcar los aseos masivos.");
    } finally {
      setGuardandoMasivo(false);
    }
  }

  return (
    <div className="ui-operativa mx-auto flex w-full max-w-6xl flex-col gap-5 pb-8 animate-fadeIn">
      {/* Toast de notificación flotante */}
      {notificacionExito && (
        <div role="status" aria-live="polite" className="fixed top-16 right-4 left-4 sm:left-auto sm:w-96 z-50 flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-900/95 text-white p-3.5 px-4 shadow-xl backdrop-blur-md animate-slideDown">
          <div className="flex items-center gap-2.5 text-sm font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
              ✓
            </span>
            <span>{notificacionExito}</span>
          </div>
          <button
            onClick={() => setNotificacionExito(null)}
            aria-label="Cerrar confirmación de aseo"
            className="text-white/80 hover:text-white font-bold text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Encabezado Principal Responsivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-terracotta-deep/15 text-brand-terracotta-deep">
              <IconBroom className="h-5 w-5" />
            </div>
            <h1 className="font-display text-2xl font-black text-brand-ink">
              Aseo diario y salidas
            </h1>
          </div>
          <p className="mt-1 text-sm text-brand-ink/80">
            Revisa qué habitaciones necesitan aseo y marca las que ya están listas.
          </p>
        </div>

        {/* Botón de historial de hoy */}
        <button
          onClick={() => setMostrarHistorial(!mostrarHistorial)}
          className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-bold transition self-start sm:self-auto ${
            mostrarHistorial
              ? "border-brand-terracotta bg-brand-sand text-brand-ink shadow-sm"
              : "border-brand-border bg-white text-brand-ink/80 hover:border-brand-border/80 hover:text-brand-ink"
          }`}
        >
          <IconClock className="h-4 w-4 text-brand-terracotta-deep" />
          <span>Bitácora de Hoy ({historialHoy.length})</span>
        </button>
      </div>

      {/* Panel de Métricas / KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* KPI 1: Recambio Urgente */}
        <button type="button" aria-pressed={filtro === "recambio"}
          onClick={() => setFiltro("recambio")}
          className={`cursor-pointer rounded-3xl border p-4 text-left transition-all ${
            filtro === "recambio"
              ? "border-rose-400 bg-rose-50/80 shadow-md ring-2 ring-rose-300"
              : "border-brand-border/70 bg-brand-card hover:bg-rose-50/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Salida / Recambio
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <IconAlertTriangle className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-black text-rose-900">
              {piezasRecambio.length}
            </span>
            <span className="text-sm font-medium text-rose-700">
              {piezasRecambio.length === 1 ? "por liberar" : "por liberar"}
            </span>
          </div>
          <p className="mt-1 text-xs text-brand-ink/80">Requieren cambio de sábanas</p>
        </button>

        {/* KPI 2: Diarios Pendientes */}
        <button type="button" aria-pressed={filtro === "diarios"}
          onClick={() => setFiltro("diarios")}
          className={`cursor-pointer rounded-3xl border p-4 text-left transition-all ${
            filtro === "diarios"
              ? "border-amber-400 bg-amber-50/80 shadow-md ring-2 ring-amber-300"
              : "border-brand-border/70 bg-brand-card hover:bg-amber-50/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Diario Pendiente
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-800">
              <IconBroom className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-black text-amber-900">
              {piezasDiariasPendientes.length}
            </span>
            <span className="text-sm font-medium text-amber-700">piezas ocupadas</span>
          </div>
          <p className="mt-1 text-xs text-brand-ink/80">Aseo matutino regular</p>
        </button>

        {/* KPI 3: Completados Hoy */}
        <button type="button" aria-pressed={filtro === "limpias"}
          onClick={() => setFiltro("limpias")}
          className={`cursor-pointer rounded-3xl border p-4 text-left transition-all ${
            filtro === "limpias"
              ? "border-emerald-400 bg-emerald-50/80 shadow-md ring-2 ring-emerald-300"
              : "border-brand-border/70 bg-brand-card hover:bg-emerald-50/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Aseos Listos Hoy
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <IconCheckCircle className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-black text-emerald-900">
              {piezasLimpiasHoy.length}
            </span>
            <span className="text-sm font-medium text-emerald-700">
              de {totalRequeridas || habitaciones.length}
            </span>
          </div>
          <p className="mt-1 text-xs text-brand-ink/80">Con registro de hoy</p>
        </button>

        {/* KPI 4: Progreso Global */}
        <div className="rounded-3xl border border-brand-border/70 bg-brand-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-ink/80">
              Cumplimiento Hoy
            </span>
            <span className="whitespace-nowrap text-sm font-black text-brand-terracotta-deep">{porcentajeAvance}%</span>
          </div>

          <div className="mt-2 space-y-1.5">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  porcentajeAvance === 100
                    ? "bg-emerald-600"
                    : porcentajeAvance > 50
                    ? "bg-amber-500"
                    : "bg-brand-terracotta-deep"
                }`}
                style={{ width: `${porcentajeAvance}%` }}
              />
            </div>
            <p className="text-xs text-right font-bold text-brand-ink">
              {totalPendientes === 0 ? "¡Todo al día!" : `${totalPendientes} pendientes restantes`}
            </p>
          </div>
        </div>
      </div>

      {/* Banner de Acción Masiva Rápida (si hay 2 o más diarios pendientes) */}
      {piezasDiariasPendientes.length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 md:px-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-900 font-black">
              ⚡
            </div>
            <div>
              <p className="text-sm md:text-sm font-bold text-amber-950">
                ¿Ronda matutina de aseo completada?
              </p>
              <p className="text-xs text-amber-900/80">
                Puedes registrar los {piezasDiariasPendientes.length} aseos diarios pendientes de una sola vez.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMostrarConfirmacionMasiva(true)}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-800 hover:bg-amber-900 px-4 py-2 text-sm font-bold text-white shadow-sm transition active:scale-95"
          >
            <IconCheck className="h-4 w-4" />
            <span>Marcar {piezasDiariasPendientes.length} diarios listos</span>
          </button>
        </div>
      )}

      {/* Bitácora de Aseos de Hoy (Colapsable) */}
      {mostrarHistorial && (
        <div className="rounded-3xl border border-brand-border/80 bg-brand-card p-5 shadow-card animate-fadeIn space-y-3">
          <div className="flex items-center justify-between border-b border-brand-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <IconClock className="h-4 w-4 text-brand-terracotta-deep" />
              <h3 className="font-display text-sm font-bold text-brand-ink">
                Historial de Aseos Registrados Hoy
              </h3>
            </div>
            <span className="text-sm font-semibold text-brand-ink/80">
              {historialHoy.length} {historialHoy.length === 1 ? "registro" : "registros"}
            </span>
          </div>

          {historialHoy.length === 0 ? (
            <p className="py-4 text-center text-sm text-brand-ink/80">
              Aún no se han registrado aseos durante la jornada de hoy.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {historialHoy.map((reg) => (
                <div
                  key={reg.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-brand-border/70 bg-white p-2.5 text-sm shadow-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 font-bold text-emerald-800 text-sm">
                      #{reg.habitacion_numero}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-brand-ink capitalize">
                        {reg.tipo === "post_checkout" ? "Recambio Salida" : "Aseo Diario"}
                      </p>
                      <p className="truncate text-xs text-brand-ink/80">
                        Por: {reg.responsable_nombre}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-bold text-brand-terracotta-deep">
                    {formatearHora(reg.fecha_hora)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Barra de Filtros y Buscador Táctil */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-brand-border/70 bg-brand-card p-3 shadow-sm">
        {/* Tabs de Filtro */}
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <button
            type="button"
            onClick={() => setFiltro("pendientes")}
            className={`flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition ${
              filtro === "pendientes"
                ? "bg-brand-terracotta-deep text-white shadow-sm"
                : "bg-brand-sand-deep text-brand-ink hover:bg-brand-sand"
            }`}
          >
            <span>Pendientes</span>
            {totalPendientes > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-xs font-black ${
                  filtro === "pendientes" ? "bg-white text-brand-terracotta-deep" : "bg-rose-600 text-white"
                }`}
              >
                {totalPendientes}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFiltro("recambio")}
            className={`flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition ${
              filtro === "recambio"
                ? "bg-rose-700 text-white shadow-sm"
                : "bg-brand-sand-deep text-brand-ink hover:bg-brand-sand"
            }`}
          >
            <span>Recambio Salida</span>
            {piezasRecambio.length > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-xs font-black ${
                  filtro === "recambio" ? "bg-white text-rose-700" : "bg-rose-100 text-rose-800"
                }`}
              >
                {piezasRecambio.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFiltro("diarios")}
            className={`flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition ${
              filtro === "diarios"
                ? "bg-amber-700 text-white shadow-sm"
                : "bg-brand-sand-deep text-brand-ink hover:bg-brand-sand"
            }`}
          >
            <span>Diarios</span>
            {piezasDiariasPendientes.length > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-xs font-black ${
                  filtro === "diarios" ? "bg-white text-amber-700" : "bg-amber-100 text-amber-800"
                }`}
              >
                {piezasDiariasPendientes.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFiltro("limpias")}
            className={`flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition ${
              filtro === "limpias"
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-brand-sand-deep text-brand-ink hover:bg-brand-sand"
            }`}
          >
            <span>Listas hoy ({piezasLimpiasHoy.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFiltro("todas")}
            className={`flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition ${
              filtro === "todas"
                ? "bg-brand-ink text-white shadow-sm"
                : "bg-brand-sand-deep text-brand-ink/80 hover:text-brand-ink"
            }`}
          >
            <span>Todas ({habitaciones.length})</span>
          </button>
        </div>

        {/* Buscador */}
        <div className="relative w-full md:w-56 shrink-0">
          <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-brand-ink/80" />
          <input
            type="text"
            aria-label="Buscar habitación o huésped para aseo"
                placeholder="Buscar por # o pasajero…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-xl border border-brand-border bg-white pl-9 pr-7 py-2 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-terracotta focus:outline-none"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="absolute right-2.5 top-2 text-sm font-bold text-brand-ink/80 hover:text-brand-ink"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Grid Principal de Habitaciones (Mobile y Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {habitacionesFiltradas.map((hab) => {
          const esRecambio = hab.estado === "en_aseo";
          const esOcupada = hab.estado === "ocupada";
          const esDiarioPendiente = esOcupada && hab.aseo_hoy_count === 0;
          const estaLimpiaHoy = hab.aseo_hoy_count > 0 && !esRecambio;
          const estaEnMantencion = hab.estado === "en_mantencion";
          const estaDisponible = hab.estado === "disponible";

          const procesando = procesandoId === hab.id;

          // Definición de borde y colores según prioridad
          let estiloCard = "border-brand-border/80 bg-brand-card";
          if (esRecambio) {
            estiloCard = "border-rose-400/90 bg-rose-50/50 shadow-sm ring-1 ring-rose-300/60";
          } else if (esDiarioPendiente) {
            estiloCard = "border-amber-300 bg-amber-50/40 shadow-sm";
          } else if (estaLimpiaHoy) {
            estiloCard = "border-emerald-300/80 bg-emerald-50/30";
          } else if (estaEnMantencion) {
            estiloCard = "border-stone-300 bg-stone-100/70 opacity-75";
          }

          return (
            <div
              key={hab.id}
              className={`flex flex-col justify-between rounded-3xl border p-4 sm:p-5 transition-all shadow-card hover:shadow-md ${estiloCard}`}
            >
              {/* Encabezado de la Tarjeta */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {/* Número de Habitación */}
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-display text-xl font-black shadow-sm ${
                        esRecambio
                          ? "bg-rose-600 text-white"
                          : esDiarioPendiente
                          ? "bg-amber-500 text-white"
                          : estaLimpiaHoy
                          ? "bg-emerald-600 text-white"
                          : "bg-brand-sand-deep text-brand-ink border border-brand-border/60"
                      }`}
                    >
                      #{hab.numero}
                    </div>

                    <div>
                      <h2 className="font-display text-base font-bold text-brand-ink leading-tight">
                        Pieza #{hab.numero}
                      </h2>
                      <p className="text-xs text-brand-ink/80">
                        Capacidad: {hab.capacidad} {hab.capacidad === 1 ? "cama" : "camas"}
                      </p>
                    </div>
                  </div>

                  {/* Badge de Estado Semántico */}
                  {esRecambio ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-2.5 py-1 text-xs font-black text-rose-800 uppercase tracking-wider motion-safe:animate-pulse">
                      <IconAlertTriangle className="h-3 w-3" />
                      Prioridad
                    </span>
                  ) : esDiarioPendiente ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                      Pendiente
                    </span>
                  ) : estaLimpiaHoy ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                      <IconCheckCircle className="h-3 w-3 text-emerald-700" />
                      Limpia hoy
                    </span>
                  ) : estaEnMantencion ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-700">
                      <IconWrench className="h-3 w-3" />
                      Mantención
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-brand-border bg-brand-sand-deep px-2.5 py-1 text-xs font-bold text-brand-ink/80">
                      Disponible
                    </span>
                  )}
                </div>

                {/* Información de Huésped / Situación */}
                <div className="rounded-2xl border border-brand-border/50 bg-white/80 p-3 space-y-1.5 text-sm">
                  {esRecambio && (
                    <>
                      <div className="flex items-center gap-1.5 text-rose-950 font-bold">
                        <IconSparkles className="h-4 w-4 text-rose-600 shrink-0" />
                        <span>Salida de huésped · Recambio de sábanas</span>
                      </div>
                      <p className="text-xs text-brand-ink/80 pl-5">
                        Último pasajero:{" "}
                        <strong className="text-brand-ink">{hab.ultimo_huesped || "No registrado"}</strong>
                      </p>
                    </>
                  )}

                  {esOcupada && (
                    <>
                      <div className="flex items-center gap-1.5 text-brand-ink font-bold">
                        <IconUser className="h-4 w-4 text-brand-terracotta-deep shrink-0" />
                        <span className="truncate">
                          Huésped: {hab.huesped_actual || "Pasajero activo"}
                        </span>
                      </div>
                      <p className="text-xs text-brand-ink/80 pl-5">
                        {esDiarioPendiente
                          ? estaEnVentanaIdeal(hab.tipo_cliente_actual, horaActual)
                            ? "⚠️ Aseo diario pendiente — huésped probablemente fuera ahora, buen momento"
                            : "⚠️ Aseo diario obligatorio de hoy pendiente"
                          : `✓ Aseo registrado hoy (${formatearHora(hab.ultimo_aseo_fecha)})`}
                      </p>
                    </>
                  )}

                  {estaDisponible && !estaLimpiaHoy && (
                    <p className="text-xs text-brand-ink/80">
                      Pieza sin ocupantes actuales. Lista para asignación.
                    </p>
                  )}

                  {estaDisponible && estaLimpiaHoy && (
                    <p className="text-xs text-emerald-800 font-semibold">
                      ✓ Liberada y limpia hoy ({formatearHora(hab.ultimo_aseo_fecha)}).
                    </p>
                  )}

                  {estaEnMantencion && (
                    <p className="text-xs text-stone-600">
                      Motivo: {hab.motivo_mantencion || "En revisión general"}
                    </p>
                  )}
                </div>
              </div>

              {/* Botones de Acción Táctil (Mínimo 48px de alto para dedos) */}
              <div className="mt-4 pt-3 border-t border-brand-border/50">
                {/* Caso 1: Pieza en Aseo (Salida reciente) */}
                {esRecambio && (
                  <button
                    type="button"
                    disabled={procesando}
                    onClick={() => marcarAseoPostCheckout(hab)}
                    className="w-full flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm sm:text-sm shadow-md transition active:scale-[0.98] disabled:opacity-50"
                  >
                    <IconSparkles className="h-4 w-4 text-emerald-200" />
                    <span>{procesando ? "Liberando pieza…" : "Completar Aseo y Liberar Pieza"}</span>
                  </button>
                )}

                {/* Caso 2: Pieza Ocupada con Aseo Pendiente */}
                {esDiarioPendiente && (
                  <button
                    type="button"
                    disabled={procesando}
                    onClick={() => marcarAseoDiario(hab)}
                    className="w-full flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-brand-terracotta-deep hover:bg-brand-terracotta-deep text-white font-bold text-sm sm:text-sm shadow-brand transition active:scale-[0.98] disabled:opacity-50"
                  >
                    <IconCheck className="h-4 w-4" />
                    <span>{procesando ? "Guardando…" : "Marcar Aseo Diario Listo"}</span>
                  </button>
                )}

                {/* Caso 3: Pieza que ya tuvo su aseo hoy */}
                {estaLimpiaHoy && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800">
                      <IconCheckCircle className="h-4 w-4 text-emerald-600" />
                      Aseo completado
                    </span>
                    <button
                      type="button"
                      disabled={procesando}
                      onClick={() => marcarAseoDiario(hab)}
                      className="rounded-xl border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold text-brand-ink/80 hover:text-brand-ink hover:bg-brand-sand-deep transition"
                    >
                      + Repaso
                    </button>
                  </div>
                )}

                {/* Caso 4: Pieza disponible que no requirió aseo hoy */}
                {estaDisponible && !estaLimpiaHoy && (
                  <button
                    type="button"
                    disabled={procesando}
                    onClick={() => marcarAseoDiario(hab)}
                    className="w-full flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-brand-border bg-white hover:bg-brand-sand-deep text-brand-ink text-sm font-bold transition"
                  >
                    <IconBroom className="h-3.5 w-3.5 text-brand-terracotta-deep" />
                    <span>Registrar aseo preventivo</span>
                  </button>
                )}

                {/* Caso 5: Mantención */}
                {estaEnMantencion && (
                  <p className="text-center text-xs text-stone-500 py-1 font-medium">
                    En mantenimiento · No disponible para aseo
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {habitacionesFiltradas.length === 0 && (
          <div className="col-span-full rounded-3xl border border-dashed border-brand-border bg-brand-card p-10 text-center space-y-3">
            <div className="ui-operativa mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <IconCheckCircle className="h-8 w-8" />
            </div>
            <h3 className="font-display text-lg font-bold text-brand-ink">
              {filtro === "pendientes"
                ? "¡Excelente! No hay aseos pendientes por el momento"
                : "No se encontraron habitaciones para este filtro"}
            </h3>
            <p className="text-sm text-brand-ink/80 max-w-sm mx-auto">
              {filtro === "pendientes"
                ? "Todas las habitaciones ocupadas y salidas ya fueron atendidas durante el día de hoy."
                : "Prueba seleccionando otra pestaña como 'Todas' o limpiando el texto del buscador."}
            </p>
            {filtro !== "todas" && (
              <button
                type="button"
                onClick={() => setFiltro("todas")}
                className="mt-2 rounded-xl bg-brand-sand px-4 py-2 text-sm font-bold text-brand-ink hover:bg-brand-sand/80 transition"
              >
                Ver todas las habitaciones
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de Confirmación para Registro Masivo */}
      {mostrarConfirmacionMasiva && (
        <Dialogo titulo="Confirmar aseo diario" onCerrar={() => setMostrarConfirmacionMasiva(false)} className="ui-operativa fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/50 p-4 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-md rounded-3xl border border-brand-border bg-brand-card p-6 shadow-2xl space-y-4 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 text-xl font-black">
              ⚡
            </div>

            <div>
              <h3 className="font-display text-lg font-black text-brand-ink">
                Confirmar Ronda de Aseo Diario
              </h3>
              <p className="mt-1 text-sm text-brand-ink/80 leading-relaxed">
                Estás a punto de marcar como listas las siguientes{" "}
                <strong>{piezasDiariasPendientes.length} habitaciones ocupadas</strong>:
              </p>
            </div>

            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 rounded-xl bg-brand-sand-deep border border-brand-border/60">
              {piezasDiariasPendientes.map((p) => (
                <span
                  key={p.id}
                  className="rounded-lg bg-white border border-brand-border px-2.5 py-1 text-sm font-bold text-brand-ink shadow-sm"
                >
                  Pieza #{p.numero} ({p.huesped_actual || "Ocupada"})
                </span>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMostrarConfirmacionMasiva(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-brand-ink/80 hover:text-brand-ink"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={guardandoMasivo}
                onClick={confirmarTodosLosDiarios}
                className="rounded-xl bg-amber-800 hover:bg-amber-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {guardandoMasivo ? "Registrando…" : "Sí, marcar todas como listas"}
              </button>
            </div>
          </div>
        </Dialogo>
      )}
    </div>
  );
}
