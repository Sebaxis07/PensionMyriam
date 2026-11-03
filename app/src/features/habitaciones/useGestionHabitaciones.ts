import { useCallback } from "react";
import { useQuery } from "@powersync/react";
import { z } from "zod";
import { powersync } from "../../lib/powersync";
import { supabase } from "../../lib/supabase";
import { fechaHoySantiago } from "../../lib/fechaNegocio";

/**
 * CAMBIO-01: CRUD de habitaciones en Ajustes, solo Administradora (ver
 * db/migrations/0028_habitaciones_crud.sql).
 *
 * Crear/editar/desactivar/reactivar son escrituras de tabla comunes:
 * van por `powersync.execute` como el resto de la app (offline-first,
 * se suben solas cuando vuelve la señal; si el servidor rechaza un
 * cambio por las reglas de negocio —p. ej. desactivar con reservas
 * futuras— el aviso de rechazo de sincronización de la app es el que
 * se lo dice a la Administradora, no un error en el momento).
 *
 * Eliminar SÍ exige conexión: corre la función `eliminar_habitacion`
 * en el servidor (valida que no haya historial y escribe la bitácora
 * en la misma transacción) y PowerSync no ejecuta funciones de
 * Postgres sin conexión, solo replica filas.
 */

export type TipoHabitacion = "individual" | "doble";

export interface HabitacionAdminRow {
  id: string;
  numero: number;
  capacidad: number;
  estado: string;
  motivo_mantencion: string | null;
  activa: number; // SQLite: 0/1
  reservas_futuras: number;
}

export interface HabitacionFormInput {
  numero: number;
  capacidad: number;
}

/** capacidad 1 = individual, capacidad 2 = doble (ver nota de alcance en 0028). */
export function tipoDeCapacidad(capacidad: number): TipoHabitacion {
  return capacidad === 1 ? "individual" : "doble";
}

export function capacidadDeTipo(tipo: TipoHabitacion): number {
  return tipo === "individual" ? 1 : 2;
}

export const HabitacionSchema = z.object({
  numero: z
    .number({ invalid_type_error: "El número de pieza debe ser un número" })
    .int("El número de pieza debe ser un número entero")
    .positive("El número de pieza debe ser mayor que cero"),
  capacidad: z
    .number({ invalid_type_error: "La capacidad debe ser un número" })
    .int("La capacidad debe ser un número entero")
    .refine((v) => v === 1 || v === 2, {
      message: "La capacidad debe ser 1 (individual) o 2 (doble)"
    })
});

const QUERY_HABITACIONES_ADMIN = `
select
  h.id, h.numero, h.capacidad, h.estado, h.motivo_mantencion, h.activa,
  (
    select count(*) from reserva r
    join cama c on c.id = r.cama_id
    where c.habitacion_id = h.id
      and r.estado = 'confirmada'
      and (r.fecha_fin is null or r.fecha_fin >= ?)
  ) as reservas_futuras
from habitacion h
order by h.numero asc
`;

export function useGestionHabitaciones() {
  const { data, isLoading } = useQuery<HabitacionAdminRow>(QUERY_HABITACIONES_ADMIN, [
    fechaHoySantiago()
  ]);

  const crearHabitacion = useCallback(async (input: HabitacionFormInput) => {
    const datos = HabitacionSchema.parse(input);
    const yaExiste = (data ?? []).some((h) => h.numero === datos.numero);
    if (yaExiste) {
      throw new Error(`Ya existe una pieza con el número ${datos.numero}.`);
    }
    const id = crypto.randomUUID();
    await powersync.writeTransaction(async (tx) => {
      await tx.execute(
        `insert into habitacion (id, numero, capacidad, estado, activa) values (?, ?, ?, 'disponible', 1)`,
        [id, datos.numero, datos.capacidad]
      );
      // Una pieza doble necesita 2 camas reservables (una para el
      // turista que arrienda la pieza completa, otra disponible para
      // nómina de empresa); una individual, solo 1. No hay trigger de
      // servidor que las cree en el INSERT (colisionaría con fixtures
      // que insertan su propia cama numero=1 — ver 0029), así que el
      // CRUD las provisiona acá, en la misma transacción local.
      for (let numero = 1; numero <= datos.capacidad; numero++) {
        await tx.execute(`insert into cama (id, habitacion_id, numero) values (?, ?, ?)`, [
          crypto.randomUUID(),
          id,
          numero
        ]);
      }
    });
    return id;
  }, [data]);

  const editarHabitacion = useCallback(
    async (id: string, input: HabitacionFormInput) => {
      const datos = HabitacionSchema.parse(input);
      const yaExiste = (data ?? []).some((h) => h.numero === datos.numero && h.id !== id);
      if (yaExiste) {
        throw new Error(`Ya existe otra pieza con el número ${datos.numero}.`);
      }
      await powersync.execute(`update habitacion set numero = ?, capacidad = ? where id = ?`, [
        datos.numero,
        datos.capacidad,
        id
      ]);
    },
    [data]
  );

  const cambiarActiva = useCallback(async (id: string, activa: boolean) => {
    await powersync.execute(`update habitacion set activa = ? where id = ?`, [
      activa ? 1 : 0,
      id
    ]);
  }, []);

  const eliminarHabitacion = useCallback(async (id: string, motivo?: string) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("Se requiere conexión a Internet para eliminar una habitación.");
    }
    const { error } = await supabase.rpc("eliminar_habitacion", {
      p_habitacion_id: id,
      p_motivo: motivo ?? null
    });
    if (error) {
      throw new Error(error.message || "No se pudo eliminar la habitación en el servidor.");
    }
  }, []);

  return {
    habitaciones: data ?? [],
    isLoading,
    crearHabitacion,
    editarHabitacion,
    cambiarActiva,
    eliminarHabitacion
  };
}
