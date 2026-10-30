import { powersync } from "../../lib/powersync";
import { supabase } from "../../lib/supabase";
import type { OperacionRechazadaRow } from "../sync/operacionesRechazadas";
import { resolverOperacionRechazada } from "../sync/operacionesRechazadas";
import { z } from "zod";

const RespaldoContratoSchema = z.object({
  id:z.string().uuid().optional(),empresa_id:z.string().uuid(),
  vigencia_desde:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vigencia_hasta:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().transform(v => v ?? null),
  headcount:z.number().int().positive(),tarifa_convenida:z.number().nonnegative(),
  creado_por:z.string().uuid(),created_at:z.string().min(1)
});

/** Recupera el mismo alta rechazada, sin crear otra versión ni duplicar el ID. */
export async function reintentarContratoRechazado(registro: OperacionRechazadaRow, usuarioId: string): Promise<void> {
  if (!navigator.onLine) throw new Error("Necesitas conexión para reintentar el guardado del contrato.");
  if (registro.tabla !== "contrato_empresa" || registro.operacion !== "PUT") throw new Error("Este registro no corresponde al alta de un contrato.");
  const usuarios = await powersync.getAll<{rol:string}>("select rol from usuario where id = ?",[usuarioId]);
  if (usuarios[0]?.rol !== "administradora") throw new Error("Solo la Administradora puede guardar contratos.");
  let respaldo: unknown;
  try { respaldo = JSON.parse(registro.datos_json); }
  catch { throw new Error("El respaldo del contrato está incompleto. Revisa el registro con el equipo de soporte."); }
  const validado = RespaldoContratoSchema.safeParse(respaldo);
  if (!validado.success) throw new Error("El respaldo del contrato está incompleto. Revisa el registro con el equipo de soporte.");
  const datos = validado.data;
  const filas = await powersync.getAll<{id:string}>(`select id
      from contrato_empresa where empresa_id = ? and vigencia_desde = ? and creado_por = ? and created_at = ?`,
    [datos.empresa_id, datos.vigencia_desde, datos.creado_por, datos.created_at]);
  if (filas.length > 1) throw new Error("Hay más de una copia del contrato. Revisa las fechas antes de reintentar.");
  const {data:existente,error:errorBusqueda} = await supabase.from("contrato_empresa").select("id")
    .eq("empresa_id",datos.empresa_id).eq("vigencia_desde",datos.vigencia_desde)
    .eq("creado_por",datos.creado_por).eq("created_at",datos.created_at).maybeSingle();
  if (errorBusqueda) throw new Error("No se pudo comprobar si el contrato ya está guardado. Intenta nuevamente con conexión.");
  // Los rechazos antiguos no guardaban el ID y la réplica puede haber
  // retirado la fila local. Solo entonces se asigna otro identificador.
  // La comprobación anterior y el EXCLUDE de vigencia impiden duplicar.
  const id = existente?.id ?? datos.id ?? filas[0]?.id ?? crypto.randomUUID();
  if (!existente) {
    const {error} = await supabase.from("contrato_empresa").upsert({...datos,id},{onConflict:"id",ignoreDuplicates:true});
    if (error?.code === "23P01") throw new Error("Ya hay un contrato para esta empresa en esas fechas. Revísalo antes de volver a guardar.");
    if (error) throw new Error(error.message);
  }
  // El alta idempotente puede encontrar un ID ya existente: verificar
  // su presencia antes de dar por recuperada la operación.
  const {data,error:errorLectura} = await supabase.from("contrato_empresa").select("id").eq("id",id).single();
  if (errorLectura || !data) throw new Error("No se pudo confirmar el contrato en el servidor. El aviso sigue pendiente.");
  await resolverOperacionRechazada(registro.id,usuarioId);
}
