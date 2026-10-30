-- Verifica RNF-03: consumo es un libro contable inmutable.
begin;
select plan(4);

-- Fixture mínima: usuario, empresa, contrato, trabajador
insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001');
insert into public.usuario (id, auth_uid, rol, nombre)
  values ('10000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000001', 'encargada', 'Encargada Test');

insert into public.empresa (id, razon_social)
  values ('20000000-0000-0000-0000-000000000001', 'Minera Test SpA');

insert into public.contrato_empresa
  (id, empresa_id, vigencia_desde, headcount, tarifa_convenida, creado_por)
  values ('30000000-0000-0000-0000-000000000001',
          '20000000-0000-0000-0000-000000000001', current_date, 10, 20000,
          '10000000-0000-0000-0000-000000000001');

insert into public.trabajador (id, contrato_empresa_id, nombre)
  values ('40000000-0000-0000-0000-000000000001',
          '30000000-0000-0000-0000-000000000001', 'Trabajador Uno');

insert into public.consumo
  (id, trabajador_id, tipo_consumo, registrado_por, uuid_idempotente)
  values ('50000000-0000-0000-0000-000000000001',
          '40000000-0000-0000-0000-000000000001', 'almuerzo',
          '10000000-0000-0000-0000-000000000001',
          '60000000-0000-0000-0000-000000000001');

-- 1) UPDATE directo debe fallar
select throws_ok(
  $$ update public.consumo set tipo_consumo = 'cena'
     where id = '50000000-0000-0000-0000-000000000001' $$,
  null,
  'consumo es un libro contable inmutable: use una fila de corrección (consumo_corregido_id), no UPDATE directo',
  'UPDATE directo sobre consumo debe ser rechazado'
);

-- 2) DELETE directo debe fallar
select throws_ok(
  $$ delete from public.consumo where id = '50000000-0000-0000-0000-000000000001' $$,
  null,
  'consumo es un libro contable inmutable: use una fila de corrección (consumo_corregido_id), no DELETE directo',
  'DELETE directo sobre consumo debe ser rechazado'
);

-- 3) La corrección correcta (INSERT con consumo_corregido_id + justificación) sí debe pasar
select lives_ok(
  $$ insert into public.consumo
       (trabajador_id, tipo_consumo, registrado_por, uuid_idempotente,
        consumo_corregido_id, justificacion_correccion)
     values
       ('40000000-0000-0000-0000-000000000001', 'cena',
        '10000000-0000-0000-0000-000000000001',
        '60000000-0000-0000-0000-000000000002',
        '50000000-0000-0000-0000-000000000001',
        'Se registró almuerzo por error, correspondía cena') $$,
  'Una corrección vía INSERT con justificación sí debe permitirse'
);

-- 4) Una corrección sin justificación debe fallar (constraint)
select throws_ok(
  $$ insert into public.consumo
       (trabajador_id, tipo_consumo, registrado_por, uuid_idempotente,
        consumo_corregido_id)
     values
       ('40000000-0000-0000-0000-000000000001', 'cena',
        '10000000-0000-0000-0000-000000000001',
        '60000000-0000-0000-0000-000000000003',
        '50000000-0000-0000-0000-000000000001') $$,
  '23514',
  null,
  'Una corrección sin justificación debe violar el constraint correccion_requiere_justificacion'
);

select * from finish();
rollback;
