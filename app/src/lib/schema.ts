import { Schema, Table, column } from "@powersync/web";

// Sprint 1: ciclo de vida completo de habitaciones (EP-02) + reserva de
// turista (HU-01). No incluye trabajador/contrato_empresa/consumo — esas
// llegan con Sprint 2 (EP-03), junto con sus propias reglas de
// sincronización (infra/powersync/config.yaml). Los nombres y tipos
// siguen 1:1 a db/migrations/0001_init.sql; los uuid/fecha/timestamp de
// Postgres se replican como texto (PowerSync/SQLite no tiene esos tipos
// nativos).
// En el celular de la Encargada llega EXACTAMENTE su propia fila (para
// resolver su usuario.id al escribir realizado_por/responsable); en el de
// la Administradora llega el directorio completo, que es lo que muestra
// la pestaña Cuentas de HU-36. Eso lo deciden dos buckets excluyentes por
// rol en infra/powersync/config.yaml — hasta el Sprint 5 un `select *`
// global replicaba la tabla entera a los dos celulares.
const usuario = new Table({
  auth_uid: column.text,
  rol: column.text,
  nombre: column.text,
  // HU-36 pide mostrar el correo; vive acá (y no solo en auth.users)
  // porque auth.users no se replica — ver 0017_seguridad_cuentas.sql.
  email: column.text,
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
  cupo_numero: column.integer,
  uuid_identificacion: column.text,
  motivo_cancelacion: column.text,
  cancelada_por: column.text,
  cancelada_en: column.text,
  uuid_cancelacion: column.text,
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

// Sprint 4 (EP-04): Control de costos de insumos y compras (PMP).
const insumo = new Table({
  nombre: column.text,
  categoria: column.text,
  unidad_medida: column.text,
  costo_promedio: column.real,
  cantidad_total: column.real
});

const compra_insumo = new Table({
  insumo_id: column.text,
  categoria: column.text,
  monto_total: column.real,
  cantidad: column.real,
  rendimiento_estimado: column.real,
  fecha: column.text,
  registrado_por: column.text,
  uuid_idempotente: column.text,
  created_at: column.text,
  // Migración 0024: detalle real del comprobante (proveedor, medio de
  // pago, N° de boleta/factura, desglose neto/IVA). Todos opcionales:
  // no toda compra trae un comprobante con ese nivel de detalle.
  proveedor: column.text,
  descripcion: column.text,
  medio_pago: column.text,
  referencia_comprobante: column.text,
  monto_neto: column.real,
  monto_iva: column.real,
  observaciones: column.text
});

// Sprint 5 (HU-39): parámetros del negocio que la Administradora edita
// (contacto, tarifa base por noche, datos de transferencia) más el plazo
// de gracia de anonimización de HU-33. Fila única, id = 'singleton'.
// Replicada a los DOS celulares porque el voucher PDF y el mensaje de
// WhatsApp se arman desde la réplica local, también sin señal; editarla
// sigue siendo exclusivo de la Administradora (RLS config_negocio_update).
const config_negocio = new Table({
  nombre_pension: column.text,
  whatsapp_contacto: column.text,
  correo_contacto_arco: column.text,
  banco_nombre: column.text,
  tipo_cuenta: column.text,
  titular_nombre: column.text,
  rut_titular: column.text,
  tarifa_base_noche: column.real,
  dias_gracia_anonimizacion: column.integer,
  actualizado_por: column.text,
  updated_at: column.text
});

// Sprint 5 (HU-33): el cierre de facturación de un período. Es el hecho
// que arranca el plazo de retención de datos personales (la purga de
// pg_cron cuenta los días desde `cerrado_at`). Lleva total_facturado, así
// que solo se replica al celular de la Administradora (bucket
// cierre_facturacion_administradora) — en el de la Encargada esta tabla
// queda simplemente vacía.
const cierre_facturacion = new Table({
  contrato_empresa_id: column.text,
  periodo_anio: column.integer,
  periodo_mes: column.integer,
  total_facturado: column.real,
  cerrado_por: column.text,
  cerrado_at: column.text,
  uuid_idempotente: column.text
});

// Tabla SOLO LOCAL (no sincroniza, PowerSync nunca la sube ni la baja):
// evidencia recuperable de operaciones que el servidor rechazó de forma
// permanente al sincronizar (HU-28/HU-42). Antes de esto, un rechazo
// permanente solo dejaba un console.warn y la fila desaparecía sin
// rastro para la usuaria — ver connector.ts.
const operacion_rechazada = new Table(
  {
    tabla: column.text,
    operacion: column.text,
    motivo: column.text,
    datos_json: column.text,
    fecha_hora: column.text,
    // HU-42: "la Administradora revisa el resumen y puede resolverlo" —
    // marca manual de que ya se hizo cargo del rechazo (ej. reasignó la
    // cama). No borra la fila: el rechazo sigue siendo evidencia
    // auditable, solo deja de pedir atención.
    resuelta: column.integer,
    resuelta_por: column.text,
    resuelta_en: column.text
  },
  { localOnly: true }
);

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
  justificacion_descuadre,
  insumo,
  compra_insumo,
  config_negocio,
  cierre_facturacion,
  operacion_rechazada
});

export type Database = (typeof AppSchema)["types"];
