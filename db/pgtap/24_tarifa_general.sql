-- Migración 0025: catálogo de tarifas generales versionado (EP-04/EP-01).
begin;
select plan(7);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000c2');

insert into public.usuario (id, auth_uid, rol, nombre) values
  ('10000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000000000c1', 'administradora', 'María'),
  ('10000000-0000-0000-0000-0000000000c2',
   '00000000-0000-0000-0000-0000000000c2', 'encargada', 'Encargada');

-- --- Como Administradora ---
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000000c1')::text, true);

select lives_ok(
  $$ insert into public.tarifa_general (tipo, monto, vigencia_desde, creado_por)
     values ('desayuno', 5000, '2026-01-01', '10000000-0000-0000-0000-0000000000c1') $$,
  'Administradora puede agregar una tarifa nueva'
);

-- Una segunda fila del MISMO tipo que se superpone con la anterior
-- (sin cerrar la vigencia previa) debe rechazarse.
select throws_ok(
  $$ insert into public.tarifa_general (tipo, monto, vigencia_desde, creado_por)
     values ('desayuno', 5500, '2026-06-01', '10000000-0000-0000-0000-0000000000c1') $$,
  null,
  'No se permiten dos vigencias superpuestas del mismo tipo de tarifa'
);

-- Cerrando la vigencia anterior sí permite cargar la nueva versión —
-- corrección correcta: fila nueva, no UPDATE de la vieja.
select lives_ok(
  $$ update public.tarifa_general set vigencia_hasta = '2026-05-31'
     where tipo = 'desayuno' and vigencia_hasta is null $$,
  'Cerrar la vigencia_hasta de la tarifa anterior es un UPDATE permitido (no cambia el monto histórico)'
);
select lives_ok(
  $$ insert into public.tarifa_general (tipo, monto, vigencia_desde, creado_por)
     values ('desayuno', 5500, '2026-06-01', '10000000-0000-0000-0000-0000000000c1') $$,
  'Tras cerrar la vigencia previa, sí se puede agregar la versión nueva sin solape'
);

-- El monto de una fila ya creada es inmutable: el GRANT de columna
-- solo permite escribir vigencia_hasta, incluso para la Administradora.
select throws_ok(
  $$ update public.tarifa_general set monto = 1 where tipo = 'desayuno' and vigencia_hasta = '2026-05-31' $$,
  null,
  'El monto de una tarifa histórica no se puede corregir en sitio (ni la Administradora) — solo vigencia_hasta'
);

reset role;

-- --- Como Encargada: puede leer, no puede insertar ---
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000000c2')::text, true);

select ok(
  (select count(*)::int from public.tarifa_general) >= 2,
  'Encargada puede leer el catálogo de tarifas (lo necesita para cobrar extras/colaciones)'
);

select throws_ok(
  $$ insert into public.tarifa_general (tipo, monto, vigencia_desde, creado_por)
     values ('almuerzo', 7500, '2026-01-01', '10000000-0000-0000-0000-0000000000c2') $$,
  null,
  'Encargada no puede agregar tarifas nuevas (RLS: solo Administradora)'
);

reset role;

select * from finish();
rollback;
