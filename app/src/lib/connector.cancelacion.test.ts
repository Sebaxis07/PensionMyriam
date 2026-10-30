import {beforeEach,describe,expect,it,vi} from "vitest";
import {UpdateType} from "@powersync/web";
const {subir,leer}=vi.hoisted(()=>({subir:vi.fn(),leer:vi.fn()}));
vi.mock("./supabase",()=>({supabase:{from:(tabla:string)=>({
  update:()=>({eq:()=>({throwOnError:()=>subir(tabla)})}),
  upsert:()=>({throwOnError:()=>subir(tabla)}),
  select:()=>({eq:()=>({single:()=>leer(tabla)})})
})}}));
vi.mock("./env",()=>({POWERSYNC_URL:"http://test"}));
import {SupabaseConnector} from "./connector";
function base(crud:unknown[]){const execute=vi.fn().mockResolvedValue({rowsAffected:1}),complete=vi.fn();return {execute,complete,getNextCrudTransaction:async()=>({crud,complete})};}
describe("Conflictos al sincronizar cancelaciones",()=>{
  beforeEach(()=>{vi.resetAllMocks();});
  it("restaura la reserva del servidor y conserva el rechazo visible",async()=>{
    subir.mockRejectedValue({code:"23514",message:"El huésped ya ingresó. Registra su salida en Habitaciones."});
    leer.mockResolvedValue({data:{estado:"confirmada",motivo_cancelacion:null,cancelada_por:null,cancelada_en:null,uuid_cancelacion:null},error:null});
    const db=base([{table:"reserva",op:UpdateType.PATCH,id:"reserva",opData:{estado:"cancelada"}}]);
    await new SupabaseConnector().uploadData(db as any);
    expect(db.execute).toHaveBeenCalledWith(expect.stringContaining("update reserva set estado"),["confirmada",null,null,null,null,"reserva"]);
    expect(db.execute).toHaveBeenCalledWith(expect.stringContaining("insert into operacion_rechazada"),expect.any(Array));expect(db.complete).toHaveBeenCalledOnce();
  });
  it("si no puede recuperar el estado, mantiene la operación para reintentar",async()=>{
    subir.mockRejectedValue({code:"23514",message:"El huésped ya ingresó"});leer.mockResolvedValue({data:null,error:new Error("Sin conexión")});
    const db=base([{table:"reserva",op:UpdateType.PATCH,id:"reserva",opData:{estado:"cancelada"}}]);
    await expect(new SupabaseConnector().uploadData(db as any)).rejects.toThrow("Sin conexión");expect(db.complete).not.toHaveBeenCalled();
  });
  it("un check-in rechazado por cancelación no deja la habitación ocupada",async()=>{
    subir.mockRejectedValue({code:"23514",message:"Esta reserva no está confirmada. Revisa si fue cancelada."});
    leer.mockImplementation(async(tabla:string)=>({data:tabla==="reserva"?{cama_id:"cama"}:tabla==="cama"?{habitacion_id:"pieza"}:{estado:"disponible"},error:null}));
    const db=base([{table:"checkin",op:UpdateType.PUT,id:"ingreso",opData:{reserva_id:"reserva"}},{table:"habitacion",op:UpdateType.PATCH,id:"pieza",opData:{estado:"ocupada"}}]);
    await new SupabaseConnector().uploadData(db as any);
    expect(subir).toHaveBeenCalledTimes(1);expect(db.execute).toHaveBeenCalledWith("delete from checkin where id = ?",["ingreso"]);expect(db.execute).toHaveBeenCalledWith("update habitacion set estado = ? where id = ?",["disponible","pieza"]);
  });
});
