import { EstadoSemaforoMargen } from "./types";

export interface ContextoRecomendacion {
  margenPorcentaje: number;
  costoDiarioTrabajador: number;
  tarifaMinimaSugerida: number;
  contratosBajoMinimo?: Array<{ razonSocial: string; tarifa: number }>;
}

/**
 * Umbrales 30%/15%: referencia de trabajo del equipo (CLAUDE.md los marca
 * explícitamente como "ej."), calibrada contra la única cifra que la
 * Administradora confirmó en las reuniones — ganancia líquida de
 * $3-4M/mes para 30 personas, ~50% de margen neto (anotaciones de la
 * reunión 2) — nunca un porcentaje de alerta exacto. Pendiente de
 * validar con ella; no son una decisión de negocio cerrada.
 */
export function obtenerEstadoSemaforo(margenPorcentaje: number): EstadoSemaforoMargen {
  if (margenPorcentaje >= 30) return "verde";
  if (margenPorcentaje >= 15) return "amarillo";
  return "rojo";
}

/**
 * HU-26: Genera una recomendación de negocio clara, humana y sin jerga técnica
 * adaptada a la baja alfabetización digital de la Señora Miriam.
 */
export function generarRecomendacionMargen(ctx: ContextoRecomendacion): string {
  const { margenPorcentaje, tarifaMinimaSugerida, contratosBajoMinimo = [] } = ctx;

  if (contratosBajoMinimo.length > 0) {
    const primera = contratosBajoMinimo[0];
    const tarifaFormateada = Math.round(primera.tarifa).toLocaleString("es-CL");
    const sugeridaFormateada = Math.round(tarifaMinimaSugerida).toLocaleString("es-CL");
    return `Atención con ${primera.razonSocial}: Su tarifa convenida ($${tarifaFormateada}) está por debajo de lo necesario para ganar tu 30% ($${sugeridaFormateada}). Te sugerimos renegociar en la próxima renovación.`;
  }

  if (margenPorcentaje >= 30) {
    return "¡Excelente noticia! Tu pensión tiene una ganancia saludable. Los pagos de las empresas cubren con holgura los alimentos, el gas y los artículos de aseo.";
  }

  if (margenPorcentaje >= 15) {
    return "Cuidado: La ganancia está un poco justa este período. Los precios de las compras de mercadería han subido. Vigila las compras de carne y verduras para que no se achique tu ganancia.";
  }

  return "¡Alerta importante! La ganancia del mes está muy baja (menos del 15%). El costo de alimentar y alojar a los trabajadores está muy cerca de lo que te pagan. Te recomendamos comprar mercadería por mayor o subir la tarifa convenida.";
}
