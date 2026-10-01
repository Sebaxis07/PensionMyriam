import { describe, it, expect } from "vitest";
import { construirLibroExcel } from "./generarPlanillaExcel";

describe("construirLibroExcel", () => {
  it("crea un libro Excel con 2 hojas: Libro de Consumos y Auditoría de Descuadres", async () => {
    const libro = await construirLibroExcel({
      razonSocialEmpresa: "Constructora Minera Norte S.A.",
      periodoMes: "2026-10",
      consumos: [
        {
          fechaHora: "2026-10-01T08:30:00Z",
          trabajadorNombre: "Pedro Castillo",
          tipoConsumo: "desayuno",
          productoExtra: "-",
          recargo: 0
        },
        {
          fechaHora: "2026-10-01T13:15:00Z",
          trabajadorNombre: "Pedro Castillo",
          tipoConsumo: "colacion",
          productoExtra: "Bebida energética",
          recargo: 2500
        }
      ],
      descuadres: [
        {
          fecha: "2026-10-01",
          tipo: "cena",
          esperado: 10,
          servido: 8,
          diferencia: -2,
          motivo: "almuerzo_mina",
          supervisor: "Don Roberto Valenzuela"
        }
      ]
    });

    expect(libro.creator).toBe("Pensión Señora Miriam");

    const hoja1 = libro.getWorksheet("Libro de Consumos");
    expect(hoja1).toBeDefined();
    expect(hoja1?.rowCount).toBeGreaterThanOrEqual(5);

    const celdaTitulo = hoja1?.getCell("A1").value?.toString();
    expect(celdaTitulo).toContain("PENSIÓN SEÑORA MIRIAM");

    const hoja2 = libro.getWorksheet("Auditoría de Descuadres");
    expect(hoja2).toBeDefined();
    expect(hoja2?.rowCount).toBeGreaterThanOrEqual(5);

    const celdaAudit = hoja2?.getCell("A1").value?.toString();
    expect(celdaAudit).toContain("AUDITORÍA DE DESCUADRES Y JUSTIFICACIONES");
  });
});
