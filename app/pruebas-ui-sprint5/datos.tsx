import { useSyncExternalStore } from "react";
import * as anterior from "../pruebas-ui-sprints34/datos";
export { usuarioId, contratoId, rol, PowerSyncContext, connectPowerSync, useCierreMensual, useDashboardAdminMetricas } from "../pruebas-ui-sprints34/datos";
const estado = new URLSearchParams(location.search).get("estado");
let revision = 0;
const escuchas = new Set<() => void>();
const notificar = () => { revision++; escuchas.forEach(fn => fn()); };
const config = { id: "singleton", nombre_pension: "Pensión de ejemplo", whatsapp_contacto: "+56 9 0000 0000", correo_contacto_arco: "contacto@example.invalid", banco_nombre: "Banco de ejemplo", tipo_cuenta: "Cuenta de ejemplo", titular_nombre: "Titular de ejemplo", rut_titular: "RUT de ejemplo", tarifa_base_noche: 15000, dias_gracia_anonimizacion: 7 };
const cuentas = [{ id: anterior.usuarioId, auth_uid: anterior.usuarioId, nombre: "Administradora de ejemplo", email: "administradora@example.invalid", rol: "administradora", created_at: "2026-10-01T12:00:00Z" }];
const persona = { id: "91000000-0000-4000-8000-000000000001", nombre: "Persona de ejemplo", rut: null, tipo: "trabajador", anonimizado_at: null };
let cierres: unknown[] = estado === "cerrado" ? [{ id: "ejemplo", cerrado_at: "2026-10-20T12:00:00Z" }] : [];
const vacio: never[] = [];
function datos(sql: string): unknown[] | undefined {
  if (sql.includes("count(distinct c.trabajador_id)")) return ["desayuno","almuerzo","cena","colacion","cama_noche"].map(tipo_consumo => ({ tipo_consumo, total: tipo_consumo === "colacion" ? 0 : 1 }));
  if (sql.includes("from config_negocio")) return [config];
  if (sql.includes("from cierre_facturacion")) return cierres;
  if (sql.includes("from usuario")) return estado === "vacio" ? vacio : cuentas;
  if (sql.includes("from trabajador") && sql.includes("nombre like")) return estado === "vacio" ? vacio : [persona];
  if (sql.includes("from reserva") && sql.includes("huesped_nombre like")) return vacio;
}
export function useQuery<T>(sql: string, args: unknown[] = []) {
  useSyncExternalStore(fn => { escuchas.add(fn); return () => { escuchas.delete(fn); }; }, () => revision);
  const respaldo = anterior.useQuery<T>(sql, args);
  return { ...respaldo, data: (datos(sql) as T[] | undefined) ?? respaldo.data, isLoading: estado === "cargando" };
}
export const powersync = { ...anterior.powersync,
  async getAll<T>(sql: string, args: unknown[] = []): Promise<T[]> { return (datos(sql) as T[] | undefined) ?? anterior.powersync.getAll<T>(sql, args); },
  async execute(sql: string, args: unknown[] = []) {
    if (estado === "error" || estado === "error-cierre") throw new Error("PGRST: SQL permission denied 42501");
    if (estado === "guardando") return new Promise<{rowsAffected:number}>(() => {});
    if (sql.includes("update config_negocio")) { [config.nombre_pension, config.whatsapp_contacto, config.correo_contacto_arco, config.banco_nombre, config.tipo_cuenta, config.titular_nombre, config.rut_titular, config.tarifa_base_noche, config.dias_gracia_anonimizacion] = args as [string,string,string,string,string,string,string,number,number]; notificar(); return {rowsAffected:1}; }
    if (sql.includes("insert into cierre_facturacion")) { cierres = [{ id: args[0], cerrado_at: args[6] }]; notificar(); return {rowsAffected:1}; }
    return anterior.powersync.execute(sql, args);
  }
};
export const supabase = { ...anterior.supabase,
  async rpc(nom: string) {
    if (estado === "guardando") return new Promise<any>(() => {});
    if (estado === "error") return { data: null, error: { message: "PGRST: SQL permission denied 42501", code: "PGRST000" } };
    if (nom === "atender_derecho_supresion") return { data: { ok: true, ya_estaba_anonimizado: estado === "anonimizado", filas_afectadas: 1 }, error: null };
    return { data: true, error: null };
  }
};
