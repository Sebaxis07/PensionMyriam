-- HU-33 (soporte): `cierre_facturacion` es el hecho que arranca el
-- plazo de retención de datos personales. Si se pudiera editar o
-- borrar, se podría estirar o adelantar a voluntad el plazo legal de
-- conservación — por eso es append-only y exclusivo de la
-- Administradora, y por eso no viaja al celular de la Encargada
-- (lleva total_facturado, dato financiero: decisión E de CLAUDE.md).
begin;
select plan(8);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000c001'),
  ('00000000-0000-0000-0000-00000000c002');

insert into public.usuario (id, auth_uid, rol, nombre) values
  ('10000000-0000-0000-0000-00000000c001',
   '00000000-0000-0000-0000-00000000c001', 'administradora', 'María'),
  ('10000000-0000-0000-0000-00000000c002',
   '00000000-0000-0000-0000-00000000c002', 'encargada', 'Encargada de Registro');

insert into public.empresa (id, razon_social)
  values ('20000000-0000-0000-0000-00000000c001', 'Minera Paposo SpA');

insert into public.contrato_empresa
  (id, empresa_id, vigencia_desde, vigencia_hasta, headcount, tarifa_convenida, creado_por)
values ('30000000-0000-0000-0000-00000000c001', '20000000-0000-0000-0000-00000000c001',
        '2026-01-01', '2026-03-31', 10, 25000, '10000000-0000-0000-0000-00000000c001');

-- =====================================================================
-- Administradora: puede cerrar; un segundo cierre del mismo período no
-- =====================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000c001')::text, true);

select lives_ok(
  $$ insert into public.cierre_facturacion
       (contrato_empresa_id, periodo_anio, periodo_mes, total_facturado,
        cerrado_por, uuid_idempotente)
     values ('30000000-0000-0000-0000-00000000c001', 2026, 2, 7500000,
             '10000000-0000-0000-0000-00000000c001',
             '90000000-0000-0000-0000-00000000c001') $$,
  'la Administradora debe poder registrar el cierre de facturación del período'
);

select throws_ok(
  $$ insert into public.cierre_facturacion
       (contrato_empresa_id, periodo_anio, periodo_mes, total_facturado,
        cerrado_por, uuid_idempotente)
     values ('30000000-0000-0000-0000-00000000c001', 2026, 2, 9999999,
             '10000000-0000-0000-0000-00000000c001',
             '90000000-0000-0000-0000-00000000c002') $$,
  '23505',
  null,
  'un período de un contrato se cierra UNA vez: un segundo cierre no puede mover el reloj de la retención'
);

-- RNF-06: el reintento de la MISMA operación (corte de red a mitad de
-- envío) choca contra uuid_idempotente, no duplica el cierre.
select throws_ok(
  $$ insert into public.cierre_facturacion
       (contrato_empresa_id, periodo_anio, periodo_mes, total_facturado,
        cerrado_por, uuid_idempotente)
     values ('30000000-0000-0000-0000-00000000c001', 2026, 3, 7500000,
             '10000000-0000-0000-0000-00000000c001',
             '90000000-0000-0000-0000-00000000c001') $$,
  '23505',
  null,
  'reenviar el mismo cierre (mismo uuid_idempotente) no debe crear una segunda fila (RNF-06)'
);

reset role;

-- =====================================================================
-- Append-only: ni editar ni borrar, tampoco como dueño de la tabla
-- =====================================================================
select throws_ok(
  $$ update public.cierre_facturacion set cerrado_at = now() - interval '1 year' $$,
  null,
  'no se puede adelantar cerrado_at: sería adelantar la purga de datos personales'
);

select throws_ok(
  $$ delete from public.cierre_facturacion $$,
  null,
  'no se puede borrar un cierre de facturación: es evidencia de auditoría'
);

-- =====================================================================
-- Encargada: ni lo ve ni lo escribe (dato financiero)
-- =====================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000c002')::text, true);

select is(
  (select count(*)::int from public.cierre_facturacion),
  0,
  'la Encargada NO debe ver los cierres de facturación: llevan el monto facturado (decisión E)'
);

select throws_ok(
  $$ insert into public.cierre_facturacion
       (contrato_empresa_id, periodo_anio, periodo_mes, total_facturado,
        cerrado_por, uuid_idempotente)
     values ('30000000-0000-0000-0000-00000000c001', 2026, 4, 1,
             '10000000-0000-0000-0000-00000000c002',
             '90000000-0000-0000-0000-00000000c003') $$,
  null,
  'la Encargada NO debe poder cerrar la facturación de un período'
);

reset role;

-- Un período inexistente en el calendario no se puede cerrar.
select throws_ok(
  $$ insert into public.cierre_facturacion
       (contrato_empresa_id, periodo_anio, periodo_mes, total_facturado,
        cerrado_por, uuid_idempotente)
     values ('30000000-0000-0000-0000-00000000c001', 2026, 13, 1,
             '10000000-0000-0000-0000-00000000c001',
             '90000000-0000-0000-0000-00000000c004') $$,
  '23514',
  null,
  'el mes del período debe estar entre 1 y 12'
);

select * from finish();
rollback;
