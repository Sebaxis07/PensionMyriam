import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fechaHoySantiago } from "../src/lib/fechaNegocio";
function sql(texto:string):string {return execFileSync("docker",["exec","-i","pension-myriam-postgres-1","sh","-c",'PGPASSWORD="$POSTGRES_PASSWORD" psql -U supabase_admin -d postgres -At -v ON_ERROR_STOP=1'],{input:texto,encoding:"utf8"}).trim();}
async function login(page:Page){
  await page.addInitScript(()=>localStorage.setItem("pension_myriam_tour_completado_v1","true"));
  await page.goto("/");await page.locator('input[type="email"]').fill("admin@pension-myriam.local");
  if(!process.env.E2E_DEMO_PASSWORD)throw new Error("Configura la clave de demo para esta prueba local.");
  await page.locator('input[type="password"]').fill(process.env.E2E_DEMO_PASSWORD);
  await page.getByRole("button",{name:"Ingresar",exact:true}).click();await expect(page.getByText("Habitaciones de la Pensión")).toBeVisible();
  await expect.poll(()=>page.evaluate(async()=>{const filas=await (window as any).__powersync.getAll("select count(*) as n from usuario");return filas[0]?.n??0;}),{timeout:25000}).toBeGreaterThan(0);
}
for(const caso of ["en línea","sin conexión","conflicto por llegada","desde habitación"])test(`cancelación real ${caso}`,async({page,context})=>{
  const hab=randomUUID(),cama=randomUUID(),reserva=randomUUID(),ingreso=randomUUID();
  const numero=caso==="en línea"?9901:caso==="sin conexión"?9902:caso==="conflicto por llegada"?9903:9904;
  const fecha=fechaHoySantiago();
  const usuario=sql("select id from public.usuario where email='admin@pension-myriam.local'");
  sql(`begin; insert into public.habitacion(id,numero,capacidad) values('${hab}',${numero},1); insert into public.cama(id,habitacion_id,numero) values('${cama}','${hab}',1); insert into public.reserva(id,tipo_cliente,cama_id,huesped_nombre,fecha_inicio,fecha_fin,creado_por,uuid_idempotente) values('${reserva}','turista','${cama}','Reserva de prueba cancelable','${fecha}','${fecha}','${usuario}',gen_random_uuid()); commit;`);
  try {
    await page.setViewportSize({width:caso === "sin conexión" ? 390 : caso === "desde habitación" ? 320 : 1280,height:900});
    await login(page);
    if(caso!=="desde habitación")await page.locator("#tour-nav-rack:visible, #tour-nav-rack-mobile:visible").click();
    const fila=page.locator("tr",{has:page.getByText(`Pieza #${numero}`,{exact:true})});
    const celda=fila.getByRole("button",{name:new RegExp(`Ocupada: Reserva de prueba cancelable, ${fecha}`)});
    if(caso==="desde habitación") await page.getByRole("button").filter({has:page.getByText(`#${numero}`,{exact:true})}).click();
    else {await expect(celda).toBeVisible({timeout:25000});await celda.click();}
    await expect(page.getByRole("button",{name:"Cancelar reserva",exact:true})).toBeVisible({timeout:8000});
    await page.getByRole("button",{name:"Cancelar reserva",exact:true}).click();
    const dialogo=page.getByRole("dialog",{name:"Cancelar reserva",exact:true});
    await expect(dialogo.getByRole("button",{name:"Confirmar cancelación"})).toBeDisabled();
    await dialogo.getByLabel("Motivo de cancelación").fill("El huésped avisó que no podrá viajar");
    if(process.env.CANCELACION_EVIDENCIA){await mkdir(process.env.CANCELACION_EVIDENCIA,{recursive:true});await page.screenshot({path:`${process.env.CANCELACION_EVIDENCIA}/${caso.replaceAll(" ","-")}.png`});}
    if(caso==="sin conexión" || caso==="conflicto por llegada"){
      await page.evaluate(async()=>{await (window as any).__powersync.disconnect();});await context.setOffline(true);
    }
    if(caso==="conflicto por llegada")sql(`insert into public.checkin(id,reserva_id,realizado_por,uuid_idempotente) values('${ingreso}','${reserva}','${usuario}',gen_random_uuid())`);
    await dialogo.getByRole("button",{name:"Confirmar cancelación"}).click();
    if(caso==="desde habitación") {await expect(dialogo).toHaveCount(0);await page.locator("#tour-nav-rack:visible, #tour-nav-rack-mobile:visible").click();}
    else await expect(page.getByText(/Reserva cancelada en este teléfono/)).toBeVisible();
    await expect(fila.getByRole("button",{name:new RegExp(`Disponible, ${fecha}`)})).toBeVisible();
    if(caso==="sin conexión" || caso==="conflicto por llegada"){
      expect(sql(`select estado from public.reserva where id='${reserva}'`)).toBe("confirmada");
      await context.setOffline(false);await page.evaluate(async()=>{await (window as any).__powersyncReconectar();});
    }
    if(caso==="conflicto por llegada"){
      await expect.poll(()=>page.evaluate(async(id)=>{const filas=await (window as any).__powersync.getAll("select estado from reserva where id = ?",[id]);return filas[0]?.estado;},reserva),{timeout:25000}).toBe("confirmada");
      await expect.poll(()=>page.evaluate(async()=>{const filas=await (window as any).__powersync.getAll("select count(*) as n from operacion_rechazada where tabla = 'reserva'");return filas[0]?.n;}),{timeout:25000}).toBeGreaterThan(0);
      expect(sql(`select estado from public.habitacion where id='${hab}'`)).toBe("ocupada");
    } else {
      await expect.poll(()=>sql(`select estado from public.reserva where id='${reserva}'`),{timeout:25000}).toBe("cancelada");
      expect(sql(`select motivo_cancelacion from public.reserva where id='${reserva}'`)).toBe("El huésped avisó que no podrá viajar");
      expect(sql(`select estado from public.habitacion where id='${hab}'`)).toBe("disponible");
      // Otra reserva real puede ocupar las mismas fechas, sin borrar el respaldo.
      const nueva=randomUUID();sql(`insert into public.reserva(id,tipo_cliente,cama_id,huesped_nombre,fecha_inicio,fecha_fin,creado_por,uuid_idempotente) values('${nueva}','turista','${cama}','Nueva reserva de prueba','${fecha}','${fecha}','${usuario}',gen_random_uuid()); delete from public.reserva where id='${nueva}'`);
    }
  } finally {
    await context.setOffline(false);
    await page.close();
    sql(`begin; delete from public.checkin where id='${ingreso}'; delete from public.reserva where id='${reserva}'; delete from public.cama where id='${cama}'; delete from public.habitacion where id='${hab}'; commit;`);
  }
});
