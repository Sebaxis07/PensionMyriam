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

export type CamaLibreRow = { cama_id: string; habitacion_id: string; numero: number; capacidad: number };

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
    `select c.id as cama_id, h.id as habitacion_id, h.numero, h.capacidad
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
 */
export async function asignarTrabajador(usuarioId: string, input: AsignacionInput): Promise<void> {
  const datos = AsignacionSchema.parse(input);
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
