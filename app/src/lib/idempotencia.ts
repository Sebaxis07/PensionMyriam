/**
 * uuid_idempotente para cada escritura reintentable (RNF-06): si la app
 * reintenta el mismo envío por un corte de señal, el servidor lo
 * identifica por este valor y no lo duplica (ver triggers/constraints
 * de db/migrations/0001_init.sql). Se genera UNA vez por acción, antes
 * de escribir — nunca en cada reintento.
 */
export function nuevoUuidIdempotente(): string {
  return crypto.randomUUID();
}
