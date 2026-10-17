import { formatearMonedaCLP } from "../../lib/pdf/pdfMakeConfig";
import { obtenerConfigPension } from "../perfil/useConfigPension";

export interface DatosMensajeWhatsApp {
  huespedNombre: string;
  habitacionNumero: number;
  fechaInicio: string;
  fechaFin?: string | null;
  nochesEstimadas?: number;
  tarifaNoche?: number;
  telefonoDestino?: string;
}

export function armarMensajeWhatsAppReserva(datos: DatosMensajeWhatsApp): string {
  const noches = Math.max(1, datos.nochesEstimadas ?? 1);
  const tarifa = datos.tarifaNoche ?? 15000;
  const total = noches * tarifa;
  const config = obtenerConfigPension();

  return (
    `¡Hola ${datos.huespedNombre}! Le confirmamos su reserva en *${config.nombrePension}* (Caleta Paposo):\n\n` +
    `🛏️ *Habitación:* Pieza #${datos.habitacionNumero}\n` +
    `📅 *Llegada:* ${datos.fechaInicio}\n` +
    `📅 *Salida:* ${datos.fechaFin || "Por coordinar"}\n` +
    `🌙 *Estadía:* ${noches} noche(s) · ${formatearMonedaCLP(tarifa)}/noche\n` +
    `💰 *Total estimado:* ${formatearMonedaCLP(total)}\n\n` +
    `💳 *Datos para transferencia (opcional):*\n` +
    `Banco: ${config.bancoNombre}\n` +
    `Tipo: ${config.tipoCuenta}\n` +
    `Titular: ${config.titularNombre}\n` +
    `RUT: ${config.rutTitular}\n\n` +
    `_No exigimos abono previo. Puede pagar al llegar en efectivo o transferencia._\n\n` +
    `🔒 *Privacidad (Ley 21.719):* Sus datos se tratan exclusivamente para coordinar su estadía y registro de hospedaje. Para consultas o ejercicio de sus derechos, responda a este mensaje.\n\n` +
    `¡Le esperamos!`
  );
}

export function abrirEnlaceWhatsApp(datos: DatosMensajeWhatsApp): void {
  const texto = armarMensajeWhatsAppReserva(datos);
  const textoCodificado = encodeURIComponent(texto);
  const numeroLimpio = datos.telefonoDestino?.replace(/[^0-9]/g, "") || "";
  const url = numeroLimpio
    ? `https://wa.me/${numeroLimpio}?text=${textoCodificado}`
    : `https://wa.me/?text=${textoCodificado}`;

  window.open(url, "_blank", "noopener,noreferrer");
}
