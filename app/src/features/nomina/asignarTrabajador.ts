import { z } from "zod";
import { powersync } from "../../lib/powersync";

const NombreSchema = z.string().trim().min(1);

/** HU-12: "cargo el listado de nombres" — crea un `trabajador` por cada
 * nombre no vacío, vinculado al contrato. Sin cama todavía. */
export async function crearTrabajadores(contratoEmpresaId: string, nombres: string[]): Promise<string[]> {
  const limpios = nombres.map((n) => n.trim()).filter(Boolean);
  const validados = limpios.map((n) => NombreSchema.parse(n));
  const ids: string[] = [];
  for (const nombre of validados) {
    const id = crypto.randomUUID();
    await powersync.execute(
      "insert into trabajador (id, contrato_empresa_id, nombre, created_at) values (?, ?, ?, ?)",
      [id, contratoEmpresaId, nombre, new Date().toISOString()]
    );
    ids.push(id);
  }
  return ids;
}

export type CamaLibreRow = { cama_id: string; habitacion_id: string; numero: number; capacidad: number; cama_numero?: number };

/**
 * HU-12: camas libres para el rango de vigencia del contrato — mismo
 * criterio que HU-01 (sin solape por cama), reutilizado acá para
 * empresas. No hay un concepto separado de "habitaciones reservadas
 * para la empresa": una cama queda asignada a un trabajador creando una
 * `reserva` (tipo_cliente='empresa'), igual que a un turista.
 */
export async function camasLibresParaContrato(fechaInicio: string, fechaFin: string | null): Promise<CamaLibreRow[]> {
  const hastaOInfinito = fechaFin || "9999-12-31";
  return powersync.getAll<CamaLibreRow>(
    `select c.id as cama_id, h.id as habitacion_id, h.numero, h.capacidad, c.numero as cama_numero
     from cama c
     join habitacion h on h.id = c.habitacion_id
     where h.estado <> 'en_mantencion'
       and not exists (
         select 1 from reserva r
         where r.cama_id = c.id
           and r.estado = 'confirmada'
           and date(r.fecha_inicio) <= date(?)
           and (r.fecha_fin is null or date(r.fecha_fin) >= date(?))
       )
     order by h.numero`,
    [hastaOInfinito, fechaInicio]
  );
}

export class SinCamasDisponiblesError extends Error {
  constructor(public faltantes: number) {
    super(`Faltan ${faltantes} cama(s) disponible(s) para asignar a toda la nómina.`);
  }
}

export class CamaOcupadaError extends Error {
  constructor() {
    super("Esa cama ya está asignada a otro trabajador en fechas que se cruzan. Elige otra cama.");
  }
}

const AsignacionSchema = z.object({
  trabajadorId: z.string().uuid(),
  camaId: z.string().uuid(),
  contratoEmpresaId: z.string().uuid(),
  fechaInicio: z.string().min(1),
  fechaFin: z.string().optional()
});
export type AsignacionInput = z.infer<typeof AsignacionSchema>;

/**
 * HU-12: asigna una cama a un trabajador — crea su `reserva` individual
 * (bloqueándola para el resto de la vigencia del contrato, vía el mismo
 * EXCLUDE de reserva que HU-01) y actualiza trabajador.cama_id en la
 * misma transacción local. Ninguna de las dos escrituras depende de un
 * trigger de servidor, así que no hace falta reflejo optimista extra.
 *
 * El EXCLUDE de Postgres (0003_sync_sprint1.sql) es la verdad final
 * contra otro dispositivo, pero solo se aplica al sincronizar — un
 * rechazo ahí queda en `operacion_rechazada` sin aviso en pantalla
 * (HU-42 aún no construye esa UI). Por eso se repite acá, en el propio
 * dispositivo y antes de escribir, el mismo chequeo defensivo que ya
 * usa `crearContratoEmpresa`: evita que dos trabajadores queden
 * silenciosamente asignados a la misma cama hasta que la app
 * recupere señal.
 */
export async function asignarTrabajador(usuarioId: string, input: AsignacionInput): Promise<void> {
  const datos = AsignacionSchema.parse(input);
  const hastaOInfinito = datos.fechaFin || "9999-12-31";
  const choques = await powersync.getAll<{ id: string }>(
    `select id from reserva
     where cama_id = ?
       and estado = 'confirmada'
       and (trabajador_id is null or trabajador_id <> ?)
       and date(fecha_inicio) <= date(?)
       and (fecha_fin is null or date(fecha_fin) >= date(?))`,
    [datos.camaId, datos.trabajadorId, hastaOInfinito, datos.fechaInicio]
  );
  if (choques.length > 0) {
    throw new CamaOcupadaError();
  }

  await powersync.writeTransaction(async (tx) => {
    await tx.execute(
      `insert into reserva
         (id, tipo_cliente, cama_id, trabajador_id, contrato_empresa_id, fecha_inicio, fecha_fin, estado, creado_por, uuid_idempotente, created_at)
       values (?, 'empresa', ?, ?, ?, ?, ?, 'confirmada', ?, ?, ?)`,
      [
        crypto.randomUUID(),
        datos.camaId,
        datos.trabajadorId,
        datos.contratoEmpresaId,
        datos.fechaInicio,
        datos.fechaFin || null,
        usuarioId,
        crypto.randomUUID(),
        new Date().toISOString()
      ]
    );
    await tx.execute("update trabajador set cama_id = ? where id = ?", [datos.camaId, datos.trabajadorId]);
  });
}

/** Desasigna la cama de un trabajador cancelando su reserva activa. */
export async function desasignarTrabajador(trabajadorId: string): Promise<void> {
  await powersync.writeTransaction(async (tx) => {
    await tx.execute(
      `update reserva set estado = 'cancelada' where trabajador_id = ? and estado in ('confirmada', 'en_curso')`,
      [trabajadorId]
    );
    await tx.execute("update trabajador set cama_id = null where id = ?", [trabajadorId]);
  });
}

/** Elimina un trabajador de la nómina y libera su reserva. */
export async function eliminarTrabajador(trabajadorId: string): Promise<void> {
  await powersync.writeTransaction(async (tx) => {
    await tx.execute(
      `update reserva set estado = 'cancelada' where trabajador_id = ? and estado in ('confirmada', 'en_curso')`,
      [trabajadorId]
    );
    await tx.execute("delete from trabajador where id = ?", [trabajadorId]);
  });
}
