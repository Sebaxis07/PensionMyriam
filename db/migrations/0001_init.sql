-- =====================================================================
-- Sistema de Gestión – Pensión Señora Miriam
-- Migración 0001: esquema inicial (Sprint 0)
-- NO APLICAR sin aprobación explícita. Borrador para revisión.
--
-- Decisiones incorporadas (aprobadas 28-09-2026):
--   A: cama + capacidad de habitación
--   B/C: contrato_empresa con vigencia (headcount y tarifa versionados)
--   D: purga anonimiza trabajador y supervisor 7 días post-cierre;
--      nunca toca `consumo`
--   E: solo Administradora inserta en compra_insumo
--   F: sin tabla de pagos (fuera de alcance)
--   K: bitácora de sincronización por dispositivo (no cola remota)
--   L: estado de habitación (actual) separado de ocupación por rango
--      de fechas (se resuelve con consultas sobre `reserva`, no con
--      una tabla nueva)
--   N: todo corte de "día" en America/Santiago
-- =====================================================================

begin;

create extension if not exists "uuid-ossp";
create extension if not exists btree_gist; -- para EXCLUDE en contrato_empresa
create extension if not exists pg_cron;

-- La imagen supabase/postgres pre-crea "authenticator" y
-- "supabase_auth_admin" SIN contraseña asignada: hay que fijarla
-- nosotros para que PostgREST y GoTrue (infra/docker-compose.yml)
-- puedan autenticarse. Contraseñas fijas de desarrollo a propósito
-- (entorno local desechable, mismo criterio que powersync_replication
-- en 0002_powersync_setup.sql). En producción se reemplazan junto con
-- esta migración.
alter user authenticator with password 'dev_authenticator_password';
alter user supabase_auth_admin with password 'dev_supabase_auth_admin_password';

-- ---------------------------------------------------------------------
-- ENUMs
-- ---------------------------------------------------------------------
create type rol_usuario as enum ('administradora', 'encargada');

create type estado_habitacion as enum
  ('disponible', 'ocupada', 'en_aseo', 'en_mantencion');

create type estado_reserva as enum
  ('confirmada', 'cancelada', 'finalizada');

create type tipo_cliente as enum ('turista', 'empresa');

create type tipo_racion as enum
  ('desayuno', 'almuerzo', 'cena', 'colacion_extra', 'plato_especial');

create type estado_conciliacion as enum
  ('pendiente', 'conciliado', 'con_diferencia_justificada');

create type motivo_descuadre as enum
  ('turno_extra', 'almuerzo_mina', 'corte_ruta', 'ausencia_justificada', 'otro');

create type categoria_compra as enum
  ('carnes', 'verduras', 'abarrotes', 'gas_combustible', 'aseo', 'otro');

create type tipo_aseo as enum ('post_checkout', 'diario');

