-- Verifica decisión E: solo Administradora opera insumo/compra_insumo.
-- Corre como el rol `authenticated` (el mismo con el que ejecuta
-- PostgREST), no como el dueño de las tablas, para que RLS aplique de
-- verdad. El dueño / superusuario siempre puede saltarse RLS.
begin;
select plan(4);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000a2');

insert into public.usuario (id, auth_uid, rol, nombre) values
  ('10000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-0000000000a1', 'administradora', 'María'),
  ('10000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000a2', 'encargada', 'Encargada');

insert into public.insumo (id, nombre, categoria, unidad_medida)
  values ('20000000-0000-0000-0000-0000000000a1', 'Arroz', 'abarrotes', 'kg');

-- --- Como Administradora: debe poder insertar y ver ---
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000000a1')::text, true);

select lives_ok(
  $$ insert into public.compra_insumo
       (insumo_id, categoria, monto_total, cantidad, registrado_por, uuid_idempotente)
     values ('20000000-0000-0000-0000-0000000000a1', 'abarrotes', 50000, 25,
             '10000000-0000-0000-0000-0000000000a1',
             '30000000-0000-0000-0000-0000000000a1') $$,
  'Administradora debe poder insertar en compra_insumo'
);

select is(
  (select count(*)::int from public.insumo),
  1,
  'Administradora debe poder ver insumo'
);

reset role;

-- --- Como Encargada: RLS debe dejarla en 0 filas / sin permiso ---
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000000a2')::text, true);

select is(
  (select count(*)::int from public.insumo),
  0,
  'Encargada NO debe ver filas de insumo (bloqueado por RLS, decisión E)'
);

select throws_ok(
  $$ insert into public.compra_insumo
       (insumo_id, categoria, monto_total, cantidad, registrado_por, uuid_idempotente)
     values ('20000000-0000-0000-0000-0000000000a1', 'abarrotes', 1000, 1,
             '10000000-0000-0000-0000-0000000000a2',
             '30000000-0000-0000-0000-0000000000a2') $$,
  null,
  'Encargada NO debe poder insertar en compra_insumo (bloqueado por RLS, decisión E)'
);

reset role;
select * from finish();
rollback;
