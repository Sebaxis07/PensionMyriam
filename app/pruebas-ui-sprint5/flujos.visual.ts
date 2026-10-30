import { test, expect, type Page } from "@playwright/test";
const ir = (page: Page, vista: string, extra = "") => page.goto(`/pruebas-ui-sprint5/index.html?vista=${vista}${extra}`);
async function buscar(page: Page) { await page.getByLabel("Nombre o RUT de la persona").fill("Persona"); await page.getByRole("button", { name: "Buscar", exact: true }).click(); }
async function abrirSupresion(page: Page) { await buscar(page); await page.getByRole("button", { name: "Eliminar datos personales", exact: true }).click(); return page.getByRole("dialog", { name: "Confirmar eliminación de datos personales", exact: true }); }
test.beforeEach(async ({ page }) => { await page.setViewportSize({width:390,height:844}); });

test("HU-31 minimización: motivo sin datos sensibles y sin campos adicionales", async ({ page }) => {
  await ir(page,"privacidad"); const d = await abrirSupresion(page);
  await expect(d.getByText(/sin información médica ni sensible/)).toBeVisible();
  await expect(d.locator("input,textarea")).toHaveCount(1);
});
test("HU-32 contacto informado sin afirmar disponibilidad del canal", async ({ page }) => {
  await ir(page,"pension"); await expect(page.getByLabel("Correo para contacto y solicitudes de datos")).toHaveValue("contacto@example.invalid");
  await expect(page.getByText(/Verifica que puedas recibir/)).toBeVisible();
});
for(const estado of ["normal","vacio"]) test(`HU-37 ayuda conciliación ${estado}`,async({page})=>{
  await ir(page,"conciliacion-ayuda",`&estado=${estado}`);
  const d=page.getByRole("dialog"); await expect(d).toBeVisible();
  if(estado==="normal") await expect(d.getByRole("button",{name:/Ir a Conciliar Raciones/})).toBeVisible();
  else await expect(d).toContainText(/al día/i);
  await page.keyboard.press("Escape"); await expect(d).toHaveCount(0);
});
test("HU-33 cierre: revisión, confirmación y escritura local diferenciadas", async ({ page }) => {
  await ir(page,"cierre"); await page.getByRole("button",{name:/Cerrar facturación de/}).click();
  const d=page.getByRole("dialog",{name:"Confirmar cierre de facturación",exact:true});
  await expect(d.getByText(/No elimina los datos de inmediato/)).toBeVisible();
  await d.getByRole("button",{name:"Confirmar cierre",exact:true}).click();
  await expect(page.getByText("Cierre registrado en este teléfono")).toBeVisible();
  await expect(page.getByText(/pendientes de validación con la Administradora/)).toBeVisible();
});
test("HU-33 pendientes de conciliación impiden ofrecer el cierre", async ({ page }) => {
  await ir(page,"cierre","&estado=pendiente"); await expect(page.getByRole("button",{name:/Cerrar facturación de/})).toHaveCount(0);
});
test("HU-33 error de escritura no se presenta como cierre guardado", async ({ page }) => {
  await ir(page,"cierre","&estado=error-cierre");
  await page.getByRole("button",{name:/Cerrar facturación de/}).click();
  const d=page.getByRole("dialog",{name:"Confirmar cierre de facturación",exact:true});
  await d.getByRole("button",{name:"Confirmar cierre",exact:true}).click();
  await expect(d.getByRole("alert")).toBeVisible();
  await expect(page.getByText("Cierre registrado en este teléfono")).toHaveCount(0);
});
test("HU-34 confirmación, longitud, Escape y recuperación del foco", async ({ page }) => {
  await ir(page,"privacidad"); const d=await abrirSupresion(page); const campo=d.getByLabel("¿Por qué se eliminan estos datos?");
  await expect(campo).toBeFocused(); await expect(d.getByRole("button",{name:"Confirmar eliminación"})).toBeDisabled();
  await campo.fill("abcd"); await expect(d.getByRole("button",{name:"Confirmar eliminación"})).toBeDisabled();
  await campo.fill("Solicitud escrita de ejemplo"); await expect(d.getByRole("button",{name:"Confirmar eliminación"})).toBeEnabled();
  await page.keyboard.press("Escape"); await expect(d).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Eliminar datos personales",exact:true})).toBeFocused();
});
for(const estado of ["normal","anonimizado"]) test(`HU-34 resultado confirmado ${estado}`,async({page})=>{
  await ir(page,"privacidad",`&estado=${estado}`); const d=await abrirSupresion(page);
  await d.getByLabel("¿Por qué se eliminan estos datos?").fill("Solicitud escrita de ejemplo");
  await d.getByRole("button",{name:"Confirmar eliminación"}).click();
  await expect(d).toHaveCount(0); await expect(page.getByText(/Los teléfonos sin conexión se actualizarán/)).toBeVisible();
  await expect(page.getByRole("status").filter({hasText:estado==="normal"?/El servidor confirmó/:/ya estaban eliminados/})).toBeVisible();
});
test("HU-34 error sin SQL y sin mensaje de éxito", async({page})=>{
  await ir(page,"privacidad","&estado=error"); const d=await abrirSupresion(page);
  await d.getByLabel("¿Por qué se eliminan estos datos?").fill("Solicitud escrita de ejemplo"); await d.getByRole("button",{name:"Confirmar eliminación"}).click();
  await expect(d.getByRole("alert")).toBeVisible(); await expect(d).not.toContainText(/SQL|PGRST|42501/);
  await expect(d.getByRole("button",{name:"Confirmar eliminación"})).toBeEnabled();
});
test("HU-34 espera bloquea doble confirmación y Escape", async({page})=>{
  await ir(page,"privacidad","&estado=guardando"); const d=await abrirSupresion(page);
  await d.getByLabel("¿Por qué se eliminan estos datos?").fill("Solicitud escrita de ejemplo"); await d.getByRole("button",{name:"Confirmar eliminación"}).click();
  await expect(d.getByRole("button",{name:"Eliminando…"})).toBeDisabled(); await page.keyboard.press("Escape"); await expect(d).toBeVisible();
});
test("HU-34 pérdida de red bloquea confirmación sin borrar el motivo", async({page,context})=>{
  await ir(page,"privacidad"); const d=await abrirSupresion(page); await d.getByLabel("¿Por qué se eliminan estos datos?").fill("Solicitud escrita de ejemplo");
  await context.setOffline(true); await expect(d.getByRole("button",{name:"Confirmar eliminación"})).toBeDisabled();
  await context.setOffline(false); await expect(d.getByRole("button",{name:"Confirmar eliminación"})).toBeEnabled();
});
test("HU-34 búsqueda vacía y sin resultados", async({page})=>{
  await ir(page,"privacidad","&estado=vacio"); await expect(page.getByRole("button",{name:"Buscar",exact:true})).toBeDisabled();
  await buscar(page); await expect(page.getByText(/No se encontraron personas registradas/)).toBeVisible();
});
test("HU-35 formulario, validación real y resultado del alta", async({page})=>{
  await ir(page,"cuentas"); await page.getByRole("button",{name:/Crear Nueva Cuenta/}).click();
  await page.getByLabel(/Nombre de la persona/).fill("Colaboradora de ejemplo");
  await page.getByLabel(/Correo electrónico de acceso/).fill("equipo@example.invalid");
  const clave=page.getByLabel(/Contraseña inicial/); await expect(clave).toHaveAttribute("type","password");
  // Valor sintético exclusivo del test; nunca se captura ni se registra en evidencias.
  await clave.fill("ejemplo".repeat(2)); await page.getByRole("button",{name:"Guardar y Crear Cuenta"}).click();
  await expect(page.getByRole("status").filter({hasText:/Cuenta creada/})).toBeVisible(); await expect(clave).toHaveCount(0);
});
test("HU-35 rol accesible con teclado y contraseña mínima", async({page})=>{
  await ir(page,"cuentas"); await page.getByRole("button",{name:/Crear Nueva Cuenta/}).click();
  const rol=page.getByRole("button",{name:/Administradora Acceso Total/}); await rol.focus(); await page.keyboard.press("Enter"); await expect(rol).toHaveAttribute("aria-pressed","true");
  await expect(page.getByLabel(/Contraseña inicial/)).toHaveAttribute("minlength","12");
});
test("HU-35 pérdida y recuperación de conexión",async({page,context})=>{
  await ir(page,"cuentas"); await page.getByRole("button",{name:/Crear Nueva Cuenta/}).click(); await context.setOffline(true);
  await expect(page.getByRole("button",{name:"Guardar y Crear Cuenta"})).toBeDisabled(); await expect(page.getByText(/Para crear una cuenta necesitas Internet/)).toBeVisible();
  await context.setOffline(false); await expect(page.getByRole("button",{name:"Guardar y Crear Cuenta"})).toBeEnabled();
});
for(const estado of ["error","guardando"]) test(`HU-35 respuesta ${estado}`,async({page})=>{
  await ir(page,"cuentas",`&estado=${estado}`);await page.getByRole("button",{name:/Crear Nueva Cuenta/}).click();
  await page.getByLabel(/Nombre de la persona/).fill("Colaboradora de ejemplo");
  await page.getByLabel(/Correo electrónico de acceso/).fill("equipo@example.invalid");
  await page.getByLabel(/Contraseña inicial/).fill("ejemplo".repeat(2));
  await page.getByRole("button",{name:"Guardar y Crear Cuenta"}).click();
  if(estado==="error") {await expect(page.getByRole("alert")).toBeVisible();await expect(page.getByRole("alert")).not.toContainText(/SQL|PGRST/);}
  else {await expect(page.getByRole("button",{name:"Creando cuenta…"})).toBeDisabled();await expect(page.getByLabel(/Nombre de la persona/)).toBeDisabled();}
});
for(const estado of ["vacio","cargando"]) test(`HU-36 lista ${estado}`,async({page})=>{
  await ir(page,"cuentas",`&estado=${estado}`); await expect(page.getByText(estado==="vacio"?"No hay cuentas disponibles en este teléfono.":"Cargando cuentas…")).toBeVisible();
});
test("HU-36 muestra los cuatro datos", async({page})=>{
  await ir(page,"cuentas"); await expect(page.getByText("administradora@example.invalid")).toBeVisible(); await expect(page.getByText(/Desde .*2026/)).toBeVisible();
  await expect(page.locator("span").filter({hasText:/^Administradora$/})).toBeVisible();
});
test("HU-36 y HU-39 permisos visuales Encargada",async({page})=>{
  await ir(page,"pension","&rol=encargada"); await expect(page.getByRole("button",{name:/Cuentas Personal/})).toHaveCount(0); await expect(page.getByRole("button",{name:/Ley 21.719/})).toHaveCount(0);
  for(const campo of await page.locator("fieldset input").all()) await expect(campo).toBeDisabled();
  await expect(page.getByRole("button",{name:"Guardar datos de la pensión"})).toHaveCount(0);
});
test("HU-38 servicio identificado, filtro y registro offline",async({page,context})=>{
  await ir(page,"raciones"); await page.getByRole("button",{name:/^Desayuno /}).click();
  await expect(page.getByRole("button",{name:/^Desayuno /})).toHaveAttribute("aria-pressed","true");
  await context.setOffline(true); await page.getByRole("button",{name:/Servir desayuno/}).first().click(); await expect(page.getByRole("status").filter({hasText:/Desayuno registrado/})).toBeVisible();
  await context.setOffline(false); await page.getByRole("button",{name:/Registrados/}).click(); await expect(page.getByText("✓ Desayuno registrado").first()).toBeVisible();
});
test("HU-38 vacío y error de registro",async({page})=>{
  await ir(page,"raciones","&estado=vacio"); await expect(page.getByRole("button",{name:/Servir desayuno/})).toHaveCount(0);
  await ir(page,"raciones","&estado=error"); await page.getByRole("button",{name:/^Desayuno /}).click(); await page.getByRole("button",{name:/Servir desayuno/}).first().click(); await expect(page.getByRole("alert")).toBeVisible();
});
test("HU-39 guardado local offline y validación",async({page,context})=>{
  await ir(page,"pension"); await page.getByLabel("Tarifa por noche ($ CLP)").fill("0"); await page.getByRole("button",{name:"Guardar datos de la pensión"}).click(); await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Tarifa por noche ($ CLP)").fill("16000"); await context.setOffline(true); await page.getByRole("button",{name:"Guardar datos de la pensión"}).click(); await expect(page.getByRole("status").filter({hasText:/pendientes de sincronización/})).toBeVisible(); await context.setOffline(false);
});
test("HU-39 error y carga",async({page})=>{
  await ir(page,"pension","&estado=error"); await page.getByRole("button",{name:"Guardar datos de la pensión"}).click(); await expect(page.getByRole("alert")).not.toContainText(/SQL|PGRST|42501/);
  await ir(page,"pension","&estado=cargando"); await expect(page.getByRole("button",{name:"Guardar datos de la pensión"})).toBeDisabled();
});
test("HU-40 recorrido real, controles táctiles, cierre y movimiento reducido",async({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"}); await ir(page,"ayuda"); await page.getByRole("button",{name:/Recorrido General/}).click();
  const popover=page.locator(".pension-tour-popover"); await expect(popover).toBeVisible();
  const siguiente=popover.getByRole("button",{name:/Siguiente/}); expect((await siguiente.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await siguiente.click(); await page.keyboard.press("Escape"); await expect(popover).toHaveCount(0);
});
test("HU-41 Encargada abre catálogo y agrega sin editar precios anteriores",async({page})=>{
  await ir(page,"raciones","&rol=encargada"); await page.getByRole("button",{name:/Productos extra/}).click(); const d=page.getByRole("dialog",{name:"Catálogo de colaciones",exact:true});
  await d.getByLabel("Nombre del plato o colación").fill("Postre de ejemplo"); await d.getByLabel("Precio unitario ($ CLP)").fill("1234"); await d.getByRole("button",{name:"Guardar en catálogo"}).click();
  await expect(d.getByRole("status")).toContainText("pendiente de sincronización"); await expect(d.getByRole("button",{name:/editar|eliminar/i})).toHaveCount(0);
});
test("HU-41 catálogo vacío y error accesible",async({page})=>{
  await ir(page,"extras","&estado=vacio"); await expect(page.getByText("No hay productos ni colaciones cargadas")).toBeVisible();
  await ir(page,"extras","&estado=error"); await page.getByLabel("Nombre del plato o colación").fill("Postre de ejemplo"); await page.getByLabel("Precio unitario ($ CLP)").fill("1200"); await page.getByRole("button",{name:"Guardar en catálogo"}).click(); await expect(page.getByRole("alert")).toBeVisible();
});
