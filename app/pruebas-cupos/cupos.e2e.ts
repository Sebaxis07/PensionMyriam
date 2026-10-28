import {test,expect,type Page} from "@playwright/test";
import {execFileSync} from "node:child_process";
import {randomUUID} from "node:crypto";
import {mkdir} from "node:fs/promises";
import {fechaHoySantiago,sumarDiasYMD} from "../src/lib/fechaNegocio";
function sql(texto:string){return execFileSync("docker",["exec","-i","pension-myriam-postgres-1","sh","-c",'PGPASSWORD="$POSTGRES_PASSWORD" psql -U supabase_admin -d postgres -At -v ON_ERROR_STOP=1'],{input:texto,encoding:"utf8"}).trim();}
async function login(page:Page){await page.addInitScript(()=>localStorage.setItem("pension_myriam_tour_completado_v1","true"));await page.goto("/");await page.locator('input[type="email"]').fill("admin@pension-myriam.local");if(!process.env.E2E_DEMO_PASSWORD)throw Error("Falta clave de demo local");await page.locator('input[type="password"]').fill(process.env.E2E_DEMO_PASSWORD);await page.getByRole("button",{name:"Ingresar",exact:true}).click();await expect(page.getByText("Habitaciones de la Pensión")).toBeVisible();}
for(const caso of ["persona existente","sin conexión","conflicto de camas","conflicto de identificación"])test(`cupos reales: ${caso}`,async({page,context})=>{
  const empresa=randomUUID(),contrato=randomUUID(),externa=randomUUID(),otraPersona=randomUUID();
  const camas=Array.from({length:4},()=>({id:randomUUID(),habitacion:randomUUID()}));
  const nombreEmpresa=`Empresa de prueba cupos ${empresa.slice(0,8)}`;
  const usuario=sql("select id from public.usuario where email='admin@pension-myriam.local'");
  const auth=sql("select auth_uid from public.usuario where email='admin@pension-myriam.local'");
  const desde=fechaHoySantiago(),hasta=sumarDiasYMD(desde,29);
  sql(`begin;insert into public.empresa(id,razon_social) values('${empresa}','${nombreEmpresa}');insert into public.contrato_empresa(id,empresa_id,vigencia_desde,vigencia_hasta,headcount,tarifa_convenida,creado_por) values('${contrato}','${empresa}','${desde}','${hasta}',4,25000,'${usuario}');${camas.map((c,i)=>`insert into public.habitacion(id,numero,capacidad) values('${c.habitacion}',${9941+i},1);insert into public.cama(id,habitacion_id,numero) values('${c.id}','${c.habitacion}',1);`).join("")}commit;`);
  try{
    await page.setViewportSize({width:caso==="sin conexión"?390:1280,height:900});await login(page);
    await page.locator("#tour-nav-empresas:visible,#tour-nav-empresas-mobile:visible").click();
    const tarjeta=page.locator("div.group.rounded-3xl").filter({has:page.getByRole("heading",{name:nombreEmpresa,exact:true})});
    await expect(tarjeta).toBeVisible({timeout:25000});await tarjeta.getByRole("button",{name:"Ver Nómina y Consumos"}).click();
    await expect(page.getByRole("button",{name:"Reservar camas sin nómina",exact:true})).toBeVisible({timeout:25000});
    if(caso==="persona existente"){
      await page.getByRole("textbox",{name:"Nombre y apellido del trabajador"}).fill("Persona existente de prueba");await page.getByRole("button",{name:"Agregar a la lista",exact:true}).click();
      await expect.poll(()=>sql(`select count(*) from public.trabajador where contrato_empresa_id='${contrato}'`)).toBe("1");
    }
    if(caso==="sin conexión"||caso==="conflicto de camas"){await page.evaluate(async()=>{await (window as any).__powersync.disconnect();});await context.setOffline(true);}
    await page.getByRole("button",{name:"Reservar camas sin nómina",exact:true}).click();
    const modal=page.getByRole("dialog",{name:"Reservar camas sin nómina",exact:true});
    for(let n=9941;n<=9944;n++)await modal.getByLabel(`Pieza #${n} · Cama 1`,{exact:true}).check();
    await modal.getByRole("button",{name:"Confirmar 4 camas",exact:true}).click();await expect(modal).toHaveCount(0);
    await expect(page.getByText("Cupo 1 · Sin nombre asignado",{exact:true})).toBeVisible();
    expect(sql(`select count(*) from public.trabajador where contrato_empresa_id='${contrato}'`)).toBe(caso==="persona existente"?"1":"0");
    if(caso==="conflicto de camas"){
      sql(`insert into public.reserva(id,tipo_cliente,cama_id,huesped_nombre,fecha_inicio,fecha_fin,creado_por,uuid_idempotente) values('${externa}','turista','${camas[2].id}','Huésped de prueba externo','${desde}','${hasta}','${usuario}',gen_random_uuid())`);
      await context.setOffline(false);await page.evaluate(async()=>{await (window as any).__powersyncReconectar();});
      await expect.poll(()=>page.evaluate(async(id)=>{const filas=await (window as any).__powersync.getAll("select count(*) as n from reserva where contrato_empresa_id=?",[id]);return filas[0].n;},contrato),{timeout:25000}).toBe(0);
      expect(sql(`select count(*) from public.reserva where contrato_empresa_id='${contrato}'`)).toBe("0");
      await expect.poll(()=>page.evaluate(async()=>{const filas=await (window as any).__powersync.getAll("select count(*) as n from operacion_rechazada where tabla='reserva'");return filas[0].n;}),{timeout:25000}).toBeGreaterThan(0);
      return;
    }
    if(caso!=="sin conexión")await expect.poll(()=>sql(`select count(*) from public.reserva where contrato_empresa_id='${contrato}'`),{timeout:25000}).toBe("4");
    if(caso==="conflicto de identificación"){await page.evaluate(async()=>{await (window as any).__powersync.disconnect();});await context.setOffline(true);}
    const reservaId=await page.evaluate(async(id)=>{const filas=await (window as any).__powersync.getAll("select id from reserva where contrato_empresa_id=? and cupo_numero=1",[id]);return filas[0].id;},contrato);
    await page.getByRole("button",{name:"Identificar cupo 1",exact:true}).click();
    const identificacion=page.getByRole("dialog",{name:"Identificar cupo 1",exact:true});
    if(caso==="persona existente"){
      const idPersona=sql(`select id from public.trabajador where contrato_empresa_id='${contrato}'`);await identificacion.getByLabel("Persona de la nómina").selectOption(idPersona);
    }else await identificacion.getByLabel("Nombre y apellido reales").fill("Persona identificada de prueba");
    if(process.env.CUPOS_EVIDENCIA){await mkdir(process.env.CUPOS_EVIDENCIA,{recursive:true});await page.screenshot({path:`${process.env.CUPOS_EVIDENCIA}/${caso.replaceAll(" ","-")}.png`});}
    await identificacion.getByRole("button",{name:"Vincular persona a esta cama"}).click();await expect(identificacion).toHaveCount(0);
    if(caso==="conflicto de identificación")sql(`begin;select set_config('request.jwt.claims','{"sub":"${auth}"}',true);select public.identificar_cupo_empresa('${reservaId}','${otraPersona}','Persona confirmada en otro teléfono',gen_random_uuid(),now());commit;`);
    if(caso==="sin conexión"){
      expect(sql(`select count(*) from public.reserva where contrato_empresa_id='${contrato}'`)).toBe("0");expect(sql(`select count(*) from public.trabajador where contrato_empresa_id='${contrato}'`)).toBe("0");
    }
    if(caso!=="persona existente"){await context.setOffline(false);await page.evaluate(async()=>{await (window as any).__powersyncReconectar();});}
    await expect.poll(()=>sql(`select count(*) from public.reserva where contrato_empresa_id='${contrato}' and trabajador_id is not null`),{timeout:25000}).toBe("1");
    expect(sql(`select count(*) from public.reserva where contrato_empresa_id='${contrato}'`)).toBe("4");expect(sql(`select count(*) from public.trabajador where contrato_empresa_id='${contrato}'`)).toBe("1");
    expect(sql(`select count(*) from public.consumo c join public.trabajador t on t.id=c.trabajador_id where t.contrato_empresa_id='${contrato}'`)).toBe("0");
    expect(sql(`select headcount from public.contrato_empresa where id='${contrato}'`)).toBe("4");
    if(caso==="conflicto de identificación"){
      await expect.poll(()=>page.evaluate(async(id)=>{const filas=await (window as any).__powersync.getAll("select trabajador_id from reserva where id=?",[id]);return filas[0]?.trabajador_id;},reservaId),{timeout:25000}).toBe(otraPersona);
      await expect.poll(()=>page.evaluate(async(id)=>{const filas=await (window as any).__powersync.getAll("select count(*) as n from trabajador where contrato_empresa_id=?",[id]);return filas[0].n;},contrato),{timeout:25000}).toBe(1);
    }
    expect(sql(`select count(*) from public.reserva where id='${reservaId}'`)).toBe("1");
    if(process.env.CUPOS_EVIDENCIA){await page.screenshot({path:`${process.env.CUPOS_EVIDENCIA}/resultado-${caso.replaceAll(" ","-")}.png`,fullPage:true});}
  }finally{
    await context.setOffline(false);await page.close();
    sql(`begin;delete from public.checkout where checkin_id in(select ci.id from public.checkin ci join public.reserva r on r.id=ci.reserva_id where r.contrato_empresa_id='${contrato}');delete from public.checkin where reserva_id in(select id from public.reserva where contrato_empresa_id='${contrato}');delete from public.reserva where contrato_empresa_id='${contrato}' or id='${externa}';delete from public.trabajador where contrato_empresa_id='${contrato}';delete from public.contrato_empresa where id='${contrato}';delete from public.empresa where id='${empresa}';${camas.map(c=>`delete from public.cama where id='${c.id}';delete from public.habitacion where id='${c.habitacion}';`).join("")}commit;`);
  }
});
