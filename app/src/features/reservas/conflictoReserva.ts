export interface ReservaConflicto {
  huesped_nombre: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
}

function formatearFechaCorta(fechaIso: string): string {
  if (!fechaIso) return "";
  try {
    const [y, m, d] = fechaIso.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return fechaIso;
  }
}

/**
 * HU-01: "indica con cuál choca". Antes del fix, un choque real de
 * último minuto (condición de carrera entre dos dispositivos, detectada
 * por el EXCLUDE de la base) solo mostraba "la cama se ocupó
 * recientemente", sin decir con quién. Esta función arma esa parte
 * nombrada del mensaje; se extrae para poder probarla sin un navegador.
 */
export function formatearMensajeConflicto(conflicto: ReservaConflicto | null | undefined): string {
  if (!conflicto) return "";
  const nombre = conflicto.huesped_nombre || "otro pasajero";
  const desde = formatearFechaCorta(conflicto.fecha_inicio);
  const hasta = conflicto.fecha_fin ? formatearFechaCorta(conflicto.fecha_fin) : "indefinido";
  return ` Choca con la reserva de ${nombre} (${desde} al ${hasta}).`;
}
