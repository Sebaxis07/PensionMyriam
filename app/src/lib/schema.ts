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

// tipo_consumo: cama_noche | desayuno | almuerzo | cena | colacion
// (0008_ledger_tipos.sql). producto_extra_id solo se llena cuando
// tipo_consumo = 'colacion' (constraint colacion_requiere_producto).
// registrado_por puede quedar vacío SOLO para cama_noche — es el único
// tipo que se genera sin un clic humano detrás (pg_cron, ver
// 0009_conciliacion_por_tipo.sql).
const consumo = new Table({
  trabajador_id: column.text,
  tipo_consumo: column.text,
  recargo: column.real,
  producto_extra_id: column.text,
  fecha_hora: column.text,
  registrado_por: column.text,
  uuid_idempotente: column.text,
  consumo_corregido_id: column.text,
  justificacion_correccion: column.text,
  created_at: column.text
});

// Catálogo de extras con tarifa diferencial (HU-15) — la Administradora
// lo administra, el resto solo lo lee para mostrar nombre/precio.
const producto_extra = new Table({
  nombre: column.text,
  precio_unitario: column.real,
  created_at: column.text
});

// Qué tipos facturan por contrato completo (headcount) vs por consumo
// real — hoy: todos menos "colacion" (marcada como supuesto pendiente
// de confirmar, ver 0009_conciliacion_por_tipo.sql). Tabla chica, de
// solo lectura para la app.
const tipo_consumo_config = new Table({
  tipo: column.text,
  factura_por_contrato_completo: column.integer, // SQLite: boolean como 0/1
  nota: column.text
});

// Ahora por (contrato, fecha, TIPO) — antes era un solo agregado del
// día. "esperado" siempre es el headcount del contrato vigente, nunca
// el conteo de trabajadores realmente asignados/registrados.
const conciliacion_diaria = new Table({
  contrato_empresa_id: column.text,
  fecha: column.text,
  tipo: column.text,
  headcount_esperado: column.integer,
  cantidad_esperada: column.integer,
  cantidad_servida: column.integer,
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
  producto_extra,
  tipo_consumo_config,
  conciliacion_diaria,
  justificacion_descuadre
});

export type Database = (typeof AppSchema)["types"];
