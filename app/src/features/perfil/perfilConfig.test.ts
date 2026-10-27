import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  obtenerConfigPension,
  sincronizarEspejoConfig,
  guardarConfigNegocio,
  filaAConfig,
  ConfigPensionSchema,
  CONFIG_PENSION_DEFAULT,
  type ConfigPension
} from "./useConfigPension";
import { armarMensajeWhatsAppReserva } from "../reservas/compartirWhatsApp";
import { construirDocDefinicionVoucher } from "../reportes/generarVoucherTuristaPdf";

/**
 * HU-39, criterio único y textual: "Dado que modifico la CuentaRUT, el
 * teléfono o la tarifa base, cuando guardo, entonces los próximos
 * comprobantes PDF reflejan la nueva información".
 *
 * La versión anterior de esta prueba solo verificaba un ida y vuelta por
 * localStorage y el mensaje de WhatsApp. El comprobante PDF —lo que el
 * criterio nombra explícitamente— nunca se revisó, y de hecho traía el
 * banco, el titular, el RUT y el correo escritos a mano en el código:
 * editar la configuración no cambiaba nada de lo que la huésped recibía
 * impreso. Acá se recorre la definición del PDF de verdad.
 */

/** Junta todo el texto de una definición de pdfmake para poder buscar en él. */
function textoPlanoDelDoc(nodo: unknown): string {
  if (nodo == null) return "";
  if (typeof nodo === "string") return nodo;
  if (typeof nodo === "number") return String(nodo);
  if (Array.isArray(nodo)) return nodo.map(textoPlanoDelDoc).join(" ");
  if (typeof nodo === "object") {
    return Object.values(nodo as Record<string, unknown>).map(textoPlanoDelDoc).join(" ");
  }
  return "";
}

const CONFIG_NUEVA: ConfigPension = {
  nombrePension: "Pensión Señora Miriam",
  whatsappContacto: "+56 9 1111 2222",
  correoContacto: "miriam.paposo@gmail.com",
  bancoNombre: "Banco de Chile",
  tipoCuenta: "Cuenta Vista",
  titularNombre: "Miriam Soto Vega",
  rutTitular: "9.876.543-2",
  tarifaBaseNoche: 22000,
  diasGraciaAnonimizacion: 15
};

