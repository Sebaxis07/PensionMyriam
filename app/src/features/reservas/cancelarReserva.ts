import { z } from "zod";
import { powersync } from "../../lib/powersync";

export const CancelacionReservaSchema = z.object({
  reservaId: z.string().uuid(),
  usuarioId: z.string().uuid(),
  motivo: z.string().trim().min(5, "Escribe el motivo con al menos 5 caracteres.").max(500, "Resume el motivo en un máximo de 500 caracteres."),
  uuidCancelacion: z.string().uuid()
});

/** Una sola escritura local; el servidor vuelve a validar al sincronizar. */
export async function cancelarReserva(entrada: z.infer<typeof CancelacionReservaSchema>): Promise<void> {
  const datos = CancelacionReservaSchema.parse(entrada);
  await powersync.writeTransaction(async tx => {
    const filas = await tx.getAll<{ estado: string; tipo_cliente: string; ingreso: number }>(
      `select r.estado, r.tipo_cliente, exists(select 1 from checkin where reserva_id = r.id) as ingreso
       from reserva r where r.id = ?`, [datos.reservaId]
    );
    const reserva = filas[0];
    if (!reserva) throw new Error("No se encontró la reserva en este teléfono. Revisa la sincronización.");
    if (reserva.estado === "cancelada") return;
    if (reserva.ingreso) throw new Error("El huésped ya ingresó. Registra su salida en Habitaciones.");
    if (reserva.estado !== "confirmada" || reserva.tipo_cliente !== "turista") throw new Error("Solo se puede cancelar una reserva de turista antes de su llegada.");
    await tx.execute(
      `update reserva set estado = 'cancelada', motivo_cancelacion = ?, cancelada_por = ?, cancelada_en = ?, uuid_cancelacion = ? where id = ?`,
      [datos.motivo, datos.usuarioId, new Date().toISOString(), datos.uuidCancelacion, datos.reservaId]
    );
  });
}
