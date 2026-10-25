import { describe, it, expect } from "vitest";
import {
  fechaSantiago,
  fechaHoySantiago,
  inicioDiaSantiagoUTC,
  finDiaSantiagoUTC,
  rangoDiaSantiagoUTC,
  sumarDiasYMD,
  mesHoySantiago
} from "./fechaNegocio";

/**
 * Cobertura del defecto transversal de zona horaria (ver informe de
 * auditoría Sprint 3): "hoy" calculado en UTC vs. "hoy" calculado en
 * America/Santiago pueden diferir por un día entero entre las 21:00 y
 * las 00:00 hora de Chile — exactamente las fechas de 2026 usadas acá.
 */
describe("fechaSantiago — medianoche y el borde UTC/Santiago", () => {
  it("un instante de las 23:30 en Santiago sigue siendo el MISMO día de Santiago, aunque en UTC ya sea el día siguiente", () => {
    // 2026-10-24 23:30 en Santiago (UTC-3 en octubre) = 2026-10-25 02:30 UTC.
    const instanteUtc = "2026-10-25T02:30:00.000Z";
    expect(fechaSantiago(instanteUtc)).toBe("2026-10-24");
  });

  it("un instante de las 00:30 UTC (00:30-1=21:30 Santiago del día anterior) NO debe contarse como el día siguiente en Santiago", () => {
    // Esta es justo la ventana que rompía 06_maquina_estados_habitacion.sql:
    // 00:30 UTC es 2026-10-24 21:30 en Santiago, un día antes que la
    // fecha UTC literal (2026-10-25).
    const instanteUtc = "2026-10-25T00:30:00.000Z";
    expect(fechaSantiago(instanteUtc)).toBe("2026-10-24");
    // El bug real: comparar el string UTC crudo da la fecha equivocada.
    expect(instanteUtc.slice(0, 10)).toBe("2026-10-25");
    expect(instanteUtc.slice(0, 10)).not.toBe(fechaSantiago(instanteUtc));
  });

  it("justo en la medianoche de Santiago, el día de negocio ya cambió", () => {
    // 2026-10-25 00:00:00 Santiago (UTC-3) = 2026-10-25 03:00:00 UTC.
    expect(fechaSantiago("2026-10-25T02:59:59.000Z")).toBe("2026-10-24");
    expect(fechaSantiago("2026-10-25T03:00:00.000Z")).toBe("2026-10-25");
  });

  it("fechaHoySantiago() es una fecha YYYY-MM-DD bien formada", () => {
    expect(fechaHoySantiago()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("fechaSantiago — cambios de horario en Chile (verano/invierno)", () => {
  it("antes del cambio a horario de invierno (5 abril 2026, -03:00): las 23:00 Santiago del día 4 siguen siendo el día 4", () => {
    // 2026-04-04 23:00 Santiago (-03:00) = 2026-04-05 02:00 UTC.
    expect(fechaSantiago("2026-04-05T02:00:00.000Z")).toBe("2026-04-04");
  });

  it("después del cambio a horario de invierno (-04:00): la medianoche de Santiago del día 5 cae a las 04:00 UTC, no a las 03:00", () => {
    expect(inicioDiaSantiagoUTC("2026-04-05").toISOString()).toBe("2026-04-05T04:00:00.000Z");
  });

  it("antes del cambio a horario de verano (6 sept 2026, -04:00): la medianoche del día 5 cae a las 04:00 UTC", () => {
    expect(inicioDiaSantiagoUTC("2026-09-05").toISOString()).toBe("2026-09-05T04:00:00.000Z");
  });

  it("después del cambio a horario de verano (-03:00): la medianoche del día 6 cae a las 03:00 UTC, no a las 04:00", () => {
    expect(inicioDiaSantiagoUTC("2026-09-06").toISOString()).toBe("2026-09-06T03:00:00.000Z");
  });
});

describe("inicioDiaSantiagoUTC / finDiaSantiagoUTC / rangoDiaSantiagoUTC", () => {
  it("el inicio de un día de verano (UTC-3) cae a las 03:00 UTC", () => {
    expect(inicioDiaSantiagoUTC("2026-01-15").toISOString()).toBe("2026-01-15T03:00:00.000Z");
  });

  it("finDiaSantiagoUTC es el inicio del día siguiente (borde exclusivo)", () => {
    expect(finDiaSantiagoUTC("2026-01-15").toISOString()).toBe(inicioDiaSantiagoUTC("2026-01-16").toISOString());
  });

  it("finDiaSantiagoUTC cruza correctamente el fin de mes", () => {
    expect(finDiaSantiagoUTC("2026-01-31").toISOString()).toBe(inicioDiaSantiagoUTC("2026-02-01").toISOString());
  });

  it("rangoDiaSantiagoUTC entrega [desde, hasta) como ISO strings", () => {
    const rango = rangoDiaSantiagoUTC("2026-10-24");
    expect(rango.desde).toBe("2026-10-24T03:00:00.000Z");
    expect(rango.hasta).toBe("2026-10-25T03:00:00.000Z");
  });

  it("un consumo registrado a las 00:30 UTC (21:30 Santiago del día 24) cae DENTRO del rango del día 24, no del 25", () => {
    const { desde, hasta } = rangoDiaSantiagoUTC("2026-10-24");
    const consumoUtc = "2026-10-25T00:30:00.000Z";
    expect(consumoUtc >= desde && consumoUtc < hasta).toBe(true);
    const rango25 = rangoDiaSantiagoUTC("2026-10-25");
    expect(consumoUtc >= rango25.desde && consumoUtc < rango25.hasta).toBe(false);
  });

  it("rechaza una fecha mal formada en vez de adivinar", () => {
    expect(() => inicioDiaSantiagoUTC("24-10-2026")).toThrow();
    expect(() => inicioDiaSantiagoUTC("2026/10/24")).toThrow();
  });
});

describe("Escenario de check-in/check-out el mismo día, sin que UTC lo rompa", () => {
  it("una reserva que empieza 'hoy' (Santiago) y hace check-out esa misma noche debe quedar en el mismo día de negocio", () => {
    // Caso exacto que rompía el trigger de checkout: fecha_inicio debe
    // fijarse con fechaHoySantiago(), no con toISOString().slice(0,10).
    const checkoutUtc = "2026-10-25T00:45:00.000Z"; // 21:45 Santiago del 24
    const fechaInicioReserva = fechaSantiago(new Date("2026-10-24T20:00:00.000Z")); // 17:00 Santiago del 24
    const fechaFinCheckout = fechaSantiago(checkoutUtc);
    expect(fechaInicioReserva).toBe("2026-10-24");
    expect(fechaFinCheckout).toBe("2026-10-24");
    // fecha_fin >= fecha_inicio (constraint fechas_coherentes) se cumple:
    expect(fechaFinCheckout >= fechaInicioReserva).toBe(true);
  });
});

describe("sumarDiasYMD — aritmética de calendario pura, sin reintroducir UTC/Santiago", () => {
  it("suma días cruzando el fin de mes", () => {
    expect(sumarDiasYMD("2026-01-28", 7)).toBe("2026-02-04");
  });

  it("resta días cruzando el fin de año", () => {
    expect(sumarDiasYMD("2026-01-02", -5)).toBe("2025-12-28");
  });

  it("+7 días desde hoy nunca queda un día antes por el desfase horario (regresión del bug)", () => {
    const hoy = "2026-10-24";
    expect(sumarDiasYMD(hoy, 7)).toBe("2026-10-31");
  });
});

describe("mesHoySantiago", () => {
  it("entrega YYYY-MM a partir del día de negocio de hoy", () => {
    expect(mesHoySantiago()).toMatch(/^\d{4}-\d{2}$/);
    expect(mesHoySantiago()).toBe(fechaHoySantiago().slice(0, 7));
  });
});

describe("Operación offline en un dispositivo con otra zona horaria", () => {
  it("el día de negocio se calcula igual sin importar la zona del dispositivo que generó el timestamp", () => {
    // El dispositivo solo aporta un INSTANTE (UTC real); fechaSantiago no
    // consulta la zona horaria del sistema que ejecuta el código, solo
    // la del propio instante — por eso sincronizar después no cambia la
    // fecha de negocio ya calculada al momento de guardar localmente.
    const instanteGuardadoOffline = "2026-10-25T01:00:00.000Z";
    const calculadoAlGuardar = fechaSantiago(instanteGuardadoOffline);
    const calculadoAlSincronizarDespues = fechaSantiago(instanteGuardadoOffline);
    expect(calculadoAlGuardar).toBe(calculadoAlSincronizarDespues);
    expect(calculadoAlGuardar).toBe("2026-10-24");
  });
});
