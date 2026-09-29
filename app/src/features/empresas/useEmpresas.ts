import { useQuery } from "@powersync/react";

export type EmpresaRow = {
  id: string;
  razon_social: string;
  rut: string | null;
  contacto: string | null;
};

/** HU-11: lista de empresas contratistas activas. */
export function useEmpresas() {
  const { data } = useQuery<EmpresaRow>("select id, razon_social, rut, contacto from empresa order by razon_social");
  return data ?? [];
}
