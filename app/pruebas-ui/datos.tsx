import { createContext } from "react";
import { fechaHoySantiago, sumarDiasYMD } from "../src/lib/fechaNegocio";

export const parametros = new URLSearchParams(location.search);
export const escenario = parametros.get("estado") ?? "normal";
const hoy = fechaHoySantiago();
export const empresaId = "10000000-0000-4000-8000-000000000001";
export const usuarioId = "20000000-0000-4000-8000-000000000001";
export const contratoId = "30000000-0000-4000-8000-000000000001";
export const habitaciones = Array.from({ length: 8 }, (_, i) => ({
  id: `40000000-0000-4000-8000-00000000000${i+1}`, numero: i+1, capacidad: i === 5 ? 4 : 2,
  estado: ["disponible", "ocupada", "en_aseo", "en_mantencion", "disponible", "ocupada", "disponible", "disponible"][i],
  motivo_mantencion: i === 3 ? "Reparación de cañería del baño" : null,
  reserva_id: i === 0 ? "50000000-0000-4000-8000-000000000001" : null,
  reserva_nombre: i === 0 ? "Carla Fuentes (ejemplo)" : null,
  reserva_tipo: "turista", checkin_activo_id: i === 1 ? "60000000-0000-4000-8000-000000000001" : null,
  huesped_actual: i === 1 ? "Laura González (ejemplo)" : i === 5 ? "Manuel Rojas (ejemplo)" : null,
  tipo_cliente_actual: i === 5 ? "empresa" : "turista", ultimo_huesped: "Huésped de ejemplo",
  aseo_hoy_count: i === 5 ? 1 : 0, ultimo_aseo_fecha: i === 5 ? new Date().toISOString() : null
}));
if (escenario === "aseo-masivo") {
  habitaciones[7].estado = "ocupada";
  habitaciones[7].huesped_actual = "Ana (ejemplo)";
}
const camas = habitaciones.map(h => ({ id: `70000000-0000-4000-8000-00000000000${h.numero}`, numero: 1, habitacion_id: h.id }));
const empresas = [{ id: empresaId, razon_social: "Empresa de ejemplo Paposo", rut: null, contacto: "Contacto de ejemplo", contrato_id: contratoId, headcount: 30, tarifa_convenida: 25000, vigencia_desde: hoy, vigencia_hasta: null, total_trabajadores: 2, camas_asignadas: 1 }];
const usuario = { id: usuarioId, nombre: "María (demostración)", rol: "administradora" };
const trabajadores = [
  { id: "80000000-0000-4000-8000-000000000001", nombre: "Manuel Rojas (ejemplo)", cama_id: camas[5].id, contrato_empresa_id: contratoId, habitacion_numero: 6, cama_numero: 1, rut: null },
  { id: "80000000-0000-4000-8000-000000000002", nombre: "Pedro Gómez (ejemplo)", cama_id: null, contrato_empresa_id: contratoId, rut: null }
];
const reservas = [{ id: "90000000-0000-4000-8000-000000000001", cama_id: camas[1].id, habitacion_id: habitaciones[1].id, huesped_nombre: "Laura González (ejemplo)", ocupante: "Laura González (ejemplo)", tipo_cliente: "turista", fecha_inicio: hoy, fecha_fin: sumarDiasYMD(hoy, 3), estado: "en_curso" }];
const vacio: never[] = [];
export function datos(sql: string): unknown[] {
  if (escenario === "vacio") return vacio;
  if (sql.includes("from operacion_rechazada")) return vacio;
  if (sql.includes("auth_uid =") || sql.includes("from usuario order")) return [usuario];
  if (sql.includes("from empresa e")) return empresas;
  if (sql.includes("from empresa where")) return empresas;
  if (sql.includes("from contrato_empresa")) return [{ id: contratoId, empresa_id: empresaId, vigencia_desde: hoy, vigencia_hasta: null, headcount: 30, tarifa_convenida: 25000 }];
  if (sql.includes("from trabajador t") && sql.includes("where t.contrato_empresa_id")) return trabajadores;
  if (sql.includes("from cama c") && sql.includes("select c.id as cama_id")) return camas.filter(c => c.numero === 1).map(c => ({ cama_id: c.id, habitacion_id: c.habitacion_id, numero: habitaciones.find(h=>h.id===c.habitacion_id)!.numero, capacidad: 2 }));
  if (sql.includes("from cama order")) return camas;
  if (sql.includes("from habitacion")) return habitaciones;
  if (sql.includes("from reserva r") && !sql.includes("select\n  h.id") && !sql.includes("select h.id")) return reservas;
  if (sql.includes("from habitacion")) return habitaciones;
  return vacio;
}

export function useQuery<T>(sql: string, _parametros?: unknown[]) {
  return { data: datos(sql) as T[], isLoading: escenario === "cargando", error: null };
}
export const PowerSyncContext = createContext(null);
const conectado = !["sin-red", "sin-red-pendientes"].includes(escenario);
const pendientes = ["sin-red-pendientes", "pendientes", "enviando", "error-sync"].includes(escenario) ? 3 : 0;
export const operaciones: {sql:string; argumentos:unknown[]}[] = [];
export const powersync = {
  currentStatus: { connected: conectado, lastSyncedAt: new Date(), dataFlowStatus: { uploading: escenario === "enviando", uploadError: escenario === "error-sync" ? new Error("Error ficticio de conexión") : undefined } },
  registerListener: (_listener: unknown) => () => {},
  async getAll<T>(sql: string, _argumentos?: unknown[]) {
    if (sql.includes("ps_crud")) return [{ n: pendientes }] as T[];
    if (sql.includes("from contrato_empresa")) return [] as T[];
    return datos(sql) as T[];
  },
  async execute(sql: string, argumentos: unknown[] = []) {
    operaciones.push({sql, argumentos});
    if (escenario === "error") throw new Error("No se pudo guardar el registro de ejemplo. Intenta nuevamente.");
    if (escenario === "guardando") return new Promise(() => {});
    return { rowsAffected: 1 };
  },
  async writeTransaction(accion: (tx: typeof powersync) => Promise<void>): Promise<void> { await accion(powersync); }
};
export async function connectPowerSync() {}
export const supabase = { auth: {
  async getSession() { return { data: { session: { user: { id: usuarioId } } } }; },
  async signOut() {}, onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
}, async rpc() { return { data: null, error: null }; } };
