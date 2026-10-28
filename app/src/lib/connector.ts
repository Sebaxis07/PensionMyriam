import type { AbstractPowerSyncDatabase, PowerSyncBackendConnector } from "@powersync/web";
import { UpdateType } from "@powersync/web";
import { supabase } from "./supabase";
import { POWERSYNC_URL } from "./env";

// Tablas cuya PK real en Postgres no se llama "id" (ver comentario en
// uploadData). Se agrega una entrada acá si un sprint futuro suma otra
// tabla con el mismo patrón 1:1-sin-surrogate.
const PK_POR_TABLA: Record<string, string> = {
  checkout: "checkin_id"
};

export type ClasificacionError =
  | "transitorio"
  | "duplicado_idempotente"
  | "rechazo_permanente";

/**
 * HU-28/HU-42: no todo error permanente (4xx/23xxx/42xxx/PGRST) significa
 * lo mismo. Un reintento de la MISMA operación (corte a mitad de envío)
 * choca contra el unique de `uuid_idempotente` con código 23505 — eso es
 * éxito disfrazado de error, no hay que avisar ni reintentar. Cualquier
 * OTRO error permanente (otra 23505 de negocio, 23P01 de solape, 23503,
 * 23514, 42xxx, PGRST, 4xx) es un rechazo real que la usuaria debe poder
 * ver después, no algo para descartar en silencio.
 * Función pura (sin I/O) para poder probarla sin mockear PowerSync.
 */
export function clasificarErrorSync(opError: any): ClasificacionError {
  const status = Number(opError?.status ?? opError?.statusCode);
  const code = String(opError?.code ?? "");
  const mensaje = String(opError?.message ?? "");

  const esErrorPermanente =
    (status >= 400 && status < 500) ||
    code.startsWith("23") || // 23503 (FK), 23505 (unique), 23P01 (exclusion), 23514 (check)
    code.startsWith("42") || // error de esquema o sintaxis
    code.startsWith("PGRST"); // error de validación de PostgREST

  if (!esErrorPermanente) return "transitorio";

  // Postgres nombra el constraint autogenerado "<tabla>_uuid_idempotente_key"
  // (ver db/migrations/0001_init.sql) y SIEMPRE lo incluye en el mensaje
  // de duplicate key — es la forma confiable de distinguir "ya se aplicó,
  // esto es un reintento" de cualquier otro unique/exclusion de negocio.
  if (code === "23505" && mensaje.includes("uuid_idempotente")) {
    return "duplicado_idempotente";
  }

  return "rechazo_permanente";
}

/**
 * Conector de subida: PowerSync mantiene la cola local (offline-first,
 * RNF-02); este conector es lo único que sabe cómo empujarla al
 * backend vía PostgREST cuando hay señal. Si `uploadData` lanza, la
 * transacción se reintenta más tarde — no se pierde (RNF-06).
 */
