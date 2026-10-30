import { z } from "zod";
import { powersync } from "../../lib/powersync";
import { nuevoUuidIdempotente } from "../../lib/idempotencia";

// 0027_aseo_detallado.sql: "aseo" es un libro de bitácora inmutable —
// nunca UPDATE/DELETE directo (igual que `consumo`, RNF-03). Corregir
// un registro es insertar una fila NUEVA que referencia
// `aseo_corregido_id`, con su propia justificación. La fila original
// nunca se borra ni se oculta.
export const CorreccionAseoSchema = z.object({
  aseoOriginalId: z.string().uuid(),
  habitacionId: z.string().uuid(),
  tipo: z.enum(["diario", "post_checkout"]).default("diario"),
  camaId: z.string().uuid().optional(),
  tareas: z.array(z.string()).optional(),
  observaciones: z.string().trim().min(1).optional(),
  pendiente: z.boolean().optional(),
  responsableDeclarado: z.string().trim().min(1).optional(),
  justificacion: z.string().trim().min(1, "Escribe el motivo de la corrección")
});
export type CorreccionAseoInput = z.input<typeof CorreccionAseoSchema>;

export async function corregirAseo(usuarioId: string, input: CorreccionAseoInput): Promise<string> {
  const datos = CorreccionAseoSchema.parse(input);
  const id = crypto.randomUUID();
  await powersync.execute(
    `insert into aseo
       (id, habitacion_id, tipo, responsable, fecha_hora, uuid_idempotente,
        cama_id, modalidad, tareas, observaciones, pendiente, responsable_declarado,
        aseo_corregido_id, justificacion_correccion)
     values (?, ?, ?, ?, ?, ?, ?, 'detallado', ?, ?, ?, ?, ?, ?)`,
    [
      id,
      datos.habitacionId,
      datos.tipo,
      usuarioId,
      new Date().toISOString(),
      nuevoUuidIdempotente(),
      datos.camaId ?? null,
      datos.tareas && datos.tareas.length > 0 ? JSON.stringify(datos.tareas) : null,
      datos.observaciones ?? null,
      datos.pendiente ? 1 : 0,
      datos.responsableDeclarado ?? null,
      datos.aseoOriginalId,
      datos.justificacion
    ]
  );
  return id;
}
