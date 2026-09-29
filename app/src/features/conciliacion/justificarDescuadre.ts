import { z } from "zod";
import { powersync } from "../../lib/powersync";

export const MOTIVOS_DESCUADRE = ["turno_extra", "almuerzo_mina", "corte_ruta", "ausencia_justificada", "otro"] as const;
export type MotivoDescuadre = (typeof MOTIVOS_DESCUADRE)[number];

export const JustificacionSchema = z.object({
  conciliacionDiariaId: z.string().uuid(),
  motivo: z.enum(MOTIVOS_DESCUADRE),
  supervisorNombre: z.string().trim().min(1, "Escribe el nombre del supervisor que autorizó")
});
export type JustificacionInput = z.infer<typeof JustificacionSchema>;

/**
 * HU-17: guarda motivo tipificado + supervisor. Esto SÍ funciona
 * offline (es una escritura normal por la cola) — lo que necesita
 * conexión es el recálculo posterior que cambia el estado a "Con
 * diferencia justificada" (ver recalcularConciliacion). El nombre del
 * supervisor se anonimiza 7 días después del cierre mensual por una
 * migración posterior (Ley 21.719) — no implementada todavía, pero esta
 * función no le impide nada: solo escribe supervisor_nombre en texto.
 */
export async function justificarDescuadre(usuarioId: string, input: JustificacionInput): Promise<string> {
  const datos = JustificacionSchema.parse(input);
  const id = crypto.randomUUID();
  await powersync.execute(
    `insert into justificacion_descuadre
       (id, conciliacion_diaria_id, motivo, supervisor_nombre, registrado_por, created_at)
     values (?, ?, ?, ?, ?, ?)`,
    [id, datos.conciliacionDiariaId, datos.motivo, datos.supervisorNombre, usuarioId, new Date().toISOString()]
  );
  return id;
}
