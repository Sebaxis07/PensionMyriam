import { describe, it, expect } from "vitest";
import {
  validarDatosCuenta,
  LARGO_MINIMO_PASSWORD,
  type CrearUsuarioInput
} from "./useGestionUsuarios";
import { formatearFechaRegistro } from "./GestionCuentasTab";

/**
 * HU-35 / HU-36 — alta y listado de cuentas.
 *
 * La versión anterior de este archivo volvía a escribir la validación
 * DENTRO del test (`const validarDatosCuenta = (input) => {…}`) y luego
 * la probaba: pasaba aunque la aplicación validara otra cosa, y de hecho
 * así fue — el test exigía 6 caracteres de contraseña igual que el
 * código, cuando el criterio oficial pide 12. Acá se importa la función
 * que corre en producción.
 */

const VALIDO: CrearUsuarioInput = {
  nombre: "Rosa Alvarado",
  email: "rosa@pension-myriam.local",
  password: "ClaveLargaSegura2026",
  rol: "encargada"
};

describe("HU-35 — validación del alta de cuenta", () => {
  it("la política del proyecto es de 12 caracteres, por sobre el mínimo de 8 de OWASP ASVS 5.0", () => {
    expect(LARGO_MINIMO_PASSWORD).toBe(12);
  });

  it("acepta una cuenta de Encargada con datos completos", () => {
    const datos = validarDatosCuenta(VALIDO);
    expect(datos.rol).toBe("encargada");
    expect(datos.nombre).toBe("Rosa Alvarado");
  });

  it("acepta una cuenta de Administradora", () => {
    const datos = validarDatosCuenta({ ...VALIDO, rol: "administradora" });
    expect(datos.rol).toBe("administradora");
  });

  it("normaliza el correo a minúsculas y sin espacios: GoTrue autentica así", () => {
    const datos = validarDatosCuenta({
      ...VALIDO,
      email: "  Rosa.Alvarado@Pension-Myriam.Local  "
    });
    expect(datos.email).toBe("rosa.alvarado@pension-myriam.local");
  });

  it("recorta los espacios del nombre pero NO los de la contraseña", () => {
    const datos = validarDatosCuenta({
      ...VALIDO,
      nombre: "  Rosa Alvarado  ",
      password: " ClaveLargaSegura "
    });
    expect(datos.nombre).toBe("Rosa Alvarado");
    // Recortar la contraseña cambiaría la credencial que queda guardada:
    // la persona no podría entrar con lo que escribió.
    expect(datos.password).toBe(" ClaveLargaSegura ");
  });

  it("rechaza una contraseña de menos de 12 caracteres", () => {
    expect(() => validarDatosCuenta({ ...VALIDO, password: "Corta123" })).toThrow(
      /al menos 12 caracteres/
    );
    // 11 caracteres: justo por debajo del límite.
    expect(() => validarDatosCuenta({ ...VALIDO, password: "Paposo2026!" })).toThrow(
      /al menos 12 caracteres/
    );
  });

  it("acepta exactamente 12 caracteres (el límite es inclusivo)", () => {
    expect(() => validarDatosCuenta({ ...VALIDO, password: "Paposo2026!!" })).not.toThrow();
  });

  it("rechaza una contraseña que son solo espacios, aunque sean 12", () => {
    expect(() => validarDatosCuenta({ ...VALIDO, password: "            " })).toThrow();
  });

  it("rechaza correos mal formados", () => {
    for (const email of ["correo-invalido", "falta@dominio", "@pension.cl", "sin arroba.cl", ""]) {
      expect(() => validarDatosCuenta({ ...VALIDO, email })).toThrow(/correo electrónico válido/);
    }
  });

  it("rechaza un nombre vacío o de solo espacios", () => {
    expect(() => validarDatosCuenta({ ...VALIDO, nombre: "" })).toThrow(/nombre de la persona/);
    expect(() => validarDatosCuenta({ ...VALIDO, nombre: "   " })).toThrow(/nombre de la persona/);
  });

  it("rechaza cualquier rol distinto de administradora o encargada", () => {
    for (const rol of ["superadmin", "turista", "invitado", ""]) {
      expect(() => validarDatosCuenta({ ...VALIDO, rol: rol as any })).toThrow(
        /Administradora o Encargada/
      );
    }
  });

  it("los mensajes de error están en lenguaje cercano, sin jerga técnica", () => {
    // Las usuarias tienen alfabetización digital básica (CLAUDE.md): un
    // "ValidationError: password.minLength" no les sirve de nada.
    try {
      validarDatosCuenta({ ...VALIDO, password: "123" });
      throw new Error("debió lanzar");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).not.toMatch(/error|exception|invalid|null|undefined/i);
      expect(msg).toMatch(/contraseña/i);
    }
  });
});

describe("HU-36 — fecha de registro legible en el listado de cuentas", () => {
  it("formatea la fecha de registro en español de Chile", () => {
    const texto = formatearFechaRegistro("2026-03-15T14:30:00.000Z");
    expect(texto).toMatch(/2026/);
    expect(texto).toMatch(/mar/i);
  });

  it("no inventa una fecha cuando la cuenta no la trae", () => {
    expect(formatearFechaRegistro(null)).toBe("fecha no registrada");
    expect(formatearFechaRegistro(undefined)).toBe("fecha no registrada");
    expect(formatearFechaRegistro("")).toBe("fecha no registrada");
    expect(formatearFechaRegistro("no-es-una-fecha")).toBe("fecha no registrada");
  });
});
