import { z } from "zod";
import { powersync } from "../../lib/powersync";
import { TIPOS_CONSUMO } from "./registrarConsumo";

// HU-13: "el sistema no permite borrar la transacción original, sino
// que exige registrar una transacción de corrección explícita y
// justificada" — nunca UPDATE/DELETE sobre `consumo` (libro inmutable).
export const CorreccionSchema = z
  .object({
    consumoOriginalId: z.string().uuid(),
    trabajadorId: z.string().uuid(),
    tipoConsumo: z.enum(TIPOS_CONSUMO),
    productoExtraId: z.string().uuid().optional(),
    recargo: z.number().nonnegative("El monto no puede ser negativo").optional(),
    justificacion: z.string().trim().min(1, "Escribe el motivo de la corrección")
  })
  .refine((d) => d.tipoConsumo !== "colacion" || !!d.productoExtraId, {
    message: "Elige el producto de la colación/plato especial",
    path: ["productoExtraId"]
  });
export type CorreccionInput = z.infer<typeof CorreccionSchema>;

export async function corregirConsumo(usuarioId: string, input: CorreccionInput): Promise<string> {
  const datos = CorreccionSchema.parse(input);
  const id = crypto.randomUUID();
  await powersync.execute(
    `insert into consumo
       (id, trabajador_id, tipo_consumo, recargo, producto_extra_id, registrado_por, fecha_hora, uuid_idempotente,
        consumo_corregido_id, justificacion_correccion)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      datos.trabajadorId,
      datos.tipoConsumo,
      datos.recargo ?? 0,
      datos.productoExtraId ?? null,
      usuarioId,
      new Date().toISOString(),
      crypto.randomUUID(),
      datos.consumoOriginalId,
      datos.justificacion
    ]
  );
  return id;
}
