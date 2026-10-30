-- HU-33: anonimización automática una vez CERRADA la facturación del
-- período, respetando el plazo de gracia, sin alterar el cuadre
-- contable y dejando constancia auditable.
--
-- Esta prueba es la que faltaba: la purga de 0013 se disparaba solo con
-- `vigencia_hasta < hoy - 7d` y por lo tanto incumplía de frente el
-- criterio "contrato finalizado SIN FACTURAR → no se anonimiza nada".
-- Acá se verifican los cuatro criterios de la historia más la
-- idempotencia (RNF-06).
begin;
select plan(14);

-- =====================================================================
-- Datos sintéticos: tres contratos en situaciones distintas.
--   A) terminado y con su período CERRADO hace 10 días  -> debe purgar
--   B) terminado y NUNCA facturado                      -> NO debe tocar
--   C) terminado y cerrado HOY (dentro del plazo)        -> NO debe tocar
-- =====================================================================
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000d001');
insert into public.usuario (id, auth_uid, rol, nombre)
  values ('10000000-0000-0000-0000-00000000d001',
          '00000000-0000-0000-0000-00000000d001', 'administradora', 'María');

insert into public.empresa (id, razon_social)
  values ('20000000-0000-0000-0000-00000000d001', 'Minera Paposo SpA');

insert into public.contrato_empresa
  (id, empresa_id, vigencia_desde, vigencia_hasta, headcount, tarifa_convenida, creado_por)
values
  ('30000000-0000-0000-0000-0000000000a0', '20000000-0000-0000-0000-00000000d001',
   '2026-05-01', '2026-06-30', 10, 25000, '10000000-0000-0000-0000-00000000d001'),
  ('30000000-0000-0000-0000-0000000000b0', '20000000-0000-0000-0000-00000000d001',
   '2026-07-01', '2026-08-31', 10, 25000, '10000000-0000-0000-0000-00000000d001'),
  ('30000000-0000-0000-0000-0000000000c0', '20000000-0000-0000-0000-00000000d001',
   '2026-09-01', '2026-09-30', 10, 25000, '10000000-0000-0000-0000-00000000d001');

insert into public.trabajador (id, contrato_empresa_id, nombre, rut) values
  ('40000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a0', 'Rodrigo Tapia', '15.420.123-K'),
  ('40000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-0000000000b0', 'Luis Araya',    '13.111.222-3'),
  ('40000000-0000-0000-0000-0000000000c1', '30000000-0000-0000-0000-0000000000c0', 'Pedro Soto',    '16.777.888-9');

-- Consumos del trabajador A: son el cuadre contable que NO debe moverse.
insert into public.consumo
  (id, trabajador_id, tipo_consumo, fecha_hora, registrado_por, uuid_idempotente)
values
  ('50000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1',
   'almuerzo', '2026-06-15 13:00:00-04', '10000000-0000-0000-0000-00000000d001',
   '60000000-0000-0000-0000-0000000000a1'),
  ('50000000-0000-0000-0000-0000000000a2', '40000000-0000-0000-0000-0000000000a1',
   'cena', '2026-06-15 20:00:00-04', '10000000-0000-0000-0000-00000000d001',
   '60000000-0000-0000-0000-0000000000a2');

-- Conciliación con descuadre justificado (su supervisor es dato
-- personal anonimizable) para el contrato A y para el B.
insert into public.conciliacion_diaria
  (id, contrato_empresa_id, fecha, tipo, headcount_esperado, cantidad_esperada, cantidad_servida, estado)
values
  ('70000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a0',
   '2026-06-15', 'almuerzo', 10, 10, 8, 'pendiente'),
  ('70000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-0000000000b0',
   '2026-08-15', 'almuerzo', 10, 10, 9, 'pendiente');

insert into public.justificacion_descuadre
  (id, conciliacion_diaria_id, motivo, supervisor_nombre, registrado_por)
values
  ('80000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1',
   'turno_extra', 'Jorge Mella', '10000000-0000-0000-0000-00000000d001'),
  ('80000000-0000-0000-0000-0000000000b1', '70000000-0000-0000-0000-0000000000b1',
   'corte_ruta', 'Ana Fuentes', '10000000-0000-0000-0000-00000000d001');

-- Cierres de facturación: A cerrado hace 10 días, C cerrado hoy, B sin cierre.
insert into public.cierre_facturacion
  (contrato_empresa_id, periodo_anio, periodo_mes, total_facturado, cerrado_por, cerrado_at, uuid_idempotente)
