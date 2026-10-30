import { useQuery } from "@powersync/react";
import {
  QUERY_HISTORIAL_ASEO_HABITACION,
  QUERY_CAMAS_DE_HABITACION,
  type HistorialAseoRow,
  type CamaDeHabitacionRow
} from "../../lib/queries";
import type { ClaveTareaAseo } from "./registrarAseo";

export type RegistroAseoHistorial = {
  id: string;
  cama_numero: number | null;
  tipo: string;
  modalidad: string;
  tareas: ClaveTareaAseo[];
  observaciones: string | null;
  // Un registro está "pendiente" SOLO si alguien lo marcó explícitamente
  // así al guardarlo (sección 7/8 del encargo). La ausencia de registro
  // nunca se traduce en este estado — eso se maneja mostrando la lista
  // vacía, nunca inventando una fila "pendiente" o "sucio".
  pendiente: boolean;
  fechaHora: string;
  responsableNombre: string;
  responsableDeclarado: string | null;
  esCorreccion: boolean;
  justificacionCorreccion: string | null;
};

function parsearTareas(raw: string | null): ClaveTareaAseo[] {
  if (!raw) return [];
  try {
    const valor = JSON.parse(raw);
    return Array.isArray(valor) ? (valor as ClaveTareaAseo[]) : [];
  } catch {
    return [];
  }
}

/**
 * Historial de aseo de una habitación (sección 7 del encargo): más
 * reciente primero, sin paginar aparte (limit 100 en la query, más que
 * suficiente para una pensión de 12 piezas). "Sin registro" NO es un
 * valor de este hook — es simplemente un arreglo vacío; la pantalla
 * decide cómo mostrarlo (nunca como "Sucio").
 */
export function useHistorialAseo(habitacionId: string): RegistroAseoHistorial[] {
  const { data } = useQuery<HistorialAseoRow>(QUERY_HISTORIAL_ASEO_HABITACION, [habitacionId]);
  return (data ?? []).map((fila) => ({
    id: fila.id,
    cama_numero: fila.cama_numero,
    tipo: fila.tipo,
    modalidad: fila.modalidad,
    tareas: parsearTareas(fila.tareas),
    observaciones: fila.observaciones,
    pendiente: fila.pendiente === 1,
    fechaHora: fila.fecha_hora,
    responsableNombre: fila.responsable_nombre,
    responsableDeclarado: fila.responsable_declarado,
    esCorreccion: fila.aseo_corregido_id !== null,
    justificacionCorreccion: fila.justificacion_correccion
  }));
}

/** Camas físicas de una habitación, para el selector opcional del modal de aseo detallado. */
export function useCamasDeHabitacion(habitacionId: string): CamaDeHabitacionRow[] {
  const { data } = useQuery<CamaDeHabitacionRow>(QUERY_CAMAS_DE_HABITACION, [habitacionId]);
  return data ?? [];
}
