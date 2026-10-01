-- HU-13: no se puede registrar dos veces la MISMA ración del MISMO
-- trabajador el MISMO día (evita el doble-toque accidental), pero una
-- corrección explícita sí puede apuntar a ese mismo trabajador/ración/
-- día. La vista v_consumo_vigente debe esconder el original corregido.
begin;
select plan(6);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000f1');
insert into public.usuario (id, auth_uid, rol, nombre) values
  ('10000000-0000-0000-0000-0000000000f1',
   '00000000-0000-0000-0000-0000000000f1', 'encargada', 'Encargada');

insert into public.empresa (id, razon_social) values
  ('20000000-0000-0000-0000-0000000000f1', 'Minera Test SpA');
insert into public.contrato_empresa (id, empresa_id, vigencia_desde, headcount, tarifa_convenida, creado_por) values
  ('21000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-0000000000f1',
   '2026-01-01', 5, 20000, '10000000-0000-0000-0000-0000000000f1');
insert into public.trabajador (id, contrato_empresa_id, nombre) values
  ('22000000-0000-0000-0000-0000000000f1', '21000000-0000-0000-0000-0000000000f1', 'Juan Pérez');

-- 1) Primer almuerzo del día: debe aceptarse.
select lives_ok(
  $$ insert into public.consumo (id, trabajador_id, tipo_consumo, registrado_por, fecha_hora, uuid_idempotente)
     values ('23000000-0000-0000-0000-0000000000f1', '22000000-0000-0000-0000-0000000000f1',
             'almuerzo', '10000000-0000-0000-0000-0000000000f1', '2026-06-01 13:00:00+00', gen_random_uuid()) $$,
  'Primer registro de almuerzo del día debe aceptarse'
);

-- 2) Segundo almuerzo, mismo trabajador, mismo día: debe rechazarse
--    (doble-toque accidental, no es una corrección).
select throws_ok(
  $$ insert into public.consumo (trabajador_id, tipo_consumo, registrado_por, fecha_hora, uuid_idempotente)
     values ('22000000-0000-0000-0000-0000000000f1',
             'almuerzo', '10000000-0000-0000-0000-0000000000f1', '2026-06-01 13:05:00+00', gen_random_uuid()) $$,
  '23505',
  null,
  'Un segundo almuerzo del mismo trabajador el mismo día debe rechazarse'
);

-- 3) Otra ración distinta (cena) el mismo día: sí debe permitirse.
select lives_ok(
  $$ insert into public.consumo (trabajador_id, tipo_consumo, registrado_por, fecha_hora, uuid_idempotente)
     values ('22000000-0000-0000-0000-0000000000f1',
             'cena', '10000000-0000-0000-0000-0000000000f1', '2026-06-01 20:00:00+00', gen_random_uuid()) $$,
  'Una ración distinta (cena) el mismo día sí debe permitirse'
);

-- 4) Corrección explícita del almuerzo original: SÍ debe permitirse
--    aunque sea el mismo trabajador/ración/día (el índice único solo
--    aplica a consumo_corregido_id is null).
select lives_ok(
  $$ insert into public.consumo
       (trabajador_id, tipo_consumo, registrado_por, fecha_hora, uuid_idempotente,
        consumo_corregido_id, justificacion_correccion)
     values ('22000000-0000-0000-0000-0000000000f1', 'almuerzo',
             '10000000-0000-0000-0000-0000000000f1', '2026-06-01 13:10:00+00', gen_random_uuid(),
             '23000000-0000-0000-0000-0000000000f1', 'Se registró con recargo por error') $$,
  'Una corrección explícita del mismo trabajador/ración/día sí debe permitirse'
);

-- 5) v_consumo_vigente NO debe mostrar el almuerzo original (fue
--    corregido) — debe verse solo la corrección.
select is(
  (select count(*)::int from public.v_consumo_vigente
     where trabajador_id = '22000000-0000-0000-0000-0000000000f1' and tipo_consumo = 'almuerzo'),
  1,
  'v_consumo_vigente debe mostrar solo 1 fila de almuerzo (la corrección, no el original)'
);

select is(
  (select consumo_corregido_id is not null from public.v_consumo_vigente
     where trabajador_id = '22000000-0000-0000-0000-0000000000f1' and tipo_consumo = 'almuerzo'),
  true,
  'La fila vigente de almuerzo debe ser la corrección, no el original'
);

select * from finish();
rollback;