-- ---------------------------------------------------------------------
-- usuario: espejo de auth.users (GoTrue) + rol de negocio
-- ---------------------------------------------------------------------
create table public.usuario (
  id          uuid primary key default gen_random_uuid(),
  auth_uid    uuid not null unique references auth.users(id) on delete cascade,
  rol         rol_usuario not null,
  nombre      text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Helpers de RLS: leen el rol desde el JWT que emite GoTrue.
-- supabase-js manda el JWT en cada request; PostgREST lo expone via
-- current_setting('request.jwt.claims', true).
-- ---------------------------------------------------------------------
create schema if not exists app;

create or replace function app.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;

create or replace function app.rol() returns text
language sql stable as $$
  select u.rol::text
  from public.usuario u
  where u.auth_uid = app.uid()
$$;

create or replace function app.es_administradora() returns boolean
language sql stable as $$
  select app.rol() = 'administradora'
$$;

-- ---------------------------------------------------------------------
-- habitacion / cama
-- ---------------------------------------------------------------------
create table public.habitacion (
  id                 uuid primary key default gen_random_uuid(),
  numero             int not null unique,
  capacidad          int not null check (capacidad > 0),
  estado             estado_habitacion not null default 'disponible',
  motivo_mantencion  text,
  updated_at         timestamptz not null default now(),
  constraint motivo_solo_en_mantencion check (
    (estado = 'en_mantencion' and motivo_mantencion is not null)
    or (estado <> 'en_mantencion' and motivo_mantencion is null)
  )
);

create table public.cama (
  id             uuid primary key default gen_random_uuid(),
  habitacion_id  uuid not null references public.habitacion(id) on delete cascade,
  numero         int not null,
  unique (habitacion_id, numero)
);

-- ---------------------------------------------------------------------
-- empresa / contrato_empresa (headcount y tarifa VERSIONADOS)
-- ---------------------------------------------------------------------
create table public.empresa (
  id            uuid primary key default gen_random_uuid(),
  razon_social  text not null,
  rut           text unique,
  contacto      text,
  created_at    timestamptz not null default now()
);

create table public.contrato_empresa (
  id                 uuid primary key default gen_random_uuid(),
  empresa_id         uuid not null references public.empresa(id),
  vigencia_desde     date not null,
  vigencia_hasta     date,  -- null = contrato vigente
  headcount          int not null check (headcount > 0),
  tarifa_convenida   numeric(12, 2) not null check (tarifa_convenida >= 0),
  creado_por         uuid not null references public.usuario(id),
  created_at         timestamptz not null default now(),
  -- nunca dos vigencias solapadas para la misma empresa
  exclude using gist (
    empresa_id with =,
    daterange(vigencia_desde, coalesce(vigencia_hasta, 'infinity'::date), '[]') with &&
  )
);

create index on public.contrato_empresa (empresa_id, vigencia_desde);

-- ---------------------------------------------------------------------
-- trabajador (nómina de un contrato) — anonimizable por Ley 21.719
-- ---------------------------------------------------------------------
create table public.trabajador (
  id                   uuid primary key default gen_random_uuid(),
  contrato_empresa_id  uuid not null references public.contrato_empresa(id),
  nombre               text not null,
  rut                  text,
  cama_id              uuid references public.cama(id),
  anonimizado_at       timestamptz,
  created_at           timestamptz not null default now(),
  unique (contrato_empresa_id, cama_id)
);

-- ---------------------------------------------------------------------
-- reserva: turista (huesped_nombre) o empresa (trabajador_id)
-- ---------------------------------------------------------------------
create table public.reserva (
  id                   uuid primary key default gen_random_uuid(),
  tipo_cliente         tipo_cliente not null,
  cama_id              uuid not null references public.cama(id),
  huesped_nombre       text,          -- solo turista
  trabajador_id        uuid references public.trabajador(id),  -- solo empresa
  contrato_empresa_id  uuid references public.contrato_empresa(id),
  fecha_inicio         date not null,
  fecha_fin            date,
  estado               estado_reserva not null default 'confirmada',
  creado_por           uuid not null references public.usuario(id),
  uuid_idempotente     uuid not null unique,
  created_at           timestamptz not null default now(),
  constraint reserva_turista_o_empresa check (
    (tipo_cliente = 'turista' and huesped_nombre is not null
       and trabajador_id is null and contrato_empresa_id is null)
    or
    (tipo_cliente = 'empresa' and trabajador_id is not null
       and contrato_empresa_id is not null and huesped_nombre is null)
  ),
  constraint fechas_coherentes check (fecha_fin is null or fecha_fin >= fecha_inicio)
);

create index on public.reserva (cama_id, fecha_inicio, fecha_fin);

-- ---------------------------------------------------------------------
-- checkin / checkout: disparan la máquina de estados de habitacion
-- ---------------------------------------------------------------------
create table public.checkin (
  id                uuid primary key default gen_random_uuid(),
  reserva_id        uuid not null unique references public.reserva(id),
  realizado_por     uuid not null references public.usuario(id),
  fecha_hora        timestamptz not null default now(),
  uuid_idempotente  uuid not null unique
);

-- 1:1 con checkin -> checkin_id es la propia PK, sin surrogate id extra.
create table public.checkout (
  checkin_id        uuid primary key references public.checkin(id),
  realizado_por     uuid not null references public.usuario(id),
  fecha_hora        timestamptz not null default now(),
  uuid_idempotente  uuid not null unique
);

-- ---------------------------------------------------------------------
-- aseo: idempotente, dos motivos (post_checkout | diario)
-- ---------------------------------------------------------------------
create table public.aseo (
  id                uuid primary key default gen_random_uuid(),
  habitacion_id     uuid not null references public.habitacion(id),
  tipo              tipo_aseo not null,
  responsable       uuid not null references public.usuario(id),
  fecha_hora        timestamptz not null default now(),
  uuid_idempotente  uuid not null unique
);

-- ---------------------------------------------------------------------
-- consumo: LIBRO CONTABLE INMUTABLE (ledger). Nunca UPDATE/DELETE.
-- ---------------------------------------------------------------------
create table public.consumo (
  id                     uuid primary key default gen_random_uuid(),
  trabajador_id          uuid not null references public.trabajador(id),
  tipo_racion            tipo_racion not null,
  recargo                numeric(12, 2) not null default 0 check (recargo >= 0),
  fecha_hora             timestamptz not null default now(),
  registrado_por         uuid not null references public.usuario(id),
  uuid_idempotente       uuid not null unique,
  consumo_corregido_id   uuid references public.consumo(id),
  justificacion_correccion text,
  created_at             timestamptz not null default now(),
  constraint correccion_requiere_justificacion check (
    consumo_corregido_id is null or justificacion_correccion is not null
  )
);

create index on public.consumo (trabajador_id, fecha_hora);

-- ---------------------------------------------------------------------
-- conciliacion_diaria: hecho DERIVADO y recalculable (no es el ledger).
-- ---------------------------------------------------------------------
create table public.conciliacion_diaria (
  id                    uuid primary key default gen_random_uuid(),
  contrato_empresa_id   uuid not null references public.contrato_empresa(id),
  fecha                 date not null,
  headcount_esperado    int not null,
  raciones_esperadas    int not null,
  raciones_servidas     int not null,
  estado                estado_conciliacion not null default 'pendiente',
  calculado_at          timestamptz not null default now(),
  unique (contrato_empresa_id, fecha)
);

create table public.justificacion_descuadre (
  id                          uuid primary key default gen_random_uuid(),
  conciliacion_diaria_id      uuid not null references public.conciliacion_diaria(id),
  motivo                      motivo_descuadre not null,
  supervisor_nombre           text not null,
  supervisor_anonimizado_at   timestamptz,
  registrado_por              uuid not null references public.usuario(id),
  created_at                  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- insumo / compra_insumo: costeo por Promedio Móvil Ponderado.
-- compra_insumo es el histórico inmutable; insumo.costo_promedio se
-- recalcula por trigger, nunca se edita a mano.
-- ---------------------------------------------------------------------
create table public.insumo (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null unique,
  categoria       categoria_compra not null,
  unidad_medida   text not null,
  costo_promedio  numeric(12, 4) not null default 0,
  cantidad_total  numeric(12, 4) not null default 0  -- para el cálculo PMP
);

create table public.compra_insumo (
  id                     uuid primary key default gen_random_uuid(),
  insumo_id              uuid not null references public.insumo(id),
  categoria              categoria_compra not null,
  monto_total            numeric(12, 2) not null check (monto_total >= 0),
  cantidad               numeric(12, 4) not null check (cantidad > 0),
  rendimiento_estimado   numeric(12, 2),  -- raciones o camas-noche
  fecha                  date not null default (now() at time zone 'America/Santiago')::date,
  registrado_por         uuid not null references public.usuario(id),
  uuid_idempotente       uuid not null unique,
  created_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- bitacora_acceso_datos_personales: alcance acotado (KPI-08).
-- Registra sincronizaciones de nómina, exportaciones y purgas —
-- NO cada lectura local (PowerSync replica al celular por diseño).
-- ---------------------------------------------------------------------
create table public.bitacora_acceso_datos_personales (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references public.usuario(id),
  accion       text not null check (
    accion in ('carga_nomina', 'exportacion_pdf', 'exportacion_excel', 'purga_automatica')
  ),
  detalle      jsonb,
  fecha_hora   timestamptz not null default now()
);

-- =====================================================================
-- TRIGGERS: reglas críticas de negocio
-- =====================================================================

-- 1) Ledger inmutable: prohibir UPDATE/DELETE en consumo (RNF-03)
create or replace function app.bloquear_edicion_consumo() returns trigger
language plpgsql as $$
begin
  raise exception 'consumo es un libro contable inmutable: use una fila de corrección (consumo_corregido_id), no % directo', tg_op;
end;
$$;

create trigger consumo_sin_update
  before update on public.consumo
  for each row execute function app.bloquear_edicion_consumo();

create trigger consumo_sin_delete
  before delete on public.consumo
  for each row execute function app.bloquear_edicion_consumo();

-- 2) Máquina de estados de habitacion, disparada por checkin/checkout/aseo
create or replace function app.checkin_ocupa_habitacion() returns trigger
language plpgsql as $$
declare
  v_habitacion_id uuid;
  v_estado estado_habitacion;
begin
  select h.id, h.estado into v_habitacion_id, v_estado
  from public.cama c
  join public.habitacion h on h.id = c.habitacion_id
  join public.reserva r on r.cama_id = c.id
  where r.id = new.reserva_id;

  if v_estado <> 'disponible' then
    raise exception 'no se puede hacer check-in: la habitación no está Disponible (estado actual: %)', v_estado;
  end if;

  update public.habitacion
     set estado = 'ocupada', updated_at = now()
   where id = v_habitacion_id;

  return new;
end;
$$;

create trigger trg_checkin_ocupa
  after insert on public.checkin
  for each row execute function app.checkin_ocupa_habitacion();

create or replace function app.checkout_dispara_aseo() returns trigger
language plpgsql as $$
declare
  v_habitacion_id uuid;
begin
  select h.id into v_habitacion_id
  from public.checkin ci
  join public.reserva r on r.id = ci.reserva_id
  join public.cama c on c.id = r.cama_id
  join public.habitacion h on h.id = c.habitacion_id
  where ci.id = new.checkin_id;

  update public.habitacion
     set estado = 'en_aseo', updated_at = now()
   where id = v_habitacion_id;

  update public.reserva
     set estado = 'finalizada', fecha_fin = (new.fecha_hora at time zone 'America/Santiago')::date
   where id = (select reserva_id from public.checkin where id = new.checkin_id);

  return new;
end;
$$;

create trigger trg_checkout_aseo
  after insert on public.checkout
  for each row execute function app.checkout_dispara_aseo();

-- "Aseo completado" (tipo=post_checkout) => Disponible.
-- El aseo "diario" (tipo=diario) NO cambia el estado (la pieza sigue Ocupada).
create or replace function app.aseo_completado_libera_habitacion() returns trigger
language plpgsql as $$
begin
  if new.tipo = 'post_checkout' then
    update public.habitacion
       set estado = 'disponible', updated_at = now()
     where id = new.habitacion_id
       and estado = 'en_aseo';
  end if;
  return new;
end;
$$;

create trigger trg_aseo_completado
  after insert on public.aseo
  for each row execute function app.aseo_completado_libera_habitacion();

-- Nunca permitir pasar manualmente de Ocupada a Disponible sin pasar
-- por checkout+aseo (regla H del análisis): bloquear ese UPDATE directo.
create or replace function app.impedir_salto_estado_habitacion() returns trigger
language plpgsql as $$
begin
  if old.estado = 'ocupada' and new.estado = 'disponible' then
    raise exception 'una habitación Ocupada no puede pasar a Disponible sin Check-out y Aseo completado';
  end if;
  return new;
end;
$$;

create trigger trg_impedir_salto_estado
  before update of estado on public.habitacion
  for each row execute function app.impedir_salto_estado_habitacion();

-- 3) Costeo por Promedio Móvil Ponderado, recalculado en cada compra
create or replace function app.recalcular_costo_promedio() returns trigger
language plpgsql as $$
declare
  v_cantidad_previa numeric(12, 4);
  v_costo_previo    numeric(12, 4);
  v_nueva_cantidad  numeric(12, 4);
  v_nuevo_costo     numeric(12, 4);
