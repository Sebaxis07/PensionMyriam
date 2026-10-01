import { useMemo } from "react";
import { useQuery } from "@powersync/react";
import { MetricasMargen } from "./types";
import { generarRecomendacionMargen, obtenerEstadoSemaforo } from "./recomendarMargen";

function obtenerRangoMesActual() {
  const ahora = new Date();
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, "0");
  const primerDia = `${y}-${m}-01`;
  const ultimoDiaNum = new Date(y, ahora.getMonth() + 1, 0).getDate();
  const ultimoDia = `${y}-${m}-${String(ultimoDiaNum).padStart(2, "0")}`;
  return { primerDia, ultimoDia, totalDiasMes: ultimoDiaNum };
}

export function useMargenProyectado(): MetricasMargen {
  const { primerDia, ultimoDia, totalDiasMes } = useMemo(() => obtenerRangoMesActual(), []);

  // 1. Contratos vigentes para calcular ingresos pactados
  const { data: contratos } = useQuery<{
    id: string;
    empresa_id: string;
    razon_social: string;
    headcount: number;
    tarifa_convenida: number;
    vigencia_desde: string;
    vigencia_hasta: string | null;
  }>(
    `select ce.id, ce.empresa_id, e.razon_social, ce.headcount, ce.tarifa_convenida,
            ce.vigencia_desde, ce.vigencia_hasta
     from contrato_empresa ce
     join empresa e on e.id = ce.empresa_id
     where ce.vigencia_desde <= ?
       and (ce.vigencia_hasta is null or ce.vigencia_hasta >= ?)`,
    [ultimoDia, primerDia]
  );

  // 2. Reservas de turistas en el mes
  const { data: reservasTuristas } = useQuery<{ count: number; total_turistas: number }>(
    `select count(*) as count,
            coalesce(sum(
              case
                when fecha_inicio is not null and fecha_fin is not null
                then max(1, (julianday(min(fecha_fin, ?)) - julianday(max(fecha_inicio, ?))))
                else 1
              end
            ), 0) as total_turistas
     from reserva
     where tipo_cliente = 'turista'
       and estado <> 'cancelada'
       and fecha_inicio <= ?
       and fecha_fin >= ?`,
    [ultimoDia, primerDia, ultimoDia, primerDia]
  );

  // 3. Compras de insumos registradas en el período
  const { data: comprasMes } = useQuery<{
    total_monto: number;
    total_compras: number;
    monto_alimentos: number;
    monto_operacion: number;
  }>(
    `select coalesce(sum(monto_total), 0) as total_monto,
            count(*) as total_compras,
            coalesce(sum(case when categoria in ('carnes', 'verduras', 'abarrotes') then monto_total else 0 end), 0) as monto_alimentos,
            coalesce(sum(case when categoria in ('gas_combustible', 'aseo', 'otro') then monto_total else 0 end), 0) as monto_operacion
     from compra_insumo
     where fecha >= ? and fecha <= ?`,
    [primerDia, ultimoDia]
  );

  // 4. Consumos reales registrados en el mes (para estimar rendimiento y costo por trabajador)
  const { data: consumosConteo } = useQuery<{ count: number }>(
    `select count(*) as count
     from consumo
     where date(fecha_hora) >= ? and date(fecha_hora) <= ?
       and consumo_corregido_id is null`,
    [primerDia, ultimoDia]
  );

  return useMemo(() => {
    // A. Cálculo de Ingresos Proyectados
    let ingresosEmpresas = 0;
    const contratosBajoMinimo: Array<{ razonSocial: string; tarifa: number }> = [];

    (contratos ?? []).forEach((c) => {
      // Días activos de este contrato dentro del mes en curso
      const inicio = c.vigencia_desde > primerDia ? c.vigencia_desde : primerDia;
      const fin = c.vigencia_hasta && c.vigencia_hasta < ultimoDia ? c.vigencia_hasta : ultimoDia;
      const [y1, m1, d1] = inicio.split("-").map(Number);
      const [y2, m2, d2] = fin.split("-").map(Number);
      const fechaA = new Date(y1, m1 - 1, d1);
      const fechaB = new Date(y2, m2 - 1, d2);
      const diasActivos = Math.max(1, Math.round((fechaB.getTime() - fechaA.getTime()) / (1000 * 3600 * 24)) + 1);

      const ingresoContrato = diasActivos * Number(c.headcount || 0) * Number(c.tarifa_convenida || 0);
      ingresosEmpresas += ingresoContrato;
    });

    const nochesTuristas = reservasTuristas?.[0]?.total_turistas || 0;
    const ingresosTuristas = nochesTuristas * 15000; // Tarifa estándar turista: $15.000 CLP
    const ingresosTotales = ingresosEmpresas + ingresosTuristas;

    // B. Cálculo de Costos de Insumos del Mes
    const totalComprasMonto = comprasMes?.[0]?.total_monto || 0;
    const totalComprasCount = comprasMes?.[0]?.total_compras || 0;

    // Total de trabajadores alojados esperados en el mes
    const trabajadoresEsperadosMes = (contratos ?? []).reduce(
      (sum, c) => sum + Number(c.headcount || 0) * totalDiasMes,
      0
    ) + nochesTuristas;

    // Costo diario real estimado por trabajador (1 cama + 3 comidas)
    // Si hay compras registradas, se prorratea. Si el negocio está recién partiendo,
    // se toma el costo base calibrado con la administradora ($14.000 por trabajador/día).
    let costoDiarioTrabajador = 14000;
    if (totalComprasMonto > 0 && trabajadoresEsperadosMes > 0) {
      costoDiarioTrabajador = Math.round(totalComprasMonto / trabajadoresEsperadosMes);
      // Mantener piso mínimo realista para evitar distorsiones por pocas compras
      if (costoDiarioTrabajador < 8000) costoDiarioTrabajador = 12000;
    }

    // Costos totales proyectados del mes
    const costosTotales = totalComprasMonto > 0
      ? totalComprasMonto
      : trabajadoresEsperadosMes * costoDiarioTrabajador;

    // C. Margen Bruto Proyectado (%)
    const margenNetoMonto = ingresosTotales - costosTotales;
    const margenPorcentaje = ingresosTotales > 0
      ? Math.round((margenNetoMonto / ingresosTotales) * 100)
      : 0;

    const estadoSemaforo = obtenerEstadoSemaforo(margenPorcentaje);

    // D. Tarifa Mínima Sugerida para asegurar 30% de ganancia:
    // tarifa = costo / (1 - 0.30) => costo / 0.7
    const tarifaMinimaSugerida = Math.round(costoDiarioTrabajador / 0.7);

    // Evaluar qué contratos vigentes están bajo la tarifa mínima
    (contratos ?? []).forEach((c) => {
      const tarifa = Number(c.tarifa_convenida || 0);
      if (tarifa > 0 && tarifa < tarifaMinimaSugerida) {
        contratosBajoMinimo.push({
          razonSocial: c.razon_social,
          tarifa
        });
      }
    });

    // E. Recomendación amigable (HU-26)
    const recomendacion = generarRecomendacionMargen({
      margenPorcentaje,
      costoDiarioTrabajador,
      tarifaMinimaSugerida,
      contratosBajoMinimo
    });

    return {
      ingresosTotales,
      costosTotales,
      margenNetoMonto,
      margenPorcentaje,
      estadoSemaforo,
      costoDiarioTrabajador,
      tarifaMinimaSugerida,
      totalComprasPeriodo: totalComprasCount,
      recomendacion
    };
  }, [contratos, reservasTuristas, comprasMes, consumosConteo, primerDia, ultimoDia, totalDiasMes]);
}
