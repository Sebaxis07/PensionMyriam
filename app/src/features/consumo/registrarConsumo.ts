import { z } from "zod";
import { powersync } from "../../lib/powersync";

// 5 tipos del ledger (0008_ledger_tipos.sql). cama_noche normalmente la
// genera pg_cron sola (generar_cama_noche, ver
// 0009_conciliacion_por_tipo.sql) — se deja registrable acá también
// para el caso de corrección/registro manual puntual (ej. un trabajador
// nuevo que la automática de esta noche todavía no alcanzó a incluir).
export const TIPOS_CONSUMO = ["cama_noche", "desayuno", "almuerzo", "cena", "colacion"] as const;
export type TipoConsumo = (typeof TIPOS_CONSUMO)[number];

export const ConsumoSchema = z
  .object({
    trabajadorId: z.string().uuid(),
    tipoConsumo: z.enum(TIPOS_CONSUMO),
    // "colacion" (colación de terreno / plato especial) SIEMPRE va con
    // un producto_extra — nombre y precio propios de la lista de
    // precios de la Administradora (constraint colacion_requiere_producto
    // en Postgres; se repite acá para avisar antes de escribir).
    productoExtraId: z.string().uuid().optional(),
    // Monto ya cobrado en ESTA fila — una copia del precio del producto
    // al momento de registrar, no una referencia viva: el ledger es
    // inmutable, así que si el precio del producto cambia mañana, las
    // filas ya escritas no deben moverse.
    recargo: z.number().nonnegative("El monto no puede ser negativo").optional()
  })
  .refine((d) => d.tipoConsumo !== "colacion" || !!d.productoExtraId, {
    message: "Elige el producto de la colación/plato especial",
    path: ["productoExtraId"]
  })
  .refine((d) => d.tipoConsumo === "colacion" || !d.productoExtraId, {
    message: "Solo colación lleva producto asociado",
    path: ["productoExtraId"]
  });
export type ConsumoInput = z.infer<typeof ConsumoSchema>;

export class ConsumoDuplicadoError extends Error {
  constructor() {
    super("Ya se registró este tipo hoy para este trabajador.");
  }
}

/**
 * HU-13: transacción inmutable de un consumo. El índice único parcial
 * de 0008_ledger_tipos.sql es la verdad final contra doble-toque, pero
 * como esa validación vive en Postgres (la escritura local a SQLite no
 * la conoce), se repite acá del lado del cliente para avisar al
 * instante en vez de que el rechazo aparezca recién al sincronizar.
 */
export async function registrarConsumo(usuarioId: string, input: ConsumoInput): Promise<string> {
  const datos = ConsumoSchema.parse(input);

  const yaRegistrado = await powersync.getAll<{ n: number }>(
    `select count(*) as n from consumo
     where trabajador_id = ? and tipo_consumo = ? and consumo_corregido_id is null
       and date(fecha_hora) = date('now')`,
    [datos.trabajadorId, datos.tipoConsumo]
  );
  if ((yaRegistrado[0]?.n ?? 0) > 0) {
    throw new ConsumoDuplicadoError();
  }

  const id = crypto.randomUUID();
  await powersync.execute(
    `insert into consumo (id, trabajador_id, tipo_consumo, recargo, producto_extra_id, registrado_por, fecha_hora, uuid_idempotente)
     values (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      datos.trabajadorId,
      datos.tipoConsumo,
      datos.recargo ?? 0,
      datos.productoExtraId ?? null,
      usuarioId,
      new Date().toISOString(),
      crypto.randomUUID()
    ]
  );
  return id;
}
