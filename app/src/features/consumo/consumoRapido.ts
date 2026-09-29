import { registrarConsumo, type TipoRacion } from "./registrarConsumo";

export type ResultadoConsumoRapido = {
  trabajadorId: string;
  ok: boolean;
  error?: string;
};

/**
 * HU-14: "el sistema genera una transacción inmutable independiente por
 * cada uno" — N llamadas independientes a registrarConsumo (cada una
 * con su propio uuid_idempotente generado en el cliente), no un batch
 * atómico: si uno de los N falla (ej. ya estaba registrado), el resto
 * se guarda igual.
 */
export async function consumoRapido(
  usuarioId: string,
  trabajadorIds: string[],
  tipoRacion: TipoRacion
): Promise<ResultadoConsumoRapido[]> {
  const resultados = await Promise.allSettled(
    trabajadorIds.map((trabajadorId) => registrarConsumo(usuarioId, { trabajadorId, tipoRacion }))
  );

  return resultados.map((resultado, i) => ({
    trabajadorId: trabajadorIds[i],
    ok: resultado.status === "fulfilled",
    error: resultado.status === "rejected" ? (resultado.reason as Error).message : undefined
  }));
}
