import { FormEvent, useMemo, useState } from "react";
import { useQuery } from "@powersync/react";
import { powersync } from "../lib/powersync";
import { nuevoUuidIdempotente } from "../lib/idempotencia";
import { fechaHoySantiago, sumarDiasYMD } from "../lib/fechaNegocio";
import {
  IconBed,
  IconCalendar,
  IconCheck,
  IconCheckCircle,
  IconFileText,
  IconUser,
  IconUsers,
  IconWrench
} from "../components/Icons";
import {
  descargarVoucherTuristaPdf,
  type DatosVoucherTurista
} from "../features/reportes/generarVoucherTuristaPdf";
import { abrirEnlaceWhatsApp } from "../features/reservas/compartirWhatsApp";
import { formatearMonedaCLP } from "../lib/pdf/pdfMakeConfig";
import { useConfigPension } from "../features/perfil/useConfigPension";
import { formatearMensajeConflicto } from "../features/reservas/conflictoReserva";

interface HabitacionItem {
  id: string;
  numero: number;
  capacidad: number;
  estado: string;
  motivo_mantencion: string | null;
}

interface CamaItem {
  id: string;
  habitacion_id: string;
  numero: number;
}

interface ReservaOcupante {
  id: string;
  cama_id: string;
  habitacion_id: string;
  ocupante: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  tipo_cliente: string;
}

function formatearFechaCorta(fechaIso: string): string {
  if (!fechaIso) return "";
  try {
    const [y, m, d] = fechaIso.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return fechaIso;
  }
}

