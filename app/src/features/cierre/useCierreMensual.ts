import { useQuery } from "@powersync/react";
import { useMemo } from "react";

export interface DiaPendienteConciliacion {
  fecha: string;
  tiposPendientes: string[];
}

export interface JustificacionAuditoriaRow {
  fecha: string;
  tipo: string;
  diferencia: number;
  motivo: string;
  supervisor_nombre: string;
}

export interface ColacionExtraResumen {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface ResumenTrabajadorConsumo {
  trabajadorId: string;
  nombre: string;
  camaNoche: number;
  desayuno: number;
  almuerzo: number;
  cena: number;
  colaciones: number;
}

export interface EstadoCierreMensual {
  estaCerrable: boolean;
  diasPendientes: DiaPendienteConciliacion[];
  totalDiasContrato: number;
  diasConciliados: number;
  headcountContratado: number;
  tarifaPactadaDiaria: number;
  totalContratoCompleto: number;
  totalColacionesExtras: number;
  granTotal: number;
  colacionesDetalle: ColacionExtraResumen[];
  trabajadoresDetalle: ResumenTrabajadorConsumo[];
  justificacionesMes: JustificacionAuditoriaRow[];
  isLoading: boolean;
}

export function useCierreMensual(
  contratoEmpresaId: string,
  anio: number,
  mes: number // 1-12
): EstadoCierreMensual {
  const mesPadded = String(mes).padStart(2, "0");
  const primerDiaMes = `${anio}-${mesPadded}-01`;
  const ultimoDiaNum = new Date(anio, mes, 0).getDate();
  const ultimoDiaMes = `${anio}-${mesPadded}-${String(ultimoDiaNum).padStart(2, "0")}`;

  // 1. Datos del contrato
  const { data: contratoData, isLoading: loadingContrato } = useQuery<{
    id: string;
    empresa_id: string;
    vigencia_desde: string;
    vigencia_hasta: string | null;
    headcount: number;
    tarifa_convenida: number;
  }>(
    "select id, empresa_id, vigencia_desde, vigencia_hasta, headcount, tarifa_convenida from contrato_empresa where id = ?",
    [contratoEmpresaId]
  );
  const contrato = contratoData?.[0];

  // 2. Conciliaciones del mes
  const { data: conciliaciones, isLoading: loadingConciliaciones } = useQuery<{
    id: string;
    fecha: string;
    tipo: string;
    headcount_esperado: number;
    cantidad_esperada: number;
    cantidad_servida: number;
    estado: string;
  }>(
    `select id, fecha, tipo, headcount_esperado, cantidad_esperada, cantidad_servida, estado
     from conciliacion_diaria
     where contrato_empresa_id = ?
       and fecha >= ? and fecha <= ?
     order by fecha, tipo`,
    [contratoEmpresaId, primerDiaMes, ultimoDiaMes]
  );

  // 3. Justificaciones del mes
  const { data: justificaciones, isLoading: loadingJustificaciones } = useQuery<{
    fecha: string;
    tipo: string;
    cantidad_esperada: number;
    cantidad_servida: number;
    motivo: string;
    supervisor_nombre: string;
  }>(
    `select cd.fecha, cd.tipo, cd.cantidad_esperada, cd.cantidad_servida,
            j.motivo, j.supervisor_nombre
     from justificacion_descuadre j
     join conciliacion_diaria cd on cd.id = j.conciliacion_diaria_id
     where cd.contrato_empresa_id = ?
       and cd.fecha >= ? and cd.fecha <= ?
     order by cd.fecha, cd.tipo`,
    [contratoEmpresaId, primerDiaMes, ultimoDiaMes]
  );

  // 4. Consumos detallados del mes por trabajador
  const { data: consumosRaw, isLoading: loadingConsumos } = useQuery<{
    trabajador_id: string;
    trabajador_nombre: string;
    tipo_consumo: string;
    producto_extra_nombre: string | null;
    recargo: number;
  }>(
    `select c.trabajador_id, t.nombre as trabajador_nombre, c.tipo_consumo,
            p.nombre as producto_extra_nombre, c.recargo
     from consumo c
     join trabajador t on t.id = c.trabajador_id
     left join producto_extra p on p.id = c.producto_extra_id
     where t.contrato_empresa_id = ?
       and date(c.fecha_hora) >= date(?)
       and date(c.fecha_hora) <= date(?)
       and c.consumo_corregido_id is null`,
    [contratoEmpresaId, primerDiaMes, ultimoDiaMes]
  );

  const isLoading =
    loadingContrato ||
    loadingConciliaciones ||
    loadingJustificaciones ||
    loadingConsumos;

  return useMemo(() => {
    if (!contrato) {
      return {
        estaCerrable: false,
        diasPendientes: [],
        totalDiasContrato: 0,
        diasConciliados: 0,
        headcountContratado: 0,
        tarifaPactadaDiaria: 0,
        totalContratoCompleto: 0,
        totalColacionesExtras: 0,
        granTotal: 0,
        colacionesDetalle: [],
        trabajadoresDetalle: [],
        justificacionesMes: [],
        isLoading
      };
    }

    const vigInicio = contrato.vigencia_desde;
    const vigFin = contrato.vigencia_hasta || "9999-12-31";

    // Calcular días efectivos del contrato dentro del mes seleccionado
    const fechaInicioEfectiva = vigInicio > primerDiaMes ? vigInicio : primerDiaMes;
    const fechaFinEfectiva = vigFin < ultimoDiaMes ? vigFin : ultimoDiaMes;

    const listaDiasEfectivos: string[] = [];
    if (fechaInicioEfectiva <= fechaFinEfectiva) {
      const actual = new Date(fechaInicioEfectiva + "T00:00:00");
      const fin = new Date(fechaFinEfectiva + "T00:00:00");
      while (actual <= fin) {
        listaDiasEfectivos.push(actual.toISOString().slice(0, 10));
        actual.setDate(actual.getDate() + 1);
      }
    }

    const tiposContrato = ["cama_noche", "desayuno", "almuerzo", "cena"];
    const conciliacionesPorDia = new Map<string, Map<string, string>>();

    (conciliaciones ?? []).forEach((c) => {
      if (!conciliacionesPorDia.has(c.fecha)) {
        conciliacionesPorDia.set(c.fecha, new Map());
      }
      conciliacionesPorDia.get(c.fecha)!.set(c.tipo, c.estado);
    });

    const diasPendientes: DiaPendienteConciliacion[] = [];
    let diasConciliadosContador = 0;

    for (const f of listaDiasEfectivos) {
      const mapaTipos = conciliacionesPorDia.get(f);
      const faltantes: string[] = [];

      for (const t of tiposContrato) {
        const est = mapaTipos?.get(t);
        if (!est || est === "pendiente") {
          faltantes.push(t);
        }
      }

      if (faltantes.length > 0) {
        diasPendientes.push({ fecha: f, tiposPendientes: faltantes });
      } else {
        diasConciliadosContador++;
      }
    }

    const estaCerrable = listaDiasEfectivos.length > 0 && diasPendientes.length === 0;

    // Calcular montos de contrato completo
    const totalDiasContrato = listaDiasEfectivos.length;
    const headcount = contrato.headcount;
    const tarifa = Number(contrato.tarifa_convenida ?? 0);
    const totalContratoCompleto = totalDiasContrato * headcount * tarifa;

    // Consolidar colaciones extras
    const colacionesMap = new Map<string, { cantidad: number; precioUnitario: number }>();
    const trabajadoresMap = new Map<string, ResumenTrabajadorConsumo>();

    (consumosRaw ?? []).forEach((c) => {
      // Por trabajador
      if (!trabajadoresMap.has(c.trabajador_id)) {
        trabajadoresMap.set(c.trabajador_id, {
          trabajadorId: c.trabajador_id,
          nombre: c.trabajador_nombre,
          camaNoche: 0,
          desayuno: 0,
          almuerzo: 0,
          cena: 0,
          colaciones: 0
        });
      }
      const t = trabajadoresMap.get(c.trabajador_id)!;
      if (c.tipo_consumo === "cama_noche") t.camaNoche++;
      else if (c.tipo_consumo === "desayuno") t.desayuno++;
      else if (c.tipo_consumo === "almuerzo") t.almuerzo++;
      else if (c.tipo_consumo === "cena") t.cena++;
      else if (c.tipo_consumo === "colacion") t.colaciones++;

      // Extras
      if (c.tipo_consumo === "colacion") {
        const prodNombre = c.producto_extra_nombre || "Colación Extra";
        const precio = Number(c.recargo || 0);
        if (!colacionesMap.has(prodNombre)) {
          colacionesMap.set(prodNombre, { cantidad: 0, precioUnitario: precio });
        }
        colacionesMap.get(prodNombre)!.cantidad++;
      }
    });

    const colacionesDetalle: ColacionExtraResumen[] = Array.from(colacionesMap.entries()).map(
      ([nombre, data]) => ({
        nombre,
        cantidad: data.cantidad,
        precioUnitario: data.precioUnitario,
        subtotal: data.cantidad * data.precioUnitario
      })
    );

    const totalColacionesExtras = colacionesDetalle.reduce((sum, item) => sum + item.subtotal, 0);
    const granTotal = totalContratoCompleto + totalColacionesExtras;

    const justificacionesMes: JustificacionAuditoriaRow[] = (justificaciones ?? []).map((j) => ({
      fecha: j.fecha,
      tipo: j.tipo,
      diferencia: Math.abs(j.cantidad_esperada - j.cantidad_servida),
      motivo: j.motivo,
      supervisor_nombre: j.supervisor_nombre
    }));

    return {
      estaCerrable,
      diasPendientes,
      totalDiasContrato,
      diasConciliados: diasConciliadosContador,
      headcountContratado: headcount,
      tarifaPactadaDiaria: tarifa,
      totalContratoCompleto,
      totalColacionesExtras,
      granTotal,
      colacionesDetalle,
      trabajadoresDetalle: Array.from(trabajadoresMap.values()).sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
      ),
      justificacionesMes,
      isLoading
    };
  }, [
    contrato,
    conciliaciones,
    justificaciones,
    consumosRaw,
    isLoading,
    primerDiaMes,
    ultimoDiaMes
  ]);
}
