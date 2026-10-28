// Estas pruebas puras no abren SQLite WASM ni conectan servicios.
vi.mock("../../lib/powersync", () => ({ powersync: { execute: vi.fn(), getAll: vi.fn() } }));
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { sincronizarEspejoConfig, CONFIG_PENSION_DEFAULT } from "./useConfigPension";
import { construirDocDefinicionVoucher } from "../reportes/generarVoucherTuristaPdf";
import { construirDocDefinicionPreFactura } from "../reportes/generarPreFacturaPdf";
import { armarMensajeWhatsAppReserva } from "../reservas/compartirWhatsApp";
import { armarResumenDiaTexto } from "../consumo/resumenDiaTexto";
import { JustificacionSchema, MOTIVOS_DESCUADRE } from "../conciliacion/justificarDescuadre";
import {
  PLAZO_LEGAL_RESPUESTA_DIAS,
  fechaLimiteRespuesta,
  SolicitudSupresionSchema,
  MARCA_ANONIMIZADO,
  estaAnonimizado
} from "../privacidad/supresionDatos";

/**
 * EP-07 — Cumplimiento Ley N° 21.719.
 *
 * La versión anterior de este archivo no importaba NADA del código de
 * producción: construía objetos literales dentro del propio test y
 * afirmaba cosas sobre ellos ("el nombre anonimizado contiene
 * ANONIMIZADO"), de modo que pasaba igual aunque la aplicación no
 * tuviera implementado ningún control. Acá cada aserción recorre el
 * código que realmente se ejecuta.
 */

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

const CIERRE_VACIO = {
  estaCerrable: true,
  diasPendientes: [],
  totalDiasContrato: 30,
  diasConciliados: 30,
  headcountContratado: 10,
  tarifaPactadaDiaria: 25000,
  totalContratoCompleto: 7500000,
  totalColacionesExtras: 0,
  granTotal: 7500000,
  colacionesDetalle: [],
  trabajadoresDetalle: [
    {
      trabajadorId: "t1",
      nombre: "Rodrigo Tapia",
      camaNoche: 30,
      desayuno: 30,
      almuerzo: 28,
      cena: 30,
      colaciones: 0
    }
  ],
  justificacionesMes: [],
  isLoading: false
};

describe("HU-32 — cláusula de privacidad en comprobantes y mensajes", () => {
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
    sincronizarEspejoConfig({
      ...CONFIG_PENSION_DEFAULT,
      correoContacto: "datos.pension@gmail.com",
      whatsappContacto: "+56 9 3333 4444"
    });
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  it("el voucher PDF lleva al pie la cláusula informativa y el canal real para ejercer derechos ARCO", () => {
    const texto = textoPlanoDelDoc(
      construirDocDefinicionVoucher({
        reservaId: "11111111-1111-1111-1111-111111111111",
        huespedNombre: "Carlos Gómez",
        habitacionNumero: 2,
        fechaInicio: "2026-11-02",
        nochesEstimadas: 1
      })
    );

    expect(texto).toMatch(/LEY N° 21\.719/i);
    // Los tres elementos que exige el criterio: finalidad, plazo de
    // conservación y cómo ejercer los derechos.
    expect(texto).toMatch(/gestión operativa de su reserva/i);
    expect(texto).toMatch(/plazo legal/i);
    expect(texto).toMatch(/acceso, rectificación, supresión o portabilidad/i);
    expect(texto).toContain("30 días corridos");
    // El canal debe ser el configurado, no un correo escrito en el código.
    expect(texto).toContain("datos.pension@gmail.com");
  });

  it("la pre-factura B2B también lleva la cláusula: sale de la pensión con la nómina completa", () => {
    const texto = textoPlanoDelDoc(
      construirDocDefinicionPreFactura({
        razonSocialEmpresa: "Minera Paposo SpA",
        rutEmpresa: "76.111.222-3",
        periodoMes: "Octubre 2026",
        folioContrato: "30000000-0000-0000-0000-000000000001",
        cierre: CIERRE_VACIO as any
      })
    );

    // Este documento imprime el nombre de cada trabajador: el aviso de
    // privacidad corresponde acá con más razón que en el voucher.
    expect(texto).toContain("Rodrigo Tapia");
    expect(texto).toMatch(/LEY N° 21\.719/i);
    expect(texto).toMatch(/se anonimizan/i);
    expect(texto).toContain("datos.pension@gmail.com");
    expect(texto).toContain("30 días corridos");
  });

  it("el texto de confirmación por WhatsApp agrega un párrafo breve de transparencia", () => {
    const mensaje = armarMensajeWhatsAppReserva({
      huespedNombre: "Carlos Gómez",
      habitacionNumero: 2,
      fechaInicio: "2026-11-02",
      nochesEstimadas: 1
    });

    expect(mensaje).toMatch(/Privacidad \(Ley 21\.719\)/);
    expect(mensaje).toMatch(/coordinar su estadía/i);
    expect(mensaje).toMatch(/plazo legal/i);
    expect(mensaje).toContain("datos.pension@gmail.com");
  });

  it("el resumen diario al supervisor no filtra datos personales: solo cantidades agregadas", () => {
    // HU-21 manda este texto por WhatsApp a un tercero (la empresa
    // contratista). Que NO contenga nombres es un control de
    // minimización, no una casualidad del formato.
    const resumen = armarResumenDiaTexto(
      "Minera Paposo SpA",
      [
        { tipo_consumo: "almuerzo", total: 8 },
        { tipo_consumo: "cena", total: 10 }
      ],
      10,
      "2026-10-27"
    );

    expect(resumen).toContain("Minera Paposo SpA");
    expect(resumen).toContain("8");
    expect(resumen).not.toMatch(/\b\d{1,2}\.\d{3}\.\d{3}-[\dkK]\b/); // ningún RUT
    expect(resumen).not.toContain("Rodrigo");
  });
});

