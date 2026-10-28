begin;
select plan(21);
insert into auth.users(id) values('00000000-0000-0000-0000-00000000cc01'),('00000000-0000-0000-0000-00000000cc02');
insert into public.usuario(id,auth_uid,rol,nombre) values
 ('10000000-0000-0000-0000-00000000cc01','00000000-0000-0000-0000-00000000cc01','administradora','Administradora de prueba'),
 ('10000000-0000-0000-0000-00000000cc02','00000000-0000-0000-0000-00000000cc02','encargada','Encargada de prueba');
insert into public.empresa(id,razon_social) values('20000000-0000-0000-0000-00000000cc01','Empresa cupos prueba'),('20000000-0000-0000-0000-00000000cc02','Otra empresa cupos prueba');
insert into public.contrato_empresa(id,empresa_id,vigencia_desde,vigencia_hasta,headcount,tarifa_convenida,creado_por) values
 ('30000000-0000-0000-0000-00000000cc01','20000000-0000-0000-0000-00000000cc01','2035-01-01','2035-01-30',4,25000,'10000000-0000-0000-0000-00000000cc01'),
 ('30000000-0000-0000-0000-00000000cc02','20000000-0000-0000-0000-00000000cc02','2035-01-01','2035-01-30',2,25000,'10000000-0000-0000-0000-00000000cc01');
