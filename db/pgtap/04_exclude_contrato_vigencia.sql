-- Verifica decisión B/C: nunca dos vigencias solapadas de contrato
-- para la misma empresa (headcount y tarifa versionados en el tiempo).
begin;
select plan(4);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000c1');
insert into public.usuario (id, auth_uid, rol, nombre) values
  ('10000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000000000c1', 'administradora', 'María');

insert into public.empresa (id, razon_social)
  values ('20000000-0000-0000-0000-0000000000c1', 'Minera Test SpA');

-- 1) Primer contrato: enero-marzo, 30 trabajadores
select lives_ok(
  $$ insert into public.contrato_empresa
       (empresa_id, vigencia_desde, vigencia_hasta, headcount, tarifa_convenida, creado_por)
     values ('20000000-0000-0000-0000-0000000000c1',
             '2026-01-01', '2026-03-31', 30, 20000,
             '10000000-0000-0000-0000-0000000000c1') $$,
  'Primer contrato de la empresa debe crearse sin problema'
);

-- 2) Segundo contrato de la MISMA empresa con fechas que SE SOLAPAN
--    (marzo cae dentro del rango del primero): debe ser rechazado.
select throws_ok(
  $$ insert into public.contrato_empresa
       (empresa_id, vigencia_desde, vigencia_hasta, headcount, tarifa_convenida, creado_por)
     values ('20000000-0000-0000-0000-0000000000c1',
             '2026-03-15', '2026-06-30', 25, 22000,
             '10000000-0000-0000-0000-0000000000c1') $$,
  '23P01',
  null,
  'Un contrato con vigencia solapada para la misma empresa debe ser rechazado por el EXCLUDE'
);

-- 3) Contrato que empieza justo donde termina el primero (sin solape):
--    debe permitirse (esto es exactamente el caso de "la empresa bajó
--    de 30 a 25 trabajadores": se cierra una vigencia y se abre otra).
select lives_ok(
  $$ insert into public.contrato_empresa
       (empresa_id, vigencia_desde, vigencia_hasta, headcount, tarifa_convenida, creado_por)
     values ('20000000-0000-0000-0000-0000000000c1',
             '2026-04-01', '2026-06-30', 25, 22000,
             '10000000-0000-0000-0000-0000000000c1') $$,
  'Un contrato con vigencia consecutiva (sin solape) debe permitirse'
);

-- 4) Un contrato solapado de OTRA empresa distinta sí debe permitirse
--    (el EXCLUDE es por empresa_id, no global).
insert into public.empresa (id, razon_social)
  values ('20000000-0000-0000-0000-0000000000c2', 'Otra Empresa SpA');

select lives_ok(
  $$ insert into public.contrato_empresa
       (empresa_id, vigencia_desde, vigencia_hasta, headcount, tarifa_convenida, creado_por)
     values ('20000000-0000-0000-0000-0000000000c2',
             '2026-01-15', '2026-04-15', 10, 18000,
             '10000000-0000-0000-0000-0000000000c1') $$,
  'Vigencias solapadas de EMPRESAS DISTINTAS sí deben permitirse'
);

select * from finish();
rollback;
