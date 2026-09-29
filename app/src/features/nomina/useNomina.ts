import { useQuery } from "@powersync/react";

export type TrabajadorRow = {
  id: string;
  contrato_empresa_id: string;
  nombre: string;
  rut: string | null;
  cama_id: string | null;
};

/** HU-12: nómina de trabajadores de un contrato, con o sin cama asignada. */
export function useNomina(contratoEmpresaId: string) {
  const { data } = useQuery<TrabajadorRow>(
    "select id, contrato_empresa_id, nombre, rut, cama_id from trabajador where contrato_empresa_id = ? order by nombre",
    [contratoEmpresaId]
  );
  return data ?? [];
}
