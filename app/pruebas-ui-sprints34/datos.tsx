import { createContext, useSyncExternalStore } from "react";
import { datos as datosBase, habitaciones, parametros, usuarioId, contratoId, empresaId, powersync as basePower } from "../pruebas-ui/datos";
import { fechaHoySantiago, sumarDiasYMD } from "../src/lib/fechaNegocio";

export { habitaciones, parametros, usuarioId, contratoId, empresaId };
export const escenario = parametros.get("estado") ?? "normal";
export const rol = parametros.get("rol") ?? "administradora";
const legado = location.pathname.startsWith("/pruebas-ui/");
const hoy = fechaHoySantiago();
const ayer = sumarDiasYMD(hoy, -1);
const instante = new Date().toISOString();
const id = (n: number) => `91000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const personas = [{id:id(1),nombre:"Manuel Rojas (ejemplo)",ya_registrado:0,hora_consumo:null}, {id:id(2),nombre:"Patricia Soto (ejemplo)",ya_registrado:0,hora_consumo:null}, {id:id(3),nombre:"Pedro Gómez (ejemplo)",ya_registrado:1,hora_consumo:instante}];
const comidas = ["cama_noche","desayuno","almuerzo","cena"];
const filasConciliacion = comidas.map((tipo,i)=>({id:id(10+i),contrato_empresa_id:contratoId,fecha:hoy,tipo,headcount_esperado:30,cantidad_esperada:30,cantidad_servida:i===2?15:i===3?28:30,estado:i===2?"pendiente":i===3?"con_diferencia_justificada":"conciliado",motivo:i===3?"ausencia_justificada":null,supervisor_nombre:i===3?"Supervisor de ejemplo":null}));
const historicoConciliacion = comidas.map((tipo,i)=>({...filasConciliacion[i],id:id(20+i),fecha:ayer,estado:"conciliado",cantidad_servida:30}));
const productos = [{id:id(30),nombre:"Colación de terreno (ejemplo)",precio_unitario:2500},{id:id(31),nombre:"Plato especial (ejemplo)",precio_unitario:3500}];
const insumos = [{id:id(40),nombre:"Pollo (ejemplo)",categoria:"carnes",unidad_medida:"kg",costo_promedio:3500,cantidad_total:20},{id:id(41),nombre:"Arroz (ejemplo)",categoria:"abarrotes",unidad_medida:"kg",costo_promedio:1200,cantidad_total:50}];
const compras = insumos.map((i,n)=>({id:id(50+n),insumo_id:i.id,insumo_nombre:i.nombre,categoria:i.categoria,monto_total:n?60000:70000,cantidad:n?50:20,rendimiento_estimado:n?150:80,fecha:hoy,registrado_por:usuarioId,uuid_idempotente:id(60+n),created_at:instante}));
const rechazos = [
  {id:id(70),tabla:"reserva",operacion:"PUT",motivo:"23P01 conflicting key violates exclusion constraint reserva_no_solapa",datos_json:JSON.stringify({huesped_nombre:"Huésped de ejemplo",fecha_inicio:hoy}),fecha_hora:instante,resuelta:0,resuelta_por:null,resuelta_en:null},
  {id:id(71),tabla:"consumo",operacion:"PUT",motivo:"42501 permission denied by row level security",datos_json:JSON.stringify({tipo_consumo:"almuerzo"}),fecha_hora:instante,resuelta:0,resuelta_por:null,resuelta_en:null},
  {id:id(72),tabla:"contrato_empresa",operacion:"PATCH",motivo:"23505 duplicate key violates unique constraint",datos_json:JSON.stringify({tarifa_convenida:98765432,rut:"RUT-FICTICIO-NO-MOSTRAR"}),fecha_hora:instante,resuelta:0,resuelta_por:null,resuelta_en:null}
];
const verRechazos = escenario.startsWith("rechaz");
const vacio: never[]=[];
let revision=0;
const suscriptores = new Set<()=>void>();
const escuchas = new Set<{statusChanged:(s:typeof powersync.currentStatus)=>void}>();
const cache = new Map<string,unknown[]>();
export const operaciones: Array<{sql:string;argumentos:unknown[]}> = [];
export const consultas: string[] = [];
function notificar(){ revision++; cache.clear();suscriptores.forEach(fn=>fn());escuchas.forEach(fn=>fn.statusChanged(powersync.currentStatus)); }

function filas(sql:string, parametrosSql:unknown[]=[]):unknown[]{
  const q=sql.replace(/\s+/g," ").toLowerCase();
  if(q.includes("from operacion_rechazada")){
    const pendientes=verRechazos?rechazos.filter(r=>!r.resuelta):[];
    return q.includes("count(*)")?[{n:pendientes.length}]:pendientes;
  }
  if(legado)return datosBase(sql);
  if(q.includes("from usuario"))return [{id:usuarioId,nombre:"María (demostración)",rol}];
  if(escenario==="vacio")return vacio;
  if(q.includes("as ya_registrado"))return personas.map(p=>({...p}));
  if(q.includes("count(distinct c.trabajador_id)"))return comidas.concat("colacion").map(tipo_consumo=>({tipo_consumo,total:tipo_consumo==="almuerzo"?15:30}));
  if(q.includes("from conciliacion_diaria"))return filasConciliacion.concat(historicoConciliacion);
  if(q.includes("from producto_extra"))return productos;
  if(q.includes("from insumo order"))return insumos;
  if(q.includes("from compra_insumo"))return compras;
  if(q.includes("from consumo c") && q.includes("where c.trabajador_id ="))return [{id:id(90),tipo_consumo:"almuerzo",recargo:0,fecha_hora:instante,producto_nombre:null}];
  if(q.includes("from justificacion_descuadre"))return [{fecha:hoy,tipo:"almuerzo",cantidad_esperada:30,cantidad_servida:15,motivo:"almuerzo_mina",supervisor_nombre:"Supervisor de ejemplo"}];
  if(q.includes("from consumo c") && q.includes("t.nombre as trabajador_nombre"))return [{fecha_hora:instante,trabajador_nombre:"Manuel Rojas (ejemplo)",tipo_consumo:"almuerzo",producto_extra_nombre:null,recargo:0}];
  if(q.includes("from contrato_empresa"))return [{id:contratoId,empresa_id:empresaId,razon_social:"Empresa de ejemplo Paposo",headcount:30,tarifa_convenida:25000,vigencia_desde:ayer,vigencia_hasta:null}];
  return datosBase(sql);
}

export function useQuery<T>(sql:string, parametrosSql:unknown[]=[]){
  useSyncExternalStore(fn=>{suscriptores.add(fn);return()=>{suscriptores.delete(fn);};},()=>revision);
  consultas.push(sql);
  const llave=sql+JSON.stringify(parametrosSql);
  if(!cache.has(llave))cache.set(llave,filas(sql,parametrosSql));
  return {data:cache.get(llave) as T[],isLoading:escenario==="cargando",error:null};
}
export const PowerSyncContext=createContext(null);
export const powersync={
  currentStatus:{...basePower.currentStatus},
  registerListener(listener:{statusChanged:(s:typeof powersync.currentStatus)=>void}){escuchas.add(listener);return()=>escuchas.delete(listener);},
  async getAll<T>(sql:string, parametrosSql:unknown[]=[]):Promise<T[]>{
    if(legado)return basePower.getAll<T>(sql,parametrosSql);
    if(sql.includes("ps_crud"))return [{n:escenario==="pendientes"?3:0}] as T[];
    if(sql.includes("count(*) as n from consumo"))return [{n:0}] as T[];
    if(sql.includes("from contrato_empresa"))return [] as T[];
    return filas(sql,parametrosSql) as T[];
  },
  async execute(sql:string,argumentos:unknown[]=[]):Promise<{rowsAffected:number}>{
    operaciones.push({sql,argumentos});
    if(legado)return basePower.execute(sql,argumentos) as Promise<{rowsAffected:number}>;
    if(escenario==="guardando")return new Promise(()=>{});
    if(escenario==="error"||escenario==="rechazos-error")throw new Error("PGRST ejemplo: permission denied by row level security");
    if(sql.includes("update operacion_rechazada")){const r=rechazos.find(r=>r.id===argumentos.at(-1));if(r)r.resuelta=1;}
    if(sql.includes("insert into consumo")){const p=personas.find(p=>p.id===argumentos[1]);if(p)p.ya_registrado=1;}
    if(sql.includes("insert into justificacion_descuadre")){const fila=filasConciliacion.find(f=>f.id===argumentos[1]);if(fila)fila.estado="con_diferencia_justificada";}
    notificar();return {rowsAffected:1};
  },
  async getOptional<T>(sql:string,argumentos:unknown[]=[]):Promise<T|null>{
    if(sql.includes("from insumo"))return (insumos.find(i=>i.id===argumentos[0]||i.nombre.toLowerCase()===String(argumentos[0]).toLowerCase())??null) as T|null;
    return (await powersync.getAll<T>(sql,argumentos))[0]??null;
  },
  async writeTransaction(accion:(tx:typeof powersync)=>Promise<void>):Promise<void>{await accion(powersync);}
};
export async function connectPowerSync(){}
export const supabase={auth:{async getSession(){return {data:{session:{user:{id:usuarioId}}}};},async signOut(){},onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
  async rpc(){return escenario==="error"?{data:null,error:{message:"PGRST: prueba sin conexión"}}:{data:2,error:null};}};

export function useCierreMensual(){
  return {estaCerrable:!["pendiente","vacio","error"].includes(escenario),diasPendientes:escenario==="pendiente"||escenario==="error"?[{fecha:hoy,tiposPendientes:["almuerzo","cena"]}]:[],
    totalDiasContrato:2,diasConciliados:escenario==="pendiente"?1:2,headcountContratado:30,tarifaPactadaDiaria:25000,totalContratoCompleto:1500000,totalColacionesExtras:5000,granTotal:1505000,
    colacionesDetalle:[{nombre:"Colación de terreno",cantidad:2,precioUnitario:2500,subtotal:5000}],
    trabajadoresDetalle:[{trabajadorId:id(1),nombre:"Manuel Rojas (ejemplo)",camaNoche:2,desayuno:2,almuerzo:1,cena:2,colaciones:2}],
    justificacionesMes:[{fecha:hoy,tipo:"almuerzo",diferencia:15,motivo:"almuerzo_mina",supervisor_nombre:"Supervisor de ejemplo"}],isLoading:escenario==="cargando"};
}

export function useDashboardAdminMetricas(){
  const sinDatos=escenario==="vacio";
  const metricasMargen={margenPorcentaje:sinDatos?0:escenario==="bajo"?10:42,estadoSemaforo:escenario==="bajo"?"rojo" as const:"verde" as const,ingresosTotales:sinDatos?0:3500000,costosTotales:sinDatos?0:2030000,costoDiarioTrabajador:sinDatos?0:12500,tarifaMinimaSugerida:sinDatos?0:17857,contratosBajoMinimo:escenario==="bajo"?[{razonSocial:"Empresa de ejemplo Paposo",tarifa:15000}]:[]};
  const metricasConciliacion={tasaConciliacion:sinDatos?0:75,totalRegistros:sinDatos?0:8,conciliados:sinDatos?0:6,pendientesJustificar:sinDatos?0:2,racionesServidas:sinDatos?0:105,racionesEsperadas:sinDatos?0:120,diasConDescuadre:sinDatos?[]:[hoy]};
  const metricasOcupacion={totalHabitaciones:8,ocupadas:2,disponibles:4,enMantencion:1,ocupadasEmpresa:1,ocupadasTurista:1,porcentajeOcupacion:25};
  const diasSemana=Array.from({length:7},(_,i)=>({fechaIso:sumarDiasYMD(hoy,i),nombreDia:i===0?"Hoy":`Día ${i+1}`,numeroDia:Number(sumarDiasYMD(hoy,i).slice(-2)),esHoy:i===0}));
  const matrizRackSemanal=Object.fromEntries(habitaciones.map(h=>[h.numero,diasSemana.map(d=>({habitacionId:h.id,habitacionNumero:h.numero,fechaIso:d.fechaIso,estado:h.estado==="en_mantencion"?"mantencion":h.estado==="ocupada"?"empresa":h.estado==="en_aseo"?"aseo":"disponible",huesped:h.huesped_actual??undefined}))]));
  return {metricasMargen,metricasConciliacion,metricasOcupacion,diasSemana,matrizRackSemanal};
}