begin
  select cantidad_total, costo_promedio into v_cantidad_previa, v_costo_previo
  from public.insumo where id = new.insumo_id
  for update;

  v_nueva_cantidad := v_cantidad_previa + new.cantidad;
  v_nuevo_costo := case
    when v_nueva_cantidad = 0 then 0
    else ((v_cantidad_previa * v_costo_previo) + new.monto_total) / v_nueva_cantidad
  end;

  update public.insumo
     set cantidad_total = v_nueva_cantidad,
         costo_promedio = v_nuevo_costo
   where id = new.insumo_id;

  return new;
end;
$$;

create trigger trg_recalcular_costo
  after insert on public.compra_insumo
  for each row execute function app.recalcular_costo_promedio();

-- =====================================================================
-- RLS: activar en todas las tablas de negocio
-- =====================================================================
alter table public.usuario enable row level security;
alter table public.habitacion enable row level security;
alter table public.cama enable row level security;
alter table public.empresa enable row level security;
alter table public.contrato_empresa enable row level security;
alter table public.trabajador enable row level security;
alter table public.reserva enable row level security;
alter table public.checkin enable row level security;
alter table public.checkout enable row level security;
alter table public.aseo enable row level security;
alter table public.consumo enable row level security;
alter table public.conciliacion_diaria enable row level security;
alter table public.justificacion_descuadre enable row level security;
alter table public.insumo enable row level security;
alter table public.compra_insumo enable row level security;
alter table public.bitacora_acceso_datos_personales enable row level security;

