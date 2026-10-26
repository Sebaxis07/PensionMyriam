// HU-18 (cierre mensual), HU-19 (pre-factura PDF) y HU-20 (planilla
// Excel para la contadora): recorrido real contra el stack completo.
// Usa la empresa de demo sembrada por db/seed-demo-empresa.sh ("Minera
// Paposo Demo Ltda.", 4 trabajadores, $25.000/día, un mes de consumos
// con 1 día ya justificado) — el día de HOY todavía no tiene su
// conciliación generada (eso lo hace el cron en producción, recién al
// día siguiente), así que el mes SIEMPRE arranca bloqueado por un día
// pendiente real, exactamente el caso que HU-18 pide cubrir.
import { test, expect, type Page } from "@playwright/test";
import ExcelJS from "exceljs";
import { PDFParse } from "pdf-parse";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const EMPRESA = "Minera Paposo Demo Ltda.";

async function omitirTourDeBienvenida(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("pension_myriam_tour_completado_v1", "true");
  });
}

async function loginAdmin(page: Page) {
  await page.goto("/");
  await page.locator('input[type="email"]').fill("admin@pension-myriam.local");
  await page.locator('input[type="password"]').fill("Paposo2026!");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("Habitaciones de la Pensión")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Sincronizado")).toBeVisible({ timeout: 20_000 });
}

/** Navega hasta la pestaña "Cierre y Facturación" de la empresa de demo. */
async function irACierreDeLaEmpresaDemo(page: Page) {
  await page.locator("#tour-nav-empresas").click();
  await expect(page.getByText(EMPRESA).first()).toBeVisible({ timeout: 10_000 });

  // La tarjeta de la empresa solo muestra el resumen de dotación y
  // tarifa ("Dotación" / "Tarifa Pactada") una vez que el contrato
  // vigente llegó a la réplica local — recién sembrado, puede tardar
  // un instante más que el resto del login. Solo una empresa de demo
  // en toda la pantalla: no hace falta acotar por tarjeta.
  await expect(page.getByText("Tarifa Pactada")).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: "Ver Nómina y Consumos" }).click();
  await page.getByRole("button", { name: "Cierre y Facturación" }).click();
}

