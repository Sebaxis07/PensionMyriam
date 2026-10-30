import {test,expect} from "@playwright/test";
import {execFileSync} from "node:child_process";
import {randomUUID} from "node:crypto";
function sql(texto:string){return execFileSync("docker",["exec","-i","pension-myriam-postgres-1","sh","-c",'PGPASSWORD="$POSTGRES_PASSWORD" psql -U supabase_admin -d postgres -At -v ON_ERROR_STOP=1'],{input:texto,encoding:"utf8"}).trim();}
for(const recuperar of [false,true])test(recuperar?"recuperar el contrato rechazado sin duplicarlo":"crear contrato con subida real sin error 403",async({page})=>{
  const empresaId=randomUUID();const usuarioId=sql("select id from public.usuario where email='admin@pension-myriam.local'");
  sql(`insert into public.empresa(id,razon_social) values('${empresaId}','Empresa sintética de prueba de contrato')`);
  try{
    await page.addInitScript(()=>localStorage.setItem("pension_myriam_tour_completado_v1","true"));await page.goto("/");
    await page.locator('input[type="email"]').fill("admin@pension-myriam.local");if(!process.env.E2E_DEMO_PASSWORD)throw Error("Falta la clave de demo local");await page.locator('input[type="password"]').fill(process.env.E2E_DEMO_PASSWORD);await page.getByRole("button",{name:"Ingresar",exact:true}).click();
    await expect(page.getByText("Habitaciones de la Pensión")).toBeVisible();
    await expect.poll(()=>page.evaluate(async(id)=>{const filas=await (window as any).__powersync.getAll("select id from empresa where id = ?",[id]);return filas.length;},empresaId),{timeout:25000}).toBe(1);
    if(recuperar)await page.evaluate(async()=>{await (window as any).__powersync.disconnect();});
    const estados:number[]=[];page.on("response",r=>{if(r.url().includes("/contrato_empresa?")&&r.request().method()==="POST")estados.push(r.status());});
    const contratoId=await page.evaluate(async({empresaId,usuarioId})=>{
      const importar=(ruta:string):Promise<any>=>import(/* @vite-ignore */ ruta);
      const {crearContratoEmpresa}=await importar("/src/features/reservaEmpresa/crearContratoEmpresa.ts");
      return crearContratoEmpresa(usuarioId,{empresaId,vigenciaDesde:"2035-01-01",headcount:10,tarifaConvenida:25000});
    },{empresaId,usuarioId});
    if(recuperar){
      await page.evaluate(async({contratoId})=>{
        const db=(window as any).__powersync;
        const tx=await db.getNextCrudTransaction();if(!tx || tx.crud.some((o:any)=>o.table!=="contrato_empresa" || o.id!==contratoId))throw Error("Cola de prueba inesperada");const fila=tx.crud[0].opData;await tx.complete();
        delete fila.id;
        await db.execute("insert into operacion_rechazada (id,tabla,operacion,motivo,datos_json,fecha_hora,resuelta) values (?, 'contrato_empresa', 'PUT', 'permission denied for table contrato_empresa', ?, ?, 0)",[crypto.randomUUID(),JSON.stringify(fila),new Date().toISOString()]);
        await (window as any).__powersyncReconectar();
      },{contratoId});
      await page.locator('button[aria-label="Ver registros que necesitan atención"]:visible').first().click();
      await page.getByRole("button",{name:"Reintentar guardado del contrato"}).click();
      await expect(page.getByText("Contrato confirmado en el servidor. El aviso queda conservado como resuelto.")).toBeVisible();
      await expect.poll(()=>page.evaluate(async()=>{const filas=await (window as any).__powersync.getAll("select count(*) as n from operacion_rechazada where tabla='contrato_empresa' and resuelta=1");return filas[0].n;})).toBe(1);
    }
    await expect.poll(()=>sql(`select count(*) from public.contrato_empresa where empresa_id='${empresaId}'`),{timeout:25000}).toBe("1");
    if(!recuperar) expect(sql(`select count(*) from public.contrato_empresa where id='${contratoId}'`)).toBe("1");
    expect(sql(`select tarifa_convenida from public.contrato_empresa where empresa_id='${empresaId}'`)).toBe("25000.00");
    expect(estados.length).toBeGreaterThan(0);expect(estados).not.toContain(403);
  }finally{await page.close();sql(`begin; delete from public.contrato_empresa where empresa_id='${empresaId}'; delete from public.empresa where id='${empresaId}'; commit;`);}
});
