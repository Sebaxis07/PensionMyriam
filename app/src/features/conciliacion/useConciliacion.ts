import { useQuery } from "@powersync/react";
import { supabase } from "../../lib/supabase";

export type ConciliacionRow = {
  id: string;
  contrato_empresa_id: string;
  fecha: string;
  headcount_esperado: number;
  raciones_esperadas: number;
  raciones_servidas: number;
  estado: string;
};

/** HU-16/17: lectura offline — se sincroniza igual que el resto. */
export function useConciliacion(contratoEmpresaId: string) {
  const { data } = useQuery<ConciliacionRow>(
    "select * from conciliacion_diaria where contrato_empresa_id = ? order by fecha desc",
    [contratoEmpresaId]
  );
  return data ?? [];
}

/**
 * HU-16: recalcular_conciliacion vive en Postgres (0006_conciliacion.sql)
 * — no puede correr sobre el SQLite local de PowerSync, así que esta
 * SÍ es una acción que necesita conexión (a diferencia de registrar
 * consumo o justificar, que son puramente offline). Es la misma
 * naturaleza que exportar un PDF/Excel (Sprint 3): un cómputo de
 * back-office, no una captura de datos en terreno.
 */
export async function recalcularConciliacion(contratoEmpresaId: string, fecha: string): Promise<void> {
  const { error } = await supabase.rpc("recalcular_conciliacion", {
    p_contrato_empresa_id: contratoEmpresaId,
    p_fecha: fecha
  });
  if (error) {
    throw new Error("No se pudo recalcular. Revisa tu conexión e intenta de nuevo.");
  }
}
