import {useEffect,useState} from "react";
import {useQuery} from "@powersync/react";
import {Dialogo} from "../../components/Dialogo";
import {AvisoInterfaz,describirErrorUi} from "../../components/MensajeInterfaz";
import {camasLibresParaContrato,type CamaLibreRow} from "./asignarTrabajador";
import {identificarCupoEmpresa,reservarCuposEmpresa,type ContratoCupos,type CupoEmpresa} from "./cuposEmpresa";
import type {TrabajadorRow} from "./useNomina";
import {calcularEstimacionContrato} from "../reservaEmpresa/estimacionContrato";
import {EstimacionContratoCard} from "../reservaEmpresa/EstimacionContratoCard";

// Solo llega con valor en el teléfono de la Administradora (bucket
// contrato_empresa_administradora, migración 0026) — en el de la
// Encargada esta fila simplemente no existe, por diseño (no ve costos).
interface ContratoEconomico{tarifa_convenida:number;incluye_desayuno:number;incluye_almuerzo:number;incluye_cena:number;}

export function CuposEmpresaPanel({contrato,usuarioId,nomina}:{contrato:ContratoCupos|undefined;usuarioId:string;nomina:TrabajadorRow[]}){
  const {data:reservas=[]}=useQuery<CupoEmpresa>(`select r.id,r.cupo_numero,r.cama_id,r.trabajador_id,h.numero as habitacion_numero,c.numero as cama_numero
    from reserva r join cama c on c.id=r.cama_id join habitacion h on h.id=c.habitacion_id
    where r.contrato_empresa_id=? and r.estado='confirmada' order by r.cupo_numero,r.created_at`,[contrato?.id??""]);
  const {data:economico=[]}=useQuery<ContratoEconomico>("select tarifa_convenida,incluye_desayuno,incluye_almuerzo,incluye_cena from contrato_empresa where id=?",[contrato?.id??""]);
  const [reservando,setReservando]=useState(false);
  const [identificando,setIdentificando]=useState<CupoEmpresa|null>(null);
  const [mensaje,setMensaje]=useState<string|null>(null);
  if(!contrato)return <p role="status" className="text-sm">Cargando cupos del contrato…</p>;
  const faltan=Math.max(0,contrato.headcount-reservas.length);
  const numeros=new Set(reservas.map(r=>r.cupo_numero));
  const pendientes:number[]=[];let numero=1;while(pendientes.length<faltan){if(!numeros.has(numero))pendientes.push(numero);numero++;}
  const nombresPendientes=Math.max(0,contrato.headcount-nomina.length);
  const datosEconomicos=economico[0];
  return <section aria-label="Cupos y camas del contrato" className="space-y-4 rounded-3xl border border-brand-border bg-brand-card p-4 sm:p-6">
    <p className="text-sm font-bold text-brand-terracotta-deep">1 de 3 etapas · Contrato, nómina y llegada</p>
    <div className="grid grid-cols-3 gap-2 text-center">
      {[[contrato.headcount,"Contratados"],[nomina.length,"Identificados"],[reservas.length,"Camas reservadas"]].map(([valor,etiqueta])=><div key={etiqueta} className="min-w-0 rounded-2xl border border-brand-border bg-white p-2 sm:p-4"><p className="font-display text-3xl font-bold">{valor}</p><p className="break-words text-sm">{etiqueta}</p></div>)}
    </div>
    <div><h3 className="font-display text-lg font-bold">¿Todavía no tienes los nombres?</h3><p className="mt-2 text-sm">Puedes reservar las camas ahora y completar la nómina cuando la empresa te envíe los datos.</p></div>
    <p className="text-sm">Vigencia: {contrato.vigencia_desde}{contrato.vigencia_hasta?` al ${contrato.vigencia_hasta}`:" · Sin fecha de término"}.</p>
    {datosEconomicos&&<EstimacionContratoCard compacta
      headcount={contrato.headcount}
      tarifaConvenida={datosEconomicos.tarifa_convenida}
      vigenciaDesde={contrato.vigencia_desde}
      vigenciaHasta={contrato.vigencia_hasta}
      servicios={{desayuno:Boolean(datosEconomicos.incluye_desayuno),almuerzo:Boolean(datosEconomicos.incluye_almuerzo),cena:Boolean(datosEconomicos.incluye_cena)}}
      condicionTributaria={null}
      estimacion={calcularEstimacionContrato({headcount:contrato.headcount,tarifaConvenida:datosEconomicos.tarifa_convenida,vigenciaDesde:contrato.vigencia_desde,vigenciaHasta:contrato.vigencia_hasta})}
    />}
    {faltan>0 && <button type="button" onClick={()=>setReservando(true)} className="min-h-12 w-full rounded-xl bg-brand-terracotta-deep px-4 py-3 font-bold text-white">Reservar camas sin nómina</button>}
    <p className="text-sm">Las camas reservadas dejan de ofrecerse durante las fechas del contrato. Sin conexión, el bloqueo queda en este teléfono hasta sincronizar.</p>
    {mensaje&&<AvisoInterfaz tono="exito">{mensaje}</AvisoInterfaz>}
    <div className="space-y-2"><h3 className="font-display text-lg font-bold">Pendiente de nómina</h3><p className="text-sm">{nombresPendientes} {nombresPendientes===1?"nombre pendiente":"nombres pendientes"}</p>
      {reservas.filter(r=>r.cupo_numero!=null).map(r=><article key={r.id} className="space-y-2 rounded-2xl border border-brand-border bg-white p-3">
        <p className="font-bold">Cupo {r.cupo_numero} · {r.trabajador_id?(nomina.find(t=>t.id===r.trabajador_id)?.nombre??"Persona identificada"):"Sin nombre asignado"}</p>
        <p className="text-sm">Pieza #{r.habitacion_numero} · Cama {r.cama_numero} · Reservada</p>
        {!r.trabajador_id?<button type="button" onClick={()=>setIdentificando(r)} className="min-h-11 rounded-xl border border-brand-border bg-brand-sand px-4 py-2 font-bold text-brand-terracotta-deep">Identificar cupo {r.cupo_numero}</button>:<p className="text-sm font-bold text-emerald-800">✓ Identificado · Llegada por registrar en Habitaciones</p>}
      </article>)}
      {pendientes.map(n=><div key={n} className="rounded-xl border border-dashed border-brand-border p-3 text-sm">Cupo {n} · Sin nombre asignado · Cama pendiente de reserva</div>)}
      {faltan===0 && reservas.every(r=>r.trabajador_id)&&<p className="text-sm font-bold text-emerald-800">Todas las camas reservadas tienen una persona identificada.</p>}
    </div>
    {reservando&&<ReservarCuposDialogo contrato={contrato} usuarioId={usuarioId} faltan={faltan} onCerrar={()=>setReservando(false)} onGuardado={(cantidad)=>{setReservando(false);setMensaje(`${cantidad} camas reservadas en este teléfono, pendientes de sincronización. No se crearon trabajadores ni consumos.`);}}/>}
    {identificando&&<IdentificarCupoDialogo cupo={identificando} personas={nomina.filter(t=>!t.cama_id)} onCerrar={()=>setIdentificando(null)} onGuardado={()=>{setIdentificando(null);setMensaje("Persona vinculada a la cama que ya estaba reservada. Pendiente de sincronización; no se creó otra reserva.");}}/>}
  </section>;
}

