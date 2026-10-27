import { z } from "zod";
import { supabase } from "../../lib/supabase";

/**
 * HU-34: "una función protegida para atender solicitudes individuales de
 * eliminación de datos, para responder dentro del plazo legal de 30 días
 * corridos".
 *
 * POR QUÉ ESTO NO PUEDE SER UNA ESCRITURA LOCAL
 *
 * La pantalla resolvía la supresión con `powersync.execute("update
 * trabajador set nombre = …")`. Eso incumple los dos criterios de la
 * historia:
 *
 *  - No dejaba constancia: la bitácora no se escribía y el motivo nunca
 *    se pedía, aunque el criterio exige "constancia en la bitácora con
 *    motivo y fecha".
 *  - No bloqueaba a la Encargada: el único freno era que la pestaña
 *    estaba oculta. La escritura local se aceptaba igual, y en el caso
 *    de `reserva` incluso llegaba al servidor (la policy `reserva_rw`
 *    permite a ambos roles), anonimizando el nombre de una huésped sin
 *    dejar rastro de quién lo hizo.
 *
 * La supresión va por un RPC que autoriza en el servidor y escribe la
 * bitácora en la misma transacción
 * (db/migrations/0019_supresion_arco.sql). Con eso, lo que la Encargada
 * ve o no ve en pantalla pasa a ser comodidad y no el control de acceso.
 *
 * REQUIERE CONEXIÓN, a propósito: es una gestión legal con 30 días de
 * plazo, no una operación del día a día que deba resolverse sin señal.
 * Ponerla en la cola offline significaría decirle a la Administradora
 * "listo" sin que el dato se haya anonimizado en el servidor ni exista
 * constancia.
 */
export const TIPOS_TITULAR = ["trabajador", "turista"] as const;
export type TipoTitular = (typeof TIPOS_TITULAR)[number];

export const SolicitudSupresionSchema = z.object({
  tipoTitular: z.enum(TIPOS_TITULAR),
  titularId: z.string().uuid("No se pudo identificar a la persona seleccionada"),
  motivo: z
    .string()
    .trim()
    .min(5, "Escribe el motivo de la solicitud (por ejemplo: «solicitud escrita del titular»)")
    .max(500, "El motivo es demasiado largo: resúmelo en menos de 500 caracteres")
});
export type SolicitudSupresion = z.infer<typeof SolicitudSupresionSchema>;

export interface ResultadoSupresion {
  ok: boolean;
  tipo_titular: TipoTitular;
  titular_id: string;
  ya_estaba_anonimizado: boolean;
  filas_afectadas: number;
}

/** Texto que queda en el registro una vez anonimizado, por tipo de titular. */
export const MARCA_ANONIMIZADO: Record<TipoTitular, string> = {
  trabajador: "TRABAJADOR ANONIMIZADO (SOLICITUD TITULAR)",
  turista: "TURISTA ANONIMIZADO (SOLICITUD TITULAR)"
};

export function estaAnonimizado(tipo: TipoTitular, nombre: string | null | undefined): boolean {
  if (!nombre) return false;
  return nombre === MARCA_ANONIMIZADO[tipo];
}

/**
 * Plazo legal de respuesta de una solicitud de derechos (Ley 21.719).
 * Se calcula en días CORRIDOS, no hábiles.
 */
export const PLAZO_LEGAL_RESPUESTA_DIAS = 30;

export function fechaLimiteRespuesta(fechaSolicitud: Date): Date {
  const limite = new Date(fechaSolicitud.getTime());
  limite.setDate(limite.getDate() + PLAZO_LEGAL_RESPUESTA_DIAS);
  return limite;
}

export async function solicitarSupresionDatos(
  entrada: SolicitudSupresion
): Promise<ResultadoSupresion> {
  const datos = SolicitudSupresionSchema.parse(entrada);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error(
      "Para eliminar los datos de una persona necesitas conexión a Internet. El plazo legal es de 30 días, así que puedes hacerlo cuando vuelva la señal."
    );
  }

  const { data, error } = await supabase.rpc("atender_derecho_supresion", {
    p_tipo_titular: datos.tipoTitular,
    p_titular_id: datos.titularId,
    p_motivo: datos.motivo
  });

  if (error) {
    // 42501 es el código con el que el servidor rechaza a quien no es
    // Administradora. Se traduce al mensaje que pide el criterio en vez
    // de mostrar el error técnico de Postgres.
    if (error.code === "42501" || /facultad exclusiva/i.test(error.message ?? "")) {
      throw new Error(
        "Eliminar datos personales es una facultad exclusiva de la Administradora."
      );
    }
    throw new Error(error.message || "No se pudo completar la eliminación de datos.");
  }

  return data as ResultadoSupresion;
}

/**
 * Registra en la bitácora que se entregó una copia de los datos de una
 * persona (derecho de acceso y portabilidad). La descarga es una salida
 * de datos personales del sistema, y la bitácora existe para eso.
 * Si falla, no se bloquea la entrega al titular: se avisa al llamador.
 */
export async function registrarExportacionFichaTitular(detalle: {
  tipo_titular: TipoTitular;
  titular_id: string;
}): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  const { error } = await supabase.rpc("registrar_acceso_datos_personales", {
    p_accion: "exportacion_pdf",
    p_detalle: { tipo_derecho: "acceso_portabilidad", ...detalle }
  });
  return !error;
}
