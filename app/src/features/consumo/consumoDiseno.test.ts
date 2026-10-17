import { describe, it, expect, vi } from "vitest";
import {
  obtenerServicioSugeridoPorHora,
  SERVICIOS_INFO,
  LISTA_SERVICIOS_ORDENADA
} from "./serviciosInfo";

describe("Diseño y Lógica de Consumo de Raciones", () => {
  it("contiene los 5 servicios con su metadata e iconos claros", () => {
    expect(LISTA_SERVICIOS_ORDENADA).toEqual([
      "desayuno",
      "almuerzo",
      "cena",
      "colacion",
      "cama_noche"
    ]);

    expect(SERVICIOS_INFO.desayuno.icon).toBe("☕");
    expect(SERVICIOS_INFO.almuerzo.icon).toBe("🍲");
    expect(SERVICIOS_INFO.cena.icon).toBe("🍽️");
    expect(SERVICIOS_INFO.colacion.icon).toBe("🥪");
    expect(SERVICIOS_INFO.cama_noche.icon).toBe("🛏️");

    expect(SERVICIOS_INFO.almuerzo.verbo).toBe("Servir almuerzo");
    expect(SERVICIOS_INFO.desayuno.verbo).toBe("Servir desayuno");
  });

  it("sugiere el servicio según la hora del día en Chile", () => {
    // Probar mañana (08:30)
    vi.setSystemTime(new Date(2026, 9, 1, 8, 30));
    expect(obtenerServicioSugeridoPorHora()).toBe("desayuno");

    // Probar mediodía (13:15)
    vi.setSystemTime(new Date(2026, 9, 1, 13, 15));
    expect(obtenerServicioSugeridoPorHora()).toBe("almuerzo");

    // Probar tarde (17:30)
    vi.setSystemTime(new Date(2026, 9, 1, 17, 30));
    expect(obtenerServicioSugeridoPorHora()).toBe("colacion");

    // Probar noche (20:45)
    vi.setSystemTime(new Date(2026, 9, 1, 20, 45));
    expect(obtenerServicioSugeridoPorHora()).toBe("cena");

    // Probar madrugada (02:00)
    vi.setSystemTime(new Date(2026, 9, 1, 2, 0));
    expect(obtenerServicioSugeridoPorHora()).toBe("cama_noche");

    vi.useRealTimers();
  });
});