-- usuario: cada quien ve su propia fila; administradora ve todas
create policy usuario_select on public.usuario for select
  using (auth_uid = app.uid() or app.es_administradora());

-- habitacion / cama / aseo / checkin / checkout / reserva:
-- lectura para ambos roles autenticados, escritura para ambos
-- (la Encargada opera el día a día; la Administradora también).
create policy habitacion_rw on public.habitacion for all
  using (app.rol() is not null) with check (app.rol() is not null);

create policy cama_rw on public.cama for all
  using (app.rol() is not null) with check (app.rol() is not null);

create policy reserva_rw on public.reserva for all
  using (app.rol() is not null) with check (app.rol() is not null);

create policy checkin_rw on public.checkin for all
  using (app.rol() is not null) with check (app.rol() is not null);

create policy checkout_rw on public.checkout for all
  using (app.rol() is not null) with check (app.rol() is not null);

create policy aseo_rw on public.aseo for all
  using (app.rol() is not null) with check (app.rol() is not null);

create policy consumo_select on public.consumo for select
  using (app.rol() is not null);
create policy consumo_insert on public.consumo for insert
  with check (app.rol() is not null);
-- (sin policy de update/delete: el trigger ya lo bloquea, y sin policy
--  PostgREST tampoco expone esos verbos sobre la tabla)

