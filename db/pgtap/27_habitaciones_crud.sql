-- CAMBIO-01: CRUD de habitaciones en Ajustes (0028_habitaciones_crud.sql).
--
-- Nota técnica: dentro de una misma transacción pgTAP, now() devuelve
-- SIEMPRE el mismo instante (now() es estable por transacción, no por
-- statement) — así que "la última fila de la bitácora por created_at"
-- es ambiguo cuando se insertan varias en la misma prueba. Por eso
-- estas pruebas verifican EXISTENCIA de la fila de bitácora esperada
-- (count(*) > 0 con esa acción), no "la más reciente".
begin;
select plan(18);

insert into auth.users(id) values
  ('00000000-0000-0000-0000-00000000d001'),
  ('00000000-0000-0000-0000-00000000d002');
insert into public.usuario(id, auth_uid, rol, nombre) values
  ('10000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000d001', 'administradora', 'Administradora de prueba (habitaciones)'),
  ('10000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-00000000d002', 'encargada', 'Encargada de prueba (habitaciones)');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000d001"}', true);

-- 1) La Administradora puede crear una pieza, y queda en la bitácora.
select lives_ok(
  $$insert into public.habitacion (id, numero, capacidad, estado) values ('40000000-0000-0000-0000-00000000d001', 9941, 2, 'disponible')$$,
  'la Administradora puede crear una habitación'
);
select is(
  (select count(*)::integer from public.habitacion_auditoria where habitacion_id = '40000000-0000-0000-0000-00000000d001' and accion = 'creada'),
  1,
  'la creación queda en la bitácora'
);

-- 2) La Encargada NO puede crear una habitación (RLS rechaza con error).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000d002"}', true);
select throws_ok(
  $$insert into public.habitacion (id, numero, capacidad, estado) values ('40000000-0000-0000-0000-00000000d002', 9942, 1, 'disponible')$$,
  '42501', null,
  'la Encargada no puede crear una habitación (RLS)'
);
select is(
  (select count(*)::integer from public.habitacion where numero = 9942),
  0,
  'el intento rechazado de la Encargada no creó la fila'
);

-- 3) La Encargada NO puede editar número/capacidad/activa. La policy
-- de UPDATE es permisiva (la necesita el check-in/check-out/aseo de la
-- Encargada para mover `estado`, ver nota de alcance en 0028) — es el
-- trigger app.habitacion_validar_permiso_edicion() el que de verdad
-- bloquea estos 3 campos administrativos para quien no es
-- Administradora, y sí lanza excepción.
select throws_ok(
  $$update public.habitacion set capacidad = 1 where id = '40000000-0000-0000-0000-00000000d001'$$,
  '42501', null,
  'la Encargada no puede editar la capacidad (trigger de permiso)'
);
select is(
  (select capacidad from public.habitacion where id = '40000000-0000-0000-0000-00000000d001'),
  2,
  'la capacidad no cambió tras el intento rechazado'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000d001"}', true);

-- 4) La Administradora sí puede editar, y queda en la bitácora.
select lives_ok(
  $$update public.habitacion set capacidad = 1 where id = '40000000-0000-0000-0000-00000000d001'$$,
  'la Administradora puede editar la capacidad'
);
select is(
  (select count(*)::integer from public.habitacion_auditoria where habitacion_id = '40000000-0000-0000-0000-00000000d001' and accion = 'editada'),
  1,
  'la edición queda en la bitácora'
);
select lives_ok(
  $$update public.habitacion set capacidad = 2 where id = '40000000-0000-0000-0000-00000000d001'$$,
  'se puede volver a subir la capacidad'
);

-- 5) Dos camas con reserva futura/en curso sobre la pieza (capacidad 2).
insert into public.cama (id, habitacion_id, numero) values
  ('50000000-0000-0000-0000-00000000d001', '40000000-0000-0000-0000-00000000d001', 1),
  ('50000000-0000-0000-0000-00000000d002', '40000000-0000-0000-0000-00000000d001', 2);
