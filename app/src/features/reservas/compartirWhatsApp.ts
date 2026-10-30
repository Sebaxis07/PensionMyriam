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
  const config = obtenerConfigPension();
  const noches = Math.max(1, datos.nochesEstimadas ?? 1);
  // HU-39: la tarifa por defecto sale de la configuración replicada, no
  // de un literal — editarla en el modal tiene que cambiar el monto que
  // se envía, igual que el del comprobante PDF.
  const tarifa = datos.tarifaNoche ?? config.tarifaBaseNoche;
  const total = noches * tarifa;

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
    // HU-32: párrafo breve de transparencia. Nombra la finalidad, el
    // plazo de conservación y el canal REAL para ejercer derechos ARCO
    // (el que la Administradora configura en HU-39), en vez de un
    // "responda a este mensaje" que no es un canal formal.
    `🔒 *Privacidad (Ley 21.719):* Sus datos se usan solo para coordinar su estadía y el registro de hospedaje, y se conservan por el plazo legal. Para acceder, corregir o eliminar sus datos escriba a ${config.correoContacto}.\n\n` +
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
