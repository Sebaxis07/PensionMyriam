import type { AbstractPowerSyncDatabase } from "@powersync/web";
import { UpdateType } from "@powersync/web";
import { supabase } from "../../lib/supabase";
type Operacion={table:string;op:UpdateType;id:string;opData?:Record<string,unknown>|null};

/** El servidor confirma un lote o una identificación completos, nunca a medias. */
export async function subirCuposEmpresa(db:AbstractPowerSyncDatabase,operaciones:Operacion[],esTransitorio:(error:unknown)=>boolean):Promise<boolean>{
  const lote=operaciones.length>0 && operaciones.every(o=>o.table==="reserva"&&o.op===UpdateType.PUT&&o.opData?.cupo_numero!=null);
  const identificacion=operaciones.find(o=>o.table==="reserva"&&o.op===UpdateType.PATCH&&o.opData?.uuid_identificacion);
  if(!lote && !identificacion)return false;
  let resultado;
  if(lote){
    resultado=await supabase.rpc("reservar_cupos_empresa",{p_reservas:operaciones.map(o=>({...o.opData,id:o.id}))});
  }else{
    const reserva=(await db.getAll<{trabajador_id:string}>("select trabajador_id from reserva where id = ?",[identificacion!.id]))[0];
    const persona=(await db.getAll<{id:string;nombre:string;created_at:string}>("select id, nombre, created_at from trabajador where id = ?",[reserva?.trabajador_id??""]))[0];
    if(!persona){
      // La restitución de un conflicto también genera un PATCH local. Si ya
      // coincide con el servidor, completarlo permite recibir su nómina.
      const {data,error}=await supabase.from("reserva").select("trabajador_id,uuid_identificacion").eq("id",identificacion!.id).maybeSingle();
      if(error)throw error;
      if(data?.trabajador_id===reserva?.trabajador_id && data?.uuid_identificacion===identificacion!.opData!.uuid_identificacion)return true;
      throw new Error("No se encontró la identificación pendiente. Se volverá a intentar.");
    }
    resultado=await supabase.rpc("identificar_cupo_empresa",{p_reserva_id:identificacion!.id,p_trabajador_id:persona.id,p_nombre:persona.nombre,p_uuid_identificacion:identificacion!.opData!.uuid_identificacion,p_creado_en:persona.created_at});
  }
  if(!resultado.error)return true;
  if(esTransitorio(resultado.error))throw resultado.error;
  // Preparar la restitución desde el servidor antes de completar la cola.
  const restauraciones:Array<{tabla:string;id:string;fila:Record<string,unknown>|null}>=[];
  for(const op of operaciones){
    if(op.table!=="reserva"&&op.table!=="trabajador")continue;
    const {data,error}=await supabase.from(op.table).select("*").eq("id",op.id).maybeSingle();
    if(error)throw error;
    restauraciones.push({tabla:op.table,id:op.id,fila:data});
  }
  await db.writeTransaction(async tx=>{
    for(const r of restauraciones){
      if(!r.fila){await tx.execute(`delete from ${r.tabla} where id = ?`,[r.id]);continue;}
      if(r.tabla==="reserva")await tx.execute("update reserva set trabajador_id=?,uuid_identificacion=?,estado=?,fecha_inicio=?,fecha_fin=? where id=?",[r.fila.trabajador_id as string|null,r.fila.uuid_identificacion as string|null,r.fila.estado as string,r.fila.fecha_inicio as string,r.fila.fecha_fin as string|null,r.id]);
      else await tx.execute("update trabajador set cama_id=? where id=?",[r.fila.cama_id as string|null,r.id]);
    }
    await tx.execute("insert into operacion_rechazada (id,tabla,operacion,motivo,datos_json,fecha_hora,resuelta) values (?, 'reserva', ?, ?, ?, ?, 0)",[crypto.randomUUID(),lote?"PUT":"PATCH",String(resultado.error.message),JSON.stringify({cupos:operaciones.filter(o=>o.table==="reserva").map(o=>o.id)}),new Date().toISOString()]);
  });
  return true;
}
