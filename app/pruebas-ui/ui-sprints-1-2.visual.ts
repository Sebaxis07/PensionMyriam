// Presentación sobre componentes reales y datos ficticios: no verifica el backend.
import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const capturas = process.env.CAPTURAS_UI ?? path.resolve("../output/revision-ui");
const ruta = (vista: string, estado = "normal") => `/pruebas-ui/?vista=${vista}&estado=${estado}`;
const vistas = ["habitaciones", "reserva", "contrato", "empresas", "nomina", "aseo", "calendario", "ingreso", "salida", "mantencion", "aseo_pieza", "sync"];

for (const ancho of [320, 390, 768, 1024, 1280]) {
  for (const vista of vistas) {
    test(`${vista} sin desbordamiento a ${ancho}px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 844 });
      const errores: string[] = [];
      page.on("pageerror", error => errores.push(error.message));
      await page.goto(ruta(vista));
      await expect(page.locator("#root")).not.toBeEmpty();
      await page.evaluate(() => document.fonts.ready);
      expect(errores).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const dialogo = page.getByRole("dialog");
      if (await dialogo.count()) {
        await expect(dialogo).toBeVisible();
        const caja = await dialogo.locator(":scope > div").boundingBox();
        expect(caja!.height).toBeLessThanOrEqual(844);
        const cerrar = dialogo.getByRole("button", { name: /Cerrar|Aceptar/ }).last();
        if (await cerrar.count()) {
          await cerrar.scrollIntoViewIfNeeded();
          const dimensiones = await cerrar.boundingBox();
          expect(dimensiones!.height).toBeGreaterThanOrEqual(44);
        }
      }
      await mkdir(capturas, { recursive: true });
      await page.screenshot({ path: path.join(capturas, `${vista}-${ancho}.png`), fullPage: (await dialogo.count()) === 0 });
    });
  }
}

test("diálogo de habitación contiene foco, cierra con Escape y devuelve foco", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto(ruta("habitaciones"));
  const tarjeta = page.getByRole("button", { name: /#1 Disponible/ });
  await tarjeta.click();
  const dialogo = page.getByRole("dialog", { name: "Acciones de habitación" });
  await expect(dialogo.getByRole("button", {name:"Registrar ingreso"})).toBeFocused();
  await dialogo.getByRole("button",{name:"Cerrar",exact:true}).focus();
  await page.keyboard.press("Tab");
  await expect(dialogo.getByRole("button", {name:"Registrar ingreso"})).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialogo.getByRole("button", {name:"Cerrar",exact:true})).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialogo).toHaveCount(0);
  await expect(tarjeta).toBeFocused();
});

test("reserva: selección con teclado, campos etiquetados y confirmación", async ({ page }) => {
  await page.goto(ruta("reserva"));
  await page.getByRole("button",{name:/Pieza #1/}).press("Enter");
  await expect(page.getByRole("button",{name:/Pieza #1/})).toHaveAttribute("aria-pressed","true");
  await page.getByLabel(/Nombre del Pasajero/).fill("Huésped de prueba");
  await page.getByLabel(/Teléfono/).fill("900000000");
  await page.getByRole("button",{name:"Confirmar Reserva",exact:true}).click();
  await expect(page.getByRole("heading",{name:/Reserva Registrada/})).toBeVisible();
  await page.screenshot({path:path.join(capturas,"reserva-confirmada.png"),fullPage:true});
});

test("calendario: la acción accesible conserva habitación y fecha prellenadas",async({page})=>{
  await page.setViewportSize({width:1280,height:844});
  await page.goto(ruta("habitaciones"));
  await page.locator("#tour-nav-rack").click();
  const fila=page.locator("tr",{has:page.getByText("Pieza #3",{exact:true})});
  const dia=fila.getByRole("button",{name:/Disponible/}).first();
  const etiqueta=await dia.getAttribute("aria-label");
  const fecha=etiqueta!.match(/\d{4}-\d{2}-\d{2}/)![0];
  await dia.press("Enter");
  await expect(page.getByLabel(/Fecha de Llegada/)).toHaveValue(fecha);
  await expect(page.getByRole("button",{name:/Pieza #3/})).toHaveAttribute("aria-pressed","true");
});

test("reserva: mensaje de error existente anunciado", async ({ page }) => {
  await page.goto(ruta("reserva","error"));
  await page.getByRole("button",{name:/Pieza #1/}).click();
  await page.getByLabel(/Nombre del Pasajero/).fill("Huésped de prueba");
  await page.getByRole("button",{name:"Confirmar Reserva",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("No se pudo completar la reserva");
  await page.screenshot({path:path.join(capturas,"reserva-error.png"),fullPage:true});
});

test("contrato: etiquetas, explicación de facturación y guardado", async ({ page }) => {
  await page.goto(ruta("contrato"));
  await expect(page.getByLabel("Empresa Contratista",{exact:false})).toBeVisible();
  await expect(page.getByText(/Se factura por todas las personas contratadas/)).toBeVisible();
  await page.getByRole("button",{name:"Confirmar contrato de empresa"}).click();
  await expect(page.getByRole("heading",{name:/Contrato confirmado/})).toBeVisible();
});

test("aseo: filtros operables con teclado y estado vacío", async ({ page }) => {
  await page.goto(ruta("aseo"));
  await page.getByRole("button",{name:/Aseos Listos Hoy/}).press("Enter");
  await expect(page.getByRole("button",{name:/Aseos Listos Hoy/})).toHaveAttribute("aria-pressed","true");
  await page.goto(ruta("aseo","vacio"));
  await expect(page.getByRole("heading",{name:/No hay aseos pendientes/})).toBeVisible();
  await page.screenshot({path:path.join(capturas,"aseo-vacio.png"),fullPage:true});
});

for(const estado of ["sin-red","sin-red-pendientes","pendientes","enviando","error-sync"]) {
  test(`conectividad: ${estado}`, async ({page}) => {
    await page.setViewportSize({width:390,height:844});
    await page.goto(ruta("sync",estado));
    await expect(page.getByRole("dialog")).toContainText("Los cambios quedan en este celular");
    await page.getByRole("button",{name:"Aceptar",exact:true}).click();
    const indicador=page.getByRole("status");
    const texto=estado==="error-sync"?"No se pudo actualizar · Revisa la conexión":estado==="sin-red"?"Sin red · Guardado local":estado==="sin-red-pendientes"?"Sin red · Cambios guardados en este celular":estado==="enviando"?"Enviando pendientes…":"Cambios pendientes de envío";
    await expect(indicador).toHaveText(texto);
    await page.screenshot({path:path.join(capturas,`sync-${estado}.png`),fullPage:true});
  });
}

test("carga y guardado visibles sin cambiar validaciones",async({page})=>{
  await page.goto(ruta("reserva","cargando"));
  await expect(page.getByRole("status")).toHaveText("Cargando habitaciones…");
  await page.goto(ruta("contrato","guardando"));
  await page.getByRole("button",{name:"Confirmar contrato de empresa"}).click();
  await expect(page.getByRole("button",{name:"Registrando contrato…"})).toBeDisabled();
  await page.screenshot({path:path.join(capturas,"contrato-guardando.png"),fullPage:true});
});

test("componentes compartidos: navegar a costos y administración sigue funcionando", async ({page})=>{
  await page.setViewportSize({width:1280,height:844});
  await page.goto(ruta("habitaciones"));
  await page.locator("#tour-nav-admin").click();
  await expect(page.getByRole("heading",{name:"Panel de Administración",exact:true})).toBeVisible();
  await page.locator("#tour-nav-costos").click();
  await expect(page.locator("main")).not.toBeEmpty();
});

test("mantención: formulario etiquetado y guardado sin modificar transiciones", async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(ruta("ingreso"));
  await page.getByRole("button",{name:"Marcar en mantención"}).click();
  await expect(page.getByLabel("Motivo",{exact:true})).toBeVisible();
  await page.getByLabel("Motivo",{exact:true}).selectOption("Electricidad");
  await page.screenshot({path:path.join(capturas,"mantencion-formulario-390.png"),fullPage:false});
  await page.getByRole("button",{name:"Confirmar mantención"}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("empresa: formulario accesible y cierre devuelve foco",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(ruta("empresas"));
  const abrir=page.getByRole("button",{name:"Nueva Empresa"});
  await abrir.click();
  await expect(page.getByLabel(/Razón Social/)).toBeFocused();
  await expect(page.getByLabel(/RUT de la Empresa/)).toBeVisible();
  await page.screenshot({path:path.join(capturas,"empresa-formulario-390.png"),fullPage:false});
  await page.keyboard.press("Escape");
  await expect(abrir).toBeFocused();
});

test("nómina: modal de asignación conserva las acciones actuales",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(ruta("nomina"));
  await page.getByRole("button",{name:"Asignar Pieza",exact:true}).click();
  await expect(page.getByRole("dialog",{name:"Asignar cama"})).toBeVisible();
  await page.screenshot({path:path.join(capturas,"asignacion-cama-390.png"),fullPage:false});
  await page.getByRole("button",{name:"Cerrar",exact:true}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("aseo: confirmación masiva y mensaje de éxito",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(ruta("aseo","aseo-masivo"));
  await page.getByRole("button",{name:"Marcar 2 diarios listos",exact:true}).click();
  await expect(page.getByRole("dialog",{name:"Confirmar aseo diario"})).toBeVisible();
  await page.screenshot({path:path.join(capturas,"aseo-confirmacion-390.png"),fullPage:false});
  await page.getByRole("button",{name:"Sí, marcar todas como listas"}).click();
  await expect(page.getByRole("status")).toContainText("Se completó la ronda de aseo diario en 2 habitaciones");
});

test("sin red: la pantalla y el guardado local siguen disponibles al perder red",async({page,context})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(ruta("reserva","sin-red"));
  await page.getByRole("button",{name:/Pieza #1/}).click();
  await page.getByLabel(/Nombre del Pasajero/).fill("Huésped sin red (prueba)");
  await context.setOffline(true);
  await page.getByRole("button",{name:"Confirmar Reserva",exact:true}).click();
  await expect(page.getByRole("heading",{name:/Reserva Registrada/})).toBeVisible();
  // El adaptador es ficticio: esto comprueba el flujo visual, no persistencia ni subida real.
  await context.setOffline(false);
});

test("capturas del código original con los mismos datos ficticios",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(ruta("habitaciones"));
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:path.join(capturas,"habitaciones-portada-390.png"),fullPage:false});
  for(const vista of ["habitaciones","reserva","contrato","aseo","ingreso","salida","mantencion","sync"]){
    await page.goto(`http://127.0.0.1:5183${ruta(vista)}`);
    await expect(page.locator("#root")).not.toBeEmpty();
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:path.join(capturas,`${vista}-antes-390.png`),fullPage:!["ingreso","salida","mantencion","sync"].includes(vista)});
  }
});
