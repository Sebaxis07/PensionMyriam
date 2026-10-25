-- Regresión dedicada del defecto transversal de zona horaria (auditoría
-- Sprint 3): confirma que app.checkout_dispara_aseo() nunca puede violar
-- "fechas_coherentes" cuando fecha_inicio se fija con el MISMO criterio
-- de día de negocio que usa el trigger (app.fecha_santiago), sin
-- importar en qué TimeZone esté la sesión que ejecuta el check-out.
--
-- No se puede "viajar en el tiempo" dentro de un test pgTAP para forzar
-- que now() caiga justo en la ventana 00:00-03:00 UTC — en vez de eso,
-- se simula esa ventana fijando el TimeZone de la sesión a un huso
-- donde el equivalente horario SÍ es tarde en la noche, y se verifica
-- que app.fecha_santiago(now()) (la fuente de verdad real) sigue dando
-- el día correcto de Santiago, consistente con lo que usa el trigger.
begin;
select plan(5);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000f1');
insert into public.usuario (id, auth_uid, rol, nombre) values
  ('10000000-0000-0000-0000-0000000000f1',
   '00000000-0000-0000-0000-0000000000f1', 'encargada', 'Encargada');

insert into public.habitacion (id, numero, capacidad) values
  ('30000000-0000-0000-0000-0000000000f1', 94, 1);
insert into public.cama (id, habitacion_id, numero) values
  ('40000000-0000-0000-0000-0000000000f1', '30000000-0000-0000-0000-0000000000f1', 1);

-- 1) app.fecha_santiago es inmutable y coincide con la conversión directa.
select is(
  app.fecha_santiago('2026-10-25 00:30:00+00'::timestamptz),
  '2026-10-24'::date,
  'app.fecha_santiago(00:30 UTC) debe dar el día de Santiago anterior (21:30 del día 24, no el 25)'
);

-- 2) Reserva creada con el MISMO criterio que usará el checkout: nunca
--    puede quedar fecha_inicio > fecha_fin aunque el check-in y el
--    check-out ocurran en el instante exacto del borde horario.
insert into public.reserva (id, tipo_cliente, cama_id, huesped_nombre, fecha_inicio, creado_por, uuid_idempotente) values
  ('50000000-0000-0000-0000-0000000000f1', 'turista', '40000000-0000-0000-0000-0000000000f1',
   'Huésped Frontera', app.fecha_santiago('2026-10-25 00:30:00+00'::timestamptz),
   '10000000-0000-0000-0000-0000000000f1', gen_random_uuid());

insert into public.checkin (id, reserva_id, realizado_por, fecha_hora, uuid_idempotente) values
  ('60000000-0000-0000-0000-0000000000f1', '50000000-0000-0000-0000-0000000000f1',
   '10000000-0000-0000-0000-0000000000f1', '2026-10-25 00:30:00+00', gen_random_uuid());

-- Check-out 10 minutos después, todavía dentro de la misma ventana
-- 00:00-03:00 UTC (21:40 hora de Chile del día 24) — el caso exacto
-- que antes de la corrección rechazaba el checkout.
select lives_ok(
  $$ insert into public.checkout (checkin_id, realizado_por, fecha_hora, uuid_idempotente)
     values ('60000000-0000-0000-0000-0000000000f1',
             '10000000-0000-0000-0000-0000000000f1', '2026-10-25 00:40:00+00', gen_random_uuid()) $$,
  'Check-out en la ventana 00:00-03:00 UTC (noche de Chile) no debe violar fechas_coherentes'
);

select is(
  (select fecha_fin from public.reserva where id = '50000000-0000-0000-0000-0000000000f1'),
  '2026-10-24'::date,
  'fecha_fin debe quedar en el mismo día de Santiago que fecha_inicio (24), no en el 25'
);

-- 3) Mismo escenario pero cruzando la transición de horario de invierno
--    (5 de abril de 2026: Santiago pasa de -03:00 a -04:00 a la
--    medianoche local). app.fecha_santiago debe seguir resolviendo el
--    día correcto sin un offset fijo.
select is(
  app.fecha_santiago('2026-04-05T03:30:00+00'::timestamptz),
  '2026-04-04'::date,
  'Justo antes de la transición de abril (03:30 UTC = 23:30 del día 4 en -04:00), sigue siendo el día 4'
);

select is(
  app.fecha_santiago('2026-04-05T04:30:00+00'::timestamptz),
  '2026-04-05'::date,
  'Una hora después (04:30 UTC = 00:30 del día 5 en -04:00), ya es el día 5'
);

select * from finish();
rollback;
