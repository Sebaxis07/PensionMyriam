-- Migración 0026: servicios incluidos / condición tributaria de
-- contrato_empresa (misma confidencialidad que tarifa_convenida) +
-- auditoría contrato_empresa_ajuste. Corre como "authenticated", igual
-- que 11_seguridad_tarifa.sql.
begin;
select plan(11);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000c101'),
  ('00000000-0000-0000-0000-00000000c102');

insert into public.usuario (id, auth_uid, rol, nombre) values
  ('10000000-0000-0000-0000-00000000c101', '00000000-0000-0000-0000-00000000c101', 'administradora', 'María'),
  ('10000000-0000-0000-0000-00000000c102', '00000000-0000-0000-0000-00000000c102', 'encargada', 'Encargada');

insert into public.empresa (id, razon_social) values
  ('20000000-0000-0000-0000-00000000c101', 'Minera Test SpA');

-- Contrato "antiguo" (como si viniera de antes de esta migración): no
-- se pasan incluye_*/condicion_tributaria, deben tomar sus defaults.
insert into public.contrato_empresa (id, empresa_id, vigencia_desde, headcount, tarifa_convenida, creado_por) values
  ('30000000-0000-0000-0000-00000000c101', '20000000-0000-0000-0000-00000000c101', current_date, 10, 25000, '10000000-0000-0000-0000-00000000c101');

select is(
  (select incluye_desayuno and incluye_almuerzo and incluye_cena
     from public.contrato_empresa where id = '30000000-0000-0000-0000-00000000c101'),
  true,
  'Un contrato creado sin especificar servicios conserva el supuesto implícito previo: todo incluido (mismo criterio que tipo_consumo_config)'
);

select is(
  (select condicion_tributaria from public.contrato_empresa where id = '30000000-0000-0000-0000-00000000c101'),
  null,
  'La condición tributaria nunca se infiere: default null (no especificada)'
);

select throws_ok(
  $$ insert into public.contrato_empresa (empresa_id, vigencia_desde, headcount, tarifa_convenida, creado_por, condicion_tributaria)
     values ('20000000-0000-0000-0000-00000000c101', current_date, 1, 1, '10000000-0000-0000-0000-00000000c101', 'otra_cosa') $$,
  null,
  'condicion_tributaria solo acepta neto/con_iva/null'
);

-- --- Caso B: Encargada no ve las nuevas columnas económicas ---
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000c102')::text, true);

select throws_ok(
  $$ select incluye_desayuno from public.contrato_empresa where id = '30000000-0000-0000-0000-00000000c101' $$,
  '42501',
  null,
  'Encargada: SELECT directo de incluye_desayuno sobre la tabla base se rechaza, igual que tarifa_convenida'
);

select is(
  (select incluye_desayuno from public.contrato_empresa_rest where id = '30000000-0000-0000-0000-00000000c101'),
  null,
  'Encargada: la vista REST enmascara incluye_desayuno igual que tarifa_convenida'
);

select is(
  (select condicion_tributaria from public.contrato_empresa_rest where id = '30000000-0000-0000-0000-00000000c101'),
  null,
  'Encargada: la vista REST enmascara condicion_tributaria'
);

select throws_ok(
  $$ insert into public.contrato_empresa_ajuste
       (contrato_anterior_id, contrato_nuevo_id, cantidad_anterior, cantidad_nueva, fecha_efectiva, motivo, registrado_por)
     values ('30000000-0000-0000-0000-00000000c101', '30000000-0000-0000-0000-00000000c101', 10, 8, current_date, 'prueba', '10000000-0000-0000-0000-00000000c102') $$,
  null,
  'Encargada no puede registrar un ajuste de contrato (RLS: solo Administradora)'
);

reset role;

-- --- Caso A: Administradora ---
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000c101')::text, true);

select is(
  (select incluye_desayuno from public.contrato_empresa_rest where id = '30000000-0000-0000-0000-00000000c101'),
  true,
  'Administradora: la vista REST SÍ entrega el valor real de incluye_desayuno'
);

-- Contrato "nuevo" (resultado de un ajuste), con menos trabajadores,
-- cena no incluida y tarifa neta.
insert into public.contrato_empresa (id, empresa_id, vigencia_desde, headcount, tarifa_convenida, creado_por, incluye_cena, condicion_tributaria) values
  ('30000000-0000-0000-0000-00000000c102', '20000000-0000-0000-0000-00000000c101', current_date + 10, 8, 25000, '10000000-0000-0000-0000-00000000c101', false, 'neto');

select lives_ok(
  $$ insert into public.contrato_empresa_ajuste
       (contrato_anterior_id, contrato_nuevo_id, cantidad_anterior, cantidad_nueva, fecha_efectiva, motivo, registrado_por)
     values ('30000000-0000-0000-0000-00000000c101', '30000000-0000-0000-0000-00000000c102', 10, 8, current_date + 10, 'La empresa redujo su dotación en faena', '10000000-0000-0000-0000-00000000c101') $$,
  'Administradora puede registrar un ajuste de contrato con su motivo'
);

select throws_ok(
  $$ insert into public.contrato_empresa_ajuste
       (contrato_anterior_id, contrato_nuevo_id, cantidad_anterior, cantidad_nueva, fecha_efectiva, motivo, registrado_por)
     values ('30000000-0000-0000-0000-00000000c101', '30000000-0000-0000-0000-00000000c102', 10, 8, current_date + 10, '   ', '10000000-0000-0000-0000-00000000c101') $$,
  null,
  'El motivo del ajuste no puede quedar vacío (check de negocio, no solo NOT NULL)'
);

select throws_ok(
  $$ update public.contrato_empresa_ajuste set cantidad_nueva = 1 where contrato_nuevo_id = '30000000-0000-0000-0000-00000000c102' $$,
  '42501',
  null,
  'contrato_empresa_ajuste es append-only: ni la Administradora tiene grant de UPDATE'
);

reset role;

select * from finish();
rollback;
