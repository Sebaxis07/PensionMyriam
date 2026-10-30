import { z } from "zod";
import { powersync } from "../../lib/powersync";
import { sumarDiasYMD } from "../../lib/fechaNegocio";

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
  tarifaConvenida: z.number().nonnegative("La tarifa no puede ser negativa"),
  // Servicios incluidos en la tarifa convenida (migración 0026).
  // Default true: mismo supuesto que ya asume tipo_consumo_config para
  // TODO contrato hasta hoy — un contrato viejo que nunca mandó estos
  // campos no cambia de significado.
  incluyeDesayuno: z.boolean().default(true),
  incluyeAlmuerzo: z.boolean().default(true),
  incluyeCena: z.boolean().default(true),
  // Nunca se infiere: null = no especificada.
  condicionTributaria: z.enum(["neto", "con_iva"]).nullable().default(null)
});
// z.input (no z.infer): los campos con .default() deben seguir siendo
// OPCIONALES para quien llama (compatibilidad con código existente que
// no conocía incluye_*/condicion_tributaria antes de la migración 0026).
export type ContratoEmpresaInput = z.input<typeof ContratoEmpresaSchema>;

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

  // Día anterior a vigenciaDesde — aritmética de calendario pura (no
  // representa "ahora", así que no hay zona horaria que resolver).
  const ayerStr = sumarDiasYMD(datos.vigenciaDesde, -1);

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
        await powersync.execute("update reserva set fecha_fin = ? where contrato_empresa_id = ? and cupo_numero is not null and estado = 'confirmada'", [ayerStr,c.id]);
      } else {
        // El nuevo contrato intenta iniciar en o antes de la fecha de inicio del contrato existente
        throw new ContratoSolapadoError();
      }
    }
  }

  const id = crypto.randomUUID();
  await powersync.execute(
    `insert into contrato_empresa
       (id, empresa_id, vigencia_desde, vigencia_hasta, headcount, tarifa_convenida,
        incluye_desayuno, incluye_almuerzo, incluye_cena, condicion_tributaria, creado_por, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      datos.empresaId,
      datos.vigenciaDesde,
      datos.vigenciaHasta || null,
      datos.headcount,
      datos.tarifaConvenida,
      datos.incluyeDesayuno,
      datos.incluyeAlmuerzo,
      datos.incluyeCena,
      datos.condicionTributaria,
      usuarioId,
      new Date().toISOString()
    ]
  );
  return id;
}
