// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

let historialMock: any[] = [];
let camasMock: any[] = [];

vi.mock("@powersync/react", () => ({
  useQuery: (sql: string) => {
    if (/from aseo/i.test(sql)) return { data: historialMock, isLoading: false };
    if (/from cama/i.test(sql)) return { data: camasMock, isLoading: false };
    return { data: [], isLoading: false };
  }
}));

import { useHistorialAseo, useCamasDeHabitacion } from "./useHistorialAseo";

describe("useHistorialAseo", () => {
  it("devuelve un arreglo vacío cuando no hay ningún registro (sin registro ≠ sucio)", () => {
    historialMock = [];
    const { result } = renderHook(() => useHistorialAseo("hab-1"));
    expect(result.current).toEqual([]);
  });

  it("parsea el JSON de tareas a un arreglo de claves", () => {
    historialMock = [
      {
        id: "a1",
        habitacion_id: "hab-1",
        cama_id: null,
        cama_numero: null,
        tipo: "diario",
        modalidad: "detallado",
        tareas: '["barrer","cambiar_sabanas"]',
        observaciones: null,
        pendiente: 0,
        fecha_hora: "2026-10-30T10:00:00Z",
        responsable_declarado: null,
        responsable_nombre: "María",
        aseo_corregido_id: null,
        justificacion_correccion: null
      }
    ];
    const { result } = renderHook(() => useHistorialAseo("hab-1"));
    expect(result.current[0].tareas).toEqual(["barrer", "cambiar_sabanas"]);
  });

  it("un registro sin tareas (null) se mapea a arreglo vacío, no a error", () => {
    historialMock = [
      {
        id: "a1",
        habitacion_id: "hab-1",
        cama_id: null,
        cama_numero: null,
        tipo: "diario",
        modalidad: "rapido",
        tareas: null,
        observaciones: null,
        pendiente: 0,
        fecha_hora: "2026-10-30T10:00:00Z",
        responsable_declarado: null,
        responsable_nombre: "María",
        aseo_corregido_id: null,
        justificacion_correccion: null
      }
    ];
    const { result } = renderHook(() => useHistorialAseo("hab-1"));
    expect(result.current[0].tareas).toEqual([]);
  });

  it("marca pendiente=true solo cuando la columna viene en 1 (explícito)", () => {
    historialMock = [
      {
        id: "a1",
        habitacion_id: "hab-1",
        cama_id: null,
        cama_numero: null,
        tipo: "diario",
        modalidad: "detallado",
        tareas: null,
        observaciones: "Falta revisar la llave del baño",
        pendiente: 1,
        fecha_hora: "2026-10-30T10:00:00Z",
        responsable_declarado: null,
        responsable_nombre: "Encargada",
        aseo_corregido_id: null,
        justificacion_correccion: null
      }
    ];
    const { result } = renderHook(() => useHistorialAseo("hab-1"));
    expect(result.current[0].pendiente).toBe(true);
  });

  it("distingue una fila de corrección por aseo_corregido_id no nulo", () => {
    historialMock = [
      {
        id: "a2",
        habitacion_id: "hab-1",
        cama_id: null,
        cama_numero: null,
        tipo: "diario",
        modalidad: "detallado",
        tareas: null,
        observaciones: null,
        pendiente: 0,
        fecha_hora: "2026-10-30T11:00:00Z",
        responsable_declarado: null,
        responsable_nombre: "María",
        aseo_corregido_id: "a1",
        justificacion_correccion: "Se registró el tipo equivocado"
      }
    ];
    const { result } = renderHook(() => useHistorialAseo("hab-1"));
    expect(result.current[0].esCorreccion).toBe(true);
    expect(result.current[0].justificacionCorreccion).toBe("Se registró el tipo equivocado");
  });
});

describe("useCamasDeHabitacion", () => {
  it("devuelve las camas tal como las entrega la query, sin inventar ninguna", () => {
    camasMock = [
      { id: "c1", numero: 1 },
      { id: "c2", numero: 2 }
    ];
    const { result } = renderHook(() => useCamasDeHabitacion("hab-1"));
    expect(result.current).toEqual(camasMock);
  });

  it("devuelve arreglo vacío para una habitación sin camas cargadas todavía", () => {
    camasMock = [];
    const { result } = renderHook(() => useCamasDeHabitacion("hab-1"));
    expect(result.current).toEqual([]);
  });
});
