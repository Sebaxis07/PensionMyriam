import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { pasosTourGeneral, pasosTourAdmin } from "./tourConfig";
import { resolverElementoVisible, adaptarPasosParaDispositivo, isElementVisible } from "./useTour";
import type { DriveStep } from "driver.js";

describe("Sistema de Tour Guiado (tourConfig)", () => {
  it("cuenta con pasos válidos y descriptivos en el tour general", () => {
    expect(pasosTourGeneral.length).toBeGreaterThanOrEqual(10);
    for (const paso of pasosTourGeneral) {
      expect(paso.element).toBeDefined();
      expect(paso.popover?.title).toBeTruthy();
      expect(paso.popover?.description).toBeTruthy();
    }
  });

  it("el tour general contiene explicaciones clave para baja alfabetización digital", () => {
    const titulos = pasosTourGeneral.map((p) => p.popover?.title);
    expect(titulos.some((t) => t?.includes("Bienvenida"))).toBe(true);
    expect(titulos.some((t) => t?.includes("sin Internet"))).toBe(true);
    expect(titulos.some((t) => t?.includes("Habitaciones"))).toBe(true);
    expect(titulos.some((t) => t?.includes("Aseo Diario"))).toBe(true);
    expect(titulos.some((t) => t?.includes("Raciones"))).toBe(true);
    expect(titulos.some((t) => t?.includes("Empresas"))).toBe(true);
    expect(titulos.some((t) => t?.includes("Compras"))).toBe(true);
    expect(titulos.some((t) => t?.includes("Reserva"))).toBe(true);
  });

  it("el tour general tiene soporte para selectores tanto desktop como mobile", () => {
    const pasosConNavegacion = pasosTourGeneral.filter(
      (p) => typeof p.element === "string" && p.element.includes("tour-nav")
    );
    expect(pasosConNavegacion.length).toBeGreaterThan(0);
    for (const paso of pasosConNavegacion) {
      expect(paso.element).toContain("-mobile");
    }
  });

  it("cuenta con pasos para el panel de administración", () => {
    expect(pasosTourAdmin.length).toBeGreaterThanOrEqual(5);
    for (const paso of pasosTourAdmin) {
      expect(paso.element).toBeDefined();
      expect(paso.popover?.title).toBeTruthy();
      expect(paso.popover?.description).toBeTruthy();
    }
  });

  it("el tour de administración cubre el tacómetro de margen y la tarifa mínima", () => {
    const elementos = pasosTourAdmin.map((p) => p.element);
    expect(elementos).toContain("#tour-chart-tacometro");
    expect(elementos).toContain("#tour-card-tarifa-minima");
    expect(elementos).toContain("#tour-kpi-conciliacion");
  });
});

describe("Optimización Mobile del Tour (useTour)", () => {
  let elementosRegistrados: Map<string, any>;

  beforeEach(() => {
    elementosRegistrados = new Map();

    const crearMockElement = (id: string, style: any = {}, rect: any = { top: 0, bottom: 50, width: 50, height: 50 }) => {
      const el: any = {
        id,
        style,
        isConnected: true,
        parentElement: null,
        getBoundingClientRect: () => rect
      };
      elementosRegistrados.set(`#${id}`, el);
      return el;
    };

    (globalThis as any).window = {
      innerWidth: 375,
      innerHeight: 800,
      getComputedStyle: (el: any) => el.style || {}
    };

    (globalThis as any).document = {
      body: {},
      documentElement: {},
      querySelectorAll: (sel: string) => {
        const found = elementosRegistrados.get(sel);
        return found ? [found] : [];
      },
      querySelector: (sel: string) => {
        return elementosRegistrados.get(sel) || null;
      },
      crearMockElement
    };
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).document;
  });

  it("ignora elementos ocultos por display: none y selecciona el elemento visible", () => {
    const doc = (globalThis as any).document;
    const btnDesktop = doc.crearMockElement("tour-nav-habitaciones", { display: "none" }, { top: 0, bottom: 0, width: 0, height: 0 });
    const btnMobile = doc.crearMockElement("tour-nav-habitaciones-mobile", { display: "flex" }, { top: 750, bottom: 800, width: 50, height: 50 });

    expect(isElementVisible(btnDesktop)).toBe(false);
    expect(isElementVisible(btnMobile)).toBe(true);

    const elementoResuelto = resolverElementoVisible("#tour-nav-habitaciones, #tour-nav-habitaciones-mobile");
    expect(elementoResuelto).toBe(btnMobile);
  });

  it("adapta la posición del popover a 'top' y 'center' en mobile para elementos de la barra inferior", () => {
    const doc = (globalThis as any).document;
    doc.crearMockElement(
      "tour-nav-habitaciones-mobile",
      { display: "flex" },
      { top: 750, bottom: 800, width: 50, height: 50 }
    );

    const pasoOriginal: DriveStep = {
      element: "#tour-nav-habitaciones-mobile",
      popover: {
        title: "Piezas",
        description: "Ver habitaciones",
        side: "right",
        align: "start"
      }
    };

    const pasosAdaptados = adaptarPasosParaDispositivo([pasoOriginal]);
    expect(pasosAdaptados.length).toBe(1);
    expect(pasosAdaptados[0].popover?.side).toBe("top");
    expect(pasosAdaptados[0].popover?.align).toBe("center");
  });

  it("adapta la posición del popover a 'bottom' y 'center' en mobile para la cabecera", () => {
    const doc = (globalThis as any).document;
    doc.crearMockElement(
      "tour-logo-identidad",
      { display: "flex" },
      { top: 10, bottom: 50, width: 140, height: 40 }
    );

    const pasoOriginal: DriveStep = {
      element: "#tour-logo-identidad",
      popover: {
        title: "Logo",
        description: "Bienvenida",
        side: "right",
        align: "start"
      }
    };

    const pasosAdaptados = adaptarPasosParaDispositivo([pasoOriginal]);
    expect(pasosAdaptados.length).toBe(1);
    expect(pasosAdaptados[0].popover?.side).toBe("bottom");
    expect(pasosAdaptados[0].popover?.align).toBe("center");
  });
});
