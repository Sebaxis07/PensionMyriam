import { formatearMonedaCLP } from "../../lib/pdf/pdfMakeConfig";

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

  return (
    `¡Hola ${datos.huespedNombre}! Le confirmamos su reserva en *Pensión Señora Miriam* (Caleta Paposo):\n\n` +
    `🛏️ *Habitación:* Pieza #${datos.habitacionNumero}\n` +
    `📅 *Llegada:* ${datos.fechaInicio}\n` +
    `📅 *Salida:* ${datos.fechaFin || "Por coordinar"}\n` +
    `🌙 *Estadía:* ${noches} noche(s) · ${formatearMonedaCLP(tarifa)}/noche\n` +
    `💰 *Total estimado:* ${formatearMonedaCLP(total)}\n\n` +
    `💳 *Datos para transferencia (opcional):*\n` +
    `Banco: BancoEstado\n` +
    `Tipo: CuentaRUT\n` +
    `Titular: María (Pensión Señora Miriam)\n` +
    `RUT: 12.345.678-9\n\n` +
    `_No exigimos abono previo. Puede pagar al llegar en efectivo o transferencia._\n` +
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
