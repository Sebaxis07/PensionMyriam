-- HU-34: función protegida para atender solicitudes individuales de
-- supresión, con constancia en la bitácora, y bloqueo REAL para la
-- Encargada (no "el botón está oculto").
--
-- Corre como el rol `authenticated` —el mismo de PostgREST— para que la
-- autorización se evalúe de verdad.
begin;
select plan(9);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000e001'),
  ('00000000-0000-0000-0000-00000000e002');

insert into public.usuario (id, auth_uid, rol, nombre) values
  ('10000000-0000-0000-0000-00000000e001',
   '00000000-0000-0000-0000-00000000e001', 'administradora', 'María'),
  ('10000000-0000-0000-0000-00000000e002',
   '00000000-0000-0000-0000-00000000e002', 'encargada', 'Encargada de Registro');

insert into public.empresa (id, razon_social)
  values ('20000000-0000-0000-0000-00000000e001', 'Minera Paposo SpA');

insert into public.contrato_empresa
  (id, empresa_id, vigencia_desde, vigencia_hasta, headcount, tarifa_convenida, creado_por)
values ('30000000-0000-0000-0000-00000000e001', '20000000-0000-0000-0000-00000000e001',
        '2026-01-01', '2026-12-31', 10, 25000, '10000000-0000-0000-0000-00000000e001');

insert into public.trabajador (id, contrato_empresa_id, nombre, rut) values
  ('40000000-0000-0000-0000-00000000e001', '30000000-0000-0000-0000-00000000e001',
   'Rodrigo Tapia', '15.420.123-K'),
  ('40000000-0000-0000-0000-00000000e002', '30000000-0000-0000-0000-00000000e001',
   'Luis Araya', '13.111.222-3');

insert into public.consumo
  (id, trabajador_id, tipo_consumo, fecha_hora, registrado_por, uuid_idempotente)
values ('50000000-0000-0000-0000-00000000e001', '40000000-0000-0000-0000-00000000e001',
        'almuerzo', '2026-06-15 13:00:00-04', '10000000-0000-0000-0000-00000000e001',
        '60000000-0000-0000-0000-00000000e001');

-- =====================================================================
-- Encargada: el sistema debe BLOQUEARLE el acceso (criterio 2)
-- =====================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000e002')::text, true);

select throws_ok(
  $$ select public.atender_derecho_supresion(
       'trabajador', '40000000-0000-0000-0000-00000000e001', 'Solicitud del titular') $$,
  '42501',
  null,
  'la Encargada NO debe poder ejecutar la supresión, ni invocando el RPC directamente (HU-34, criterio 2)'
);

select is(
  (select nombre from public.trabajador where id = '40000000-0000-0000-0000-00000000e001'),
  'Rodrigo Tapia',
  'tras el intento de la Encargada el dato debe seguir intacto'
);

reset role;

-- =====================================================================
-- Administradora: supresión inmediata + constancia (criterio 1)
-- =====================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000e001')::text, true);

select lives_ok(
  $$ select public.atender_derecho_supresion(
       'trabajador', '40000000-0000-0000-0000-00000000e001',
       'Solicitud escrita del titular recibida el 2026-10-20') $$,
  'la Administradora debe poder ejecutar la supresión'
);

select is(
  (select nombre from public.trabajador where id = '40000000-0000-0000-0000-00000000e001'),
  'TRABAJADOR ANONIMIZADO (SOLICITUD TITULAR)',
  'el registro del titular se anonimiza de inmediato (HU-34, criterio 1)'
);

select is(
  (select rut from public.trabajador where id = '40000000-0000-0000-0000-00000000e001'),
  null,
  'el RUT del titular queda en nulo'
);

-- El motivo es obligatorio: sin él la bitácora no podría justificar la
-- destrucción del dato.
select throws_ok(
  $$ select public.atender_derecho_supresion(
       'trabajador', '40000000-0000-0000-0000-00000000e002', '   ') $$,
  '22023',
  null,
  'la supresión debe exigir un motivo: la constancia tiene que decir por qué (HU-34, criterio 1)'
);

reset role;

-- Constancia con motivo y fecha, atribuida a quien la ejecutó.
select is(
  (select count(*)::int from public.bitacora_acceso_datos_personales
    where accion = 'solicitud_derechos_arco'
      and usuario_id = '10000000-0000-0000-0000-00000000e001'
      and detalle ->> 'tipo_derecho' = 'supresion'
      and detalle ->> 'motivo' = 'Solicitud escrita del titular recibida el 2026-10-20'),
  1,
  'debe quedar constancia en la bitácora con motivo y fecha (HU-34, criterio 1)'
);

-- La constancia no debe reintroducir el dato personal que se acaba de
-- suprimir: sería guardar el nombre justo donde queda para siempre.
select is_empty(
  $$ select 1 from public.bitacora_acceso_datos_personales
      where detalle::text like '%Rodrigo Tapia%' $$,
  'la bitácora no debe copiar el nombre suprimido'
);

-- El ledger no se toca.
select is(
  (select count(*)::int from public.consumo
    where trabajador_id = '40000000-0000-0000-0000-00000000e001'),
  1,
  'la supresión no altera el libro contable inmutable (RNF-03)'
);

select * from finish();
rollback;
