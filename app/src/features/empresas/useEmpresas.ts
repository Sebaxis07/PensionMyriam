import { useQuery } from "@powersync/react";

export type EmpresaRow = {
  id: string;
  razon_social: string;
  rut: string | null;
  contacto: string | null;
  contrato_id?: string | null;
  headcount?: number | null;
  tarifa_convenida?: number | null;
  vigencia_desde?: string | null;
  vigencia_hasta?: string | null;
  total_trabajadores?: number;
  camas_asignadas?: number;
};

const QUERY_EMPRESAS_DETALLADAS = `
select
  e.id,
  e.razon_social,
  e.rut,
  e.contacto,
  c.id as contrato_id,
  c.headcount,
  c.tarifa_convenida,
  c.vigencia_desde,
  c.vigencia_hasta,
  coalesce(
    (select count(*) from trabajador t where t.contrato_empresa_id = c.id),
    0
  ) as total_trabajadores,
  coalesce(
    (select count(*) from trabajador t where t.contrato_empresa_id = c.id and t.cama_id is not null),
    0
  ) as camas_asignadas
from empresa e
left join (
  select ce.*,
         row_number() over (
           partition by ce.empresa_id
           order by
             case
               when ce.vigencia_desde <= date('now') and (ce.vigencia_hasta is null or ce.vigencia_hasta >= date('now')) then 1
               when ce.vigencia_desde > date('now') then 2
               else 3
             end,
             ce.vigencia_desde desc
         ) as rn
  from contrato_empresa ce
) c on c.empresa_id = e.id and c.rn = 1
order by e.razon_social asc
`;

/** Lista de empresas contratistas con resumen de su contrato y dotación más reciente. */
export function useEmpresas(): EmpresaRow[] {
  const { data } = useQuery<EmpresaRow>(QUERY_EMPRESAS_DETALLADAS);
  return data ?? [];
}
