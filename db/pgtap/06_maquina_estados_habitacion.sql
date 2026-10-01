-- HU-05/06/07/08/09: máquina de estados completa de habitacion, tal
-- como la disparan los triggers de 0001_init.sql. Cubre transiciones
-- válidas e inválidas — no toca RLS (eso ya está en 02_rls_insumo_compra
-- para el patrón general de roles; acá ambos roles pueden operar todo).
begin;
select plan(11);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000e1');
insert into public.usuario (id, auth_uid, rol, nombre) values
  ('10000000-0000-0000-0000-0000000000e1',
   '00000000-0000-0000-0000-0000000000e1', 'encargada', 'Encargada');

-- Habitación con 2 camas, para poder probar "check-in bloqueado si la
-- pieza ya no está Disponible" sin chocar con el EXCLUDE de reserva.
insert into public.habitacion (id, numero, capacidad) values
  ('30000000-0000-0000-0000-0000000000e1', 92, 2);
insert into public.cama (id, habitacion_id, numero) values
  ('40000000-0000-0000-0000-0000000000e1', '30000000-0000-0000-0000-0000000000e1', 1),
  ('40000000-0000-0000-0000-0000000000e2', '30000000-0000-0000-0000-0000000000e1', 2);

insert into public.reserva (id, tipo_cliente, cama_id, huesped_nombre, fecha_inicio, creado_por, uuid_idempotente) values
  ('50000000-0000-0000-0000-0000000000e1', 'turista', '40000000-0000-0000-0000-0000000000e1',
   'Huésped Uno', current_date, '10000000-0000-0000-0000-0000000000e1', gen_random_uuid()),
  ('50000000-0000-0000-0000-0000000000e2', 'turista', '40000000-0000-0000-0000-0000000000e2',
   'Huésped Dos', current_date, '10000000-0000-0000-0000-0000000000e1', gen_random_uuid());

-- 1) Check-in de la primera reserva: la pieza está Disponible, debe
--    aceptarse y dejar la habitación Ocupada.
select lives_ok(
  $$ insert into public.checkin (id, reserva_id, realizado_por, uuid_idempotente)
     values ('60000000-0000-0000-0000-0000000000e1', '50000000-0000-0000-0000-0000000000e1',
             '10000000-0000-0000-0000-0000000000e1', gen_random_uuid()) $$,
  'Check-in sobre habitación Disponible debe aceptarse'
);

select is(
  (select estado::text from public.habitacion where id = '30000000-0000-0000-0000-0000000000e1'),
  'ocupada',
  'El check-in debe dejar la habitación en estado Ocupada'
);

-- 2) Check-in de la segunda reserva: MISMA habitación (otra cama), que
--    ya quedó Ocupada por el paso anterior — debe rechazarse.
select throws_ok(
  $$ insert into public.checkin (reserva_id, realizado_por, uuid_idempotente)
     values ('50000000-0000-0000-0000-0000000000e2',
             '10000000-0000-0000-0000-0000000000e1', gen_random_uuid()) $$,
  'P0001',
  null,
  'Check-in bloqueado si la habitación ya no está Disponible'
);

-- 3) Check-out: la pieza debe pasar a En aseo y la reserva a Finalizada.
select lives_ok(
  $$ insert into public.checkout (checkin_id, realizado_por, uuid_idempotente)
     values ('60000000-0000-0000-0000-0000000000e1',
             '10000000-0000-0000-0000-0000000000e1', gen_random_uuid()) $$,
  'Check-out debe aceptarse sobre una habitación Ocupada'
);

select is(
  (select estado::text from public.habitacion where id = '30000000-0000-0000-0000-0000000000e1'),
  'en_aseo',
  'El check-out debe dejar la habitación En aseo'
);

select is(
  (select estado::text from public.reserva where id = '50000000-0000-0000-0000-0000000000e1'),
  'finalizada',
  'El check-out debe cerrar la reserva como Finalizada'
);

-- 4) Salto directo Ocupada -> Disponible sin pasar por aseo: bloqueado
--    (regla H). Se fuerza el estado a "ocupada" para aislar este caso
--    del de "aseo pendiente" ya cubierto arriba.
update public.habitacion set estado = 'ocupada' where id = '30000000-0000-0000-0000-0000000000e1';
select throws_ok(
  $$ update public.habitacion set estado = 'disponible'
     where id = '30000000-0000-0000-0000-0000000000e1' $$,
  'P0001',
  null,
  'Salto directo de Ocupada a Disponible debe estar bloqueado'
);

-- 5) Aseo diario (tipo=diario) sobre una habitación Ocupada: NO debe
--    cambiar el estado (sigue Ocupada, HU-08).
select lives_ok(
  $$ insert into public.aseo (habitacion_id, tipo, responsable, uuid_idempotente)
     values ('30000000-0000-0000-0000-0000000000e1', 'diario',
             '10000000-0000-0000-0000-0000000000e1', gen_random_uuid()) $$,
  'Aseo diario debe registrarse sin problema'
);
select is(
  (select estado::text from public.habitacion where id = '30000000-0000-0000-0000-0000000000e1'),
  'ocupada',
  'El aseo diario NO debe cambiar el estado de la habitación'
);

-- 6) Aseo post_checkout sobre una habitación En aseo: SÍ debe liberarla.
update public.habitacion set estado = 'en_aseo' where id = '30000000-0000-0000-0000-0000000000e1';
select lives_ok(
  $$ insert into public.aseo (habitacion_id, tipo, responsable, uuid_idempotente)
     values ('30000000-0000-0000-0000-0000000000e1', 'post_checkout',
             '10000000-0000-0000-0000-0000000000e1', gen_random_uuid()) $$,
  'Aseo post_checkout debe registrarse sin problema'
);
select is(
  (select estado::text from public.habitacion where id = '30000000-0000-0000-0000-0000000000e1'),
  'disponible',
  'El aseo post_checkout debe dejar la habitación Disponible'
);

select * from finish();
rollback;
