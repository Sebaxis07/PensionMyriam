export type TipoClienteAseo = "turista" | "empresa" | null | undefined;

/**
 * HU-08: "priorizando el horario en que los huéspedes están fuera
 * (contratistas de 06:00 a 19:00 y turistas temprano en la mañana)".
 * Antes de esto no existía ninguna lógica de horario — el recordatorio
 * trataba todas las piezas ocupadas igual, sin importar si el huésped
 * estaba en faena o recién saliendo a pasear. Score más alto = más
 * prioritario para asear AHORA (el huésped probablemente no está).
 *
 * Función pura para poder probarla sin depender de la hora real del
 * sistema ni de PowerSync.
 */
export function calcularPrioridadAseo(tipoCliente: TipoClienteAseo, horaActual: number): number {
  if (tipoCliente === "empresa") {
    // Contratista en faena: fuera de 06:00 a 19:00 (inclusive el borde
    // de las 19, el turno real de faena en Paposo).
    return horaActual >= 6 && horaActual < 19 ? 2 : 0;
  }
  if (tipoCliente === "turista") {
    // "Temprano en la mañana": ventana razonable antes de que el
    // turista vuelva a la pieza a media mañana/mediodía.
    return horaActual >= 7 && horaActual < 11 ? 2 : 0;
  }
  // Tipo de huésped desconocido (dato no sincronizado aún, etc.): sin
  // información para priorizar, prioridad neutra.
  return 1;
}

export function estaEnVentanaIdeal(tipoCliente: TipoClienteAseo, horaActual: number): boolean {
  return calcularPrioridadAseo(tipoCliente, horaActual) === 2;
}
