import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const carpeta=process.env.CAPTURAS_UI34??path.resolve("../output/revision-sprints34");
const ruta=(vista:string,estado="normal")=>`/pruebas-ui-sprints34/?vista=${vista}&estado=${estado}`;

test("WhatsApp: comparaciones móvil y escritorio",async({page})=>{
  await mkdir(carpeta,{recursive:true});
  for(const width of [390,1280]){
    await page.setViewportSize({width,height:844});
    await page.goto(`http://127.0.0.1:5187${ruta("consumos")}`);
    await page.screenshot({path:path.join(carpeta,`whatsapp-antes-${width}.png`),fullPage:true});
    await page.goto(ruta("consumos"));
    await page.getByRole("button",{name:"Ver resumen del día"}).click();
    await expect(page.getByLabel("Texto del resumen",{exact:true})).toBeVisible();
    await page.screenshot({path:path.join(carpeta,`whatsapp-despues-${width}.png`),fullPage:true});
  }
});

test("corrección conserva el motivo obligatorio y explica el registro original",async({page})=>{
  await page.setViewportSize({width:320,height:844});
  await page.goto(ruta("consumos"));
  await page.getByRole("button",{name:/Opciones de consumo de/}).first().click();
  const dialogo=page.getByRole("dialog");
  await dialogo.getByRole("button",{name:/Corregir/}).first().click();
  await expect(dialogo.getByText(/El registro original se conserva/)).toBeVisible();
  await expect(dialogo.getByRole("button",{name:"Confirmar anulación/corrección"})).toBeDisabled();
  await dialogo.getByLabel(/Motivo obligatorio/).fill("Marcado por error en prueba visual");
  await expect(dialogo.getByRole("button",{name:"Confirmar anulación/corrección"})).toBeEnabled();
  await dialogo.getByRole("button",{name:"Cancelar",exact:true}).click();
  await expect(dialogo.getByLabel("Colación o plato especial")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialogo).toHaveCount(0);
});

test("compra: error anunciado y estado de guardado",async({page})=>{
  for(const estado of ["error","guardando"]){
    await page.goto(ruta("compra",estado));
    const dialogo=page.getByRole("dialog");
    await dialogo.getByLabel(/Qué producto compraste/).fill("Insumo ficticio");
    await dialogo.getByLabel(/Total pagado/i).fill("10000");
    await dialogo.getByLabel(/Cantidad Comprada/).fill("2");
    await dialogo.getByRole("button",{name:"Guardar Compra de Mercadería"}).click();
    if(estado==="error"){
      await expect(dialogo.getByRole("alert")).toContainText("No se pudo guardar");
      await expect(dialogo.getByRole("alert")).not.toContainText("PGRST");
    }else await expect(dialogo.getByRole("button",{name:"Guardando compra…"})).toBeDisabled();
  }
});

for(const vista of ["costos","dashboard"]){
  test(`${vista}: sin registros y navegación por teclado`,async({page})=>{
    await page.setViewportSize({width:320,height:844});
    await page.goto(ruta(vista,"vacio"));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await expect(page.getByRole("button",{name:/Anotar.*Compra/}).first()).toBeVisible();
    await page.getByRole("button",{name:/Anotar.*Compra/}).first().focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog",{name:"Registrar compra"})).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}

test("ayuda de un indicador no abre el plan al cerrar con teclado",async({page})=>{
  await page.goto(ruta("dashboard"));
  const tarjeta=page.locator("#tour-kpi-semaforo");
  const ayuda=tarjeta.getByRole("button").first();
  await ayuda.click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(ayuda).toBeFocused();
});
