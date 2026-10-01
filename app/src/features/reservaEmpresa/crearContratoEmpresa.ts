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

  // Buscar si hay contratos existentes para esta empresa
  const existentes = await powersync.getAll<{
    id: string;
    vigencia_desde: string;
    vigencia_hasta: string | null;
  }>(
    `select id, vigencia_desde, vigencia_hasta from contrato_empresa
     where empresa_id = ?
     order by vigencia_desde desc`,
    [datos.empresaId]
  );

  // Calcular la fecha del día anterior a vigenciaDesde (formato YYYY-MM-DD en UTC)
  const partes = datos.vigenciaDesde.split("-").map(Number);
  const fechaDesde = new Date(Date.UTC(partes[0], partes[1] - 1, partes[2]));
  fechaDesde.setUTCDate(fechaDesde.getUTCDate() - 1);
  const ayerStr = fechaDesde.toISOString().slice(0, 10);

  for (const c of existentes) {
    const cFin = c.vigencia_hasta || "9999-12-31";
    const solapa = c.vigencia_desde <= hastaOInfinito && cFin >= datos.vigenciaDesde;
    if (solapa) {
      if (c.vigencia_desde <= ayerStr) {
        // HU-02: se cierra la vigencia del contrato actual (vigencia_hasta = ayer)
        // y se abre una nueva para mantener trazabilidad contractual (RNF-03)
        await powersync.execute(
          `update contrato_empresa set vigencia_hasta = ? where id = ?`,
          [ayerStr, c.id]
        );
      } else {
        // El nuevo contrato intenta iniciar en o antes de la fecha de inicio del contrato existente
        throw new ContratoSolapadoError();
      }
    }
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
