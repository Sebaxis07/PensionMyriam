import { z } from "zod";
import { powersync } from "../../lib/powersync";
import { nuevoUuidIdempotente } from "../../lib/idempotencia";

/**
 * Catálogo de tareas opcionales del registro detallado (sección 4 del
 * encargo). Son OPCIONES propuestas por el equipo para facilitar el
 * registro — no una lista de obligaciones confirmada por la clienta:
 * María no documentó un checklist de aseo ni una frecuencia de cambio
 * de sábanas. Ninguna tarea es obligatoria y pueden seleccionarse
 * todas, varias, una sola o ninguna (si hay una observación).
 */
export const TAREAS_ASEO = [
  { clave: "barrer", etiqueta: "Barrer" },
  { clave: "trapear", etiqueta: "Trapear" },
  { clave: "retirar_basura", etiqueta: "Retirar basura" },
  { clave: "ventilar", etiqueta: "Ventilar habitación" },
  { clave: "limpiar_bano", etiqueta: "Limpiar baño o área sanitaria" },
  { clave: "ordenar_camas", etiqueta: "Ordenar camas" },
  { clave: "cambiar_sabanas", etiqueta: "Cambiar sábanas" },
  { clave: "cambiar_fundas", etiqueta: "Cambiar fundas" },
  { clave: "revisar_estado", etiqueta: "Revisar estado general" }
] as const;

export type ClaveTareaAseo = (typeof TAREAS_ASEO)[number]["clave"];
const CLAVES_TAREAS_ASEO = TAREAS_ASEO.map((t) => t.clave) as [ClaveTareaAseo, ...ClaveTareaAseo[]];

// `tipo` sigue gobernando la máquina de estados de habitación (igual
// que hoy: 'diario' no cambia el estado, 'post_checkout' libera
// en_aseo -> disponible vía el trigger de Postgres). `modalidad` es un
// eje NUEVO e independiente: solo describe si el registro trae detalle
// o no, nunca mueve el estado de la pieza.
export const AseoRapidoSchema = z.object({
  habitacionId: z.string().uuid(),
  tipo: z.enum(["diario", "post_checkout"]).default("diario")
});
export type AseoRapidoInput = z.input<typeof AseoRapidoSchema>;

export const AseoDetalladoSchema = z.object({
  habitacionId: z.string().uuid(),
  tipo: z.enum(["diario", "post_checkout"]).default("diario"),
  camaId: z.string().uuid().optional(),
  tareas: z.array(z.enum(CLAVES_TAREAS_ASEO)).optional(),
  observaciones: z.string().trim().min(1).optional(),
  pendiente: z.boolean().optional(),
  responsableDeclarado: z.string().trim().min(1).optional()
});
export type AseoDetalladoInput = z.input<typeof AseoDetalladoSchema>;

/**
 * Registro rápido: "Aseo realizado" en un toque, sin observaciones,
 * tareas ni firma (sección 4, Modalidad 1). `modalidad` queda en
 * 'rapido' (default de la columna).
 */
export async function registrarAseoRapido(usuarioId: string, input: AseoRapidoInput): Promise<string> {
  const datos = AseoRapidoSchema.parse(input);
  const id = crypto.randomUUID();
  await powersync.execute(
    `insert into aseo (id, habitacion_id, tipo, responsable, fecha_hora, uuid_idempotente)
     values (?, ?, ?, ?, ?, ?)`,
    [id, datos.habitacionId, datos.tipo, usuarioId, new Date().toISOString(), nuevoUuidIdempotente()]
  );
  return id;
}

/**
 * Registro detallado: tareas/cama/observaciones/pendiente/responsable
 * declarado, TODOS opcionales (sección 4/5/6 del encargo). No exige
 * completar ninguna tarea ni marcar todas las camas; una habitación
 * ocupada puede recibir este registro sin que cambie su estado (eso
 * solo lo controla `tipo`, no esta función).
 */
export async function registrarAseoDetallado(usuarioId: string, input: AseoDetalladoInput): Promise<string> {
  const datos = AseoDetalladoSchema.parse(input);
  const id = crypto.randomUUID();
  await powersync.execute(
    `insert into aseo
       (id, habitacion_id, tipo, responsable, fecha_hora, uuid_idempotente,
        cama_id, modalidad, tareas, observaciones, pendiente, responsable_declarado)
     values (?, ?, ?, ?, ?, ?, ?, 'detallado', ?, ?, ?, ?)`,
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
      datos.responsableDeclarado ?? null
    ]
  );
  return id;
}