describe("HU-39 — configuración del negocio y comprobantes", () => {
  let almacen: Record<string, string> = {};

  beforeEach(() => {
    almacen = {};
    (globalThis as any).localStorage = {
      getItem: (k: string) => almacen[k] ?? null,
      setItem: (k: string, v: string) => {
        almacen[k] = v;
      },
      removeItem: (k: string) => {
        delete almacen[k];
      },
      clear: () => {
        almacen = {};
      }
    };
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  it("sin configuración replicada todavía, los comprobantes usan los valores vigentes del negocio", () => {
    const config = obtenerConfigPension();
    expect(config).toEqual(CONFIG_PENSION_DEFAULT);
    // $15.000/noche es la tarifa fija del negocio (CLAUDE.md): el valor
    // de fábrica no puede cambiar sin decisión de la Administradora.
    expect(config.tarifaBaseNoche).toBe(15000);
    expect(config.diasGraciaAnonimizacion).toBe(7);
  });

  it("el comprobante PDF refleja la CuentaRUT, el titular y el correo que se guardaron", () => {
    sincronizarEspejoConfig(CONFIG_NUEVA);

    const texto = textoPlanoDelDoc(
      construirDocDefinicionVoucher({
        reservaId: "11111111-1111-1111-1111-111111111111",
        huespedNombre: "Carlos Gómez",
        habitacionNumero: 2,
        fechaInicio: "2026-11-02",
        nochesEstimadas: 3
      })
    );

    expect(texto).toContain("Banco de Chile");
    expect(texto).toContain("Cuenta Vista");
    expect(texto).toContain("Miriam Soto Vega");
    expect(texto).toContain("9.876.543-2");
    expect(texto).toContain("miriam.paposo@gmail.com");

    // Y ya NO aparecen los datos que antes estaban escritos en el código.
    expect(texto).not.toContain("12.345.678-9");
    expect(texto).not.toContain("contacto@pension-myriam.local");
  });

  it("el comprobante PDF usa la tarifa base configurada cuando la reserva no trae una propia", () => {
    sincronizarEspejoConfig(CONFIG_NUEVA);

    const texto = textoPlanoDelDoc(
      construirDocDefinicionVoucher({
        reservaId: "11111111-1111-1111-1111-111111111111",
        huespedNombre: "Carlos Gómez",
        habitacionNumero: 2,
        fechaInicio: "2026-11-02",
        nochesEstimadas: 2
      })
    );

    // 2 noches x $22.000 = $44.000 (el formato CLP trae separador de
    // miles, por eso se comparan solo los dígitos).
    const soloDigitos = texto.replace(/[^\d]/g, "");
    expect(soloDigitos).toContain("22000");
    expect(soloDigitos).toContain("44000");
  });

  it("una tarifa explícita de la reserva manda por sobre la tarifa base", () => {
    sincronizarEspejoConfig(CONFIG_NUEVA);
    const texto = textoPlanoDelDoc(
      construirDocDefinicionVoucher({
        reservaId: "11111111-1111-1111-1111-111111111111",
        huespedNombre: "Carlos Gómez",
        habitacionNumero: 2,
        fechaInicio: "2026-11-02",
        nochesEstimadas: 1,
        tarifaNoche: 18000
      })
    );
    expect(texto.replace(/[^\d]/g, "")).toContain("18000");
  });

  it("el mensaje de WhatsApp refleja los mismos datos y la tarifa configurada", () => {
    sincronizarEspejoConfig(CONFIG_NUEVA);

    const mensaje = armarMensajeWhatsAppReserva({
      huespedNombre: "Carlos Gómez",
      habitacionNumero: 2,
      fechaInicio: "2026-11-02",
      nochesEstimadas: 3
    });

    expect(mensaje).toContain("Titular: Miriam Soto Vega");
    expect(mensaje).toContain("RUT: 9.876.543-2");
    expect(mensaje).toContain("Banco: Banco de Chile");
    expect(mensaje).toContain("Tipo: Cuenta Vista");
    expect(mensaje).toContain("Pieza #2");
    // 3 noches x $22.000 = $66.000
    expect(mensaje.replace(/[^\d]/g, "")).toContain("66000");
  });

  it("traduce la fila replicada a la configuración de la app", () => {
    const config = filaAConfig({
      id: "singleton",
      nombre_pension: "Pensión Señora Miriam",
      whatsapp_contacto: "+56 9 1111 2222",
      correo_contacto_arco: "miriam.paposo@gmail.com",
      banco_nombre: "Banco de Chile",
      tipo_cuenta: "Cuenta Vista",
      titular_nombre: "Miriam Soto Vega",
      rut_titular: "9.876.543-2",
      tarifa_base_noche: 22000,
      dias_gracia_anonimizacion: 15
    });
    expect(config).toEqual(CONFIG_NUEVA);
  });

  it("si una columna aún no bajó por la réplica, ese campo cae al valor de fábrica y no queda en blanco", () => {
    const config = filaAConfig({
      id: "singleton",
      banco_nombre: "Banco de Chile",
      tarifa_base_noche: null,
      titular_nombre: null
    });
    expect(config.bancoNombre).toBe("Banco de Chile");
    expect(config.tarifaBaseNoche).toBe(CONFIG_PENSION_DEFAULT.tarifaBaseNoche);
    expect(config.titularNombre).toBe(CONFIG_PENSION_DEFAULT.titularNombre);
  });

  it("sin fila replicada devuelve la configuración de fábrica completa", () => {
    expect(filaAConfig(null)).toEqual(CONFIG_PENSION_DEFAULT);
    expect(filaAConfig(undefined)).toEqual(CONFIG_PENSION_DEFAULT);
  });

  describe("validaciones (los mismos límites que los CHECK de la tabla)", () => {
    it("acepta una configuración completa y válida", () => {
      expect(() => ConfigPensionSchema.parse(CONFIG_NUEVA)).not.toThrow();
    });

    it("rechaza una tarifa de cero o negativa: saldría impresa en un comprobante", () => {
      expect(() => ConfigPensionSchema.parse({ ...CONFIG_NUEVA, tarifaBaseNoche: 0 })).toThrow();
      expect(() => ConfigPensionSchema.parse({ ...CONFIG_NUEVA, tarifaBaseNoche: -5000 })).toThrow();
    });

    it("rechaza una tarifa absurdamente alta (un cero de más al teclear)", () => {
      expect(() =>
        ConfigPensionSchema.parse({ ...CONFIG_NUEVA, tarifaBaseNoche: 2_000_000 })
      ).toThrow();
    });

    it("acepta exactamente los extremos permitidos de la tarifa", () => {
      expect(() => ConfigPensionSchema.parse({ ...CONFIG_NUEVA, tarifaBaseNoche: 1 })).not.toThrow();
      expect(() =>
        ConfigPensionSchema.parse({ ...CONFIG_NUEVA, tarifaBaseNoche: 1_000_000 })
      ).not.toThrow();
    });

    it("rechaza un correo inválido: es el canal para ejercer derechos ARCO impreso en el comprobante", () => {
      expect(() =>
        ConfigPensionSchema.parse({ ...CONFIG_NUEVA, correoContacto: "no-es-un-correo" })
      ).toThrow();
      expect(() =>
        ConfigPensionSchema.parse({ ...CONFIG_NUEVA, correoContacto: "falta@dominio" })
      ).toThrow();
    });

    it("rechaza campos obligatorios en blanco", () => {
      expect(() => ConfigPensionSchema.parse({ ...CONFIG_NUEVA, rutTitular: "   " })).toThrow();
      expect(() => ConfigPensionSchema.parse({ ...CONFIG_NUEVA, bancoNombre: "" })).toThrow();
      expect(() => ConfigPensionSchema.parse({ ...CONFIG_NUEVA, titularNombre: "" })).toThrow();
    });

    it("rechaza un plazo de gracia fuera de rango (0 purgaría al instante; 400 sería retención indefinida)", () => {
      expect(() =>
        ConfigPensionSchema.parse({ ...CONFIG_NUEVA, diasGraciaAnonimizacion: 0 })
      ).toThrow();
      expect(() =>
        ConfigPensionSchema.parse({ ...CONFIG_NUEVA, diasGraciaAnonimizacion: 400 })
      ).toThrow();
      expect(() =>
        ConfigPensionSchema.parse({ ...CONFIG_NUEVA, diasGraciaAnonimizacion: 1 })
      ).not.toThrow();
      expect(() =>
        ConfigPensionSchema.parse({ ...CONFIG_NUEVA, diasGraciaAnonimizacion: 90 })
      ).not.toThrow();
    });

    it("no intenta escribir en la base cuando los datos son inválidos", async () => {
      // guardarConfigNegocio valida ANTES de tocar PowerSync: si no fuera
      // así, la fila quedaría en la réplica local y el servidor la
      // rechazaría después por el CHECK, dejando a la usuaria creyendo
      // que guardó.
      await expect(
        guardarConfigNegocio({ ...CONFIG_NUEVA, tarifaBaseNoche: -1 })
      ).rejects.toThrow();
    });
  });
});
