-- =====================================================================
-- Migración 0025: catálogo de tarifas generales, versionado por
-- vigencia (EP-04/EP-01, a partir de evidencia real: ev/precios.txt).
--
-- No reemplaza `contrato_empresa.tarifa_convenida` (la tarifa pactada
-- con cada empresa, que ya está versionada y es la fuente de verdad
-- para facturar sus contratos — "los contratos existentes deben
-- conservar las tarifas acordadas originalmente"). Tampoco reemplaza
-- `config_negocio.tarifa_base_noche` (HU-39), que sigue siendo la
-- fuente que usan hoy Reservar.tsx y el voucher PDF: cambiar esa
-- fuente es una decisión de alcance mayor, fuera de esta tarea.
--
-- Esta tabla es un catálogo APPEND-ONLY (nunca UPDATE/DELETE de una
-- fila ya creada — mismo principio que consumo/compra_insumo): cada
-- cambio de precio es una fila nueva con su propia vigencia, para que
-- un contrato o comprobante antiguo pueda consultar la tarifa que
-- realmente regía en su fecha, sin que una corrección posterior la
-- altere retroactivamente.
-- =====================================================================
begin;

create type public.tipo_tarifa_general as enum (
  'cama_turista',      -- alojamiento particular, por noche
  'desayuno',
  'almuerzo',
  'cena',
  'cena_especial',     -- "Cenas en fechas importantes" (ev/precios.txt)
  'cama_empresa',      -- alojamiento contratista, por trabajador/noche
  'desayuno_empresa'
);

create table public.tarifa_general (
  id              uuid primary key default gen_random_uuid(),
  tipo            public.tipo_tarifa_general not null,
  monto           numeric(12, 2) not null check (monto >= 0),
  -- ev/precios.txt solo marca IVA explícito en "Cenas en fechas
  -- importantes" ("$15.000 + IVA en caso de requerir factura"); el
  -- resto no indica tratamiento tributario y no se asume ninguno.
  iva_aplicable   boolean not null default false,
  vigencia_desde  date not null default (now() at time zone 'America/Santiago')::date,
  vigencia_hasta  date,  -- null = tarifa vigente
  nota            text,
  creado_por      uuid not null references public.usuario(id),
  created_at      timestamptz not null default now(),
  -- nunca dos vigencias solapadas para el mismo tipo de tarifa
  exclude using gist (
    tipo with =,
    daterange(vigencia_desde, coalesce(vigencia_hasta, 'infinity'::date), '[]') with &&
  )
);

create index on public.tarifa_general (tipo, vigencia_desde);

alter table public.tarifa_general enable row level security;

-- Mismo patrón que config_negocio: todos leen (la Encargada también
-- necesita saber la tarifa vigente para cobrar extras/colaciones),
-- solo la Administradora agrega versiones nuevas. Sin UPDATE/DELETE
-- para nadie: una tarifa ya creada es histórica, no se corrige en
-- sitio (si se cargó mal, se cierra su vigencia_hasta y se crea una
-- fila nueva correcta, igual que un consumo corregido en el ledger).
create policy tarifa_general_select on public.tarifa_general for select
  using (app.rol() is not null);
create policy tarifa_general_insert on public.tarifa_general for insert
  with check (app.es_administradora());

grant select, insert on public.tarifa_general to authenticated;

-- No se carga ningún dato de referencia aquí: esta migración corre
-- ANTES de que exista cualquier usuario `administradora` (creado_por
-- es NOT NULL y referencia public.usuario), así que un seed condicional
-- a "si ya hay una Administradora" nunca se ejecutaría en un despliegue
-- nuevo. La carga de referencia basada en ev/precios.txt vive en
-- db/seed-tarifas-referencia.sh, que corre después de crear las
-- usuarias de demo — mismo patrón que db/seed-demo.sh.

commit;
