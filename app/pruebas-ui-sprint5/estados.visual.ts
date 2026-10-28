import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const antes=process.env.UI_ANTES==="1";
for(const width of [320,390,768,1024,1280]) for(const vista of ["cuentas-formulario","supresion","tour","configuracion-banco"]){
  test(`estado ${vista} ${width}`,async({page})=>{
    await page.emulateMedia({reducedMotion:"reduce"});
    await page.setViewportSize({width,height:900});
    const ruta=vista==="cuentas-formulario"?"cuentas":vista==="supresion"?"privacidad":vista==="tour"?"ayuda":"pension";
    await page.goto(`/pruebas-ui-sprint5/index.html?vista=${ruta}`);
    if(vista==="cuentas-formulario") await page.getByRole("button",{name:/Crear Nueva Cuenta/}).click();
    if(vista==="supresion") {
      await page.getByPlaceholder(/Nombre o RUT/).fill("Persona");await page.getByRole("button",{name:"Buscar",exact:true}).click();
      await page.getByRole("button",{name:antes?"Anonimizar":"Eliminar datos personales",exact:true}).click();
      if(antes) await page.getByText(/Confirmar Derecho de Supresión/).scrollIntoViewIfNeeded();
    }
    if(vista==="tour") await page.getByRole("button",{name:/Recorrido General/}).click();
    if(vista==="configuracion-banco") await page.getByText(antes?"Guardar Datos de la Pensión":"Guardar datos de la pensión",{exact:true}).scrollIntoViewIfNeeded();
    if(!antes){
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      for(const b of await page.locator('button:visible').all()){
        const rect=await b.boundingBox();if(rect && rect.width>0){ expect(rect.height,await b.innerText()).toBeGreaterThanOrEqual(44); expect(rect.width,await b.innerText()).toBeGreaterThanOrEqual(44); }
      }
    }
    const carpeta=process.env.UI_EVIDENCIA;if(carpeta){await mkdir(carpeta,{recursive:true});await page.screenshot({path:`${carpeta}/${vista}-${width}.png`,fullPage:true});}
  });
}
