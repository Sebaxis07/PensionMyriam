import { useQuery } from "@powersync/react";
import { useMemo } from "react";
import { useMargenProyectado } from "../../features/costos/useMargenProyectado";
import { QUERY_PIEZAS, type PiezaRow } from "../../lib/queries";

export interface DiaSemanaInfo {
  fechaIso: string;
  nombreDia: string;
  numeroDia: number;
  esHoy: boolean;
}

export type EstadoCeldaRack = "disponible" | "empresa" | "turista" | "aseo" | "mantencion";

export interface CeldaRackSemanal {
  habitacionId: string;
  habitacionNumero: number;
  fechaIso: string;
  estado: EstadoCeldaRack;
  huesped?: string;
  tipoCliente?: string;
}

interface ReservaSemanaRow {
  id: string;
  habitacion_id: string;
  tipo_cliente: string;
  huesped_nombre: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: string;
}

interface ConciliacionMesRow {
  id: string;
  fecha: string;
  tipo: string;
  cantidad_esperada: number;
  cantidad_servida: number;
  estado: string;
  justificacion_id: string | null;
}

export function useDashboardAdminMetricas() {
  // 1. KPI-06 / EP-04: Margen y Costos
  const metricasMargen = useMargenProyectado();

  // 2. EP-01 / EP-02: Habitaciones y ocupación actual
  const { data: piezas } = useQuery<PiezaRow>(QUERY_PIEZAS);

  // 3. Reservas para la matriz semanal de 7 días
  const { data: reservasSemana } = useQuery<ReservaSemanaRow>(
    `select r.id, c.habitacion_id, r.tipo_cliente, r.huesped_nombre,
            r.fecha_inicio, r.fecha_fin, r.estado
     from reserva r
     join cama c on c.id = r.cama_id
     where r.estado in ('confirmada')
       and (r.fecha_fin is null or date(r.fecha_fin) >= date('now'))
       and date(r.fecha_inicio) <= date('now', '+7 days')`
  );

  // 4. KPI-01 / EP-03: Conciliación B2B y raciones del mes
  const { data: conciliacionesMes } = useQuery<ConciliacionMesRow>(
    `select cd.id, cd.fecha, cd.tipo, cd.cantidad_esperada, cd.cantidad_servida,
            cd.estado, jd.id as justificacion_id
     from conciliacion_diaria cd
     left join justificacion_descuadre jd on jd.conciliacion_diaria_id = cd.id
     where strftime('%Y-%m', cd.fecha) = strftime('%Y-%m', 'now')
     order by cd.fecha desc`
  );

  // Generar los próximos 7 días
  const diasSemana = useMemo<DiaSemanaInfo[]>(() => {
    const lista: DiaSemanaInfo[] = [];
    const hoy = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const diaNum = String(d.getDate()).padStart(2, "0");
      const fechaIso = `${y}-${m}-${diaNum}`;

      const nombreDia =
        i === 0
          ? "Hoy"
          : d.toLocaleDateString("es-CL", { weekday: "short" }).slice(0, 3).toUpperCase();

      lista.push({
        fechaIso,
        nombreDia,
        numeroDia: d.getDate(),
        esHoy: i === 0
      });
    }
    return lista;
  }, []);

  // Construir la matriz de 8 piezas × 7 días
  const matrizRackSemanal = useMemo<Record<number, CeldaRackSemanal[]>>(() => {
    const resultado: Record<number, CeldaRackSemanal[]> = {};
    const listaPiezas = piezas ?? [];

    for (let numPieza = 1; numPieza <= 8; numPieza++) {
      const pieza = listaPiezas.find((p) => p.numero === numPieza);
      resultado[numPieza] = diasSemana.map((dia) => {
        if (!pieza) {
          return {
            habitacionId: `temp-${numPieza}`,
            habitacionNumero: numPieza,
            fechaIso: dia.fechaIso,
            estado: "disponible"
          };
        }

        // Si la pieza está en mantención
        if (pieza.estado === "mantencion") {
          return {
            habitacionId: pieza.id,
            habitacionNumero: numPieza,
            fechaIso: dia.fechaIso,
            estado: "mantencion"
          };
        }

        // Si es hoy y tiene aseo pendiente
        if (dia.esHoy && pieza.estado === "ocupada" && pieza.aseo_hoy_count === 0) {
          return {
            habitacionId: pieza.id,
            habitacionNumero: numPieza,
            fechaIso: dia.fechaIso,
            estado: "aseo",
            huesped: pieza.huesped_actual ?? undefined
          };
        }

        // Buscar si hay reserva activa en este día
        const reserva = reservasSemana?.find((r) => {
          if (r.habitacion_id !== pieza.id) return false;
          const inicio = r.fecha_inicio.slice(0, 10);
          const fin = r.fecha_fin ? r.fecha_fin.slice(0, 10) : "9999-12-31";
          return dia.fechaIso >= inicio && dia.fechaIso <= fin;
        });

        if (reserva) {
          return {
            habitacionId: pieza.id,
            habitacionNumero: numPieza,
            fechaIso: dia.fechaIso,
            estado: reserva.tipo_cliente === "empresa" ? "empresa" : "turista",
            huesped: reserva.huesped_nombre,
            tipoCliente: reserva.tipo_cliente
          };
        }

        // Si hoy está ocupada por check-in activo
        if (dia.esHoy && pieza.estado === "ocupada") {
          return {
            habitacionId: pieza.id,
            habitacionNumero: numPieza,
            fechaIso: dia.fechaIso,
            estado: pieza.reserva_tipo === "empresa" ? "empresa" : "turista",
            huesped: pieza.huesped_actual ?? undefined,
            tipoCliente: pieza.reserva_tipo ?? undefined
          };
        }

        return {
          habitacionId: pieza.id,
          habitacionNumero: numPieza,
          fechaIso: dia.fechaIso,
          estado: "disponible"
        };
      });
    }

    return resultado;
  }, [piezas, diasSemana, reservasSemana]);

  // Métricas de Conciliación B2B
  const metricasConciliacion = useMemo(() => {
    const filas = conciliacionesMes ?? [];
    if (filas.length === 0) {
      return {
        tasaConciliacion: 100,
        totalRegistros: 0,
        conciliados: 0,
        pendientesJustificar: 0,
        racionesServidas: 0,
        racionesEsperadas: 0,
        diasConDescuadre: []
      };
    }

    let conciliadosCount = 0;
    let pendientesCount = 0;
    let racionesServidas = 0;
    let racionesEsperadas = 0;
    const diasConDescuadre: string[] = [];

    filas.forEach((f) => {
      racionesServidas += f.cantidad_servida;
      racionesEsperadas += f.cantidad_esperada;

      const estaConciliado =
        f.cantidad_esperada === f.cantidad_servida ||
        f.estado === "conciliado" ||
        f.estado === "con_diferencia_justificada" ||
        Boolean(f.justificacion_id);

      if (estaConciliado) {
        conciliadosCount++;
      } else {
        pendientesCount++;
        if (!diasConDescuadre.includes(f.fecha)) {
          diasConDescuadre.push(f.fecha);
        }
      }
    });

    const tasaConciliacion =
      filas.length > 0 ? Math.round((conciliadosCount / filas.length) * 100) : 100;

    return {
      tasaConciliacion,
      totalRegistros: filas.length,
      conciliados: conciliadosCount,
      pendientesJustificar: pendientesCount,
      racionesServidas,
      racionesEsperadas,
      diasConDescuadre
    };
  }, [conciliacionesMes]);

  // Métricas de Ocupación actual
  const metricasOcupacion = useMemo(() => {
    const totalHabitaciones = piezas?.length || 8;
    const ocupadas = piezas?.filter((p) => p.estado === "ocupada").length ?? 0;
    const disponibles = piezas?.filter((p) => p.estado === "disponible").length ?? 0;
    const enMantencion = piezas?.filter((p) => p.estado === "mantencion").length ?? 0;

    const ocupadasEmpresa =
      piezas?.filter((p) => p.estado === "ocupada" && p.reserva_tipo === "empresa").length ?? 0;
    const ocupadasTurista =
      piezas?.filter((p) => p.estado === "ocupada" && p.reserva_tipo !== "empresa").length ?? 0;

    const porcentajeOcupacion =
      totalHabitaciones > 0 ? Math.round((ocupadas / totalHabitaciones) * 100) : 0;

    return {
      totalHabitaciones,
      ocupadas,
      disponibles,
      enMantencion,
      ocupadasEmpresa,
      ocupadasTurista,
      porcentajeOcupacion
    };
  }, [piezas]);

  return {
    metricasMargen,
    metricasConciliacion,
    metricasOcupacion,
    diasSemana,
    matrizRackSemanal,
    piezas: piezas ?? []
  };
}
