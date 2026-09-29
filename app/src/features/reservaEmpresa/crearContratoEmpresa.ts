import { z } from "zod";
import { powersync } from "../../lib/powersync";

// HU-02: headcount y tarifa quedan versionados por vigencia (nunca se
// sobrescribe un contrato existente — un cambio de headcount/tarifa
// cierra esta vigencia y abre una nueva). El EXCLUDE de
// 0001_init.sql (sin solapes por empresa) es la verdad final; acá solo
// se hace una advertencia temprana en el propio dispositivo antes de
// escribir, para no descubrir el rechazo recién al sincronizar.
export const ContratoEmpresaSchema = z.object({
  empresaId: z.string().uuid(),
  vigenciaDesde: z.string().min(1, "Indica la fecha de inicio"),
  vigenciaHasta: z.string().optional(),
  headcount: z.number().int().positive("La cantidad de trabajadores debe ser mayor a 0"),
  tarifaConvenida: z.number().nonnegative("La tarifa no puede ser negativa")
});
export type ContratoEmpresaInput = z.infer<typeof ContratoEmpresaSchema>;

export class ContratoSolapadoError extends Error {
  constructor() {
    super("Ya existe un contrato vigente para esta empresa en esas fechas.");
  }
}

export async function crearContratoEmpresa(usuarioId: string, input: ContratoEmpresaInput): Promise<string> {
  const datos = ContratoEmpresaSchema.parse(input);
  const hastaOInfinito = datos.vigenciaHasta || "9999-12-31";

  const solapadas = await powersync.getAll<{ n: number }>(
    `select count(*) as n from contrato_empresa
     where empresa_id = ?
       and date(vigencia_desde) <= date(?)
       and (vigencia_hasta is null or date(vigencia_hasta) >= date(?))`,
    [datos.empresaId, hastaOInfinito, datos.vigenciaDesde]
  );
  if ((solapadas[0]?.n ?? 0) > 0) {
    throw new ContratoSolapadoError();
  }

  const id = crypto.randomUUID();
  await powersync.execute(
    `insert into contrato_empresa
       (id, empresa_id, vigencia_desde, vigencia_hasta, headcount, tarifa_convenida, creado_por, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      datos.empresaId,
      datos.vigenciaDesde,
      datos.vigenciaHasta || null,
      datos.headcount,
      datos.tarifaConvenida,
      usuarioId,
      new Date().toISOString()
    ]
  );
  return id;
}
