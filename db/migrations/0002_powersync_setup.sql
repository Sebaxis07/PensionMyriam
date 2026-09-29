-- =====================================================================
-- Migración 0002: rol de replicación y publicación para PowerSync.
-- Separada de 0001 porque es infraestructura de sincronización, no
-- del modelo de negocio. Verificada 29-09-2026 contra el servicio real
-- corriendo (riesgo M de la planificación, confirmado en
-- infra/docker-compose.yml).
-- =====================================================================
begin;

-- Contraseña de desarrollo fija a propósito (entorno local desechable,
-- ver db/dev-run.sh). En producción, infra/docker-compose.yml la
-- reemplaza por la variable de entorno real antes de aplicar esta
-- migración — nunca se commitea la contraseña real.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'powersync_replication') then
    create role powersync_replication with replication login password 'dev_powersync_password';
  end if;
end
$$;

grant usage on schema public to powersync_replication;
grant select on all tables in schema public to powersync_replication;
alter default privileges in schema public grant select on tables to powersync_replication;

-- RLS está activo en todas las tablas de negocio (según rol vía JWT), pero
-- la replicación lógica no tiene un JWT que evaluar: sin esto, el propio
-- servicio de PowerSync lo detecta y falla al intentar leer cualquier
-- tabla con policy ("permission denied for schema app", ya que las
-- policies llaman a app.rol()). Requiere superusuario para asignarse.
alter role powersync_replication bypassrls;

-- PowerSync Service (storage: postgresql) guarda sus propios buckets de
-- sincronización en un schema "powersync" que administra por completo
-- (tablas, migraciones internas, etc.). Dueño = el propio rol, para que
-- pueda crear y modificar sus tablas sin privilegios adicionales.
-- "postgres" (quien aplica esta migración) no es superusuario real en
-- esta imagen: para poder asignar esa autoría necesita antes ser
-- miembro del rol.
grant powersync_replication to postgres;
create schema if not exists powersync authorization powersync_replication;

-- PowerSync replica por publicación lógica. Sprint 0 solo necesita
-- `habitacion` para el criterio de cierre; cada sprint agrega sus
-- tablas nuevas a esta publicación cuando defina sus sync rules
-- (infra/powersync/config.yaml).
-- El nombre "powersync" es fijo: el servicio lo espera hardcodeado y no
-- es configurable (ver infra/powersync/config.yaml).
create publication powersync for table public.habitacion;

commit;
