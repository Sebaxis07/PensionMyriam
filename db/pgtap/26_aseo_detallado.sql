-- Registro opcional de aseo por habitación y cama (0027_aseo_detallado.sql).
-- Cubre: opcionalidad real de las columnas nuevas, validación de que
-- `cama_id` pertenezca a la habitación del registro, el patrón de
-- corrección (fila nueva, nunca UPDATE/DELETE) y que `aseo` ahora se
-- comporta como ledger inmutable igual que `consumo`.
--
-- La máquina de estados de habitación (06_maquina_estados_habitacion.sql,
-- 09_zona_horaria_checkout.sql) y la idempotencia (03_idempotencia.sql)
-- NO se tocan en esta migración y se verifican aparte, sin cambios,
-- como regresión.
begin;
select plan(12);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000f1');
insert into public.usuario (id, auth_uid, rol, nombre) values
  ('10000000-0000-0000-0000-0000000000f1',
   '00000000-0000-0000-0000-0000000000f1', 'encargada', 'Encargada Test');

insert into public.habitacion (id, numero, capacidad) values
  ('20000000-0000-0000-0000-0000000000f1', 61, 2),
  ('20000000-0000-0000-0000-0000000000f2', 62, 1);
insert into public.cama (id, habitacion_id, numero) values
  ('40000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-0000000000f1', 1),
  ('40000000-0000-0000-0000-0000000000f2', '20000000-0000-0000-0000-0000000000f1', 2),
  ('40000000-0000-0000-0000-0000000000f3', '20000000-0000-0000-0000-0000000000f2', 1);

-- 1) Registro rápido: ninguna columna nueva es obligatoria.
select lives_ok(
  $$ insert into public.aseo (id, habitacion_id, tipo, responsable, uuid_idempotente)
     values ('50000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-0000000000f1',
             'diario', '10000000-0000-0000-0000-0000000000f1', gen_random_uuid()) $$,
  'Un registro de aseo sin cama/tareas/observaciones/pendiente/responsable_declarado debe insertarse igual (todo opcional)'
);

select is(
  (select modalidad::text from public.aseo where id = '50000000-0000-0000-0000-0000000000f1'),
  'rapido',
  'modalidad por defecto debe ser rapido'
);

select is(
  (select pendiente from public.aseo where id = '50000000-0000-0000-0000-0000000000f1'),
  false,
  'pendiente por defecto debe ser false'
);

-- 2) Registro detallado con cama de la MISMA habitación: debe aceptarse.
select lives_ok(
  $$ insert into public.aseo
       (id, habitacion_id, tipo, responsable, uuid_idempotente, cama_id, modalidad, tareas, observaciones, pendiente, responsable_declarado)
     values ('50000000-0000-0000-0000-0000000000f2', '20000000-0000-0000-0000-0000000000f1',
             'diario', '10000000-0000-0000-0000-0000000000f1', gen_random_uuid(),
             '40000000-0000-0000-0000-0000000000f1', 'detallado',
             '["cambiar_sabanas","ordenar_camas"]', 'Falta cambiar funda de la cama 2', true,
             'cuñada de María') $$,
  'Registro detallado con cama propia de la habitación debe aceptarse'
);

-- 3) cama_id de OTRA habitación: debe rechazarse.
select throws_ok(
  $$ insert into public.aseo (habitacion_id, tipo, responsable, uuid_idempotente, cama_id)
     values ('20000000-0000-0000-0000-0000000000f1', 'diario',
             '10000000-0000-0000-0000-0000000000f1', gen_random_uuid(),
             '40000000-0000-0000-0000-0000000000f3') $$,
  'P0001',
  null,
  'cama_id que no pertenece a la habitación del registro debe rechazarse'
);

-- 4) Limpiar la cama 2 de una habitación no debe afectar la cama 1
--    (independencia por cama, caso #6 del encargo).
select lives_ok(
  $$ insert into public.aseo (habitacion_id, tipo, responsable, uuid_idempotente, cama_id, modalidad)
     values ('20000000-0000-0000-0000-0000000000f1', 'diario',
             '10000000-0000-0000-0000-0000000000f1', gen_random_uuid(),
             '40000000-0000-0000-0000-0000000000f2', 'detallado') $$,
  'Registrar aseo de la cama 2 no debe fallar ni requerir tocar la cama 1'
);
select is(
  (select count(*)::int from public.aseo where cama_id = '40000000-0000-0000-0000-0000000000f1'),
  1,
  'El registro de la cama 1 sigue existiendo solo, sin duplicarse por el registro de la cama 2'
);

-- 5) Corrección sin justificación: debe rechazarse (constraint).
select throws_ok(
  $$ insert into public.aseo (habitacion_id, tipo, responsable, uuid_idempotente, aseo_corregido_id)
     values ('20000000-0000-0000-0000-0000000000f1', 'diario',
             '10000000-0000-0000-0000-0000000000f1', gen_random_uuid(),
             '50000000-0000-0000-0000-0000000000f1') $$,
  '23514',
  null,
  'Corrección sin justificacion_correccion debe rechazarse'
);

-- 6) Corrección CON justificación: debe aceptarse y dejar ambas filas.
select lives_ok(
  $$ insert into public.aseo
       (id, habitacion_id, tipo, responsable, uuid_idempotente, aseo_corregido_id, justificacion_correccion)
     values ('50000000-0000-0000-0000-0000000000f3', '20000000-0000-0000-0000-0000000000f1',
             'diario', '10000000-0000-0000-0000-0000000000f1', gen_random_uuid(),
             '50000000-0000-0000-0000-0000000000f1', 'Se registró el tipo de tarea equivocado') $$,
  'Corrección con justificación debe aceptarse'
);
select is(
  (select count(*)::int from public.aseo
    where id in ('50000000-0000-0000-0000-0000000000f1', '50000000-0000-0000-0000-0000000000f3')),
  2,
  'La corrección NO borra ni reemplaza la fila original: ambas deben seguir existiendo'
);

-- 7) Ledger inmutable: UPDATE y DELETE directos deben rechazarse ahora.
select throws_ok(
  $$ update public.aseo set observaciones = 'editado a mano'
     where id = '50000000-0000-0000-0000-0000000000f1' $$,
  'P0001',
  null,
  'UPDATE directo sobre aseo debe rechazarse (ledger inmutable, igual que consumo)'
);
select throws_ok(
  $$ delete from public.aseo where id = '50000000-0000-0000-0000-0000000000f1' $$,
  'P0001',
  null,
  'DELETE directo sobre aseo debe rechazarse'
);

select * from finish();
rollback;
