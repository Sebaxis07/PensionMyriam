import { z } from "zod";
import { powersync } from "../../lib/powersync";

/**
 * HU-33: el plazo de gracia para anonimizar la nómina se cuenta desde que
 * la facturación del período quedó CERRADA — no desde que el contrato
 * terminó. Hasta el Sprint 5 ese hecho no existía como dato: la pantalla
 * de cierre calculaba el total al vuelo, emitía la pre-factura y no
 * dejaba nada registrado, así que la purga no tenía forma de saber si un
 * período había sido facturado (y anonimizaba contratos terminados que
 * nadie había facturado nunca, incumpliendo el criterio 2 de la historia).
 *
 * Esta función escribe ese hecho. Es una escritura normal por la cola de
 * PowerSync, así que funciona sin señal; `uuid_idempotente` y el unique
 * (contrato, año, mes) garantizan que un reintento o un segundo cierre no
 * muevan el reloj de la retención (RNF-06, verificado en
 * db/pgtap/18_cierre_facturacion.sql).
 *
 * Es append-only: cerrar es un hecho, no un estado que se edite.
 */
export const CierreFacturacionSchema = z.object({
  contratoEmpresaId: z.string().uuid(),
  anio: z.number().int().min(2024).max(2100),
  mes: z.number().int().min(1).max(12),
  totalFacturado: z.number().nonnegative("El total facturado no puede ser negativo"),
  cerradoPor: z.string().uuid()
});
export type CierreFacturacionInput = z.infer<typeof CierreFacturacionSchema>;

export interface CierreFacturacionRow {
  id: string;
  contrato_empresa_id: string;
  periodo_anio: number;
  periodo_mes: number;
  total_facturado: number;
  cerrado_por: string;
  cerrado_at: string;
}

/**
 * Devuelve el cierre ya registrado para ese período, o null. Permite que
 * la pantalla muestre "ya cerrado el …" en vez de ofrecer cerrar de
 * nuevo y chocar contra el unique al sincronizar.
 */
export async function buscarCierrePeriodo(
  contratoEmpresaId: string,
  anio: number,
  mes: number
): Promise<CierreFacturacionRow | null> {
  const filas = await powersync.getAll<CierreFacturacionRow>(
    `select * from cierre_facturacion
      where contrato_empresa_id = ? and periodo_anio = ? and periodo_mes = ?
      limit 1`,
    [contratoEmpresaId, anio, mes]
  );
  return filas[0] ?? null;
}

/**
 * Registra el cierre. Si el período ya estaba cerrado devuelve el cierre
 * existente sin escribir nada: así el botón es seguro de volver a tocar
 * (la Encargada o la Administradora pueden no estar seguras de si alcanzó
 * a guardarse cuando se cortó la señal).
 */
export async function registrarCierreFacturacion(
  input: CierreFacturacionInput
): Promise<CierreFacturacionRow> {
  const datos = CierreFacturacionSchema.parse(input);

  const existente = await buscarCierrePeriodo(datos.contratoEmpresaId, datos.anio, datos.mes);
  if (existente) return existente;

  const id = crypto.randomUUID();
  const cerradoAt = new Date().toISOString();
  await powersync.execute(
    `insert into cierre_facturacion
       (id, contrato_empresa_id, periodo_anio, periodo_mes, total_facturado,
        cerrado_por, cerrado_at, uuid_idempotente)
     values (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      datos.contratoEmpresaId,
      datos.anio,
      datos.mes,
      datos.totalFacturado,
      datos.cerradoPor,
      cerradoAt,
      crypto.randomUUID()
    ]
  );

  return {
    id,
    contrato_empresa_id: datos.contratoEmpresaId,
    periodo_anio: datos.anio,
    periodo_mes: datos.mes,
    total_facturado: datos.totalFacturado,
    cerrado_por: datos.cerradoPor,
    cerrado_at: cerradoAt
  };
}

/**
 * Fecha a partir de la cual la nómina de ese período queda sujeta a
 * anonimización automática. Se usa para poder decírselo a la
 * Administradora en pantalla ("desde el … los nombres se reemplazan"),
 * que es lo que vuelve la política de datos comprensible para ella.
 * El cálculo real lo hace el servidor; este es el mismo, para mostrar.
 */
export function fechaAnonimizacionPrevista(cerradoAt: string, diasGracia: number): Date {
  const base = new Date(cerradoAt);
  const prevista = new Date(base.getTime());
  prevista.setDate(prevista.getDate() + diasGracia);
  return prevista;
}
