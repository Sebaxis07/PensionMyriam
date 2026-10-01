import { useQuery } from "@powersync/react";

export type TrabajadorRow = {
  id: string;
  contrato_empresa_id: string;
  nombre: string;
  rut: string | null;
  cama_id: string | null;
  habitacion_numero?: number | null;
  cama_numero?: number | null;
};

/** Nómina de trabajadores de un contrato con información de su pieza y cama asignada. */
export function useNomina(contratoEmpresaId: string): TrabajadorRow[] {
  const { data } = useQuery<TrabajadorRow>(
    `select t.id, t.contrato_empresa_id, t.nombre, t.rut, t.cama_id,
            h.numero as habitacion_numero,
            c.numero as cama_numero
     from trabajador t
     left join cama c on c.id = t.cama_id
     left join habitacion h on h.id = c.habitacion_id
     where t.contrato_empresa_id = ?
     order by t.nombre asc`,
    [contratoEmpresaId]
  );
  return data ?? [];
}
