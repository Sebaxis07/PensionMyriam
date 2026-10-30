import {beforeEach,expect,it,vi} from "vitest";
import {UpdateType} from "@powersync/web";
const {rpc,leer}=vi.hoisted(()=>({rpc:vi.fn(),leer:vi.fn()}));
vi.mock("../../lib/supabase",()=>({supabase:{rpc,from:()=>({select:()=>({eq:()=>({maybeSingle:leer})})})}}));
import {subirCuposEmpresa} from "./subirCuposEmpresa";
beforeEach(()=>vi.resetAllMocks());
it("completa la restitución ya confirmada aunque la persona del otro teléfono aún no se replique",async()=>{
  const db={getAll:vi.fn().mockResolvedValueOnce([{trabajador_id:"persona-remota"}]).mockResolvedValueOnce([])};
  leer.mockResolvedValue({data:{trabajador_id:"persona-remota",uuid_identificacion:"identificacion-remota"},error:null});
  expect(await subirCuposEmpresa(db as any,[{table:"reserva",op:UpdateType.PATCH,id:"cupo",opData:{uuid_identificacion:"identificacion-remota"}}],()=>false)).toBe(true);
  expect(rpc).not.toHaveBeenCalled();
});
it("conserva el reintento cuando no puede comprobar la restitución",async()=>{
  const db={getAll:vi.fn().mockResolvedValueOnce([{trabajador_id:"persona-remota"}]).mockResolvedValueOnce([])};
  leer.mockResolvedValue({data:null,error:new Error("Sin conexión")});
  await expect(subirCuposEmpresa(db as any,[{table:"reserva",op:UpdateType.PATCH,id:"cupo",opData:{uuid_identificacion:"identificacion-remota"}}],()=>false)).rejects.toThrow("Sin conexión");
});