insert into public.reserva (id, tipo_cliente, cama_id, huesped_nombre, fecha_inicio, estado, creado_por, uuid_idempotente) values
  ('60000000-0000-0000-0000-00000000d001', 'turista', '50000000-0000-0000-0000-00000000d001', 'Huésped de prueba 1', '2035-06-01', 'confirmada', '10000000-0000-0000-0000-00000000d001', gen_random_uuid()),
  ('60000000-0000-0000-0000-00000000d002', 'turista', '50000000-0000-0000-0000-00000000d002', 'Huésped de prueba 2', '2035-06-01', 'confirmada', '10000000-0000-0000-0000-00000000d001', gen_random_uuid());

-- 6) No se puede desactivar con reservas futuras/en curso.
select throws_ok(
  $$update public.habitacion set activa = false where id = '40000000-0000-0000-0000-00000000d001'$$,
  '23514', null,
  'no se puede desactivar una pieza con reservas futuras/en curso'
);

-- 7) No se puede reducir la capacidad por debajo de las camas ocupadas:
-- hay 2 camas con reserva activa, bajar a capacidad 1 debe rechazarse.
select throws_ok(
  $$update public.habitacion set capacidad = 1 where id = '40000000-0000-0000-0000-00000000d001'$$,
  '23514', null,
  'no se puede reducir la capacidad por debajo de las camas con reserva activa'
);

-- 8) No se puede eliminar: tiene historial (las reservas).
select throws_ok(
  $$select public.eliminar_habitacion('40000000-0000-0000-0000-00000000d001', 'prueba pgTAP')$$,
  '23514', null,
  'no se puede eliminar una pieza con historial de reservas'
);

-- 9) Cancelar ambas reservas y ahora sí poder desactivar.
update public.reserva set estado = 'cancelada', motivo_cancelacion = 'prueba pgTAP cancelacion', cancelada_por = '10000000-0000-0000-0000-00000000d001', cancelada_en = now(), uuid_cancelacion = gen_random_uuid()
  where id in ('60000000-0000-0000-0000-00000000d001', '60000000-0000-0000-0000-00000000d002');

select lives_ok(
  $$update public.habitacion set activa = false where id = '40000000-0000-0000-0000-00000000d001'$$,
  'sin reservas activas, sí se puede desactivar'
);
select is(
  (select count(*)::integer from public.habitacion_auditoria where habitacion_id = '40000000-0000-0000-0000-00000000d001' and accion = 'desactivada'),
  1,
  'la desactivación queda en la bitácora'
);

-- 10) Una reserva CANCELADA (no 'confirmada') sigue contando como
-- historial para eliminar_habitacion() (se fija en que exista
-- CUALQUIER fila de reserva, sin filtrar por estado): esta pieza ya no
-- se puede eliminar, solo desactivar. Para probar el camino feliz de
-- "sin ningún dato asociado" se usa una pieza nueva, sin ninguna
-- reserva jamás.
select throws_ok(
  $$select public.eliminar_habitacion('40000000-0000-0000-0000-00000000d001', 'prueba pgTAP historial cancelado')$$,
  '23514', null,
  'una reserva cancelada sigue siendo historial: tampoco se puede eliminar'
);

insert into public.habitacion (id, numero, capacidad, estado) values ('40000000-0000-0000-0000-00000000d003', 9943, 1, 'disponible');
select lives_ok(
  $$select public.eliminar_habitacion('40000000-0000-0000-0000-00000000d003', 'prueba pgTAP sin historial')$$,
  'una pieza sin ningún historial sí se puede eliminar'
);
select is(
  (select count(*)::integer from public.habitacion where id = '40000000-0000-0000-0000-00000000d003'),
  0,
  'la fila eliminada ya no existe'
);
select is(
  (select count(*)::integer from public.habitacion_auditoria where habitacion_numero = 9943 and accion = 'eliminada'),
  1,
  'la eliminación queda en la bitácora aunque la fila ya no exista'
);

reset role;
select * from finish();
rollback;
