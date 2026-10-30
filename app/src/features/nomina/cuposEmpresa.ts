import { z } from "zod";
import { powersync } from "../../lib/powersync";

export interface ContratoCupos { id:string; headcount:number; vigencia_desde:string; vigencia_hasta:string|null; }
export interface CupoEmpresa { id:string; cupo_numero:number; cama_id:string; trabajador_id:string|null; habitacion_numero:number; cama_numero:number; }
const ReservarSchema=z.object({contratoId:z.string().uuid(),usuarioId:z.string().uuid(),camas:z.array(z.string().uuid()).min(1,"Selecciona al menos una cama.")});

export async function reservarCuposEmpresa(entrada:z.infer<typeof ReservarSchema>):Promise<void>{
  const datos=ReservarSchema.parse(entrada);
  if(new Set(datos.camas).size!==datos.camas.length)throw new Error("Selecciona camas diferentes para cada cupo.");
  await powersync.writeTransaction(async tx=>{
    const contrato=(await tx.getAll<ContratoCupos>("select id, headcount, vigencia_desde, vigencia_hasta from contrato_empresa where id = ?",[datos.contratoId]))[0];
    if(!contrato)throw new Error("Espera a que se cargue el contrato en este teléfono.");
    const existentes=await tx.getAll<{cupo_numero:number|null}>("select cupo_numero from reserva where contrato_empresa_id = ? and estado = 'confirmada'",[datos.contratoId]);
    if(existentes.length+datos.camas.length>contrato.headcount)throw new Error("La selección supera las camas contratadas que faltan por reservar.");
    const usados=new Set(existentes.map(r=>r.cupo_numero));
    for(const cama of datos.camas){
      const disponibles=await tx.getAll<{id:string}>(`select c.id from cama c join habitacion h on h.id=c.habitacion_id
        where c.id=? and h.estado<>'en_mantencion' and not exists(select 1 from reserva r where r.cama_id=c.id and r.estado='confirmada'
        and date(r.fecha_inicio)<=date(?) and (r.fecha_fin is null or date(r.fecha_fin)>=date(?)))`,[cama,contrato.vigencia_hasta??"9999-12-31",contrato.vigencia_desde]);
      if(!disponibles.length)throw new Error("Una cama ya no está disponible durante todo el contrato. Revisa tu selección.");
      let numero=1;while(usados.has(numero))numero++;usados.add(numero);
      await tx.execute(`insert into reserva (id,tipo_cliente,cama_id,contrato_empresa_id,cupo_numero,fecha_inicio,fecha_fin,estado,creado_por,uuid_idempotente,created_at)
        values (?,'empresa',?,?,?,?,?,'confirmada',?,?,?)`,[crypto.randomUUID(),cama,datos.contratoId,numero,contrato.vigencia_desde,contrato.vigencia_hasta,datos.usuarioId,crypto.randomUUID(),new Date().toISOString()]);
    }
  });
}

const IdentificarSchema=z.object({reservaId:z.string().uuid(),trabajadorId:z.string().uuid(),nombre:z.string().trim().min(1,"Escribe el nombre real de la persona."),uuidIdentificacion:z.string().uuid()});
export async function identificarCupoEmpresa(entrada:z.infer<typeof IdentificarSchema>):Promise<void>{
  const datos=IdentificarSchema.parse(entrada);
  await powersync.writeTransaction(async tx=>{
    const cupo=(await tx.getAll<{contrato_empresa_id:string;cama_id:string;trabajador_id:string|null;uuid_identificacion:string|null;estado:string}>("select contrato_empresa_id, cama_id, trabajador_id, uuid_identificacion, estado from reserva where id = ? and cupo_numero is not null",[datos.reservaId]))[0];
    if(!cupo || cupo.estado!=="confirmada")throw new Error("El cupo ya no está disponible. Revisa la reserva.");
    if(cupo.trabajador_id){if(cupo.trabajador_id===datos.trabajadorId&&cupo.uuid_identificacion===datos.uuidIdentificacion)return;throw new Error("Este cupo ya tiene una persona identificada.");}
    const persona=(await tx.getAll<{contrato_empresa_id:string;cama_id:string|null}>("select contrato_empresa_id, cama_id from trabajador where id = ?",[datos.trabajadorId]))[0];
    if(persona && (persona.contrato_empresa_id!==cupo.contrato_empresa_id || persona.cama_id))throw new Error("Elige una persona de este contrato que todavía no tenga cama.");
    if(!persona)await tx.execute("insert into trabajador (id,contrato_empresa_id,nombre,cama_id,created_at) values (?,?,?,?,?)",[datos.trabajadorId,cupo.contrato_empresa_id,datos.nombre,cupo.cama_id,new Date().toISOString()]);
    else await tx.execute("update trabajador set cama_id = ? where id = ?",[cupo.cama_id,datos.trabajadorId]);
    await tx.execute("update reserva set trabajador_id = ?, uuid_identificacion = ? where id = ?",[datos.trabajadorId,datos.uuidIdentificacion,datos.reservaId]);
  });
}