test.describe.serial("HU-18/19/20: cierre mensual y sus reportes (pre-factura y planilla)", () => {
  test("HU-18: el mes arranca bloqueado por el día de hoy (sin conciliar) y se cierra tras conciliar", async ({
    page
  }) => {
    await omitirTourDeBienvenida(page);
    await loginAdmin(page);
    await irACierreDeLaEmpresaDemo(page);

    // Estado inicial real: hoy mismo (al arrancar la demo desde cero)
    // todavía no tiene fila de conciliacion_diaria para ningún tipo —
    // se genera al día siguiente en producción — así que el mes
    // arranca bloqueado. Si este mismo test ya corrió hoy antes (se
    // volvió a ejecutar sin reiniciar el stack), hoy puede llegar ya
    // resuelto: igual de válido, solo se salta el tramo de justificar.
    //
    // La pestaña recién montada pasa por un instante de carga
    // (cierre.isLoading) antes de mostrar uno de los dos estados — un
    // isVisible() sin espera puede leer "false" en ese instante y
    // saltarse por error todo el tramo de conciliar/justificar. Se
    // espera a que termine de cargar (aparece alguno de los dos
    // textos) antes de decidir cuál es.
    await expect(page.getByText(/Cierre mensual bloqueado|Mes 100% Conciliado/)).toBeVisible({
      timeout: 15_000
    });
    const arrancaBloqueado = await page.getByText("Cierre mensual bloqueado").isVisible().catch(() => false);

    if (arrancaBloqueado) {
      await expect(page.getByText(/Días con diferencias pendientes/)).toBeVisible();
      await page.getByRole("button", { name: "Conciliar días del mes automáticamente" }).click();

      // Hoy es un día real en curso: los servicios que YA ocurrieron
      // (ej. cama_noche) quedan conciliados al recalcular, pero
      // desayuno/cena de hoy mismo aún no se han servido en este demo —
      // una diferencia real que solo se resuelve justificándola (regla
      // de negocio de CLAUDE.md: "la diferencia se justifica
      // formalmente con el nombre del supervisor, pero el valor pactado
      // se mantiene completo"), no "forzando" el cierre.
      //
      // "Conciliar días del mes" es un RPC a Postgres (conciliar_periodo
      // — verificado directo contra psql: deja cama_noche "conciliado"
      // de inmediato), pero useCierreMensual lee la réplica LOCAL de
      // PowerSync, no Postgres directo — el cambio recién es visible
      // acá después de que PowerSync lo replique de vuelta al
      // dispositivo. Por eso se espera con reintento (no un timeout
      // fijo) a que "Noche de cama" deje de aparecer como pendiente,
      // en vez de asumir que el RPC + la réplica ya terminaron.
      await expect(async () => {
        const bloqueado = await page.getByText("Cierre mensual bloqueado").isVisible().catch(() => false);
        if (bloqueado) {
          expect(await page.getByText(/Falta:.*Noche de cama/).count()).toBe(0);
        }
      }).toPass({ timeout: 20_000 });
    }

    if (await page.getByText("Cierre mensual bloqueado").isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "Justificar Diferencias →" }).click();
      await expect(page.getByText("Servicios del Día")).toBeVisible({ timeout: 10_000 });
      // Las 4 tarjetas de servicio (useConciliacion, otra query
      // reactiva) pueden tardar un instante más en poblarse que el
      // encabezado de la pantalla.
      await page.waitForTimeout(1000);

      const botonJustificar = page.getByRole("button", { name: /Justificar Diferencia \(/ }).first();
      let intentosRestantes = 8;
      while (intentosRestantes-- > 0 && (await botonJustificar.isVisible().catch(() => false))) {
        await botonJustificar.click();
        await page.getByPlaceholder("Ej: Don Carlos Valenzuela").fill("Supervisor de Faena R. Núñez");
        await page.getByRole("button", { name: "Guardar Justificación" }).click();
        await expect(page.getByText("Diferencia justificada guardada exitosamente.")).toBeVisible({
          timeout: 10_000
        });
        // El recálculo tras guardar reemplaza el botón del mismo tipo
        // de servicio (ahora "Modificar justificación") o lo quita de
        // la lista — esperar a que el DOM termine de re-renderizar
        // antes de volver a mirar si queda otro servicio por justificar.
        await page.waitForTimeout(500);
      }

      await page.getByRole("button", { name: "Cierre Mensual y Facturación →" }).click();
    }

    // Tras resolver (automáticamente o justificando) el único día
    // realmente pendiente (hoy), y con el resto del mes ya
    // conciliado/justificado por el seed, el período queda 100% cerrable.
    await expect(page.getByText("Mes 100% Conciliado y Validado")).toBeVisible({ timeout: 15_000 });

    // Cifras reales del seed: 4 trabajadores, $25.000/día, contrato
    // vigente todo el mes (31 días en este caso) + 1 colación extra de
    // $3.500 ("Colación de terreno").
    await expect(page.getByText("4 trabajadores")).toBeVisible();
    await expect(page.getByText("$25.000", { exact: false })).toBeVisible();
    await expect(page.getByText("Colación de terreno")).toBeVisible();
    await expect(page.getByText("Total a Facturar:")).toBeVisible();

    // Persistencia offline-first: recargar la página debe reconstruir
    // el mismo estado ya cerrado desde la réplica local, sin volver a
    // depender de la red ni de "Conciliar" otra vez.
    await page.reload();
    await expect(page.getByText("Habitaciones de la Pensión")).toBeVisible({ timeout: 15_000 });
    await irACierreDeLaEmpresaDemo(page);
    await expect(page.getByText("Mes 100% Conciliado y Validado")).toBeVisible({ timeout: 15_000 });
  });

  test("HU-19: la pre-factura PDF descargada contiene los montos y nombres REALES del cierre", async ({
    page
  }) => {
    await omitirTourDeBienvenida(page);
    await loginAdmin(page);
    await irACierreDeLaEmpresaDemo(page);

    // El mes ya quedó conciliado por el test anterior (test.describe.serial).
    await expect(page.getByText("Mes 100% Conciliado y Validado")).toBeVisible({ timeout: 15_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Descargar Pre-factura \(PDF\)/ }).click()
    ]);

    expect(download.suggestedFilename()).toMatch(/^prefactura_.*\.pdf$/);

    const destino = path.join(os.tmpdir(), `e2e-${Date.now()}-${download.suggestedFilename()}`);
    await download.saveAs(destino);

    const buffer = fs.readFileSync(destino);
    const parser = new PDFParse({ data: buffer });
    const resultado = await parser.getText();
    await parser.destroy();
    const texto = resultado.text.replace(/\s+/g, " ");

    expect(texto).toContain("PENSIÓN SEÑORA MIRIAM");
    expect(texto).toContain("PRE-FACTURA MENSUAL");
    expect(texto).toContain(EMPRESA);
    // Dotación y tarifa pactada reales del contrato de demo.
    expect(texto).toContain("4 trabajadores");
    expect(texto).toContain("$25.000");
    // El total general debe coincidir con 31 días x 4 x $25.000 +
    // $3.500 de la colación extra = $3.103.500 (mismo cálculo que
    // useCierreMensual.ts, verificado también en la UI arriba).
    expect(texto).toContain("$3.103.500");
    // Auditoría de la diferencia justificada real del seed.
    expect(texto).toContain("Ausencia Justificada");
    // Al menos uno de los 4 trabajadores de nómina debe aparecer.
    expect(texto).toMatch(/Pedro Almonte|Luis Vergara|Manuel Rojas|Sergio Cortés/);

    fs.unlinkSync(destino);
  });

  test("HU-20: la planilla Excel descargada tiene las 2 hojas reales con los datos del período", async ({
    page
  }) => {
    await omitirTourDeBienvenida(page);
    await loginAdmin(page);
    await irACierreDeLaEmpresaDemo(page);

    await expect(page.getByText("Mes 100% Conciliado y Validado")).toBeVisible({ timeout: 15_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Descargar Planilla Contadora \(Excel\)/ }).click()
    ]);

    expect(download.suggestedFilename()).toMatch(/^planilla_contadora_.*\.xlsx$/);

    const destino = path.join(os.tmpdir(), `e2e-${Date.now()}-${download.suggestedFilename()}`);
    await download.saveAs(destino);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(destino);

    const nombresHojas = wb.worksheets.map((ws) => ws.name);
    expect(nombresHojas).toEqual(["Libro de Consumos", "Auditoría de Descuadres"]);

    const wsConsumos = wb.getWorksheet("Libro de Consumos")!;
    // Fila 1: título, fila 2: empresa/período, fila 3: vacía, fila 4: encabezados.
    expect(String(wsConsumos.getCell("A1").value)).toContain("LIBRO INMUTABLE DE CONSUMOS");
    expect(String(wsConsumos.getCell("A2").value)).toContain(EMPRESA);
    expect(wsConsumos.getRow(4).getCell(1).value).toBe("Fecha y Hora");
    // Un mes de 4 trabajadores x 3 raciones x ~30 días + 1 colación
    // extra: debe haber un volumen real de filas de consumo, no 0 ni
    // un total trivial — zona horaria America/Santiago, no UTC.
    expect(wsConsumos.rowCount).toBeGreaterThan(300);
    const fechaPrimeraFila = String(wsConsumos.getRow(5).getCell(1).value);
    expect(fechaPrimeraFila).not.toBe("");

    const wsDescuadres = wb.getWorksheet("Auditoría de Descuadres")!;
    expect(String(wsDescuadres.getCell("A1").value)).toContain("AUDITORÍA DE DESCUADRES");
    expect(wsDescuadres.getRow(4).getCell(1).value).toBe("Fecha");
    // El descuadre real del seed: 3 tipos (desayuno/almuerzo/cena) del
    // día con ausencia justificada, cada uno con su propia fila.
    expect(wsDescuadres.rowCount).toBeGreaterThanOrEqual(7);
    const motivos = [];
    for (let i = 5; i <= wsDescuadres.rowCount; i++) {
      motivos.push(wsDescuadres.getRow(i).getCell(6).value);
    }
    expect(motivos).toContain("Ausencia Justificada");

    fs.unlinkSync(destino);
  });
});
