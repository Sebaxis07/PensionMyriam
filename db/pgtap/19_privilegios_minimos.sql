-- Auditoría de privilegios (Sprint 5, §13): qué puede tocar realmente el
-- rol `authenticated`, con el que PostgREST ejecuta TODA petición de la
-- app.
--
-- Esta prueba existe porque la imagen de Supabase trae un
-- `alter default privileges … grant all on tables to anon,
-- authenticated, service_role`: los `grant select, insert` explícitos de
-- las migraciones no restringían nada, solo repetían algo ya concedido
-- de más. El rol tenía DELETE, UPDATE y TRUNCATE sobre TODA tabla de
-- `public`, incluidos el ledger inmutable y la bitácora.
--
-- Dónde estaba el daño real:
--   * TRUNCATE no pasa por RLS ni dispara los triggers de fila que
--     protegen el ledger. Era la única escritura capaz de saltarse las
--     dos barreras a la vez.
--   * DELETE sí alcanzaba filas en las tablas con policy `FOR ALL`
--     (justificaciones de descuadre, check-ins, aseo…).
--
-- UPDATE se conserva donde la app escribe: el conector sube cada
-- inserción como un upsert y Postgres exige ese privilegio para
-- `INSERT … ON CONFLICT DO UPDATE`. Ver el comentario de
-- db/migrations/0021_privilegios_minimos.sql.
begin;
select plan(12);

-- =====================================================================
-- 1. TRUNCATE: en ninguna tabla, para ninguno de los dos roles de la app
-- =====================================================================
select is_empty(
  $$ select table_name::text
       from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee in ('authenticated', 'anon')
        and privilege_type = 'TRUNCATE' $$,
  'ninguna tabla debe conceder TRUNCATE a los roles de la app: es la única escritura que ignora RLS y no dispara los triggers de fila'
);

-- =====================================================================
-- 2. DELETE: tampoco, salvo la ÚNICA excepción deliberada agregada por
-- 0028_habitaciones_crud.sql (CAMBIO-01) — "eliminar de verdad" una
-- habitación sin ningún historial asociado. No es el mismo hueco que
-- esta prueba detectó originalmente: ahí el privilegio alcanzaba CUALQUIER
-- fila porque la policy era FOR ALL sin distinguir verbos; acá hay dos
-- barreras explícitas antes de que un DELETE real alcance una fila:
-- la policy `habitacion_delete` (solo `app.es_administradora()`) y el
-- chequeo de historial dentro de `eliminar_habitacion()`. `anon` sigue
-- sin NINGÚN privilegio de DELETE.
-- =====================================================================
select is_empty(
  $$ select table_name::text
       from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee = 'anon'
        and privilege_type = 'DELETE' $$,
  'anon sigue sin privilegio de DELETE en ninguna tabla'
);
select is(
  (select array_agg(table_name::text order by table_name)
     from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'authenticated'
      and privilege_type = 'DELETE'),
  array['habitacion'],
  'authenticated solo tiene DELETE en habitacion (CAMBIO-01); ninguna otra tabla debe concederlo'
);

-- =====================================================================
-- 3. Tablas que la app NO escribe nunca: sin privilegio de escritura
-- =====================================================================
select is_empty(
  $$ select privilege_type::text
       from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee = 'authenticated'
        and table_name = 'usuario'
        and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE') $$,
  'usuario es de solo lectura para la app: el alta va por el RPC crear_cuenta_usuario, así nadie puede ascenderse a administradora con un PATCH (HU-35)'
);

select is_empty(
  $$ select privilege_type::text
       from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee = 'authenticated'
        and table_name = 'bitacora_acceso_datos_personales'
        and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE') $$,
  'la bitácora de datos personales solo se lee desde el cliente: se escribe por funciones SECURITY DEFINER (HU-33/HU-34)'
);

select is_empty(
  $$ select privilege_type::text
       from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee = 'authenticated'
        and table_name = 'tipo_consumo_config'
        and privilege_type <> 'SELECT' $$,
  'tipo_consumo_config es un catálogo de solo lectura para la app'
);

select is_empty(
  $$ select privilege_type::text
       from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee = 'authenticated'
        and table_name = 'config_negocio'
        and privilege_type in ('INSERT', 'DELETE', 'TRUNCATE') $$,
  'config_negocio es una fila única: la app solo la lee y la actualiza, nunca la crea ni la borra (HU-39)'
);

-- =====================================================================
-- 4. `anon` (petición sin sesión) no toca nada del negocio
-- =====================================================================
select is_empty(
  $$ select table_name::text || ':' || privilege_type::text
       from information_schema.role_table_grants
      where table_schema = 'public' and grantee = 'anon' $$,
  'una petición sin sesión (anon) no debe tener ningún privilegio sobre el esquema de la pensión'
);

-- Tampoco debe quedar como privilegio por defecto para las tablas que
-- se creen en migraciones futuras: ahí estaba el origen del problema.
select is_empty(
  $$ select acl::text
       from pg_default_acl d
       join pg_namespace n on n.oid = d.defaclnamespace
       cross join lateral unnest(d.defaclacl) as acl
      where n.nspname = 'public' and d.defaclobjtype = 'r'
        and acl::text like 'anon=%' $$,
  'los privilegios por defecto del esquema no deben volver a conceder nada a anon: así una tabla nueva no reintroduce el problema en silencio'
);

-- =====================================================================
-- 5. Lo que la app SÍ necesita sigue concedido (no se rompió el día a día)
-- =====================================================================
select isnt_empty(
  $$ select 1 from information_schema.role_table_grants
      where table_schema = 'public' and grantee = 'authenticated'
        and table_name = 'consumo' and privilege_type = 'INSERT' $$,
  'la Encargada debe seguir pudiendo registrar consumo'
);

-- El conector sube cada inserción como upsert (INSERT … ON CONFLICT DO
-- UPDATE) y Postgres exige UPDATE para esa forma de sentencia: sin este
-- privilegio la sincronización se cae por completo (se verificó
-- quitándolo: 7 especificaciones E2E de los Sprints 1-4 en rojo).
select isnt_empty(
  $$ select 1 from information_schema.role_table_grants
      where table_schema = 'public' and grantee = 'authenticated'
        and table_name = 'consumo' and privilege_type = 'UPDATE' $$,
  'el upsert del conector necesita UPDATE; la inmutabilidad la sostienen RLS (sin policy de update) y el trigger consumo_sin_update'
);

-- Y la restricción de columna de 0015 sobrevive al revoke/regrant: la
-- tarifa convenida no vuelve a quedar legible para la Encargada.
select is_empty(
  $$ select 1 from information_schema.column_privileges
      where table_schema = 'public' and grantee = 'authenticated'
        and table_name = 'contrato_empresa'
        and column_name = 'tarifa_convenida'
        and privilege_type = 'SELECT' $$,
  'tarifa_convenida debe seguir sin privilegio de LECTURA por columna tras rehacer los privilegios (regresión de 0015)'
);

select * from finish();
rollback;