function ReservarCuposDialogo({contrato,usuarioId,faltan,onCerrar,onGuardado}:{contrato:ContratoCupos;usuarioId:string;faltan:number;onCerrar:()=>void;onGuardado:(n:number)=>void}){
  const [camas,setCamas]=useState<CamaLibreRow[]>([]),[seleccion,setSeleccion]=useState<string[]>([]),[cargando,setCargando]=useState(true),[guardando,setGuardando]=useState(false),[error,setError]=useState<string|null>(null);
  useEffect(()=>{let vigente=true;camasLibresParaContrato(contrato.vigencia_desde,contrato.vigencia_hasta).then(datos=>{if(vigente)setCamas(datos);}).catch(()=>{if(vigente)setError("No se pudieron consultar las camas de este teléfono.");}).finally(()=>{if(vigente)setCargando(false);});return()=>{vigente=false;};},[contrato.id,contrato.vigencia_desde,contrato.vigencia_hasta]);
  async function guardar(){setError(null);setGuardando(true);try{await reservarCuposEmpresa({contratoId:contrato.id,usuarioId,camas:seleccion});onGuardado(seleccion.length);}catch(e){setError(describirErrorUi(e instanceof Error?e.message:"No se pudieron reservar las camas."));}finally{setGuardando(false);}}
  return <Dialogo titulo="Reservar camas sin nómina" onCerrar={()=>{if(!guardando)onCerrar();}} className="ui-operativa fixed inset-0 z-[70] flex items-center justify-center bg-brand-ink/60 p-3"><div className="w-full max-w-lg space-y-4 rounded-3xl border border-brand-border bg-brand-card p-5">
    <h2 className="font-display text-xl font-bold">Reservar camas sin nómina</h2><p className="text-sm">Faltan {faltan} camas por reservar. Selecciona las que necesitas; se comprobará todo el período del contrato.</p>
    {cargando?<p role="status">Consultando camas disponibles…</p>:<p className="text-sm">{camas.length} camas disponibles · {seleccion.length} seleccionadas</p>}
    {!cargando&&camas.length<faltan&&<AvisoInterfaz>Faltan {faltan-camas.length} camas disponibles para cubrir todo el contrato. Puedes reservar las disponibles y revisar las restantes.</AvisoInterfaz>}
    <fieldset disabled={guardando} className="max-h-72 space-y-2 overflow-y-auto"><legend className="sr-only">Camas disponibles para el contrato</legend>{camas.map(c=><label key={c.cama_id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-brand-border bg-white p-3"><input type="checkbox" checked={seleccion.includes(c.cama_id)} disabled={!seleccion.includes(c.cama_id)&&seleccion.length>=faltan} onChange={e=>setSeleccion(actual=>e.target.checked?[...actual,c.cama_id]:actual.filter(id=>id!==c.cama_id))}/><span>Pieza #{c.numero} · Cama {c.cama_numero??"sin número"}</span></label>)}</fieldset>
    {error&&<AvisoInterfaz tono="error">{error}</AvisoInterfaz>}
    <div className="flex flex-col gap-2 sm:flex-row"><button disabled={guardando} onClick={onCerrar} className="rounded-xl border border-brand-border bg-white px-4 py-3 font-bold">Volver sin reservar</button><button disabled={guardando||!seleccion.length||cargando} onClick={guardar} className="rounded-xl bg-brand-terracotta-deep px-4 py-3 font-bold text-white disabled:opacity-50">{guardando?"Reservando…":`Confirmar ${seleccion.length} camas`}</button></div>
  </div></Dialogo>;
}

function IdentificarCupoDialogo({cupo,personas,onCerrar,onGuardado}:{cupo:CupoEmpresa;personas:TrabajadorRow[];onCerrar:()=>void;onGuardado:()=>void}){
  const [nombre,setNombre]=useState(""),[existente,setExistente]=useState(""),[guardando,setGuardando]=useState(false),[error,setError]=useState<string|null>(null);
  const [nuevoId]=useState(()=>crypto.randomUUID()),[uuid]=useState(()=>crypto.randomUUID());
  async function guardar(e:React.FormEvent){e.preventDefault();setError(null);setGuardando(true);try{const persona=personas.find(t=>t.id===existente);await identificarCupoEmpresa({reservaId:cupo.id,trabajadorId:persona?.id??nuevoId,nombre:persona?.nombre??nombre,uuidIdentificacion:uuid});onGuardado();}catch(e){setError(describirErrorUi(e instanceof Error?e.message:"No se pudo identificar el cupo."));}finally{setGuardando(false);}}
  return <Dialogo titulo={`Identificar cupo ${cupo.cupo_numero}`} onCerrar={()=>{if(!guardando)onCerrar();}} className="ui-operativa fixed inset-0 z-[70] flex items-center justify-center bg-brand-ink/60 p-3"><form onSubmit={guardar} className="w-full max-w-lg space-y-4 rounded-3xl border border-brand-border bg-brand-card p-5"><h2 className="font-display text-xl font-bold">Identificar cupo {cupo.cupo_numero}</h2><p className="text-sm">Pieza #{cupo.habitacion_numero} · Cama {cupo.cama_numero}. Se conserva esta reserva.</p>
    {personas.length>0&&<div><label htmlFor="cupo-persona" className="mb-2 block font-bold">Persona de la nómina</label><select id="cupo-persona" disabled={guardando} value={existente} onChange={e=>setExistente(e.target.value)} className="w-full rounded-xl border border-brand-border bg-white p-3"><option value="">Agregar una persona nueva</option>{personas.map(t=><option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>}
    {!existente&&<div><label htmlFor="cupo-nombre" className="mb-2 block font-bold">Nombre y apellido reales</label><input id="cupo-nombre" autoFocus required disabled={guardando} value={nombre} onChange={e=>setNombre(e.target.value)} className="w-full rounded-xl border border-brand-border bg-white p-3"/></div>}
    {error&&<AvisoInterfaz tono="error">{error}</AvisoInterfaz>}
    <div className="flex flex-col gap-2 sm:flex-row"><button type="button" disabled={guardando} onClick={onCerrar} className="rounded-xl border border-brand-border bg-white px-4 py-3 font-bold">Volver sin identificar</button><button disabled={guardando||(!existente&&!nombre.trim())} className="rounded-xl bg-brand-terracotta-deep px-4 py-3 font-bold text-white disabled:opacity-50">{guardando?"Vinculando…":"Vincular persona a esta cama"}</button></div>
  </form></Dialogo>;
}
