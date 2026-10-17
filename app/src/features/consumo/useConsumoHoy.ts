import { useQuery } from "@powersync/react";
import type { TipoConsumo } from "./registrarConsumo";

export type TrabajadorConsumoRow = {
  id: string;
  nombre: string;
  ya_registrado: number; // 0 | 1 — SQLite no tiene boolean nativo
  hora_consumo?: string | null;
};

export type ResumenRacionItem = {
  tipo_consumo: TipoConsumo;
  total: number;
};

/**
 * HU-14 (barra de consumo rápido): nómina de un contrato con una marca
 * de si ya tiene ese tipo de consumo registrado hoy — para no dejar
 * tocar de nuevo a quien ya está marcado (ver también el rechazo
 * server-side en 0008_ledger_tipos.sql).
 */
export function useConsumoHoy(contratoEmpresaId: string, tipoConsumo: TipoConsumo) {
  const { data } = useQuery<TrabajadorConsumoRow>(
    `select
       t.id, t.nombre,
       exists (
         select 1 from consumo c
         where c.trabajador_id = t.id and c.tipo_consumo = ?
           and c.consumo_corregido_id is null and date(c.fecha_hora) = date('now')
       ) as ya_registrado,
       (
         select c.fecha_hora from consumo c
         where c.trabajador_id = t.id and c.tipo_consumo = ?
           and c.consumo_corregido_id is null and date(c.fecha_hora) = date('now')
         order by c.fecha_hora desc limit 1
       ) as hora_consumo
     from trabajador t
     where t.contrato_empresa_id = ?
     order by t.nombre`,
    [tipoConsumo, tipoConsumo, contratoEmpresaId]
  );
  return data ?? [];
}

/**
 * Hook para obtener el resumen de raciones servidas hoy por cada tipo de servicio
 * para la empresa seleccionada.
 */
export function useResumenConsumosDia(contratoEmpresaId: string) {
  const { data } = useQuery<ResumenRacionItem>(
    `select
       c.tipo_consumo,
       count(distinct c.trabajador_id) as total
     from consumo c
     join trabajador t on t.id = c.trabajador_id
     where t.contrato_empresa_id = ?
       and c.consumo_corregido_id is null
       and date(c.fecha_hora) = date('now')
     group by c.tipo_consumo`,
    [contratoEmpresaId]
  );
  return data ?? [];
}
