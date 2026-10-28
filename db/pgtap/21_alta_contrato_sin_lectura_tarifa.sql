-- Regresión del 403 al sincronizar un alta de contrato.
begin;
select plan(4);
insert into auth.users(id) values('00000000-0000-0000-0000-00000000cb01');
insert into public.usuario(id,auth_uid,rol,nombre) values('10000000-0000-0000-0000-00000000cb01','00000000-0000-0000-0000-00000000cb01','administradora','Administradora de prueba');
insert into public.empresa(id,razon_social) values('20000000-0000-0000-0000-00000000cb01','Empresa de prueba de sincronización');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000cb01"}',true);
select throws_ok($$insert into public.contrato_empresa(id,empresa_id,vigencia_desde,headcount,tarifa_convenida,creado_por) values('30000000-0000-0000-0000-00000000cb01','20000000-0000-0000-0000-00000000cb01','2035-01-01',10,25000,'10000000-0000-0000-0000-00000000cb01') on conflict(id) do update set tarifa_convenida=excluded.tarifa_convenida$$,'42501',null,'el upsert anterior exige leer la tarifa protegida y falla');
select lives_ok($$insert into public.contrato_empresa(id,empresa_id,vigencia_desde,headcount,tarifa_convenida,creado_por) values('30000000-0000-0000-0000-00000000cb01','20000000-0000-0000-0000-00000000cb01','2035-01-01',10,25000,'10000000-0000-0000-0000-00000000cb01') on conflict(id) do nothing$$,'el alta sin sobrescritura sí está autorizada');
select lives_ok($$insert into public.contrato_empresa(id,empresa_id,vigencia_desde,headcount,tarifa_convenida,creado_por) values('30000000-0000-0000-0000-00000000cb01','20000000-0000-0000-0000-00000000cb01','2035-01-01',99,99000,'10000000-0000-0000-0000-00000000cb01') on conflict(id) do nothing$$,'reenviar el mismo ID no duplica ni sobrescribe el contrato');
select is((select tarifa_convenida from public.contrato_empresa_rest where id='30000000-0000-0000-0000-00000000cb01'),25000::numeric,'la tarifa original se conserva');
reset role;
select * from finish();
rollback;
