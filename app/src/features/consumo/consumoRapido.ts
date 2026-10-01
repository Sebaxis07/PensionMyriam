import { registrarConsumo, type TipoConsumo } from "./registrarConsumo";

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
 * se guarda igual. Sirve para cualquiera de los 5 tipos (incluido
 * cama_noche, para un registro manual puntual fuera de la generación
 * automática nocturna).
 */
export async function consumoRapido(
  usuarioId: string,
  trabajadorIds: string[],
  tipoConsumo: TipoConsumo,
  opciones?: { productoExtraId?: string; recargo?: number }
): Promise<ResultadoConsumoRapido[]> {
  const resultados = await Promise.allSettled(
    trabajadorIds.map((trabajadorId) =>
      registrarConsumo(usuarioId, {
        trabajadorId,
        tipoConsumo,
        productoExtraId: opciones?.productoExtraId,
        recargo: opciones?.recargo
      })
    )
  );

  return resultados.map((resultado, i) => ({
    trabajadorId: trabajadorIds[i],
    ok: resultado.status === "fulfilled",
    error: resultado.status === "rejected" ? (resultado.reason as Error).message : undefined
  }));
}
