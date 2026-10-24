// HU-04 (Sprint 2): "veo las 8 habitaciones y los días... clic en una
// celda libre... se abre el formulario de nueva reserva prellenado con
// esa habitación y fecha." No tenía ninguna prueba automatizada — se
// verificó antes solo por lectura de código. Requiere el mismo stack
// levantado que e2e/offline-write-syncs.spec.ts (ver ese archivo).
import { test, expect } from "@playwright/test";

test("HU-04: clic en una celda libre del rack abre Reservar con la pieza y fecha prellenadas", async ({
  page
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("pension_myriam_tour_completado_v1", "true");
  });

  await page.goto("/");
  await page.locator('input[type="email"]').fill("encargada@pension-myriam.local");
  await page.locator('input[type="password"]').fill("Paposo2026!");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("Habitaciones de la Pensión")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Sincronizado")).toBeVisible({ timeout: 20_000 });

  // Ir al calendario (HU-04).
  await page.locator("#tour-nav-rack").click();
  await expect(
    page.getByRole("main").getByRole("heading", { name: "Calendario de Ocupación" })
  ).toBeVisible({ timeout: 10_000 });

  // Pieza #3 queda "en_aseo" en los datos de demo pero sin ninguna
  // reserva activa (el aseo no crea una fila en `reserva`), así que el
  // rack la muestra libre de forma determinística sin depender de qué
  // otras pruebas corrieron antes. Se toma la primera celda disponible
  // de esa fila (cualquier día del mes visible).
  const filaPieza3 = page.locator("tr", { has: page.getByText("Pieza #3", { exact: true }) });
  const celdaLibre = filaPieza3.locator('td[title*="Disponible"]').first();
  await expect(celdaLibre).toBeVisible({ timeout: 10_000 });

  // El título de la celda ("Pieza #3 - Disponible") no trae la fecha;
  // se lee del encabezado de columna correspondiente para verificar
  // después que el formulario quedó con la MISMA fecha.
  const indiceColumna = await celdaLibre.evaluate((td) => {
    const fila = td.parentElement!;
    return Array.from(fila.children).indexOf(td);
  });
  const diaColumna = await page
    .locator("table thead th")
    .nth(indiceColumna)
    .locator("div")
    .nth(1)
    .innerText();

  await celdaLibre.click();

  // Debe aterrizar en el formulario de nueva reserva.
  await expect(
    page.getByRole("main").getByRole("heading", { name: "Nueva Reserva de Pasajero" })
  ).toBeVisible({ timeout: 10_000 });

  // Pieza preseleccionada: la tarjeta resumen "Habitación Elegida"
  // (único párrafo grande "Pieza #N" distinto de las tarjetas de la
  // grilla) debe mostrar específicamente la #3, marcada lista para
  // reservar — confirma que no solo se preseleccionó *una* pieza, sino
  // la misma que se tocó en el rack.
  await expect(page.getByText("Lista para reservar")).toBeVisible();
  await expect(page.locator("p.font-display.text-lg.font-black", { hasText: "Pieza #3" })).toBeVisible();

  // Fecha prellenada: el input "Fecha de Llegada" debe tener el mismo
  // día que se tocó en la grilla (comparación por día del mes, robusta
  // a si el rack mostraba el mes actual o el siguiente).
  const valorFecha = await page.locator('input[type="date"]').first().inputValue();
  const diaInput = String(Number(valorFecha.split("-")[2]));
  expect(diaInput).toBe(diaColumna.trim());
});
