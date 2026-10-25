// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { armarResumenDiaTexto, copiarResumenDiaTexto, abrirResumenDiaWhatsApp } from "./resumenDiaTexto";

describe("armarResumenDiaTexto (HU-21)", () => {
  it("arma un texto con las raciones servidas, omitiendo los tipos sin registros", () => {
    const texto = armarResumenDiaTexto(
      "Minera Paposo Demo Ltda.",
      [
        { tipo_consumo: "desayuno", total: 4 },
        { tipo_consumo: "almuerzo", total: 3 },
        { tipo_consumo: "cena", total: 0 },
        { tipo_consumo: "colacion", total: 0 }
      ],
      4,
      "2026-10-25"
    );

    expect(texto).toContain("Minera Paposo Demo Ltda.");
    expect(texto).toContain("2026-10-25");
    expect(texto).toContain("Desayuno: 4");
    expect(texto).toContain("Almuerzo: 3");
    expect(texto).not.toContain("Cena: 0");
    expect(texto).toContain("Total raciones servidas hoy: 7");
    expect(texto).toContain("Dotación contratada: 4 trabajadores");
  });

  it("si no hay ninguna ración registrada, lo dice explícitamente en vez de un texto vacío", () => {
    const texto = armarResumenDiaTexto("Empresa X", [], undefined, "2026-10-25");
    expect(texto).toContain("Sin raciones registradas todavía.");
    expect(texto).toContain("Total raciones servidas hoy: 0");
  });

  it("usa fechaHoySantiago() por defecto cuando no se pasa fecha explícita", () => {
    const texto = armarResumenDiaTexto("Empresa X", []);
    expect(texto).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("no afirma ningún envío — solo arma el texto para que el llamador decida copiarlo o compartirlo", () => {
    const texto = armarResumenDiaTexto("Empresa X", [{ tipo_consumo: "almuerzo", total: 5 }]);
    expect(texto.toLowerCase()).not.toMatch(/\benviad[oa]\b/);
  });
});

describe("copiarResumenDiaTexto", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("devuelve true cuando el portapapeles acepta el texto", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const ok = await copiarResumenDiaTexto("texto de prueba");
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith("texto de prueba");
  });

  it("devuelve false sin lanzar si el navegador rechaza el acceso al portapapeles", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("sin permiso"));
    Object.assign(navigator, { clipboard: { writeText } });

    const ok = await copiarResumenDiaTexto("texto de prueba");
    expect(ok).toBe(false);
  });
});

describe("abrirResumenDiaWhatsApp", () => {
  it("abre un enlace wa.me con el texto codificado (sin API de WhatsApp Business)", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    abrirResumenDiaWhatsApp("Hola *mundo*", "+56 9 1234 5678");
    expect(open).toHaveBeenCalledWith(
      expect.stringContaining("https://wa.me/56912345678?text="),
      "_blank",
      "noopener,noreferrer"
    );
    open.mockRestore();
  });

  it("sin número destino, abre wa.me genérico para que la usuaria elija el contacto", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    abrirResumenDiaWhatsApp("texto");
    expect(open).toHaveBeenCalledWith(expect.stringContaining("https://wa.me/?text="), "_blank", "noopener,noreferrer");
    open.mockRestore();
  });
});