-- empresa / contrato_empresa / trabajador / conciliacion_diaria /
-- justificacion_descuadre: operables por ambos roles (la Encargada
-- registra consumo de trabajadores y necesita verlos), pero solo
-- la Administradora da de alta empresas y contratos.
create policy empresa_select on public.empresa for select
  using (app.rol() is not null);
create policy empresa_insert on public.empresa for insert
  with check (app.es_administradora());
create policy empresa_update on public.empresa for update
  using (app.es_administradora()) with check (app.es_administradora());

create policy contrato_empresa_select on public.contrato_empresa for select
  using (app.rol() is not null);
create policy contrato_empresa_insert on public.contrato_empresa for insert
  with check (app.es_administradora());
create policy contrato_empresa_update on public.contrato_empresa for update
  using (app.es_administradora()) with check (app.es_administradora());

create policy trabajador_select on public.trabajador for select
  using (app.rol() is not null);
create policy trabajador_insert on public.trabajador for insert
  with check (app.es_administradora());
create policy trabajador_update on public.trabajador for update
  using (app.es_administradora()) with check (app.es_administradora());

create policy conciliacion_select on public.conciliacion_diaria for select
  using (app.rol() is not null);
create policy conciliacion_insert on public.conciliacion_diaria for insert
  with check (app.es_administradora());
