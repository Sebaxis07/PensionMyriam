import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const carpeta = process.env.UI_EVIDENCIA;
for (const ancho of [320, 390, 768, 1024, 1280]) {
  for (const vista of ["raciones", "privacidad", "cuentas", "pension", "ayuda", "extras", "cierre", "dashboard"]) {
    test(`captura ${vista} ${ancho}`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      const errores: string[] = [];
      page.on("pageerror", e => errores.push(e.message));
      await page.goto(`/pruebas-ui-sprint5/index.html?vista=${vista}`);
      await expect(page.getByText("Revisión visual · datos ficticios")).toBeAttached();
      await page.evaluate(() => document.fonts.ready);
      expect(errores).toEqual([]);
      if (process.env.UI_ANTES !== "1") expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (carpeta) { await mkdir(carpeta, { recursive: true }); await page.screenshot({ path: `${carpeta}/${vista}-${ancho}.png`, fullPage: true }); }
    });
  }
}
