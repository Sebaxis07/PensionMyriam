import { z } from "zod";
import { powersync } from "../../lib/powersync";

export const TIPOS_RACION = ["desayuno", "almuerzo", "cena", "colacion_extra", "plato_especial"] as const;
export type TipoRacion = (typeof TIPOS_RACION)[number];

export const ConsumoSchema = z.object({
  trabajadorId: z.string().uuid(),
  tipoRacion: z.enum(TIPOS_RACION),
  // HU-15: recargo de colación extra / plato especial. Para las 3
  // raciones base no debería venir con recargo, pero no se restringe
  // acá — el monto lo decide la pantalla (Antigravity), esto solo lo
  // valida.
  recargo: z.number().nonnegative("El recargo no puede ser negativo").optional()
});
export type ConsumoInput = z.infer<typeof ConsumoSchema>;

export class ConsumoDuplicadoError extends Error {
  constructor() {
    super("Ya se registró esta ración hoy para este trabajador.");
  }
}

/**
 * HU-13: transacción inmutable de una ración. El índice único de
 * 0005_empresas_consumo.sql es la verdad final contra doble-toque, pero
 * como esa validación vive en Postgres (la escritura local a SQLite no
 * la conoce), se repite acá del lado del cliente para avisar al
 * instante en vez de que el rechazo aparezca recién al sincronizar.
 */
export async function registrarConsumo(usuarioId: string, input: ConsumoInput): Promise<string> {
  const datos = ConsumoSchema.parse(input);

  const yaRegistrado = await powersync.getAll<{ n: number }>(
    `select count(*) as n from consumo
     where trabajador_id = ? and tipo_racion = ? and consumo_corregido_id is null
       and date(fecha_hora) = date('now')`,
    [datos.trabajadorId, datos.tipoRacion]
  );
  if ((yaRegistrado[0]?.n ?? 0) > 0) {
    throw new ConsumoDuplicadoError();
  }

  const id = crypto.randomUUID();
  await powersync.execute(
    `insert into consumo (id, trabajador_id, tipo_racion, recargo, registrado_por, fecha_hora, uuid_idempotente)
     values (?, ?, ?, ?, ?, ?, ?)`,
    [id, datos.trabajadorId, datos.tipoRacion, datos.recargo ?? 0, usuarioId, new Date().toISOString(), crypto.randomUUID()]
  );
  return id;
}