describe("HU-31 — minimización: la justificación de descuadre no admite datos de salud", () => {
  it("los motivos son exactamente los cinco tipificados acordados con la Administradora", () => {
    expect([...MOTIVOS_DESCUADRE]).toEqual([
      "turno_extra",
      "almuerzo_mina",
      "corte_ruta",
      "ausencia_justificada",
      "otro"
    ]);
  });

  it("ningún motivo tipificado alude a salud, licencias ni diagnósticos", () => {
    for (const motivo of MOTIVOS_DESCUADRE) {
      expect(motivo).not.toMatch(/medic|salud|enfermedad|licencia|diagnost/i);
    }
  });

  it("rechaza un motivo escrito a mano: no hay campo libre donde quepa un diagnóstico", () => {
    const base = {
      conciliacionDiariaId: "70000000-0000-0000-0000-000000000001",
      supervisorNombre: "Jorge Mella"
    };
    expect(() =>
      JustificacionSchema.parse({ ...base, motivo: "con licencia médica por lumbago" })
    ).toThrow();
    expect(() => JustificacionSchema.parse({ ...base, motivo: "otro" })).not.toThrow();
  });

  it("la justificación solo acepta los tres campos previstos y descarta cualquier extra", () => {
    const parseada = JustificacionSchema.parse({
      conciliacionDiariaId: "70000000-0000-0000-0000-000000000001",
      motivo: "ausencia_justificada",
      supervisorNombre: "Jorge Mella",
      // Un campo así nunca debe llegar a la base: Zod lo descarta por
      // no estar en el esquema (comportamiento por defecto de .object()).
      observacionSalud: "diagnóstico de gripe"
    } as any);
    expect(parseada).not.toHaveProperty("observacionSalud");
    expect(Object.keys(parseada).sort()).toEqual([
      "conciliacionDiariaId",
      "motivo",
      "supervisorNombre"
    ]);
  });
});

describe("HU-34 — plazo legal y marcas de anonimización", () => {
  it("el plazo de respuesta de una solicitud es de 30 días CORRIDOS", () => {
    expect(PLAZO_LEGAL_RESPUESTA_DIAS).toBe(30);
    const limite = fechaLimiteRespuesta(new Date("2026-10-01T12:00:00Z"));
    expect(limite.toISOString().slice(0, 10)).toBe("2026-10-31");
  });

  it("el plazo cruza correctamente el cambio de mes y de año", () => {
    const limite = fechaLimiteRespuesta(new Date("2026-12-20T09:00:00Z"));
    expect(limite.toISOString().slice(0, 10)).toBe("2027-01-19");
  });

  it("reconoce un registro ya anonimizado por su marca exacta, no por un parecido", () => {
    expect(estaAnonimizado("trabajador", MARCA_ANONIMIZADO.trabajador)).toBe(true);
    expect(estaAnonimizado("turista", MARCA_ANONIMIZADO.turista)).toBe(true);
    expect(estaAnonimizado("trabajador", "Rodrigo Tapia")).toBe(false);
    expect(estaAnonimizado("trabajador", null)).toBe(false);
    expect(estaAnonimizado("trabajador", "")).toBe(false);
  });

  it("la supresión exige un motivo con contenido: la bitácora debe poder explicar el borrado", () => {
    const base = {
      tipoTitular: "trabajador" as const,
      titularId: "40000000-0000-0000-0000-000000000001"
    };
    expect(() => SolicitudSupresionSchema.parse({ ...base, motivo: "" })).toThrow();
    expect(() => SolicitudSupresionSchema.parse({ ...base, motivo: "   " })).toThrow();
    expect(() => SolicitudSupresionSchema.parse({ ...base, motivo: "ok" })).toThrow();
    expect(() =>
      SolicitudSupresionSchema.parse({ ...base, motivo: "Solicitud escrita del titular" })
    ).not.toThrow();
  });

  it("rechaza un tipo de titular que no existe en el sistema", () => {
    expect(() =>
      SolicitudSupresionSchema.parse({
        tipoTitular: "proveedor",
        titularId: "40000000-0000-0000-0000-000000000001",
        motivo: "Solicitud escrita del titular"
      })
    ).toThrow();
  });
});
