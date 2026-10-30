-- =====================================================================
-- Migración 0026: condiciones económicas explícitas de contrato_empresa
-- (estimación del contrato, EP-03) + auditoría de ajustes de cantidad
-- contratada.
--
-- NO reinterpreta `tarifa_convenida`: sigue siendo exactamente lo que ya
-- usan useMargenProyectado.ts y useCierreMensual.ts hoy — un monto por
-- persona y por día. Esta migración solo hace esa unidad explícita (ver
-- la nueva etiqueta del formulario) y agrega, sin tocar el monto:
--
--   - qué servicios de alimentación están incluidos en esa tarifa
--     (alojamiento siempre está incluido: headcount × tarifa × días ES
--     el cargo de alojamiento, así que no hay columna para "excluirlo"
--     sin romper el cálculo base);
--   - la condición tributaria de la tarifa, cuando se conoce.
--
-- Los defaults (`true` para los tres servicios, `null`/no especificado
-- para la condición tributaria) preservan el comportamiento implícito
-- de TODOS los contratos ya creados: `tipo_consumo_config`
-- (0009_conciliacion_por_tipo.sql) ya trata cama_noche/desayuno/
-- almuerzo/cena como "factura por contrato completo" para TODA empresa,
-- es decir, la asunción vigente hasta hoy es que esos servicios SIEMPRE
-- están incluidos. Un contrato antiguo no cambia de significado al
-- aplicarse esta migración.
-- =====================================================================
begin;

alter table public.contrato_empresa
  add column incluye_desayuno    boolean not null default true,
  add column incluye_almuerzo    boolean not null default true,
  add column incluye_cena        boolean not null default true,
  -- null = no especificada (nunca se asume neta ni con IVA sin que la
  -- Administradora lo indique explícitamente — ver ev/precios.txt, que
  -- solo marca IVA explícito para la cena especial, no para el resto).
  add column condicion_tributaria text
    check (condicion_tributaria is null or condicion_tributaria in ('neto', 'con_iva'));

comment on column public.contrato_empresa.tarifa_convenida is
  'Monto por persona y por día (unidad ya usada por useMargenProyectado.ts y useCierreMensual.ts). No es un monto mensual ni global del contrato.';
comment on column public.contrato_empresa.incluye_desayuno is
  'Si la tarifa convenida ya incluye el desayuno de cada trabajador (no se vuelve a cobrar aparte). Default true: mismo supuesto que tipo_consumo_config hasta hoy.';
comment on column public.contrato_empresa.incluye_almuerzo is
  'Análogo a incluye_desayuno, para almuerzo.';
comment on column public.contrato_empresa.incluye_cena is
  'Análogo a incluye_desayuno, para cena.';
comment on column public.contrato_empresa.condicion_tributaria is
  'neto (tarifa + IVA aparte) | con_iva (tarifa ya incluye IVA) | null = no especificada. Nunca se infiere: solo la Administradora la declara.';

-- Estas columnas describen la MISMA condición económica confidencial
-- que tarifa_convenida (RNF: "la Encargada no ve costos ni márgenes") —
-- mismo tratamiento exacto que 0015_seguridad_tarifa.sql: se revoca el
-- select de columna completo y se repone sin las nuevas columnas, y la
-- vista REST las enmascara igual que tarifa_convenida.
revoke select on public.contrato_empresa from authenticated;
grant select (id, empresa_id, vigencia_desde, vigencia_hasta, headcount, creado_por, created_at)
  on public.contrato_empresa to authenticated;

drop view public.contrato_empresa_rest;
create view public.contrato_empresa_rest as
select
  id,
  empresa_id,
  vigencia_desde,
  vigencia_hasta,
  headcount,
  case when app.es_administradora() then tarifa_convenida else null end as tarifa_convenida,
  case when app.es_administradora() then incluye_desayuno else null end as incluye_desayuno,
  case when app.es_administradora() then incluye_almuerzo else null end as incluye_almuerzo,
  case when app.es_administradora() then incluye_cena else null end as incluye_cena,
  case when app.es_administradora() then condicion_tributaria else null end as condicion_tributaria,
  creado_por,
  created_at
from public.contrato_empresa;

grant select on public.contrato_empresa_rest to authenticated;

-- =====================================================================
-- Auditoría de ajustes de cantidad contratada (sección 8 del alcance:
-- "mostrar cantidad anterior, cantidad nueva, fecha efectiva, ...").
--
-- El versionado de contrato_empresa (cerrar vigencia + abrir fila
-- nueva, HU-02) YA deja trazabilidad de los valores en sí — esta tabla
-- es la bitácora explícita del POR QUÉ y CUÁNDO de cada ajuste, para no
-- depender de que alguien reconstruya la intención leyendo fechas de
-- vigencia sueltas. APPEND-ONLY, mismo principio que consumo/
-- compra_insumo/tarifa_general: nunca se corrige una fila ya creada,
-- se agrega una nueva si hiciera falta.
-- =====================================================================
create table public.contrato_empresa_ajuste (
  id                  uuid primary key default gen_random_uuid(),
  contrato_anterior_id uuid not null references public.contrato_empresa(id),
  contrato_nuevo_id   uuid not null references public.contrato_empresa(id),
  cantidad_anterior   int not null check (cantidad_anterior > 0),
  cantidad_nueva      int not null check (cantidad_nueva > 0),
  fecha_efectiva      date not null,
  motivo              text not null check (length(trim(motivo)) > 0),
  registrado_por      uuid not null references public.usuario(id),
  created_at          timestamptz not null default now()
);

create index on public.contrato_empresa_ajuste (contrato_anterior_id);
create index on public.contrato_empresa_ajuste (contrato_nuevo_id);

alter table public.contrato_empresa_ajuste enable row level security;

-- Mismo criterio de confidencialidad que contrato_empresa: cualquiera
-- autenticado puede ver que hubo un ajuste y su motivo/fecha (eso no es
-- un costo), pero solo la Administradora registra ajustes (igual que
-- solo ella da de alta/edita contrato_empresa).
create policy contrato_empresa_ajuste_select on public.contrato_empresa_ajuste for select
  using (app.rol() is not null);
create policy contrato_empresa_ajuste_insert on public.contrato_empresa_ajuste for insert
  with check (app.es_administradora());

grant select, insert on public.contrato_empresa_ajuste to authenticated;

commit;
