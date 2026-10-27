-- HU-35 / HU-36: alta de cuentas con autorización real y los datos que
-- el listado necesita.
--
-- La prueba central de este archivo es una REGRESIÓN de un
-- escalamiento de privilegios real: `public.crear_cuenta_usuario`
-- decidía la autorización con `current_user`, que dentro de un
-- SECURITY DEFINER es el DUEÑO de la función y no quien llama. El
-- `and` cortocircuitaba y el chequeo de administradora no se evaluaba
-- nunca: una Encargada podía crearse una cuenta de administradora.
-- Ver db/migrations/0017_seguridad_cuentas.sql.
--
-- ALCANCE DE ESTE ARCHIVO: acá se verifica todo lo que ocurre ANTES de
-- escribir en `auth.users` (autorización y validaciones). El camino
-- feliz — que la cuenta queda creada y puede iniciar sesión — NO se
-- puede verificar en este contenedor: las columnas de auth.users que la
-- función usa (email_confirmed_at, is_sso_user, …) y la tabla
-- auth.identities las crea GoTrue al arrancar, no la imagen de
-- Postgres. Esa parte se verifica contra el stack real en
-- e2e/sprint5-cuentas-seguridad.spec.ts.
begin;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000f001', 'maria@pension-myriam.local'),
  ('00000000-0000-0000-0000-00000000f002', 'encargada@pension-myriam.local');

insert into public.usuario (id, auth_uid, rol, nombre, email) values
  ('10000000-0000-0000-0000-00000000f001',
   '00000000-0000-0000-0000-00000000f001', 'administradora', 'María',
   'maria@pension-myriam.local'),
  ('10000000-0000-0000-0000-00000000f002',
   '00000000-0000-0000-0000-00000000f002', 'encargada', 'Encargada de Registro',
   'encargada@pension-myriam.local');

-- =====================================================================
-- HU-36: la tabla debe poder responder "nombre, correo, rol y fecha de
-- registro" sin salir a la red (vive replicada en el celular).
-- =====================================================================
select has_column(
  'public', 'usuario', 'email',
  'usuario debe tener el correo: HU-36 pide mostrarlo y auth.users no se replica al celular'
);

select is(
  (select email from public.usuario where id = '10000000-0000-0000-0000-00000000f001'),
  'maria@pension-myriam.local',
  'el correo debe quedar disponible en la fila de aplicación'
);

select throws_ok(
  $$ insert into public.usuario (auth_uid, rol, nombre, email)
     values ('00000000-0000-0000-0000-00000000f003', 'encargada', 'Otra',
             'MARIA@pension-myriam.local') $$,
  null,
  'un mismo correo no puede quedar en dos cuentas, ni cambiando mayúsculas (GoTrue normaliza a minúsculas)'
);

-- =====================================================================
-- HU-35: escalamiento de privilegios — la Encargada NO crea cuentas
-- =====================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000f002')::text, true);

select throws_ok(
  $$ select public.crear_cuenta_usuario(
       'intrusa@pension-myriam.local', 'ClaveLargaSegura2026', 'Intrusa', 'administradora') $$,
  '42501',
  null,
  'REGRESIÓN: la Encargada NO debe poder crear cuentas, menos aún de rol administradora (HU-35)'
);

select is(
  (select count(*)::int from public.usuario where email = 'intrusa@pension-myriam.local'),
  0,
  'tras el intento de la Encargada no debe existir ninguna cuenta nueva'
);

reset role;

-- =====================================================================
-- HU-35: la Administradora sí, con la política de 12 caracteres
-- =====================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000f001')::text, true);

select throws_ok(
  $$ select public.crear_cuenta_usuario(
       'rosa@pension-myriam.local', 'Corta123', 'Rosa Alvarado', 'encargada') $$,
  '22023',
  null,
  'una contraseña de menos de 12 caracteres debe rechazarse (HU-35: política propia sobre el mínimo de 8 de OWASP ASVS 5.0)'
);

select throws_ok(
  $$ select public.crear_cuenta_usuario(
       'rosa@pension-myriam.local', 'ClaveLargaSegura2026', 'Rosa Alvarado', 'superadmin') $$,
  '22023',
  null,
  'un rol fuera de administradora/encargada debe rechazarse'
);

reset role;

select * from finish();
rollback;
