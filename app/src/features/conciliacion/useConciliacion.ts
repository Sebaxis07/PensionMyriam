import { useQuery } from "@powersync/react";
import { supabase } from "../../lib/supabase";

// Por (contrato, fecha, TIPO) — antes un solo agregado del día. Solo
// existen filas para los tipos que facturan por contrato completo
// (cama_noche/desayuno/almuerzo/cena); "colacion" no genera fila acá,
// se factura por consumo real (ver tipo_consumo_config).
export type ConciliacionRow = {
  id: string;
  contrato_empresa_id: string;
  fecha: string;
  tipo: string;
  headcount_esperado: number;
  cantidad_esperada: number;
  cantidad_servida: number;
  estado: string;
};

/** HU-16/17: lectura offline — se sincroniza igual que el resto. */
export function useConciliacion(contratoEmpresaId: string) {
  const { data } = useQuery<ConciliacionRow>(
    "select * from conciliacion_diaria where contrato_empresa_id = ? order by fecha desc, tipo",
    [contratoEmpresaId]
  );
  return data ?? [];
}

/**
 * HU-16: recalcular_conciliacion vive en Postgres (0009_conciliacion_por_tipo.sql)
 * — no puede correr sobre el SQLite local de PowerSync, así que esta
 * SÍ es una acción que necesita conexión (a diferencia de registrar
 * consumo o justificar, que son puramente offline). Recalcula TODOS los
 * tipos de contrato completo de ese día en una sola llamada.
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

/**
 * HU-16 (cama_noche): genera las filas de cama-noche de una fecha para
 * TODAS las empresas (pg_cron ya lo hace cada noche solo; esto es para
 * forzar un reproceso puntual de un día atrasado). También necesita
 * conexión — corre en Postgres.
 */
export async function generarCamaNoche(fecha: string): Promise<number> {
  const { data, error } = await supabase.rpc("generar_cama_noche", { p_fecha: fecha });
  if (error) {
    throw new Error("No se pudo generar cama-noche. Revisa tu conexión e intenta de nuevo.");
  }
  return data as number;
}
