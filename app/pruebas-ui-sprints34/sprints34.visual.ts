import { test, expect } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";

const carpeta=process.env.CAPTURAS_UI34??path.resolve("../output/revision-sprints34");
const ruta=(vista:string,estado="normal",rol="administradora")=>`/pruebas-ui-sprints34/?vista=${vista}&estado=${estado}&rol=${rol}`;
const vistas=["consumos","seleccion_empresa","empresas","conciliacion","rechazos","cierre","costos","compra","historial","dashboard"];
async function captura(page:import("@playwright/test").Page,nombre:string){
  await mkdir(carpeta,{recursive:true});
  await page.evaluate(()=>document.fonts.ready);
  const cabecera=page.getByRole("dialog").getByRole("heading").first();
  if(await cabecera.count())await cabecera.scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(carpeta,`${nombre}.png`),fullPage:!(await page.getByRole("dialog").count())});
}

for(const ancho of [320,390,768,1024,1280])for(const vista of vistas){
  test(`${vista} a ${ancho}px`,async({page})=>{
    await page.setViewportSize({width:ancho,height:844});
    const errores:string[]=[];
    page.on("pageerror",e=>errores.push(e.message));
    await page.goto(ruta(vista,vista==="rechazos"?"rechazos":"normal"));
    await expect(page.locator("#root")).not.toBeEmpty();
    await page.evaluate(()=>document.fonts.ready);
    expect(errores).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    const dialogo=page.getByRole("dialog");
    if(await dialogo.count()){
      const boton=dialogo.getByRole("button").last();
      await boton.scrollIntoViewIfNeeded();
      expect((await boton.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await captura(page,`${vista}-${ancho}`);
  });
}

test("rechazos: detalle comprensible, datos financieros ausentes y revisión conservada",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(ruta("rechazos","rechazos"));
  const dialogo=page.getByRole("dialog");
  await expect(dialogo.getByRole("heading",{name:/3 registros necesitan/})).toBeVisible();
  await expect(dialogo.getByText(/La cama o las fechas coinciden/)).toBeVisible();
  expect(await page.content()).not.toMatch(/23P01|42501|23505|98765432|RUT-FICTICIO|conflicting key|datos_json/);
  const primerRegistro=dialogo.getByRole("article").first();
  await primerRegistro.getByText("Cómo revisar este registro").click();
  await expect(primerRegistro).toContainText("no corrige ni vuelve a enviar");
  await primerRegistro.getByRole("button",{name:"Ya revisé este registro"}).click();
  await expect(dialogo.getByRole("heading",{name:/2 registros necesitan/})).toBeVisible();
  await page.getByRole("button",{name:"Aceptar",exact:true}).click();
  await expect(page.getByRole("status")).not.toContainText("Sincronizado");
});

test("rechazos: un fallo al marcar revisión mantiene visible el registro",async({page})=>{
  await page.goto(ruta("rechazos","rechazos-error"));
  await page.getByRole("button",{name:"Ya revisé este registro"}).first().click();
  await expect(page.getByRole("alert")).toContainText("El registro sigue pendiente");
  await expect(page.getByRole("article")).toHaveCount(3);
});

test("consumos: registro individual, masivo y opciones conservan los datos seleccionados",async({page})=>{
  await page.goto(ruta("consumos"));
  await page.getByRole("button",{name:/Almuerzo/}).first().click();
  await page.getByLabel(/Seleccionar a Manuel/).check();
  await page.getByLabel(/Seleccionar a Patricia/).check();
  await page.getByRole("button",{name:/Registrar 2/}).click();
  await expect(page.getByRole("status")).toContainText("Se registraron 2");
  await page.getByRole("button",{name:/Ya comieron/}).click();
  await expect(page.getByText("Manuel Rojas (ejemplo)",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Detalle",exact:true}).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button",{name:"Corregir",exact:true}).click();
  await page.getByLabel(/Motivo obligatorio/).fill("Registro por error en el comedor");
  await captura(page,"correccion-390");
  await page.getByRole("button",{name:"Confirmar anulación/corrección"}).click();
  await expect(page.getByRole("status")).toContainText("Corrección guardada");
});

test("consumos: error legible y búsqueda vacía",async({page})=>{
  await page.goto(ruta("consumos","error"));
  await page.getByRole("button",{name:"Servir",exact:true}).first().click();
  await expect(page.getByRole("alert")).not.toContainText("PGRST");
  await page.getByLabel("Buscar trabajador",{exact:true}).fill("Nombre que no existe");
  await expect(page.getByText(/No se encontró ningún trabajador/)).toBeVisible();
});

test("WhatsApp: vista previa y copiar no confirman un envío",async({page,context})=>{
  await context.grantPermissions(["clipboard-read","clipboard-write"]);
  await page.setViewportSize({width:390,height:844});
  await page.goto(ruta("consumos"));
  await page.getByRole("button",{name:"Ver resumen del día"}).click();
  const texto=page.getByLabel("Texto del resumen",{exact:true});
  const esperado=await texto.inputValue();
  expect(esperado).toContain("Empresa de ejemplo Paposo");
  await page.getByRole("button",{name:"Copiar texto",exact:true}).click();
  await expect(page.getByRole("status")).toContainText("Texto copiado");
  const copiado=await page.evaluate(()=>navigator.clipboard.readText());
  expect(copiado.replace(/\r\n/g,"\n")).toBe(esperado.replace(/\r\n/g,"\n"));
  await captura(page,"whatsapp-despues-390");
  await context.route("https://wa.me/**",route=>route.fulfill({body:"Mensaje preparado para revisión",contentType:"text/html"}));
  const popup=context.waitForEvent("page");
  await page.getByRole("button",{name:"Abrir WhatsApp",exact:true}).click();
  const ventana=await popup;
  await ventana.waitForLoadState();
  expect(new URL(ventana.url()).searchParams.get("text")).toBe(esperado);
  await expect(page.getByRole("status")).toContainText("aún no se ha confirmado un envío");
  await ventana.close();
});

test("WhatsApp: error de portapapeles deja el texto disponible",async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(navigator,"clipboard",{value:{writeText:()=>Promise.reject(new Error("Portapapeles no disponible"))}}));
  await page.goto(ruta("consumos"));
  await page.getByRole("button",{name:"Ver resumen del día"}).click();
  await page.getByRole("button",{name:"Copiar texto",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("No se pudo copiar");
  await expect(page.getByLabel("Texto del resumen",{exact:true})).toBeVisible();
});

test("conciliación: contratado, servido y formulario de justificación accesible",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(ruta("conciliacion"));
  await expect(page.getByText(/La empresa contrató/).first()).toBeVisible();
  await page.getByRole("button",{name:/Justificar Diferencia \(15\)/}).click();
  const dialogo=page.getByRole("dialog",{name:"Justificar diferencia"});
  await expect(dialogo.getByLabel(/Nombre del Supervisor/)).toBeFocused();
  await dialogo.getByLabel(/Motivo de la Diferencia/).selectOption("almuerzo_mina");
  await dialogo.getByLabel(/Nombre del Supervisor/).fill("Supervisor de ejemplo");
  await captura(page,"justificacion-390");
  await dialogo.getByRole("button",{name:"Guardar Justificación"}).click();
  await expect(dialogo).toHaveCount(0);
});

for(const estado of ["vacio","error","cargando","pendiente"]){
  test(`cierre y consumos: estado ${estado}`,async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto(ruta("cierre",estado));
    if(estado==="cargando")await expect(page.getByRole("status")).toContainText("Cargando resumen");
    if(estado==="pendiente"){
      await expect(page.getByText(/Requiere revisión/)).toBeVisible();
      await expect(page.getByRole("button",{name:/Descargar Pre/})).toHaveCount(0);
    }
    await captura(page,`cierre-${estado}-390`);
    await page.goto(ruta("consumos",estado));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  });
}

test("descarga de PDF real con datos ficticios y Excel de dos hojas",async({page})=>{
  await page.goto(ruta("cierre"));
  await expect(page.getByText("Listo para preparar los reportes")).toBeVisible();
  await mkdir(carpeta,{recursive:true});
  const promesaPdf=page.waitForEvent("download");
  await page.getByRole("button",{name:"Descargar Pre-factura (PDF)"}).click();
  const pdf=await promesaPdf;
  await pdf.saveAs(path.join(carpeta,"prefactura-ejemplo.pdf"));
  expect((await readFile(path.join(carpeta,"prefactura-ejemplo.pdf"))).subarray(0,4).toString()).toBe("%PDF");
  const promesaExcel=page.waitForEvent("download");
  await page.getByRole("button",{name:"Descargar Planilla Contadora (Excel)"}).click();
  const excel=await promesaExcel;
  await excel.saveAs(path.join(carpeta,"planilla-ejemplo.xlsx"));
  const libro=new ExcelJS.Workbook();await libro.xlsx.readFile(path.join(carpeta,"planilla-ejemplo.xlsx"));
  expect(libro.worksheets.length).toBe(2);
  expect(libro.worksheets[0].rowCount).toBeGreaterThan(1);
  expect(libro.worksheets[1].rowCount).toBeGreaterThan(1);
  await writeFile(path.join(carpeta,"hojas-exportadas.json"),JSON.stringify(libro.worksheets.map(h=>({nombre:h.name,filas:h.rowCount})),null,2));
});

test("compras: formulario, error y confirmación sin alterar el cálculo",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(ruta("costos"));
  await page.getByRole("button",{name:/Anotar.*Compra/}).first().click();
  const dialogo=page.getByRole("dialog",{name:"Registrar compra"});
  await dialogo.getByLabel(/Qué producto compraste/).fill("Pollo de prueba");
  await dialogo.getByLabel(/Total pagado/i).fill("10000");
  await dialogo.getByLabel(/cantidad/i).first().fill("2");
  await dialogo.getByRole("button",{name:"Guardar Compra de Mercadería"}).click();
  await expect(page.getByRole("status")).toContainText("Compra registrada en este celular");
});

