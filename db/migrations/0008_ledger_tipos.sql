-- =====================================================================
-- Migración 0008 (Sprint 2, corrección de alcance): el ledger de
-- consumo pasa a 5 tipos (cama_noche, desayuno, almuerzo, cena,
-- colacion) en vez de las 5 originales (desayuno, almuerzo, cena,
-- colacion_extra, plato_especial). Colación de terreno y plato
-- especial NO se fusionan sin más: pasan a ser el mismo tipo de enum
-- ("colacion", fuera de convenio) pero conservan detalle y precio
-- propios vía producto_extra — la Administradora va a traer su propia
-- lista de precios de extras y no tiene por qué caber en 2 casillas
-- fijas de enum.
-- =====================================================================
begin;

-- 1) Catálogo de extras con tarifa diferencial (HU-15). La
--    Administradora carga acá su lista de precios; nada de esto
--    necesita otra migración cuando agregue un producto nuevo.
create table public.producto_extra (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null unique,
  precio_unitario numeric(12, 2) not null check (precio_unitario >= 0),
  created_at      timestamptz not null default now()
);

alter table public.producto_extra enable row level security;
create policy producto_extra_select on public.producto_extra for select
  using (app.rol() is not null);
create policy producto_extra_write on public.producto_extra for insert
  with check (app.es_administradora());
grant select on public.producto_extra to authenticated;
grant insert on public.producto_extra to authenticated;

-- 2) Nuevo enum del ledger.
create type public.tipo_consumo as enum ('cama_noche', 'desayuno', 'almuerzo', 'cena', 'colacion');

drop index public.consumo_unico_por_racion_dia;

-- v_consumo_vigente depende de la columna (select c.* ...): hay que
-- soltarla antes del cambio de tipo y recrearla después.
drop view public.v_consumo_vigente;

alter table public.consumo
  alter column tipo_racion type public.tipo_consumo
  using (case tipo_racion::text
           when 'colacion_extra' then 'colacion'
           when 'plato_especial' then 'colacion'
           else tipo_racion::text
         end)::public.tipo_consumo;

alter table public.consumo rename column tipo_racion to tipo_consumo;
drop type public.tipo_racion;

create view public.v_consumo_vigente as
select c.*
from public.consumo c
where not exists (
  select 1 from public.consumo c2 where c2.consumo_corregido_id = c.id
);
alter view public.v_consumo_vigente set (security_invoker = true);
grant select on public.v_consumo_vigente to authenticated;

-- 3) Detalle del extra — solo aplica a "colacion". `recargo` sigue
--    siendo el monto YA COBRADO en esa fila específica (una copia del
--    precio al momento de registrar): el ledger es inmutable, así que
--    si la Administradora sube el precio del producto mañana, las
--    filas ya escritas no deben cambiar de monto retroactivamente.
--    producto_extra_id es solo para trazabilidad de "cuál producto fue".
alter table public.consumo add column producto_extra_id uuid references public.producto_extra(id);
alter table public.consumo add constraint colacion_requiere_producto check (
  (tipo_consumo = 'colacion' and producto_extra_id is not null)
  or (tipo_consumo <> 'colacion' and producto_extra_id is null)
);

-- 4) cama_noche puede generarse sin un clic humano detrás (pg_cron,
--    0009_conciliacion_por_tipo.sql) — es el único tipo que puede
--    quedar sin responsable.
alter table public.consumo alter column registrado_por drop not null;
alter table public.consumo add constraint responsable_excepto_cama_noche check (
  tipo_consumo = 'cama_noche' or registrado_por is not null
);

-- 5) Mismo índice de siempre (evita el doble-toque accidental sobre un
--    original, nunca bloquea una corrección), con el nombre de columna
--    nuevo.
create unique index consumo_unico_por_tipo_dia
  on public.consumo (trabajador_id, tipo_consumo, app.fecha_santiago(fecha_hora))
  where consumo_corregido_id is null;

commit;
