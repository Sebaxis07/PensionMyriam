import { fechaHoySantiago } from "../../lib/fechaNegocio";
import { SERVICIOS_INFO } from "./serviciosInfo";
import type { TipoConsumo } from "./registrarConsumo";

export interface RacionDelDia {
  tipo_consumo: TipoConsumo;
  total: number;
}

/**
 * HU-21: "arma un texto con las raciones servidas listo para copiar y
 * enviar" — solo texto, sin API de WhatsApp Business (RNF, CLAUDE.md:
 * "enlaces wa.me... sin API"). No envía nada por sí mismo: el llamador
 * decide si lo copia al portapapeles o lo abre en un enlace wa.me,
 * igual que compartirWhatsApp.ts para reservas.
 */
export function armarResumenDiaTexto(
  empresaNombre: string,
  raciones: RacionDelDia[],
  headcountContratado?: number,
  fecha: string = fechaHoySantiago()
): string {
  const lineas = raciones
    .filter((r) => r.total > 0)
    .map((r) => {
      const info = SERVICIOS_INFO[r.tipo_consumo];
      const etiqueta = info?.nombreCorto ?? r.tipo_consumo;
      const icono = info?.icon ?? "🍽️";
      return `${icono} ${etiqueta}: ${r.total}`;
    });

  const totalServido = raciones.reduce((sum, r) => sum + r.total, 0);
  const cuerpoRaciones = lineas.length > 0 ? lineas.join("\n") : "Sin raciones registradas todavía.";
  const lineaDotacion =
    typeof headcountContratado === "number"
      ? `\nDotación contratada: ${headcountContratado} trabajadores.`
      : "";

  return (
    `📋 *Resumen del día — ${empresaNombre}*\n` +
    `📅 ${fecha}\n\n` +
    `${cuerpoRaciones}\n\n` +
    `Total raciones servidas hoy: ${totalServido}.${lineaDotacion}\n\n` +
    `_Generado desde el registro de la Pensión Señora Miriam. Las diferencias frente a lo contratado, si las hay, quedan con su justificación en el sistema._`
  );
}

/** Copia el resumen al portapapeles. Devuelve false si el navegador lo impide (sin permiso, contexto no seguro, etc.). */
export async function copiarResumenDiaTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

/** Abre un enlace wa.me con el texto precargado — la usuaria elige el contacto y presiona enviar; nada se envía automáticamente. */
export function abrirResumenDiaWhatsApp(texto: string, telefonoDestino?: string): void {
  const textoCodificado = encodeURIComponent(texto);
  const numeroLimpio = telefonoDestino?.replace(/[^0-9]/g, "") || "";
  const url = numeroLimpio
    ? `https://wa.me/${numeroLimpio}?text=${textoCodificado}`
    : `https://wa.me/?text=${textoCodificado}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
