-- HU-01: nunca dos reservas Confirmadas sobre la misma cama en fechas
-- que se cruzan (0003_sync_sprint1.sql).
begin;
select plan(4);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000d1');
insert into public.usuario (id, auth_uid, rol, nombre) values
  ('10000000-0000-0000-0000-0000000000d1',
   '00000000-0000-0000-0000-0000000000d1', 'administradora', 'María');

insert into public.habitacion (id, numero, capacidad) values
  ('30000000-0000-0000-0000-0000000000d1', 91, 1);
insert into public.cama (id, habitacion_id, numero) values
  ('40000000-0000-0000-0000-0000000000d1', '30000000-0000-0000-0000-0000000000d1', 1);

-- 1) Primera reserva turista, 10 al 15 de enero: debe crearse sin problema.
select lives_ok(
  $$ insert into public.reserva
       (tipo_cliente, cama_id, huesped_nombre, fecha_inicio, fecha_fin, creado_por, uuid_idempotente)
     values ('turista', '40000000-0000-0000-0000-0000000000d1', 'Juana Pérez',
             '2026-01-10', '2026-01-15', '10000000-0000-0000-0000-0000000000d1', gen_random_uuid()) $$,
  'Primera reserva sobre la cama debe crearse sin problema'
);

-- 2) Segunda reserva de OTRO cliente, misma cama, fechas que se cruzan
--    (13 cae dentro del rango 10-15): debe ser rechazada.
select throws_ok(
  $$ insert into public.reserva
       (tipo_cliente, cama_id, huesped_nombre, fecha_inicio, fecha_fin, creado_por, uuid_idempotente)
     values ('turista', '40000000-0000-0000-0000-0000000000d1', 'Pedro Soto',
             '2026-01-13', '2026-01-20', '10000000-0000-0000-0000-0000000000d1', gen_random_uuid()) $$,
  '23P01',
  null,
  'Una reserva con fechas que se cruzan en la misma cama debe ser rechazada por el EXCLUDE'
);

-- 3) Reserva que empieza el día DESPUÉS de que termina la primera: sin
--    solape, debe permitirse. Ambos bordes del rango son inclusivos
--    ('[]' en el EXCLUDE de 0003_sync_sprint1.sql), así que el mismo
--    día no puede ser a la vez "hasta" de una reserva e "inicio" de
--    otra en la misma cama — el día 15 ya es de la primera reserva.
select lives_ok(
  $$ insert into public.reserva
       (tipo_cliente, cama_id, huesped_nombre, fecha_inicio, fecha_fin, creado_por, uuid_idempotente)
     values ('turista', '40000000-0000-0000-0000-0000000000d1', 'Rosa Díaz',
             '2026-01-16', '2026-01-20', '10000000-0000-0000-0000-0000000000d1', gen_random_uuid()) $$,
  'Una reserva consecutiva (sin solape) sobre la misma cama debe permitirse'
);

-- 4) Fechas que se cruzan pero en OTRA cama: sí debe permitirse (el
--    EXCLUDE es por cama_id, no global).
insert into public.cama (id, habitacion_id, numero) values
  ('40000000-0000-0000-0000-0000000000d2', '30000000-0000-0000-0000-0000000000d1', 2);

select lives_ok(
  $$ insert into public.reserva
       (tipo_cliente, cama_id, huesped_nombre, fecha_inicio, fecha_fin, creado_por, uuid_idempotente)
     values ('turista', '40000000-0000-0000-0000-0000000000d2', 'Ana Rojas',
             '2026-01-12', '2026-01-18', '10000000-0000-0000-0000-0000000000d1', gen_random_uuid()) $$,
  'Fechas que se cruzan en OTRA cama sí deben permitirse'
);

select * from finish();
rollback;
