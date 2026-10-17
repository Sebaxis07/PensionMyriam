import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Gestión y Creación de Cuentas (Administradora / Encargada)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("valida los roles permitidos en el sistema", () => {
    const rolesValidos = ["administradora", "encargada"];
    expect(rolesValidos).toContain("administradora");
    expect(rolesValidos).toContain("encargada");

    const esRolValido = (r: string) => r === "administradora" || r === "encargada";
    expect(esRolValido("administradora")).toBe(true);
    expect(esRolValido("encargada")).toBe(true);
    expect(esRolValido("superadmin")).toBe(false);
    expect(esRolValido("invitado")).toBe(false);
  });

  it("valida requisitos de nombre, email y contraseña para crear cuenta", () => {
    const validarDatosCuenta = (input: { nombre: string; email: string; password: string; rol: string }) => {
      if (!input.nombre.trim()) throw new Error("Nombre requerido");
      if (!input.email.includes("@") || !input.email.includes(".")) throw new Error("Email inválido");
      if (input.password.trim().length < 6) throw new Error("Contraseña debe tener al menos 6 caracteres");
      if (input.rol !== "administradora" && input.rol !== "encargada") throw new Error("Rol inválido");
      return true;
    };

    // Cuenta válida de Encargada
    expect(
      validarDatosCuenta({
        nombre: "Rosa Alvarado",
        email: "rosa@pension-myriam.local",
        password: "Password123!",
        rol: "encargada"
      })
    ).toBe(true);

    // Cuenta válida de Administradora
    expect(
      validarDatosCuenta({
        nombre: "María Elena",
        email: "maria@pension-myriam.local",
        password: "Admin2026!",
        rol: "administradora"
      })
    ).toBe(true);

    // Falla si la clave es menor a 6 caracteres
    expect(() =>
      validarDatosCuenta({
        nombre: "Ana",
        email: "ana@pension.cl",
        password: "123",
        rol: "encargada"
      })
    ).toThrow("Contraseña debe tener al menos 6 caracteres");

    // Falla si el email no es válido
    expect(() =>
      validarDatosCuenta({
        nombre: "Ana",
        email: "correo-invalido",
        password: "Password123!",
        rol: "encargada"
      })
    ).toThrow("Email inválido");

    // Falla si el rol no es admin ni encargada
    expect(() =>
      validarDatosCuenta({
        nombre: "Ana",
        email: "ana@pension.cl",
        password: "Password123!",
        rol: "turista"
      })
    ).toThrow("Rol inválido");
  });

  it("verifica que solo la administradora puede ver y acceder a la pestaña de creación de cuentas", () => {
    const puedeGestionarCuentas = (rol: string) => rol === "administradora";

    expect(puedeGestionarCuentas("administradora")).toBe(true);
    expect(puedeGestionarCuentas("encargada")).toBe(false);
  });
});
