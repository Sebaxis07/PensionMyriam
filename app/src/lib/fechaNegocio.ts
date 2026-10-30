/**
 * Fuente única de verdad para "qué día es" del lado del cliente.
 *
 * Causa raíz del bug transversal (ver informe de auditoría Sprint 3):
 * `new Date().toISOString().slice(0, 10)` y el `date('now')` de SQLite
 * son SIEMPRE UTC. Postgres ya hace esto bien en todas sus migraciones
 * (helper `app.fecha_santiago(ts)` en 0005_empresas_consumo.sql, y
 * `at time zone 'America/Santiago'` en cada trigger/función que corta
 * por día) — el cliente era el único lado sin un punto único de verdad,
 * y terminaba comparando una fecha UTC contra un corte hecho en
 * Santiago. Entre las 21:00 y las 00:00 hora de Chile (00:00-03:00 UTC),
 * "hoy" en UTC ya es un día distinto a "hoy" en Santiago.
 *
 * No se fija un offset fijo (-03:00/-04:00): Chile cambia de horario, y
 * un offset fijo quedaría mal la mitad del año. En vez de eso se usa
 * `Intl.DateTimeFormat`/`toLocaleString` con el nombre de la zona IANA
 * — la misma base de datos de zonas horarias (ICU) que ya resuelve
 * correctamente el horario de verano/invierno de Chile sin que este
 * módulo tenga que saber las fechas exactas del cambio.
 */

export const ZONA_NEGOCIO = "America/Santiago";

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Evita el parsing ambiguo de "YYYY-MM-DD": separa los números a mano
 * en vez de dejar que el motor de JS decida cómo interpretar el string. */
function partesYMD(fechaYMD: string): { y: number; m: number; d: number } {
  const m = YMD_RE.exec(fechaYMD);
  if (!m) {
    throw new Error(`Fecha inválida, se esperaba YYYY-MM-DD: "${fechaYMD}"`);
  }
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/**
 * Diferencia (en minutos) entre la hora en `zona` y UTC, PARA EL
 * INSTANTE DADO (no un offset fijo: el resultado cambia según la época
 * del año). Técnica estándar sin dependencias: se proyecta el mismo
 * instante a través de dos zonas distintas y se compara — el resultado
 * no depende de en qué zona horaria esté configurado el dispositivo
 * que ejecuta este código (requisito explícito: "sin depender de la
 * zona horaria del dispositivo").
 */
function offsetMinutosEnInstante(zona: string, instante: Date): number {
  const comoUtc = new Date(instante.toLocaleString("en-US", { timeZone: "UTC" }));
  const comoZona = new Date(instante.toLocaleString("en-US", { timeZone: zona }));
  return Math.round((comoZona.getTime() - comoUtc.getTime()) / 60000);
}

/** Fecha de negocio (YYYY-MM-DD) de un instante, en la zona del negocio. */
export function fechaSantiago(instante: Date | string = new Date()): string {
  const fecha = typeof instante === "string" ? new Date(instante) : instante;
  if (Number.isNaN(fecha.getTime())) {
    throw new Error(`Instante inválido: "${String(instante)}"`);
  }
  // en-CA formatea como YYYY-MM-DD directamente — evita construir el
  // string a mano a partir de las partes (year/month/day) de Intl.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_NEGOCIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(fecha);
}

/** "Hoy" de negocio — lo que antes era `new Date().toISOString().slice(0, 10)`. */
export function fechaHoySantiago(): string {
  return fechaSantiago(new Date());
}

/** Fecha y hora de negocio legibles (HH:mm, 24h) de un instante. */
export function horaSantiago(instante: Date | string = new Date()): string {
  const fecha = typeof instante === "string" ? new Date(instante) : instante;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA_NEGOCIO,
    hour: "2-digit",
    minute: "2-digit"
  }).format(fecha);
}

/**
 * Instante UTC que corresponde a las 00:00:00 de un día de negocio
 * (YYYY-MM-DD) en Santiago. Punto fijo de 2 iteraciones: la primera
 * aproximación usa el offset en la medianoche UTC de esa fecha (a lo
 * sumo unas horas de distancia real), la segunda ya usa el offset en
 * el instante refinado — suficiente salvo que la transición de horario
 * ocurra exactamente a esa medianoche de Santiago (caso extremo: ICU
 * sigue resolviendo un resultado válido y consistente, solo que de un
 * lado u otro de la transición).
 */
export function inicioDiaSantiagoUTC(fechaYMD: string): Date {
  const { y, m, d } = partesYMD(fechaYMD);
  const base = Date.UTC(y, m - 1, d, 0, 0, 0);
  let candidato = new Date(base);
  for (let i = 0; i < 2; i++) {
    const offset = offsetMinutosEnInstante(ZONA_NEGOCIO, candidato);
    candidato = new Date(base - offset * 60000);
  }
  return candidato;
}

/** Instante UTC de las 00:00:00 del día de negocio SIGUIENTE — el borde
 * exclusivo de un rango "todo ese día". */
export function finDiaSantiagoUTC(fechaYMD: string): Date {
  const { y, m, d } = partesYMD(fechaYMD);
  // d+1 es seguro: el constructor Date normaliza el desborde de mes/año.
  const siguiente = fechaSantiago(new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0)));
  return inicioDiaSantiagoUTC(siguiente);
}

/**
 * Rango [desde, hasta) en UTC para filtrar filas de un día de negocio
 * completo sin usar `date(columna) = date('now')` (que compara el
 * substring UTC literal, no el día de Santiago). `hasta` es exclusivo.
 */
export function rangoDiaSantiagoUTC(fechaYMD: string): { desde: string; hasta: string } {
  return {
    desde: inicioDiaSantiagoUTC(fechaYMD).toISOString(),
    hasta: finDiaSantiagoUTC(fechaYMD).toISOString()
  };
}

/** Rango del día de negocio de HOY — el caso de uso más común. */
export function rangoHoySantiagoUTC(): { desde: string; hasta: string } {
  return rangoDiaSantiagoUTC(fechaHoySantiago());
}

/**
 * Suma (o resta, con N negativo) días de calendario a una fecha
 * YYYY-MM-DD. Aritmética pura de calendario — no representa ningún
 * instante, así que no hay ambigüedad de zona horaria que resolver
 * (a diferencia de "hoy", que sí depende de en qué zona se mire el
 * reloj real).
 */
export function sumarDiasYMD(fechaYMD: string, dias: number): string {
  const { y, m, d } = partesYMD(fechaYMD);
  // Se opera sobre un Date UTC solo como calculadora de calendario (para
  // que normalice desbordes de mes/año) y se leen sus componentes UTC
  // de vuelta — NUNCA se convierte a Santiago acá: eso reintroduciría
  // el mismo desfase de día que este módulo existe para evitar.
  const resultado = new Date(Date.UTC(y, m - 1, d + dias));
  const yy = resultado.getUTCFullYear();
  const mm = String(resultado.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(resultado.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** "YYYY-MM" del día de negocio de hoy — para filtros "del mes actual". */
export function mesHoySantiago(): string {
  return fechaHoySantiago().slice(0, 7);
}
