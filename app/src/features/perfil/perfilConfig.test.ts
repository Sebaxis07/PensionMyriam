import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  obtenerConfigPension,
  guardarConfigPension,
  CONFIG_PENSION_DEFAULT
} from "./useConfigPension";
import { armarMensajeWhatsAppReserva } from "../reservas/compartirWhatsApp";

describe("Módulo de Perfil y Configuración de la Pensión", () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      }
    };
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  it("retorna la configuración por defecto de Paposo si no hay datos guardados", () => {
    const config = obtenerConfigPension();
    expect(config.nombrePension).toBe(CONFIG_PENSION_DEFAULT.nombrePension);
    expect(config.bancoNombre).toBe("BancoEstado");
    expect(config.tipoCuenta).toBe("CuentaRUT");
    expect(config.rutTitular).toBe(CONFIG_PENSION_DEFAULT.rutTitular);
  });

  it("permite guardar y actualizar datos de la pensión y cuenta bancaria", () => {
    guardarConfigPension({
      titularNombre: "Miriam Soto",
      rutTitular: "9.876.543-2",
      bancoNombre: "BancoEstado",
      tipoCuenta: "Cuenta Corriente"
    });

    const guardada = obtenerConfigPension();
    expect(guardada.titularNombre).toBe("Miriam Soto");
    expect(guardada.rutTitular).toBe("9.876.543-2");
    expect(guardada.tipoCuenta).toBe("Cuenta Corriente");
    // Mantiene los otros valores sin pisar
    expect(guardada.nombrePension).toBe(CONFIG_PENSION_DEFAULT.nombrePension);
  });

  it("refleja los datos bancarios personalizados en el mensaje de WhatsApp para reservas", () => {
    guardarConfigPension({
      titularNombre: "Señora Miriam Paposo",
      rutTitular: "11.222.333-4",
      bancoNombre: "BancoEstado",
      tipoCuenta: "CuentaRUT"
    });

    const mensaje = armarMensajeWhatsAppReserva({
      huespedNombre: "Carlos Gómez",
      habitacionNumero: 2,
      fechaInicio: "2026-10-12",
      nochesEstimadas: 3,
      tarifaNoche: 20000
    });

    expect(mensaje).toContain("¡Hola Carlos Gómez!");
    expect(mensaje).toContain("Pieza #2");
    expect(mensaje).toContain("Titular: Señora Miriam Paposo");
    expect(mensaje).toContain("RUT: 11.222.333-4");
    expect(mensaje).toContain("Banco: BancoEstado");
    expect(mensaje).toContain("Tipo: CuentaRUT");
  });
});
