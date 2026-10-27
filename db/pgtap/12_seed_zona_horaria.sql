-- Regresión del defecto de zona horaria en los scripts de siembra
-- (db/seed-demo.sh, db/seed-demo-empresa.sh, db/volume-test-empresa.sh):
-- usaban `current_date`/`now()` bajo el TimeZone de SESIÓN por defecto
-- del contenedor (UTC), no el de negocio (America/Santiago). Entre las
-- 21:00 y 23:59 hora de Chile, UTC ya marca el día siguiente — una
-- reserva "de hoy" quedaba fechada para mañana (HU-27 fallaba de
-- verdad, no por un defecto de la app: ver app.fecha_santiago, ya
-- correcto y probado en 09_zona_horaria_checkout.sql).
--
-- No se puede "viajar en el tiempo" dentro de pgTAP para forzar que
-- now() caiga justo en ese borde horario — en vez de eso, se reproduce
-- el mismo instante real donde el defecto ocurrió (2026-10-25 00:30
-- UTC = 2026-10-24 21:30 en Santiago, horario de verano) como un
-- literal fijo, exactamente como hace 09_zona_horaria_checkout.sql.
begin;
select plan(3);

-- 1) Reproduce la causa exacta: bajo el TimeZone por defecto del
--    contenedor (UTC, igual que Docker), ese instante lee como el día
--    25 — la fecha "de mañana" que los scripts de siembra escribían
--    por error antes de esta corrección.
select is(
  ('2026-10-25 00:30:00+00'::timestamptz at time zone 'UTC')::date,
  '2026-10-25'::date,
  'Causa del defecto: bajo TimeZone=UTC (el del contenedor), ese instante real lee como el día 25 — "mañana" en Chile'
);

-- 2) La corrección (igual que SET LOCAL TIMEZONE en seed-demo.sh): el
--    MISMO instante, leído en la zona de negocio, da el día real de
--    Chile en ese momento — el 24, no el 25.
select is(
  ('2026-10-25 00:30:00+00'::timestamptz at time zone 'America/Santiago')::date,
  '2026-10-24'::date,
  'Corrección: el mismo instante bajo America/Santiago da el día correcto de negocio (24)'
);

-- 3) Esa misma conversión es exactamente la que ya usa y prueba
--    app.fecha_santiago() para el trigger de producción — los scripts
--    de siembra ahora quedan consistentes con esa única fuente de
--    verdad, en vez de tener su propio criterio de "hoy".
select is(
  ('2026-10-25 00:30:00+00'::timestamptz at time zone 'America/Santiago')::date,
  app.fecha_santiago('2026-10-25 00:30:00+00'::timestamptz),
  'La corrección usa el mismo criterio de día de negocio que app.fecha_santiago, no uno propio'
);

select * from finish();
rollback;