values
  ('30000000-0000-0000-0000-0000000000a0', 2026, 6, 7500000,
   '10000000-0000-0000-0000-00000000d001', now() - interval '10 days',
   '90000000-0000-0000-0000-0000000000a1'),
  ('30000000-0000-0000-0000-0000000000c0', 2026, 9, 7500000,
   '10000000-0000-0000-0000-00000000d001', now(),
   '90000000-0000-0000-0000-0000000000c1');

-- =====================================================================
-- Corrida de la purga
-- =====================================================================
select lives_ok(
  $$ select app.purgar_datos_personales_facturados() $$,
  'la purga automática debe correr sin errores'
);

-- Criterio 1: período facturado y cerrado + plazo de gracia vencido.
select is(
  (select nombre from public.trabajador where id = '40000000-0000-0000-0000-0000000000a1'),
  'TRABAJADOR ANONIMIZADO (LEY 21.719)',
  'contrato con período cerrado hace más de 7 días: el nombre debe quedar anonimizado'
);

select is(
  (select rut from public.trabajador where id = '40000000-0000-0000-0000-0000000000a1'),
  null,
  'contrato con período cerrado: el RUT debe quedar en nulo'
);

select isnt(
  (select anonimizado_at from public.trabajador where id = '40000000-0000-0000-0000-0000000000a1'),
  null,
  'debe quedar sellada la fecha de anonimización'
);

-- Criterio 2: "Dado un contrato finalizado SIN FACTURAR, cuando corre
-- el proceso, entonces NO SE ANONIMIZA NADA". Este es el criterio que
-- la implementación anterior incumplía.
select is(
  (select nombre from public.trabajador where id = '40000000-0000-0000-0000-0000000000b1'),
  'Luis Araya',
  'contrato terminado pero NUNCA facturado: no se debe anonimizar nada (HU-33, criterio 2)'
);

select is(
  (select rut from public.trabajador where id = '40000000-0000-0000-0000-0000000000b1'),
  '13.111.222-3',
  'contrato terminado sin facturar: el RUT debe seguir intacto'
);

select is(
  (select supervisor_nombre from public.justificacion_descuadre
    where id = '80000000-0000-0000-0000-0000000000b1'),
  'Ana Fuentes',
  'supervisor de un mes sin cierre de facturación: no se debe anonimizar'
);

-- Plazo de gracia: cerrado hoy, todavía no corresponde.
select is(
  (select nombre from public.trabajador where id = '40000000-0000-0000-0000-0000000000c1'),
  'Pedro Soto',
  'período cerrado HOY: dentro del plazo de gracia no se anonimiza'
);

-- El supervisor del mes cerrado sí se anonimiza.
select is(
  (select supervisor_nombre from public.justificacion_descuadre
    where id = '80000000-0000-0000-0000-0000000000a1'),
  'SUPERVISOR ANONIMIZADO (LEY 21.719)',
  'supervisor del mes con facturación cerrada hace más de 7 días: debe quedar anonimizado'
);

-- Criterio 3: el libro inmutable (RNF-03) conserva filas, ids, fechas y
-- montos; solo pierde el nombre legible aguas arriba.
select is(
  (select count(*)::int from public.consumo
    where trabajador_id = '40000000-0000-0000-0000-0000000000a1'),
  2,
  'el ledger debe conservar sus filas tras la anonimización (RNF-03)'
);

select is(
  (select array_agg(tipo_consumo::text order by tipo_consumo::text)
     from public.consumo where trabajador_id = '40000000-0000-0000-0000-0000000000a1'),
  array['almuerzo', 'cena'],
  'cantidades y tipos del ledger quedan intactos: solo cambian los datos de identificación (HU-33, criterio 3)'
);

-- Criterio 4: evento inmutable y auditable, firmado como proceso
-- automático (usuario_id nulo), no atribuido a una persona que no lo
-- ejecutó.
select is(
  (select count(*)::int from public.bitacora_acceso_datos_personales
    where accion = 'purga_automatica' and usuario_id is null),
  1,
  'la purga debe dejar un evento en la bitácora firmado como proceso automático (HU-33, criterio 4)'
);

-- Idempotencia (RNF-06): una segunda corrida el mismo día no vuelve a
-- anonimizar ni a recontar lo ya anonimizado.
select is(
  (select (app.purgar_datos_personales_facturados() ->> 'trabajadores_purgados')::int),
  0,
  'correr la purga dos veces no debe volver a contar filas ya anonimizadas (idempotencia, RNF-06)'
);

select throws_ok(
  $$ update public.bitacora_acceso_datos_personales
        set detalle = '{"adulterado": true}'::jsonb $$,
  null,
  'la bitácora debe ser inmutable: no se puede editar un evento ya registrado (HU-33, criterio 4)'
);

select * from finish();
rollback;
