/**
 * Devuelve la fecha actual en zona horaria America/Santiago en formato YYYY-MM-DD.
 * Esto asegura consistencia estricta con app.fecha_santiago(ts) de PostgreSQL
 * y evita discrepancias de corte nocturno causadas por el UTC de SQLite local.
 */
export function fechaSantiagoHoy(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}
