begin;
select plan(16);
insert into auth.users(id) values ('00000000-0000-0000-0000-00000000ca01'), ('00000000-0000-0000-0000-00000000ca02');
insert into public.usuario(id,auth_uid,rol,nombre) values
 ('10000000-0000-0000-0000-00000000ca01','00000000-0000-0000-0000-00000000ca01','administradora','Administradora de prueba'),
 ('10000000-0000-0000-0000-00000000ca02','00000000-0000-0000-0000-00000000ca02','encargada','Encargada de prueba');
insert into public.habitacion(id,numero,capacidad) values ('30000000-0000-0000-0000-00000000ca01',991,1);
insert into public.cama(id,habitacion_id,numero) values ('40000000-0000-0000-0000-00000000ca01','30000000-0000-0000-0000-00000000ca01',1);
insert into public.reserva(id,tipo_cliente,cama_id,huesped_nombre,fecha_inicio,fecha_fin,creado_por,uuid_idempotente) values
 ('50000000-0000-0000-0000-00000000ca01','turista','40000000-0000-0000-0000-00000000ca01','Huésped de prueba','2030-01-01','2030-01-05','10000000-0000-0000-0000-00000000ca01',gen_random_uuid());

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000ca02"}',true);
select throws_ok($$update public.reserva set estado='cancelada',cancelada_por='10000000-0000-0000-0000-00000000ca02' where id='50000000-0000-0000-0000-00000000ca01'$$,'23514',null,'no se cancela sin motivo ni respaldo');
select throws_ok($$update public.reserva set estado='cancelada',motivo_cancelacion='No llega',cancelada_por='10000000-0000-0000-0000-00000000ca01',cancelada_en=now(),uuid_cancelacion=gen_random_uuid() where id='50000000-0000-0000-0000-00000000ca01'$$,'42501',null,'no se suplanta a otra usuaria');
select lives_ok($$update public.reserva set estado='cancelada',motivo_cancelacion='El huésped cambió su viaje',cancelada_por='10000000-0000-0000-0000-00000000ca02',cancelada_en='2030-01-01T12:00:00Z',uuid_cancelacion='90000000-0000-0000-0000-00000000ca01' where id='50000000-0000-0000-0000-00000000ca01'$$,'la Encargada puede cancelar antes de la llegada');
select is((select estado::text from public.reserva where id='50000000-0000-0000-0000-00000000ca01'),'cancelada','reserva conservada como cancelada');
select is((select motivo_cancelacion from public.reserva where id='50000000-0000-0000-0000-00000000ca01'),'El huésped cambió su viaje','se conserva el motivo');
select is((select estado::text from public.habitacion where numero=991),'disponible','cancelar no cambia el estado de la habitación');
select lives_ok($$update public.reserva set estado='cancelada',motivo_cancelacion='El huésped cambió su viaje',cancelada_por='10000000-0000-0000-0000-00000000ca02',cancelada_en='2030-01-01T12:00:00Z',uuid_cancelacion='90000000-0000-0000-0000-00000000ca01' where id='50000000-0000-0000-0000-00000000ca01'$$,'reenviar la misma cancelación es idempotente');
select throws_ok($$update public.reserva set motivo_cancelacion='Otro motivo distinto' where id='50000000-0000-0000-0000-00000000ca01'$$,'23514',null,'no se sobrescribe el respaldo de cancelación');
select throws_ok($$update public.reserva set estado='confirmada' where id='50000000-0000-0000-0000-00000000ca01'$$,'23514',null,'no se reactiva una reserva cancelada');
select throws_ok($$insert into public.checkin(reserva_id,realizado_por,uuid_idempotente) values('50000000-0000-0000-0000-00000000ca01','10000000-0000-0000-0000-00000000ca02',gen_random_uuid())$$,'23514',null,'no se hace check-in de una reserva cancelada');
select lives_ok($$insert into public.reserva(id,tipo_cliente,cama_id,huesped_nombre,fecha_inicio,fecha_fin,creado_por,uuid_idempotente) values('50000000-0000-0000-0000-00000000ca02','turista','40000000-0000-0000-0000-00000000ca01','Otra persona de prueba','2030-01-01','2030-01-05','10000000-0000-0000-0000-00000000ca02',gen_random_uuid())$$,'las mismas fechas quedan disponibles para otra reserva');
select lives_ok($$insert into public.checkin(reserva_id,realizado_por,uuid_idempotente) values('50000000-0000-0000-0000-00000000ca02','10000000-0000-0000-0000-00000000ca02',gen_random_uuid())$$,'la nueva reserva sí admite check-in');
select throws_ok($$update public.reserva set estado='cancelada',motivo_cancelacion='El huésped cambió su viaje',cancelada_por='10000000-0000-0000-0000-00000000ca02',cancelada_en=now(),uuid_cancelacion=gen_random_uuid() where id='50000000-0000-0000-0000-00000000ca02'$$,'23514',null,'no se cancela después del check-in');
select is((select estado::text from public.habitacion where numero=991),'ocupada','rechazar la cancelación conserva la ocupación');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000ca01"}',true);
select lives_ok($$insert into public.reserva(id,tipo_cliente,cama_id,huesped_nombre,fecha_inicio,fecha_fin,creado_por,uuid_idempotente) values('50000000-0000-0000-0000-00000000ca03','turista','40000000-0000-0000-0000-00000000ca01','Reserva futura de prueba','2031-01-01','2031-01-05','10000000-0000-0000-0000-00000000ca01',gen_random_uuid()); update public.reserva set estado='cancelada',motivo_cancelacion='Viaje suspendido por el huésped',cancelada_por='10000000-0000-0000-0000-00000000ca01',cancelada_en=now(),uuid_cancelacion=gen_random_uuid() where id='50000000-0000-0000-0000-00000000ca03'$$,'la Administradora puede cancelar una reserva futura');
reset role;
set local role anon;
select throws_ok($$update public.reserva set estado='cancelada'$$,'42501',null,'sin sesión no se pueden cancelar reservas');
reset role;
select * from finish();
rollback;
