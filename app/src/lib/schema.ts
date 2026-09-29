import { Schema, Table, column } from "@powersync/web";

// Sprint 1: ciclo de vida completo de habitaciones (EP-02) + reserva de
// turista (HU-01). No incluye trabajador/contrato_empresa/consumo — esas
// llegan con Sprint 2 (EP-03), junto con sus propias reglas de
// sincronización (infra/powersync/config.yaml). Los nombres y tipos
// siguen 1:1 a db/migrations/0001_init.sql; los uuid/fecha/timestamp de
// Postgres se replican como texto (PowerSync/SQLite no tiene esos tipos
// nativos).
// Solo para resolver el propio usuario.id a partir de auth_uid (ver
// useUsuarioActual) — no se lista ni edita a otras personas con esto.
const usuario = new Table({
  auth_uid: column.text,
  rol: column.text,
  nombre: column.text,
  created_at: column.text
});

const habitacion = new Table({
  numero: column.integer,
  capacidad: column.integer,
  estado: column.text,
  motivo_mantencion: column.text
});

const cama = new Table({
  habitacion_id: column.text,
  numero: column.integer
});

const reserva = new Table({
  tipo_cliente: column.text,
  cama_id: column.text,
  huesped_nombre: column.text,
  trabajador_id: column.text,
  contrato_empresa_id: column.text,
  fecha_inicio: column.text,
  fecha_fin: column.text,
  estado: column.text,
  creado_por: column.text,
  uuid_idempotente: column.text,
  created_at: column.text
});

const checkin = new Table({
  reserva_id: column.text,
  realizado_por: column.text,
  fecha_hora: column.text,
  uuid_idempotente: column.text
});

// PK real en Postgres es checkin_id (sin columna "id" propia); el select
// de infra/powersync/config.yaml alias ese valor como "id" para
// PowerSync, y lo deja también disponible acá como columna normal para
// poder buscar/filtrar por él.
const checkout = new Table({
  checkin_id: column.text,
  realizado_por: column.text,
  fecha_hora: column.text,
  uuid_idempotente: column.text
});

const aseo = new Table({
  habitacion_id: column.text,
  tipo: column.text,
  responsable: column.text,
  fecha_hora: column.text,
  uuid_idempotente: column.text
});

// Sprint 2 (EP-03): empresas, nómina y libro de consumos.
const empresa = new Table({
  razon_social: column.text,
  rut: column.text,
  contacto: column.text,
  created_at: column.text
});

// tarifa_convenida llega SOLO al dispositivo de administradora (bucket
// empresa_tarifas, ver infra/powersync/config.yaml) — en el celular de
// la Encargada esta columna queda simplemente vacía, nunca se
// sincroniza. No asumir que siempre tiene valor.
const contrato_empresa = new Table({
  empresa_id: column.text,
  vigencia_desde: column.text,
  vigencia_hasta: column.text,
  headcount: column.integer,
  tarifa_convenida: column.real,
  creado_por: column.text,
  created_at: column.text
});

const trabajador = new Table({
  contrato_empresa_id: column.text,
  nombre: column.text,
  rut: column.text,
  cama_id: column.text,
  anonimizado_at: column.text,
  created_at: column.text
});

const consumo = new Table({
  trabajador_id: column.text,
  tipo_racion: column.text,
  recargo: column.real,
  fecha_hora: column.text,
  registrado_por: column.text,
  uuid_idempotente: column.text,
  consumo_corregido_id: column.text,
  justificacion_correccion: column.text,
  created_at: column.text
});

const conciliacion_diaria = new Table({
  contrato_empresa_id: column.text,
  fecha: column.text,
  headcount_esperado: column.integer,
  raciones_esperadas: column.integer,
  raciones_servidas: column.integer,
  estado: column.text,
  calculado_at: column.text
});

const justificacion_descuadre = new Table({
  conciliacion_diaria_id: column.text,
  motivo: column.text,
  supervisor_nombre: column.text,
  supervisor_anonimizado_at: column.text,
  registrado_por: column.text,
  created_at: column.text
});

export const AppSchema = new Schema({
  usuario,
  habitacion,
  cama,
  reserva,
  checkin,
  checkout,
  aseo,
  empresa,
  contrato_empresa,
  trabajador,
  consumo,
  conciliacion_diaria,
  justificacion_descuadre
});

export type Database = (typeof AppSchema)["types"];
