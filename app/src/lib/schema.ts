import { Schema, Table, column } from "@powersync/web";

// Sprint 0: solo la tabla que necesita el criterio de cierre
// ("un registro creado offline aparece en Postgres al reconectar").
// El resto de las 16 tablas se agrega tabla por tabla en cada sprint,
// junto con las reglas de sincronización del servidor
// (infra/powersync/sync-rules.yaml), para no replicar al celular datos
// que ese rol no debería ver (ej. insumo/compra_insumo, decisión E).
const habitacion = new Table({
  numero: column.integer,
  capacidad: column.integer,
  estado: column.text,
  motivo_mantencion: column.text
});

export const AppSchema = new Schema({
  habitacion
});

export type Database = (typeof AppSchema)["types"];