export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      return null;
    }
    return {
      endpoint: POWERSYNC_URL,
      token: data.session.access_token
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    // HU-22: insumo.costo_promedio/cantidad_total SOLO debe recalcularlos
    // el trigger app.recalcular_costo_promedio() al insertar en
    // compra_insumo (0001_init.sql) — esa es la ÚNICA fuente de verdad
    // del Promedio Móvil Ponderado. El cliente escribe localmente ese
    // mismo cálculo en insumo (espejo optimista, para ver el costo
    // actualizado al instante sin conexión — ver registrarCompraInsumo.ts),
    // pero esa escritura nunca debe llegar intacta al servidor: el rol
    // "authenticated" SÍ tiene permiso de escribir insumo (Supabase
    // otorga privilegios amplios por defecto; la restricción real la
    // pone RLS, que para la Administradora permite escribir) — así que
    // si se sincronizara tal cual, el trigger del INSERT en
    // compra_insumo volvería a sumar la MISMA compra sobre un insumo que
    // el cliente ya había actualizado, contándola DOS VECES. Esto pasa
    // en DOS formas distintas, confirmadas ambas en
    // db/pgtap/10_pmp_insumo.sql:
    //   (a) insumo EXISTENTE: el cliente emite un PATCH con el PMP ya
    //       recalculado — se omite por completo, el insert en
    //       compra_insumo basta.
    //   (b) insumo NUEVO: el cliente emite un PUT (insert) con
    //       cantidad_total/costo_promedio ya iguales a esta primera
    //       compra (no hay insumo previo con el que promediar) — ese
    //       insert SÍ debe llegar (compra_insumo.insumo_id es FK y
    //       exige que la fila exista), pero con cantidad_total=0 y
    //       costo_promedio=0, para que el trigger arranque desde cero y
    //       calcule él solo el valor correcto a partir de la compra.
    const haySuCompraEnEstaTransaccion = transaction.crud.some((o) => o.table === "compra_insumo");
    let ingresoRechazadoPorCancelacion = false;

    try {
      for (const op of transaction.crud) {
        if (ingresoRechazadoPorCancelacion && op.table === "habitacion" && op.op === UpdateType.PATCH) continue;
        // (a) insumo EXISTENTE: el PATCH con el PMP ya recalculado nunca
        // es una escritura legítima para sincronizar — el trigger es la
        // única fuente de verdad, así que se omite siempre, sin importar
        // si esta transacción puntual trae o no su compra_insumo.
        if (op.table === "insumo" && op.op === UpdateType.PATCH) {
          continue;
        }
        // (b) insumo NUEVO: el insert sí debe llegar (FK de
        // compra_insumo.insumo_id), pero solo se fuerza a cero cuando
        // viene junto a su primera compra en la MISMA transacción — si
        // alguna vez existiera una creación de catálogo sin compra
        // asociada, sus valores iniciales no deben tocarse.
        if (op.table === "insumo" && op.op === UpdateType.PUT && haySuCompraEnEstaTransaccion) {
          op.opData = { ...(op.opData ?? {}), cantidad_total: 0, costo_promedio: 0 };
        }

        const table = supabase.from(op.table);
        const pk = PK_POR_TABLA[op.table] ?? "id";
        try {
          switch (op.op) {
            case UpdateType.PUT:
              await table
                .upsert(pk === "id" ? { ...(op.opData ?? {}), id: op.id } : { ...(op.opData ?? {}) }, {
                  onConflict: pk
                })
                .throwOnError();
              break;
            case UpdateType.PATCH:
              await table.update(op.opData ?? {}).eq(pk, op.id).throwOnError();
              break;
            case UpdateType.DELETE:
              await table.delete().eq(pk, op.id).throwOnError();
              break;
          }
        } catch (opError: any) {
          const clasificacion = clasificarErrorSync(opError);

          if (clasificacion === "transitorio") {
            // Error de red o 5xx del servidor: re-lanzar para que PowerSync
            // reintente la transacción completa más tarde (RNF-06).
            throw opError;
          }

          if (clasificacion === "duplicado_idempotente") {
            // Esta operación ya se aplicó en un envío anterior (corte a
            // mitad de sincronización); no es un rechazo, es el caso
            // exitoso de la idempotencia. No se avisa a la usuaria.
            continue;
          }

          // Un segundo teléfono pudo registrar la llegada mientras este
          // cancelaba sin señal. Se recupera el estado autorizado antes
          // de completar la cola; si falla la lectura, se reintenta.
          if (op.table === "reserva" && op.op === UpdateType.PATCH && op.opData?.estado === "cancelada") {
            const { data, error } = await supabase.from("reserva")
              .select("estado,motivo_cancelacion,cancelada_por,cancelada_en,uuid_cancelacion")
              .eq("id", op.id).single();
            if (error || !data) throw error ?? new Error("No se pudo recuperar la reserva.");
            await database.execute(
              "update reserva set estado = ?, motivo_cancelacion = ?, cancelada_por = ?, cancelada_en = ?, uuid_cancelacion = ? where id = ?",
              [data.estado, data.motivo_cancelacion, data.cancelada_por, data.cancelada_en, data.uuid_cancelacion, op.id]
            );
          }
          if (op.table === "checkin" && /reserva no está confirmada/i.test(String(opError?.message))) {
            ingresoRechazadoPorCancelacion = true;
            const reservaId = String(op.opData?.reserva_id ?? "");
            const { data: reserva, error: errorReserva } = await supabase.from("reserva").select("cama_id").eq("id", reservaId).single();
            if (errorReserva) throw errorReserva;
            const { data: cama, error: errorCama } = await supabase.from("cama").select("habitacion_id").eq("id", reserva!.cama_id).single();
            if (errorCama) throw errorCama;
            const { data: habitacion, error: errorHabitacion } = await supabase.from("habitacion").select("estado").eq("id", cama!.habitacion_id).single();
            if (errorHabitacion) throw errorHabitacion;
            await database.execute("delete from checkin where id = ?", [op.id]);
            await database.execute("update habitacion set estado = ? where id = ?", [habitacion!.estado, cama!.habitacion_id]);
          }

          // Rechazo permanente genuino (HU-42): no queda solo en consola.
          // Se guarda en la tabla local operacion_rechazada para que la
          // Administradora pueda revisarlo después — el dato no
          // desaparece sin dejar aviso. La interfaz es mínima (ver
          // useOperacionesRechazadas.ts); la especificación visual
          // completa queda pendiente para Codex (ver informe).
          try {
            await database.execute(
              `insert into operacion_rechazada (id, tabla, operacion, motivo, datos_json, fecha_hora, resuelta)
               values (?, ?, ?, ?, ?, ?, 0)`,
              [
                crypto.randomUUID(),
                op.table,
                op.op,
                String(opError?.message ?? opError),
                JSON.stringify(op.opData ?? {}),
                new Date().toISOString()
              ]
            );
          } catch (errorAlGuardarRechazo) {
            console.error(
              "[PowerSync] No se pudo guardar evidencia del rechazo en operacion_rechazada:",
              errorAlGuardarRechazo
            );
          }

          // "El dato local se revierte" (HU-42): el único caso ya
          // validado de rechazo permanente no-duplicado es el EXCLUDE de
          // reserva (23P01, cama ocupada por otro — mismo conflicto que
          // asignarTrabajador ya intenta evitar antes de escribir, pero
          // puede igual ocurrir entre dos dispositivos que escribieron
          // sin verse). Revertir acá solo ese caso conocido y verificado
          // (ver db/pgtap/05_exclude_reserva_cama.sql), en vez de un
          // rollback genérico por tabla que adivinaría relaciones no
          // validadas para otras tablas.
          if (op.table === "reserva" && String(opError?.code ?? "") === "23P01") {
            const trabajadorId = String(op.opData?.trabajador_id ?? "");
            const camaRechazada = String(op.opData?.cama_id ?? "");
            try {
              await database.writeTransaction(async (tx) => {
                await tx.execute("delete from reserva where id = ?", [op.id]);
                if (trabajadorId) {
                  await tx.execute(
                    "update trabajador set cama_id = null where id = ? and cama_id = ?",
                    [trabajadorId, camaRechazada]
                  );
                }
              });
            } catch {
              // Si la reversión falla, el rechazo ya quedó registrado
              // arriba — no se pierde evidencia, solo no se limpió el
              // estado local optimista de inmediato.
            }
          }

          console.warn(
            `[PowerSync] Rechazo permanente en ${op.table} (${op.op}), guardado en operacion_rechazada:`,
            opError?.message || opError
          );
        }
      }
      await transaction.complete();
    } catch (err) {
      console.error("[PowerSync] Error subiendo transacción (se reintentará):", err);
      throw err;
    }
  }
}
