-- =====================================================================
-- Migración 0005 (Sprint 2 / EP-03): piezas de esquema que faltaban
-- sobre las tablas empresa/contrato_empresa/trabajador/consumo, que ya
-- existían desde 0001_init.sql.
--
-- Nota sobre RLS/tarifas (decisión revisada): la Encargada no debe ver
-- tarifa_convenida, pero las lecturas de la app NUNCA pasan por
-- PostgREST/RLS — van contra la réplica local de PowerSync, que usa un
-- rol con BYPASSRLS (ver 0002_powersync_setup.sql). Restringir columnas
-- de Postgres no ocultaría nada del celular de la Encargada: lo único
-- que de verdad lo evita son las sync rules de PowerSync (bucket
-- separado, solo para administradora — ver infra/powersync/config.yaml).
-- Por eso esta migración NO toca RLS/GRANTs de contrato_empresa.
-- =====================================================================
begin;

-- Corte de "día" en hora de Santiago (nunca UTC, la del servidor —
-- regla del proyecto). timestamptz -> date directo depende del
-- timezone de sesión (no es IMMUTABLE); esta envoltura sí lo es, fijando
-- la zona explícita.
create or replace function app.fecha_santiago(ts timestamptz) returns date
language sql immutable as $$
  select (ts at time zone 'America/Santiago')::date
$$;

-- HU-13: uuid_idempotente ya evita que un reintento de red duplique la
-- MISMA acción, pero no evita que la Encargada marque dos veces al
-- mismo trabajador la misma ración el mismo día por error humano. Solo
-- aplica a registros ORIGINALES (consumo_corregido_id is null): una
-- corrección puede — y debe poder — apuntar al mismo trabajador/ración/
-- día que el registro que corrige.
create unique index consumo_unico_por_racion_dia
  on public.consumo (trabajador_id, tipo_racion, app.fecha_santiago(fecha_hora))
  where consumo_corregido_id is null;

-- HU-13: vista de lectura del libro "vigente" — excluye cualquier fila
-- que haya sido reemplazada por una corrección (una fila corregida dos
-- veces solo deja ver la última corrección). El propio `consumo` como
-- tabla sigue siendo el libro contable completo e inmutable; esta vista
-- es solo una proyección de lectura para conciliación y listados.
create view public.v_consumo_vigente as
select c.*
from public.consumo c
where not exists (
  select 1 from public.consumo c2 where c2.consumo_corregido_id = c.id
);

-- Mismo grant/RLS que la tabla base: quien puede leer consumo puede
-- leer esta vista (las vistas heredan RLS del owner por defecto en
-- Postgres 15+ con security_invoker; lo fijamos explícito).
alter view public.v_consumo_vigente set (security_invoker = true);
grant select on public.v_consumo_vigente to authenticated;

commit;