create temporary table camas_prueba(n integer,id uuid,habitacion_id uuid,reserva_id uuid,uuid_idempotente uuid);
insert into camas_prueba select n,gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid() from generate_series(1,5) n;
insert into public.habitacion(id,numero,capacidad) select habitacion_id,9930+n,1 from camas_prueba;
insert into public.cama(id,habitacion_id,numero) select id,habitacion_id,1 from camas_prueba;
grant select on camas_prueba to authenticated;
create function pg_temp.lote() returns jsonb language sql as $$select jsonb_agg(jsonb_build_object('id',reserva_id,'cama_id',id,'contrato_empresa_id','30000000-0000-0000-0000-00000000cc01','cupo_numero',n,'fecha_inicio','2035-01-01','fecha_fin','2035-01-30','creado_por','10000000-0000-0000-0000-00000000cc01','uuid_idempotente',uuid_idempotente,'created_at','2026-10-28T12:00:00Z') order by n) from camas_prueba where n<=4$$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000cc01"}',true);
select lives_ok($$select public.reservar_cupos_empresa(pg_temp.lote())$$,'reserva cuatro camas durante toda la vigencia');
select is((select count(*)::integer from public.trabajador where contrato_empresa_id='30000000-0000-0000-0000-00000000cc01'),0,'no crea trabajadores ficticios');
select is((select count(*)::integer from public.consumo c join public.trabajador t on t.id=c.trabajador_id where t.contrato_empresa_id='30000000-0000-0000-0000-00000000cc01'),0,'los cupos no generan consumos');
select is((select count(*)::integer from public.reserva where contrato_empresa_id='30000000-0000-0000-0000-00000000cc01'),4,'cuatro reservas reales sin nombre');
select lives_ok($$select public.reservar_cupos_empresa(pg_temp.lote())$$,'reintentar el lote es idempotente');
select is((select count(*)::integer from public.reserva where contrato_empresa_id='30000000-0000-0000-0000-00000000cc01'),4,'el reintento no duplica camas');
select throws_ok($$select public.reservar_cupos_empresa(jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'cama_id',(select id from camas_prueba where n=5),'contrato_empresa_id','30000000-0000-0000-0000-00000000cc01','cupo_numero',5,'fecha_inicio','2035-01-01','fecha_fin','2035-01-30','creado_por','10000000-0000-0000-0000-00000000cc01','uuid_idempotente',gen_random_uuid(),'created_at',now())))$$,'23514',null,'no permite más cupos que personas contratadas');
select throws_ok($$insert into public.checkin(reserva_id,realizado_por,uuid_idempotente) values((select reserva_id from camas_prueba where n=1),'10000000-0000-0000-0000-00000000cc01',gen_random_uuid())$$,'23514',null,'el cupo sin identificar no permite check-in');
select lives_ok($$select public.identificar_cupo_empresa((select reserva_id from camas_prueba where n=1),'60000000-0000-0000-0000-00000000cc01','Persona real de prueba','90000000-0000-0000-0000-00000000cc01',now())$$,'identifica una persona real sin otra reserva');
select is((select count(*)::integer from public.reserva r join camas_prueba c on c.reserva_id=r.id where c.n=1 and r.cama_id=c.id and r.trabajador_id='60000000-0000-0000-0000-00000000cc01'),1,'conserva la misma reserva y cama');
select lives_ok($$select public.identificar_cupo_empresa((select reserva_id from camas_prueba where n=1),'60000000-0000-0000-0000-00000000cc01','Persona real de prueba','90000000-0000-0000-0000-00000000cc01',now())$$,'identificar es idempotente');
select throws_ok($$select public.identificar_cupo_empresa((select reserva_id from camas_prueba where n=1),'60000000-0000-0000-0000-00000000cc03','Otra persona de prueba',gen_random_uuid(),now())$$,'23514',null,'dos teléfonos no identifican el mismo cupo');
select is((select count(*)::integer from public.trabajador where id='60000000-0000-0000-0000-00000000cc03'),0,'el rechazo no deja una persona huérfana');
select lives_ok($$insert into public.checkin(reserva_id,realizado_por,uuid_idempotente) values((select reserva_id from camas_prueba where n=1),'10000000-0000-0000-0000-00000000cc01',gen_random_uuid())$$,'la persona identificada puede hacer check-in');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000cc02"}',true);
select lives_ok($$select public.identificar_cupo_empresa((select reserva_id from camas_prueba where n=2),'60000000-0000-0000-0000-00000000cc02','Persona real segunda','90000000-0000-0000-0000-00000000cc02',now())$$,'la Encargada puede completar la nómina');
reset role;set local role anon;
select throws_ok($$select public.reservar_cupos_empresa('[]'::jsonb)$$,'42501',null,'sin sesión no se reservan cupos');
reset role;
create function pg_temp.otro_lote() returns jsonb language sql as $$select jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'cama_id',id,'contrato_empresa_id','30000000-0000-0000-0000-00000000cc02','cupo_numero',case when n=5 then 1 else 2 end,'fecha_inicio','2035-01-01','fecha_fin','2035-01-30','creado_por','10000000-0000-0000-0000-00000000cc01','uuid_idempotente',gen_random_uuid(),'created_at',now()) order by n desc) from camas_prueba where n in(1,5)$$;
set local role authenticated;select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000cc01"}',true);
select throws_ok($$select public.reservar_cupos_empresa(pg_temp.otro_lote())$$,'23P01',null,'el mismo bloqueo de reservas impide ocupar una cama reservada');
select is((select count(*)::integer from public.reserva where contrato_empresa_id='30000000-0000-0000-0000-00000000cc02'),0,'un conflicto revierte el lote completo');
select throws_ok($$select public.reservar_cupos_empresa(jsonb_set(pg_temp.otro_lote(),'{0,creado_por}','"10000000-0000-0000-0000-00000000cc02"'::jsonb))$$,'42501',null,'no permite registrar el lote a nombre de otra usuaria');
select is((select count(*)::integer from public.trabajador where contrato_empresa_id='30000000-0000-0000-0000-00000000cc01' and nombre like 'Cupo%'),0,'los cupos no aparecen en la nómina como personas');
select throws_ok($$select public.reservar_cupos_empresa(jsonb_build_array(jsonb_set(pg_temp.otro_lote()->0,'{fecha_fin}','"2035-02-15"'::jsonb)))$$,'23514',null,'no acepta fechas fuera del contrato');
reset role;
select * from finish();
rollback;