export function Reservar({
  usuarioId,
  preseleccion,
  fechaPreseleccionada,
  onListo
}: {
  usuarioId: string;
  preseleccion?: string | null;
  fechaPreseleccionada?: string;
  onListo: () => void;
}) {
  const fechaInicial = fechaPreseleccionada || fechaHoySantiago();
  const [desde, setDesde] = useState(fechaInicial);
  const [hasta, setHasta] = useState(sumarDiasYMD(fechaInicial, 1));
  const [habitacionSeleccionadaId, setHabitacionSeleccionadaId] = useState<string | null>(
    preseleccion || null
  );
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeBloqueo, setMensajeBloqueo] = useState<string | null>(null);
  const [reservaConfirmada, setReservaConfirmada] = useState<DatosVoucherTurista | null>(null);

  // 1. Consultar todas las habitaciones
  const { data: habitacionesRaw, isLoading: cargandoHabitaciones } = useQuery<HabitacionItem>(
    "select id, numero, capacidad, estado, motivo_mantencion from habitacion order by numero asc"
  );
  const habitaciones = habitacionesRaw ?? [];

  // 2. Consultar todas las camas
  const { data: camasRaw } = useQuery<CamaItem>(
    "select id, habitacion_id, numero from cama order by numero asc"
  );
  const camas = camasRaw ?? [];

  // 3. Consultar reservas que se traslapan con el rango [desde, hastaFinal]
  const fechaFinEfectiva = hasta && hasta >= desde ? hasta : desde;

  const { data: reservasSolapadas } = useQuery<ReservaOcupante>(
    `select r.id, r.cama_id, c.habitacion_id,
            coalesce(r.huesped_nombre, t.nombre, 'Pasajero') as ocupante,
            r.fecha_inicio, r.fecha_fin, r.tipo_cliente
     from reserva r
     join cama c on c.id = r.cama_id
     left join trabajador t on t.id = r.trabajador_id
     where r.estado in ('confirmada', 'en_curso')
       and date(r.fecha_inicio) <= date(?)
       and (r.fecha_fin is null or date(r.fecha_fin) >= date(?))`,
    [fechaFinEfectiva, desde]
  );

  // Calcular disponibilidad detallada por habitación para las fechas elegidas
  const estadoHabitaciones = useMemo(() => {
    const mapa = new Map<
      string,
      {
        habitacion: HabitacionItem;
        disponible: boolean;
        enMantencion: boolean;
        camasLibres: CamaItem[];
        ocupantes: { nombre: string; desde: string; hasta: string | null }[];
      }
    >();

    const camasOcupadasIds = new Set<string>();
    const ocupantesPorHabitacion = new Map<
      string,
      { nombre: string; desde: string; hasta: string | null }[]
    >();

    (reservasSolapadas ?? []).forEach((r) => {
      camasOcupadasIds.add(r.cama_id);
      const list = ocupantesPorHabitacion.get(r.habitacion_id) || [];
      list.push({
        nombre: r.ocupante,
        desde: r.fecha_inicio,
        hasta: r.fecha_fin
      });
      ocupantesPorHabitacion.set(r.habitacion_id, list);
    });

    habitaciones.forEach((hab) => {
      const camasHab = camas.filter((c) => c.habitacion_id === hab.id);
      const camasLibres = camasHab.filter((c) => !camasOcupadasIds.has(c.id));
      const enMantencion = hab.estado === "en_mantencion";
      const disponible = !enMantencion && camasLibres.length > 0;

      mapa.set(hab.id, {
        habitacion: hab,
        disponible,
        enMantencion,
        camasLibres,
        ocupantes: ocupantesPorHabitacion.get(hab.id) || []
      });
    });

    return mapa;
  }, [habitaciones, camas, reservasSolapadas]);

  // Habitación activa seleccionada
  const infoSeleccionada = habitacionSeleccionadaId
    ? estadoHabitaciones.get(habitacionSeleccionadaId)
    : null;

  // Si la habitación seleccionada pasa a estar ocupada por cambio de fechas, alertar
  const habitacionElegidaValida = infoSeleccionada?.disponible ?? false;

  // Cálculo de noches y tarifa
  const noches = useMemo(() => {
    if (!desde) return 1;
    if (!hasta || hasta <= desde) return 1;
    try {
      const [y1, m1, d1] = desde.split("-").map(Number);
      const [y2, m2, d2] = hasta.split("-").map(Number);
      const dt1 = new Date(y1, m1 - 1, d1).getTime();
      const dt2 = new Date(y2, m2 - 1, d2).getTime();
      const diff = Math.round((dt2 - dt1) / (1000 * 60 * 60 * 24));
      return Math.max(1, diff);
    } catch {
      return 1;
    }
  }, [desde, hasta]);

  // HU-03: tarifa base vigente, configurable en HU-39 — ya no un literal.
  const { config: configPension } = useConfigPension();
  const tarifaNoche = configPension.tarifaBaseNoche;
  const totalEstimado = noches * tarifaNoche;

  // Cantidad de habitaciones libres
  const totalLibres = useMemo(() => {
    let count = 0;
    estadoHabitaciones.forEach((v) => {
      if (v.disponible) count++;
    });
    return count;
  }, [estadoHabitaciones]);

  function handleSeleccionarHabitacion(habId: string) {
    const estado = estadoHabitaciones.get(habId);
    if (!estado) return;

    if (estado.enMantencion) {
      setMensajeBloqueo(
        `La Pieza #${estado.habitacion.numero} está actualmente en mantención${
          estado.habitacion.motivo_mantencion ? `: "${estado.habitacion.motivo_mantencion}"` : "."
        }`
      );
      return;
    }

    if (!estado.disponible) {
      const primerOcupante = estado.ocupantes[0];
      const periodoTexto = primerOcupante
        ? `ocupada por ${primerOcupante.nombre} (${formatearFechaCorta(
            primerOcupante.desde
          )} al ${formatearFechaCorta(primerOcupante.hasta || "indefinido")})`
        : "ocupada";
      setMensajeBloqueo(
        `La Pieza #${estado.habitacion.numero} no tiene camas libres en el rango seleccionado: ${periodoTexto}.`
      );
      return;
    }

    setMensajeBloqueo(null);
    setHabitacionSeleccionadaId(habId);
  }

  async function confirmarReserva(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!habitacionSeleccionadaId || !infoSeleccionada || !infoSeleccionada.disponible) {
      setError("Por favor selecciona una habitación disponible para las fechas indicadas.");
      return;
    }

    if (!nombre.trim()) {
      setError("Por favor ingresa el nombre del pasajero.");
      return;
    }

    const camaElegida = infoSeleccionada.camasLibres[0];
    if (!camaElegida) {
      setError("No hay camas libres disponibles en la habitación seleccionada.");
      return;
    }

    setGuardando(true);
    const nuevoId = crypto.randomUUID();

    try {
      await powersync.execute(
        `insert into reserva
           (id, tipo_cliente, cama_id, huesped_nombre, fecha_inicio, fecha_fin, estado, creado_por, uuid_idempotente, created_at)
         values (?, 'turista', ?, ?, ?, ?, 'confirmada', ?, ?, ?)`,
        [
          nuevoId,
          camaElegida.id,
          nombre.trim(),
          desde,
          hasta || null,
          usuarioId,
          nuevoUuidIdempotente(),
          new Date().toISOString()
        ]
      );

      setReservaConfirmada({
        reservaId: nuevoId,
        huespedNombre: nombre.trim(),
        habitacionNumero: infoSeleccionada.habitacion.numero,
        fechaInicio: desde,
        fechaFin: hasta || null,
        nochesEstimadas: noches,
        tarifaNoche
      });
    } catch (err) {
      console.error(err);
      // HU-01: el criterio exige indicar CON QUÉ reserva choca, no solo
      // que chocó. La verificación previa (estadoHabitaciones) ya evita
      // esto en el caso normal; este catch solo se alcanza ante una
      // condición de carrera real (otro dispositivo reservó la misma
      // cama/fecha en el instante entre que se mostró la grilla y se
      // confirmó), que el EXCLUDE de la base detecta siempre. Se
      // vuelve a consultar para poder nombrar a quién choca.
      let detalleConflicto = "";
      try {
        const conflictos = await powersync.getAll<{ huesped_nombre: string | null; fecha_inicio: string; fecha_fin: string | null }>(
          `select huesped_nombre, fecha_inicio, fecha_fin from reserva
           where cama_id = ? and estado in ('confirmada', 'en_curso')
             and date(fecha_inicio) <= date(?)
             and (fecha_fin is null or date(fecha_fin) >= date(?))
           order by fecha_inicio asc limit 1`,
          [camaElegida.id, fechaFinEfectiva, desde]
        );
        detalleConflicto = formatearMensajeConflicto(conflictos[0]);
      } catch {
        // Si ni siquiera se puede releer el conflicto, se deja el
        // mensaje genérico de abajo — no debe impedir informar el error.
      }
      setError(
        `No se pudo completar la reserva: la cama se ocupó recientemente.${detalleConflicto} Elige otra habitación o fecha e intenta de nuevo.`
      );
    } finally {
      setGuardando(false);
    }
  }

  if (cargandoHabitaciones) return <p role="status" className="ui-operativa rounded-2xl border border-brand-border bg-brand-card p-6 text-base text-brand-ink">Cargando habitaciones…</p>;

  // Vista de éxito / Confirmación
  if (reservaConfirmada) {
    return (
      <div className="ui-operativa mx-auto max-w-2xl rounded-3xl border border-brand-border/80 bg-brand-card p-6 md:p-9 shadow-card text-center space-y-6 animate-fadeIn">
        <div className="ui-operativa mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
          <IconCheck className="h-8 w-8" />
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">
            <IconCheckCircle className="h-4 w-4 text-emerald-700" />
            Reserva Confirmada
          </span>
          <h2 className="mt-2 font-display text-2xl md:text-3xl font-black text-brand-ink">
            ¡Reserva Registrada con Éxito!
          </h2>
          <p className="mt-1 text-sm text-brand-ink/80 max-w-md mx-auto">
            La habitación ha quedado asignada. Puedes descargar el comprobante oficial o enviarlo directamente al pasajero por WhatsApp.
          </p>
        </div>

        {/* Resumen con estética de voucher de viaje */}
        <div className="rounded-2xl border border-brand-border bg-brand-sand-deep/60 p-5 text-left space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-terracotta-deep">
                Pasajero
              </p>
              <p className="text-base font-bold text-brand-ink">
                {reservaConfirmada.huespedNombre}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-ink/80">
                Habitación Asignada
              </p>
              <p className="font-display text-lg font-black text-brand-ink">
                Pieza #{reservaConfirmada.habitacionNumero}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm pt-1">
            <div>
              <span className="text-brand-ink/80 block text-xs">Llegada</span>
              <span className="font-bold text-brand-ink">
                {formatearFechaCorta(reservaConfirmada.fechaInicio)}
              </span>
            </div>
            <div>
              <span className="text-brand-ink/80 block text-xs">Salida</span>
              <span className="font-bold text-brand-ink">
                {reservaConfirmada.fechaFin ? formatearFechaCorta(reservaConfirmada.fechaFin) : "Por definir"}
              </span>
            </div>
            <div>
              <span className="text-brand-ink/80 block text-xs">Estadía</span>
              <span className="font-bold text-brand-ink">
                {reservaConfirmada.nochesEstimadas} noche(s)
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-brand-border/60 pt-3">
            <div>
              <span className="text-sm text-brand-ink/80">Tarifa estándar: </span>
              <span className="text-sm font-semibold text-brand-ink">
                {formatearMonedaCLP(reservaConfirmada.tarifaNoche ?? tarifaNoche)} / noche
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm text-brand-ink/80 block">Total Estimado</span>
              <span className="font-display text-lg font-black text-brand-terracotta-deep">
                {formatearMonedaCLP(
                  (reservaConfirmada.nochesEstimadas ?? 1) * (reservaConfirmada.tarifaNoche ?? tarifaNoche)
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => descargarVoucherTuristaPdf(reservaConfirmada)}
            className="flex items-center justify-center gap-2 rounded-xl border border-brand-terracotta bg-brand-terracotta-deep px-4 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-brand-terracotta-deep transition active:scale-[0.98]"
          >
            <IconFileText className="h-4 w-4" />
            <span>Descargar Comprobante (PDF)</span>
          </button>

          <button
            type="button"
            onClick={() =>
              abrirEnlaceWhatsApp({
                huespedNombre: reservaConfirmada.huespedNombre,
                habitacionNumero: reservaConfirmada.habitacionNumero,
                fechaInicio: reservaConfirmada.fechaInicio,
                fechaFin: reservaConfirmada.fechaFin,
                nochesEstimadas: reservaConfirmada.nochesEstimadas,
                telefonoDestino: telefono
              })
            }
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition active:scale-[0.98]"
          >
            <span>💬 Enviar por WhatsApp</span>
          </button>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onListo}
            className="rounded-xl px-5 py-2 text-sm font-bold text-brand-ink/80 hover:text-brand-ink hover:underline"
          >
            ← Volver a Habitaciones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-operativa mx-auto max-w-5xl space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-brand-border/60">
        <div>
          <h2 className="font-display text-2xl font-black text-brand-ink">
            Nueva Reserva de Pasajero
          </h2>
          <p className="mt-0.5 text-sm text-brand-ink/80">
            Elige las fechas, una habitación disponible y el nombre del huésped.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-600 motion-safe:animate-pulse" />
            {totalLibres} de {habitaciones.length || 8} piezas libres
          </span>
        </div>
      </div>

      {/* Alerta de bloqueo / intento de seleccionar pieza ocupada */}
      {mensajeBloqueo && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="text-base">⚠️</span>
            <span>{mensajeBloqueo}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeBloqueo(null)}
            aria-label="Cerrar aviso de disponibilidad"
            className="rounded-lg p-1 text-amber-700 hover:bg-amber-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bloque Superior: Selector de Fechas Interactivo */}
      <div className="rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-sand-deep text-brand-terracotta-deep">
              <IconCalendar className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-brand-ink">
                1. Fechas de Estadía
              </h3>
              <p className="text-xs text-brand-ink/80">
                La disponibilidad de las piezas se actualiza automáticamente al cambiar estas fechas.
              </p>
            </div>
          </div>

          {/* Accesos rápidos de fechas */}
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-xs text-brand-ink/80 mr-1 font-semibold">Atajos:</span>
            <button
              type="button"
              onClick={() => {
                const h = fechaHoySantiago();
                setDesde(h);
                setHasta(sumarDiasYMD(h, 1));
              }}
              className="rounded-lg border border-brand-border bg-brand-sand-deep px-2.5 py-1 text-xs font-semibold text-brand-ink hover:border-brand-terracotta hover:bg-white transition"
            >
              Hoy (1 noche)
            </button>
            <button
              type="button"
              onClick={() => {
                const m = sumarDiasYMD(fechaHoySantiago(), 1);
                setDesde(m);
                setHasta(sumarDiasYMD(m, 1));
              }}
              className="rounded-lg border border-brand-border bg-brand-sand-deep px-2.5 py-1 text-xs font-semibold text-brand-ink hover:border-brand-terracotta hover:bg-white transition"
            >
              Mañana
            </button>
            <button
              type="button"
              onClick={() => {
                const h = fechaHoySantiago();
                setDesde(h);
                setHasta(sumarDiasYMD(h, 2));
              }}
              className="rounded-lg border border-brand-border bg-brand-sand-deep px-2.5 py-1 text-xs font-semibold text-brand-ink hover:border-brand-terracotta hover:bg-white transition"
            >
              2 Noches
            </button>
            <button
              type="button"
              onClick={() => {
                const h = fechaHoySantiago();
                setDesde(h);
                setHasta(sumarDiasYMD(h, 7));
              }}
              className="rounded-lg border border-brand-border bg-brand-sand-deep px-2.5 py-1 text-xs font-semibold text-brand-ink hover:border-brand-terracotta hover:bg-white transition"
            >
              1 Semana
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
          <div>
            <label htmlFor="reserva-desde" className="block text-xs font-bold uppercase tracking-wider text-brand-ink/80 mb-1">
              Fecha de Llegada (Check-in)
            </label>
            <input id="reserva-desde"
              type="date"
              required
              value={desde}
              onChange={(e) => {
                const nuevaDesde = e.target.value;
                setDesde(nuevaDesde);
                if (hasta && hasta <= nuevaDesde) {
                  setHasta(sumarDiasYMD(nuevaDesde, 1));
                }
              }}
              className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm font-semibold text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
            />
          </div>

          <div>
            <label htmlFor="reserva-hasta" className="block text-xs font-bold uppercase tracking-wider text-brand-ink/80 mb-1">
              Fecha de Salida (Check-out)
            </label>
            <input id="reserva-hasta"
              type="date"
              required
              min={desde}
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm font-semibold text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-4 rounded-xl border border-brand-border/70 bg-brand-sand-deep/50 p-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-ink/80 block">
                Duración calculada
              </span>
              <span className="font-display text-lg font-black text-brand-ink">
                {noches} {noches === 1 ? "noche" : "noches"}
              </span>
            </div>
            <div className="border-l border-brand-border/70 pl-4">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-ink/80 block">
                Rango
              </span>
              <span className="text-sm font-semibold text-brand-terracotta-deep">
                {formatearFechaCorta(desde)} → {formatearFechaCorta(hasta)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Principal: Selector Visual de Habitaciones + Formulario Lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Selector de las 8 Habitaciones (8 columnas en lg) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconBed className="h-4 w-4 text-brand-terracotta-deep" />
              <h3 className="font-display text-sm font-bold text-brand-ink">
                2. Selecciona una Habitación
              </h3>
            </div>
            <span className="text-sm text-brand-ink/80">
              Toca una habitación disponible para elegirla
            </span>
          </div>

          {/* Cuadrícula de Habitaciones */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3">
            {habitaciones.map((hab) => {
              const estado = estadoHabitaciones.get(hab.id);
              const disponible = estado?.disponible ?? false;
              const enMantencion = estado?.enMantencion ?? false;
              const ocupada = !enMantencion && !disponible;
              const seleccionada = habitacionSeleccionadaId === hab.id;
              const ocupantes = estado?.ocupantes ?? [];
              const primerOcupante = ocupantes[0];

              let estiloCard = "border-brand-border bg-brand-card hover:border-brand-terracotta/40";
              let badgeBg = "bg-emerald-100 text-emerald-800 border-emerald-200";
              let badgeTexto = "Disponible";

              if (enMantencion) {
                estiloCard = "border-stone-300 bg-stone-100/80 opacity-70 cursor-not-allowed";
                badgeBg = "bg-stone-200 text-stone-700 border-stone-300";
                badgeTexto = "Mantención";
              } else if (ocupada) {
                estiloCard = "border-amber-300/80 bg-amber-50/60 hover:bg-amber-50";
                badgeBg = "bg-amber-100 text-amber-900 border-amber-200";
                badgeTexto = "Ocupada";
              }

              if (seleccionada && disponible) {
                estiloCard = "border-brand-terracotta ring-2 ring-brand-terracotta/30 bg-brand-sand-deep/50 shadow-md";
              }

              return (
                <button type="button" aria-pressed={seleccionada && disponible}
                  key={hab.id}
                  onClick={() => handleSeleccionarHabitacion(hab.id)}
                  className={`group relative flex flex-col justify-between rounded-2xl text-left border p-3.5 transition-all cursor-pointer ${estiloCard}`}
                >
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <p className="font-display text-base font-extrabold text-brand-ink leading-tight">
                        Pieza #{hab.numero}
                      </p>
                      <span className="inline-flex items-center gap-1 text-xs text-brand-ink/80 mt-0.5">
                        <IconUsers className="h-3 w-3 text-brand-ink/80" />
                        {hab.capacidad} camas
                      </span>
                    </div>

                    {seleccionada && disponible && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-terracotta-deep text-white shadow-sm">
                        <IconCheck className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>

                  {/* Estado / Disponibilidad */}
                  <div className="mt-3 pt-2.5 border-t border-brand-border/40">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${badgeBg}`}
                    >
                      {disponible && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
                      {ocupada && <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />}
                      {enMantencion && <IconWrench className="h-2.5 w-2.5 text-stone-600" />}
                      <span>{badgeTexto}</span>
                    </span>

                    {/* Detalle si está ocupada */}
                    {ocupada && primerOcupante && (
                      <p
                        className="mt-1.5 text-xs text-amber-950 font-medium truncate"
                        title={`Ocupada por ${primerOcupante.nombre}`}
                      >
                        Por: {primerOcupante.nombre}
                      </p>
                    )}

                    {/* Detalle si está en mantención */}
                    {enMantencion && (
                      <p className="mt-1.5 text-xs text-stone-600 truncate">
                        {hab.motivo_mantencion || "En revisión"}
                      </p>
                    )}

                    {/* Detalle si está disponible */}
                    {disponible && (
                      <p className="mt-1.5 text-xs text-emerald-800 font-medium">
                        {estado?.camasLibres.length === hab.capacidad
                          ? "Completamente libre"
                          : `${estado?.camasLibres.length} cama(s) libre(s)`}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Guía semántica de colores */}
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-brand-ink/80">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              Disponible para reservar
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              Ocupada en estas fechas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-stone-400" />
              En mantención
            </span>
          </div>
        </div>

        {/* Formulario y Resumen de Reserva (5 columnas en lg) */}
        <div className="lg:col-span-5 space-y-4">
          <form
            onSubmit={confirmarReserva}
            className="rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card space-y-4"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-brand-border/60">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-sand-deep text-brand-terracotta-deep">
                <IconUser className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-brand-ink">
                  3. Datos del Pasajero
                </h3>
                <p className="text-xs text-brand-ink/80">
                  Información para el registro y comprobante
                </p>
              </div>
            </div>

            {/* Habitación seleccionada actualmente */}
            <div className="rounded-2xl border border-brand-border/70 bg-brand-sand-deep/50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-ink/80">
                  Habitación Elegida
                </span>
                {habitacionElegidaValida && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                    Lista para reservar
                  </span>
                )}
              </div>

              {infoSeleccionada ? (
                <div className="mt-1 flex items-baseline justify-between">
                  <p className="font-display text-lg font-black text-brand-ink">
                    Pieza #{infoSeleccionada.habitacion.numero}
                  </p>
                  <span className="text-sm text-brand-ink/80 font-medium">
                    {infoSeleccionada.camasLibres.length} cama(s) disponible(s)
                  </span>
                </div>
              ) : (
                <p className="mt-1 text-sm font-semibold text-brand-terracotta-deep">
                  Selecciona una habitación en la lista de habitaciones.
                </p>
              )}
            </div>

            {/* Nombre del Pasajero */}
            <div>
              <label htmlFor="reserva-nombre" className="block text-xs font-bold uppercase tracking-wider text-brand-ink/80 mb-1.5">
                Nombre del Pasajero / Turista <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input id="reserva-nombre"
                  type="text"
                  required
                  placeholder="Ej: Laura González"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
                />
              </div>
            </div>

            {/* Teléfono / WhatsApp opcional */}
            <div>
              <label htmlFor="reserva-telefono" className="block text-xs font-bold uppercase tracking-wider text-brand-ink/80 mb-1.5">
                Teléfono / WhatsApp (opcional)
              </label>
              <input id="reserva-telefono"
                type="tel"
                placeholder="Ej: +56 9 8765 4321"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
              />
              <span className="mt-1 block text-xs text-brand-ink/80">
                Permite enviar el comprobante de reserva con 1 toque al confirmar.
              </span>
            </div>

            {/* Tarjeta de Resumen de Cobro */}
            <div className="rounded-2xl border border-brand-border/80 bg-white p-4 space-y-2 text-sm">
              <div className="flex justify-between text-brand-ink/80">
                <span>Tarifa por noche:</span>
                <span className="font-semibold text-brand-ink">{formatearMonedaCLP(tarifaNoche)} CLP</span>
              </div>
              <div className="flex justify-between text-brand-ink/80">
                <span>Duración ({formatearFechaCorta(desde)} al {formatearFechaCorta(hasta)}):</span>
                <span className="font-semibold text-brand-ink">{noches} noche(s)</span>
              </div>
              <div className="flex items-center justify-between border-t border-brand-border/60 pt-2">
                <span className="font-bold text-brand-ink text-sm">Total Estimado:</span>
                <span className="font-display text-xl font-black text-brand-terracotta-deep">
                  {formatearMonedaCLP(totalEstimado)}
                </span>
              </div>
              <p className="text-xs text-brand-ink/80 italic">
                Sin abono ni garantía de reserva. Si cancelan, no se cobra nada.
              </p>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            {/* Botón de Confirmación */}
            <button
              type="submit"
              disabled={guardando || !habitacionElegidaValida || !nombre.trim()}
              className="w-full flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-brand-terracotta-deep px-4 py-3.5 text-sm font-bold text-white shadow-brand hover:bg-brand-terracotta-deep transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconCheck className="h-5 w-5" />
              <span>{guardando ? "Guardando Reserva…" : "Confirmar Reserva"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
