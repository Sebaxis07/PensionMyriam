import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "../src/index.css";
import { Piezas } from "../src/screens/Piezas";
import { Reservar } from "../src/screens/Reservar";
import { AseoHoy } from "../src/screens/AseoHoy";
import { RackHotelero } from "../src/screens/RackHotelero";
import { ContratoScreen } from "../src/screens/sprint2/ContratoScreen";
import { EmpresasScreen } from "../src/screens/sprint2/EmpresasScreen";
import { NominaScreen } from "../src/screens/sprint2/NominaScreen";
import { ModuloEmpresas } from "../src/screens/sprint2/ModuloEmpresas";
import { SyncStatusBadge } from "../src/components/SyncStatusBadge";
import { SyncStatusModal } from "../src/components/SyncStatusModal";
import { RoomSheet } from "../src/components/RoomSheet";
import { habitaciones, parametros, usuarioId, contratoId, empresaId } from "./datos";

localStorage.setItem("pension_myriam_tour_completado_v1", "true");
const vista = parametros.get("vista") ?? "habitaciones";
function Revision() {
  const [abierto, setAbierto] = React.useState(true);
  const cerrar = () => setAbierto(false);
  if (vista === "habitaciones") return <Piezas />;
  const piezas = { ingreso: habitaciones[0], salida: habitaciones[1], mantencion: habitaciones[3], aseo_pieza: habitaciones[2] };
  let pantalla: React.ReactNode;
  switch(vista) {
    case "reserva": pantalla=<Reservar usuarioId={usuarioId} onListo={cerrar}/>; break;
    case "contrato": pantalla=<ContratoScreen usuarioId={usuarioId} empresaIdInicial={empresaId}/>; break;
    case "empresas": pantalla=<EmpresasScreen/>; break;
    case "nomina": pantalla=<NominaScreen usuarioId={usuarioId} contratoEmpresaId={contratoId}/>; break;
    case "modulo_empresas": pantalla=<ModuloEmpresas usuarioId={usuarioId}/>; break;
    case "aseo": pantalla=<AseoHoy usuarioId={usuarioId}/>; break;
    case "calendario": pantalla=<RackHotelero onSeleccionarParaReservar={()=>{}}/>; break;
    case "sync": pantalla=<><SyncStatusBadge/><button onClick={()=>setAbierto(true)}>Abrir estado</button>{abierto&&<SyncStatusModal usuarioId={usuarioId} onCerrar={cerrar}/>}</>; break;
    default: pantalla=abierto && <RoomSheet pieza={piezas[vista as keyof typeof piezas] ?? habitaciones[0]} usuarioId={usuarioId} onClose={cerrar} onIrAReservar={cerrar}/>;
  }
  return <main className="min-h-screen bg-brand-sand p-4 md:p-8">{pantalla}</main>;
}
ReactDOM.createRoot(document.getElementById("root")!).render(<Revision/>);
