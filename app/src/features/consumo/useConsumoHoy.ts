import { useQuery } from "@powersync/react";
import type { TipoRacion } from "./registrarConsumo";

export type TrabajadorConsumoRow = {
  id: string;
  nombre: string;
  ya_registrado: number; // 0 | 1 — SQLite no tiene boolean nativo
};

/**
 * HU-14 (barra de consumo rápido): nómina de un contrato con una marca
 * de si ya tiene esa ración registrada hoy — para no dejar tocar de
 * nuevo a quien ya está marcado (ver también el rechazo server-side en
 * 0005_empresas_consumo.sql).
 */
export function useConsumoHoy(contratoEmpresaId: string, tipoRacion: TipoRacion) {
  const { data } = useQuery<TrabajadorConsumoRow>(
    `select
       t.id, t.nombre,
       exists (
         select 1 from consumo c
         where c.trabajador_id = t.id and c.tipo_racion = ?
           and c.consumo_corregido_id is null and date(c.fecha_hora) = date('now')
       ) as ya_registrado
     from trabajador t
     where t.contrato_empresa_id = ?
     order by t.nombre`,
    [tipoRacion, contratoEmpresaId]
  );
  return data ?? [];
}
