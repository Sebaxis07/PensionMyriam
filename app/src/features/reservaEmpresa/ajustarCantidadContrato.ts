import { z } from "zod";
import { powersync } from "../../lib/powersync";
import { crearContratoEmpresa } from "./crearContratoEmpresa";
import {
  calcularEstimacionContrato,
  type EstimacionContrato,
  type CondicionTributariaContrato
} from "./estimacionContrato";

/**
 * Ajuste de la cantidad contratada (sección 8 del alcance: "mostrar
 * cantidad anterior, cantidad nueva, fecha efectiva, ... estimación
 * anterior, estimación actualizada, diferencia económica").
 *
 * NO reconstruye el versionado de contrato_empresa: reutiliza
 * crearContratoEmpresa (HU-02), que ya cierra la vigencia del contrato
 * actual y abre una fila nueva sin sobrescribir la anterior. Esta
 * función solo:
 *   1. valida que el ajuste tenga sentido (fecha efectiva posterior al
 *      inicio del contrato actual — no se puede modificar
 *      retroactivamente un período ya transcurrido);
 *   2. conserva la tarifa, los servicios incluidos y la condición
 *      tributaria del contrato actual (un ajuste de CANTIDAD no cambia
 *      esas condiciones — para eso hay que crear un contrato nuevo);
 *   3. deja un registro explícito en contrato_empresa_ajuste con el
 *      motivo, trazable aparte del simple historial de vigencias.
 */
const AjusteSchema = z.object({
  contratoActualId: z.string().uuid(),
  nuevaCantidad: z.number().int().positive("La nueva cantidad debe ser mayor a 0"),
  fechaEfectiva: z.string().min(1, "Indica la fecha efectiva del ajuste"),
  motivo: z.string().trim().min(1, "Indica el motivo del ajuste")
});
export type AjusteCantidadContratoInput = z.infer<typeof AjusteSchema>;

interface ContratoActualRow {
  empresa_id: string;
  headcount: number;
  tarifa_convenida: number;
  vigencia_desde: string;
  vigencia_hasta: string | null;
  incluye_desayuno: number | boolean;
  incluye_almuerzo: number | boolean;
  incluye_cena: number | boolean;
  condicion_tributaria: CondicionTributariaContrato;
}

export class ContratoNoEncontradoError extends Error {
  constructor() {
    super("No se encontró el contrato a ajustar en este teléfono.");
  }
}

export class FechaEfectivaInvalidaError extends Error {
  constructor() {
    super("La fecha efectiva del ajuste debe ser posterior a la fecha de inicio del contrato actual.");
  }
}

export class ContratoFinalizadoError extends Error {
  constructor() {
    super("Este contrato ya finalizó; no se puede ajustar su cantidad después de la fecha de término.");
  }
}

export interface ResultadoAjusteCantidad {
  contratoNuevoId: string;
  estimacionAnterior: EstimacionContrato;
  estimacionNueva: EstimacionContrato;
}

/** Vista previa (sin escribir nada) de antes/después — la usa el diálogo de confirmación de la UI. */
export function previsualizarAjusteCantidad(
  contratoActual: Pick<ContratoActualRow, "headcount" | "tarifa_convenida" | "vigencia_desde" | "vigencia_hasta">,
  nuevaCantidad: number,
  fechaEfectiva: string
): { estimacionAnterior: EstimacionContrato; estimacionNueva: EstimacionContrato } {
  const estimacionAnterior = calcularEstimacionContrato({
    headcount: contratoActual.headcount,
    tarifaConvenida: contratoActual.tarifa_convenida,
    vigenciaDesde: contratoActual.vigencia_desde,
    vigenciaHasta: contratoActual.vigencia_hasta
  });
  const estimacionNueva = calcularEstimacionContrato({
    headcount: nuevaCantidad,
    tarifaConvenida: contratoActual.tarifa_convenida,
    vigenciaDesde: fechaEfectiva,
    vigenciaHasta: contratoActual.vigencia_hasta
  });
  return { estimacionAnterior, estimacionNueva };
}

export async function ajustarCantidadContrato(
  usuarioId: string,
  input: AjusteCantidadContratoInput
): Promise<ResultadoAjusteCantidad> {
  const datos = AjusteSchema.parse(input);

  const filas = await powersync.getAll<ContratoActualRow>(
    `select empresa_id, headcount, tarifa_convenida, vigencia_desde, vigencia_hasta,
            incluye_desayuno, incluye_almuerzo, incluye_cena, condicion_tributaria
       from contrato_empresa where id = ?`,
    [datos.contratoActualId]
  );
  const contratoActual = filas[0];
  if (!contratoActual) throw new ContratoNoEncontradoError();

  // No se permite retroceder antes del propio inicio del contrato
  // actual: eso sería reescribir un período que ya corrió. Tampoco se
  // permite el mismo día de inicio (ver crearContratoEmpresa: cerrar
  // una vigencia que recién empieza hoy mismo la trataría como un
  // solape, no como un cierre).
  if (datos.fechaEfectiva <= contratoActual.vigencia_desde) {
    throw new FechaEfectivaInvalidaError();
  }
  if (contratoActual.vigencia_hasta && datos.fechaEfectiva > contratoActual.vigencia_hasta) {
    throw new ContratoFinalizadoError();
  }

  const estimacionAnterior = calcularEstimacionContrato({
    headcount: contratoActual.headcount,
    tarifaConvenida: contratoActual.tarifa_convenida,
    vigenciaDesde: contratoActual.vigencia_desde,
    vigenciaHasta: contratoActual.vigencia_hasta
  });
  const estimacionNueva = calcularEstimacionContrato({
    headcount: datos.nuevaCantidad,
    tarifaConvenida: contratoActual.tarifa_convenida,
    vigenciaDesde: datos.fechaEfectiva,
    vigenciaHasta: contratoActual.vigencia_hasta
  });

  // crearContratoEmpresa cierra la vigencia del contrato actual
  // (vigencia_hasta = día anterior a fechaEfectiva) y abre esta fila
  // nueva — misma tarifa, servicios y condición tributaria: un ajuste
  // de CANTIDAD no es un ajuste de precio.
  const contratoNuevoId = await crearContratoEmpresa(usuarioId, {
    empresaId: contratoActual.empresa_id,
    vigenciaDesde: datos.fechaEfectiva,
    vigenciaHasta: contratoActual.vigencia_hasta || undefined,
    headcount: datos.nuevaCantidad,
    tarifaConvenida: contratoActual.tarifa_convenida,
    incluyeDesayuno: Boolean(contratoActual.incluye_desayuno),
    incluyeAlmuerzo: Boolean(contratoActual.incluye_almuerzo),
    incluyeCena: Boolean(contratoActual.incluye_cena),
    condicionTributaria: contratoActual.condicion_tributaria
  });

  await powersync.execute(
    `insert into contrato_empresa_ajuste
       (id, contrato_anterior_id, contrato_nuevo_id, cantidad_anterior, cantidad_nueva, fecha_efectiva, motivo, registrado_por, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      datos.contratoActualId,
      contratoNuevoId,
      contratoActual.headcount,
      datos.nuevaCantidad,
      datos.fechaEfectiva,
      datos.motivo,
      usuarioId,
      new Date().toISOString()
    ]
  );

  return { contratoNuevoId, estimacionAnterior, estimacionNueva };
}
