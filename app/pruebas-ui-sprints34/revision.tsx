import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "../src/index.css";
import { Piezas } from "../src/screens/Piezas";
import { ConsumoScreen } from "../src/screens/sprint2/ConsumoScreen";
import { ConciliacionScreen } from "../src/screens/sprint2/ConciliacionScreen";
import { CierreMensualModal } from "../src/screens/sprint2/CierreMensualModal";
import { ModuloConsumos } from "../src/screens/sprint2/ModuloConsumos";
import { ModuloEmpresas } from "../src/screens/sprint2/ModuloEmpresas";
import { ModuloCostos } from "../src/screens/sprint4/ModuloCostos";
import { DashboardAdmin } from "../src/screens/sprint4/DashboardAdmin";
import { RegistrarCompraModal } from "../src/screens/sprint4/RegistrarCompraModal";
import { InsumosHistorialModal } from "../src/screens/sprint4/InsumosHistorialModal";
import { SyncStatusModal } from "../src/components/SyncStatusModal";
import { SyncStatusBadge } from "../src/components/SyncStatusBadge";
import { parametros, usuarioId, contratoId, rol } from "./datos";

localStorage.setItem("pension_myriam_tour_completado_v1","true");
const vista=parametros.get("vista")??"consumos";
function Revision(){
  const [abierto,setAbierto]=useState(true);
  const cerrar=()=>setAbierto(false);
  const consumo=<ConsumoScreen usuarioId={usuarioId} contratoEmpresaId={contratoId} usuarioRol={rol} empresaNombre="Empresa de ejemplo Paposo" headcount={30}/>;
  let contenido:React.ReactNode;
  switch(vista){
    case "inicio":return <Piezas/>;
    case "consumos":contenido=consumo;break;
    case "seleccion_empresa":contenido=<ModuloConsumos usuarioId={usuarioId} usuarioRol={rol}/>;break;
    case "empresas":contenido=<ModuloEmpresas usuarioId={usuarioId}/>;break;
    case "conciliacion":contenido=<ConciliacionScreen usuarioId={usuarioId} contratoEmpresaId={contratoId}/>;break;
    case "cierre":contenido=abierto&&<CierreMensualModal contratoEmpresaId={contratoId} razonSocialEmpresa="Empresa de ejemplo Paposo" onCerrar={cerrar}/>;break;
    case "costos":contenido=<ModuloCostos usuarioId={usuarioId}/>;break;
    case "compra":contenido=abierto&&<RegistrarCompraModal usuarioId={usuarioId} onCerrar={cerrar}/>;break;
    case "historial":contenido=abierto&&<InsumosHistorialModal onCerrar={cerrar}/>;break;
    case "dashboard":contenido=<DashboardAdmin usuarioId={usuarioId}/>;break;
    case "rechazos":contenido=<><SyncStatusBadge/><button onClick={()=>setAbierto(true)}>Ver registros</button>{abierto&&<SyncStatusModal usuarioId={usuarioId} onCerrar={cerrar}/>}</>;break;
    default:contenido=consumo;
  }
  return <main className="min-h-screen bg-brand-sand p-4 md:p-6">{contenido}</main>;
}
ReactDOM.createRoot(document.getElementById("root")!).render(<Revision/>);
