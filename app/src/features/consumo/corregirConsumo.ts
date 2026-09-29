import { z } from "zod";
import { powersync } from "../../lib/powersync";
import { TIPOS_RACION } from "./registrarConsumo";

// HU-13: "el sistema no permite borrar la transacción original, sino
// que exige registrar una transacción de corrección explícita y
// justificada" — nunca UPDATE/DELETE sobre `consumo` (libro inmutable).
export const CorreccionSchema = z.object({
  consumoOriginalId: z.string().uuid(),
  trabajadorId: z.string().uuid(),
  tipoRacion: z.enum(TIPOS_RACION),
  recargo: z.number().nonnegative("El recargo no puede ser negativo").optional(),
  justificacion: z.string().trim().min(1, "Escribe el motivo de la corrección")
});
export type CorreccionInput = z.infer<typeof CorreccionSchema>;

export async function corregirConsumo(usuarioId: string, input: CorreccionInput): Promise<string> {
  const datos = CorreccionSchema.parse(input);
  const id = crypto.randomUUID();
  await powersync.execute(
    `insert into consumo
       (id, trabajador_id, tipo_racion, recargo, registrado_por, fecha_hora, uuid_idempotente,
        consumo_corregido_id, justificacion_correccion)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      datos.trabajadorId,
      datos.tipoRacion,
      datos.recargo ?? 0,
      usuarioId,
      new Date().toISOString(),
      crypto.randomUUID(),
      datos.consumoOriginalId,
      datos.justificacion
    ]
  );
  return id;
}
