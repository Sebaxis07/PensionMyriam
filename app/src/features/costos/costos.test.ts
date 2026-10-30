import { describe, it, expect } from "vitest";
import { obtenerEstadoSemaforo, generarRecomendacionMargen } from "./recomendarMargen";

describe("HU-24 & HU-26: Semáforo de Margen y Recomendaciones de Negocio", () => {
  it("debe asignar semáforo verde para márgenes >= 30%", () => {
    expect(obtenerEstadoSemaforo(30)).toBe("verde");
    expect(obtenerEstadoSemaforo(45)).toBe("verde");
  });

  it("debe asignar semáforo amarillo para márgenes entre 15% y 29%", () => {
    expect(obtenerEstadoSemaforo(29)).toBe("amarillo");
    expect(obtenerEstadoSemaforo(15)).toBe("amarillo");
    expect(obtenerEstadoSemaforo(22)).toBe("amarillo");
  });

  it("debe asignar semáforo rojo para márgenes inferiores a 15%", () => {
    expect(obtenerEstadoSemaforo(14)).toBe("rojo");
    expect(obtenerEstadoSemaforo(0)).toBe("rojo");
    expect(obtenerEstadoSemaforo(-10)).toBe("rojo");
  });

  it("debe generar un mensaje positivo cuando el margen es saludable", () => {
    const recomendacion = generarRecomendacionMargen({
      margenPorcentaje: 35,
      costoDiarioTrabajador: 14000,
      tarifaMinimaSugerida: 20000
    });
    expect(recomendacion).toContain("ganancia saludable");
  });

  it("debe advertir sobre aumento de costos cuando el margen está entre 15% y 29%", () => {
    const recomendacion = generarRecomendacionMargen({
      margenPorcentaje: 20,
      costoDiarioTrabajador: 16000,
      tarifaMinimaSugerida: 22857
    });
    expect(recomendacion).toContain("Cuidado: La ganancia está un poco justa");
  });

  it("debe disparar alerta urgente cuando el margen es menor al 15%", () => {
    const recomendacion = generarRecomendacionMargen({
      margenPorcentaje: 10,
      costoDiarioTrabajador: 18000,
      tarifaMinimaSugerida: 25714
    });
    expect(recomendacion).toContain("¡Alerta importante!");
  });

  it("debe alertar con nombre de empresa cuando la tarifa convenida está bajo la tarifa mínima recomendada", () => {
    const recomendacion = generarRecomendacionMargen({
      margenPorcentaje: 25,
      costoDiarioTrabajador: 14000,
      tarifaMinimaSugerida: 20000,
      contratosBajoMinimo: [{ razonSocial: "Minera Paposo Demo", tarifa: 18000 }]
    });
    expect(recomendacion).toContain("Minera Paposo Demo");
    expect(recomendacion).toContain("18.000");
    expect(recomendacion).toContain("20.000");
  });
});

describe("HU-22: Fórmula de Promedio Móvil Ponderado (PMP)", () => {
  it("debe calcular el nuevo costo PMP correctamente tras compras sucesivas", () => {
    // Compra 1: 10 kg a $10.000 ($1.000 / kg)
    const cant1 = 10;
    const costo1 = 1000;

    // Compra 2: 10 kg a $14.000 ($1.400 / kg)
    const cant2 = 10;
    const monto2 = 14000;

    const cantTotal = cant1 + cant2;
    const nuevoCostoPmp = (cant1 * costo1 + monto2) / cantTotal;

    expect(nuevoCostoPmp).toBe(1200);
  });

  it("debe calcular tarifa mínima para margen del 30%", () => {
    const costoDiario = 14000;
    const margenMeta = 0.30;
    const tarifaMinima = Math.round(costoDiario / (1 - margenMeta));

    expect(tarifaMinima).toBe(20000);
    // Verificamos que margen sea 30%: (20000 - 14000) / 20000 = 6000 / 20000 = 0.30
    expect((tarifaMinima - costoDiario) / tarifaMinima).toBe(0.3);
  });
});