create policy conciliacion_update on public.conciliacion_diaria for update
  using (app.es_administradora()) with check (app.es_administradora());

create policy justificacion_rw on public.justificacion_descuadre for all
  using (app.rol() is not null) with check (app.rol() is not null);

-- insumo / compra_insumo: SOLO Administradora (decisión E). La
-- Encargada no ve costos ni márgenes.
create policy insumo_admin_only on public.insumo for all
  using (app.es_administradora()) with check (app.es_administradora());

create policy compra_insumo_admin_only on public.compra_insumo for all
  using (app.es_administradora()) with check (app.es_administradora());

-- bitácora: solo lectura para Administradora, escritura solo por
-- funciones de servidor (pg_cron / backend), nunca desde el cliente.
create policy bitacora_admin_read on public.bitacora_acceso_datos_personales
  for select using (app.es_administradora());

-- ---------------------------------------------------------------------
-- GRANTS: sin esto, RLS es irrelevante — PostgREST ejecuta como el rol
-- `authenticated` (provisto por la imagen Supabase junto con `anon` y
-- `service_role`), que por defecto no tiene ningún privilegio sobre
-- `public`. RLS decide QUÉ FILAS ve cada policy; el GRANT decide si
-- puede tocar la tabla siquiera. Ambos son necesarios.
-- ---------------------------------------------------------------------
grant usage on schema public to authenticated;
grant usage on schema app to authenticated;

grant select on public.usuario to authenticated;
grant select, insert, update on public.habitacion to authenticated;
grant select, insert, update on public.cama to authenticated;
grant select, insert, update on public.empresa to authenticated;
grant select, insert, update on public.contrato_empresa to authenticated;
grant select, insert, update on public.trabajador to authenticated;
grant select, insert, update on public.reserva to authenticated;
grant select, insert on public.checkin to authenticated;
grant select, insert on public.checkout to authenticated;
grant select, insert on public.aseo to authenticated;
grant select, insert on public.consumo to authenticated;  -- sin update/delete: el trigger + la ausencia de policy ya lo bloquean
grant select, insert, update on public.conciliacion_diaria to authenticated;
grant select, insert on public.justificacion_descuadre to authenticated;
grant select, insert on public.insumo to authenticated;   -- filtrado por RLS a solo-administradora
grant select, insert on public.compra_insumo to authenticated;
grant select on public.bitacora_acceso_datos_personales to authenticated;

commit;

-- =====================================================================
-- NOTA: la función de purga (pg_cron, 7 días post-cierre de
-- facturación) y la función de conciliación diaria recalculable se
-- entregan en una migración aparte (0002_conciliacion.sql,
-- 0003_purga_ley21719.sql) una vez cerrado el detalle de HU-16/17/18
-- en el Sprint 3, para no bloquear el Sprint 0 con lógica que aún no
-- tiene pgTAP escrito.
-- =====================================================================