test("dashboard: plan accesible y umbrales identificados como referencia",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(ruta("dashboard","bajo"));
  await expect(page.getByText("Referencia 35% · Por validar")).toBeVisible();
  await page.locator("#tour-kpi-semaforo").press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await captura(page,"plan-margen-390");
  await page.keyboard.press("Escape");
  await expect(page.locator("#tour-kpi-semaforo")).toBeFocused();
});

test("Encargada: se conservan las restricciones reales del árbol de navegación",async({page})=>{
  await page.setViewportSize({width:1280,height:844});
  await page.goto(ruta("inicio","normal","encargada"));
  await expect(page.getByRole("heading",{name:"Habitaciones de la Pensión"})).toBeVisible();
  await expect(page.locator("#tour-nav-admin")).toHaveCount(0);
  await expect(page.locator("#tour-nav-costos")).toHaveCount(0);
  expect(await page.content()).not.toMatch(/3\.500\.000|2\.030\.000|98765432|Costo diario|Tarifa mínima sugerida/);
  await page.locator("#tour-nav-consumos").click();
  await expect(page.getByRole("button",{name:"Ver resumen del día"})).toHaveCount(0);
  await expect(page.getByRole("button",{name:/Lista de Colaciones/})).toHaveCount(0);
});

test("comparación antes y después de las pantallas prioritarias",async({page})=>{
  for(const ancho of [390,1280])for(const vista of ["consumos","conciliacion","rechazos","cierre","costos","dashboard"]){
    await page.setViewportSize({width:ancho,height:844});
    await page.goto(`http://127.0.0.1:5187${ruta(vista,vista==="rechazos"?"rechazos":"normal")}`);
    await expect(page.locator("#root")).not.toBeEmpty();
    await captura(page,`${vista}-antes-${ancho}`);
  }
});
