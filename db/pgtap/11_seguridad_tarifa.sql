-- Corrección de seguridad: tarifa_convenida de contrato_empresa no
-- debe ser legible por la Encargada vía PostgREST/consultas directas
-- (0015_seguridad_tarifa.sql). Corre como "authenticated" (el mismo
-- rol con el que ejecuta PostgREST), no como el dueño de las tablas.
begin;
select plan(8);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000c001'),
  ('00000000-0000-0000-0000-00000000c002');

insert into public.usuario (id, auth_uid, rol, nombre) values
  ('10000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000c001', 'administradora', 'María'),
  ('10000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-00000000c002', 'encargada', 'Encargada');

insert into public.empresa (id, razon_social) values
  ('20000000-0000-0000-0000-00000000c001', 'Minera Test SpA');

insert into public.contrato_empresa (id, empresa_id, vigencia_desde, headcount, tarifa_convenida, creado_por) values
  ('30000000-0000-0000-0000-00000000c001', '20000000-0000-0000-0000-00000000c001', current_date, 10, 77777, '10000000-0000-0000-0000-00000000c001');

-- --- Caso B: Encargada ---
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000c002')::text, true);

select throws_ok(
  $$ select tarifa_convenida from public.contrato_empresa where id = '30000000-0000-0000-0000-00000000c001' $$,
  '42501',
  null,
  'Encargada: SELECT directo a la tabla base contrato_empresa debe ser rechazado (permission denied)'
);

select is(
  (select tarifa_convenida from public.contrato_empresa_rest where id = '30000000-0000-0000-0000-00000000c001'),
  null,
  'Encargada: la vista contrato_empresa_rest SÍ responde, pero tarifa_convenida llega en null'
);

select is(
  (select headcount from public.contrato_empresa_rest where id = '30000000-0000-0000-0000-00000000c001'),
  10,
  'Encargada: los datos operativos (headcount) de la vista SÍ llegan completos — no se restringió de más'
);

reset role;

-- --- Caso A: Administradora ---
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000c001')::text, true);

select is(
  (select tarifa_convenida from public.contrato_empresa_rest where id = '30000000-0000-0000-0000-00000000c001'),
  77777::numeric,
  'Administradora: la vista SÍ entrega la tarifa real'
);

select throws_ok(
  $$ select tarifa_convenida from public.contrato_empresa where id = '30000000-0000-0000-0000-00000000c001' $$,
  '42501',
  null,
  'Administradora: leer tarifa_convenida DIRECTO de la tabla base también se rechaza — ni ella tiene ese grant de columna, solo la vista la desenmascara'
);

select lives_ok(
  $$ select headcount from public.contrato_empresa where id = '30000000-0000-0000-0000-00000000c001' $$,
  'Las columnas no sensibles SÍ se pueden leer directo de la tabla base (grant de columna) — necesario para que WHERE/RLS funcionen en UPDATE'
);

-- UPDATE con WHERE id=? necesita poder LEER esa columna para evaluar
-- la condición y la política RLS — por eso el fix usa GRANT de
-- columna (id incluido) en vez de un REVOKE total de SELECT.
select lives_ok(
  $$ update public.contrato_empresa set headcount = 12
     where id = '30000000-0000-0000-0000-00000000c001' $$,
  'Administradora: UPDATE sobre contrato_empresa sigue funcionando (grant de columna cubre id/headcount)'
);

reset role;

select is(
  (select headcount from public.contrato_empresa where id = '30000000-0000-0000-0000-00000000c001'),
  12,
  'El UPDATE de la Administradora efectivamente se aplicó (verificado como superusuario)'
);

select * from finish();
rollback;
