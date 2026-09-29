-- HU-16: conciliación diaria (esperado vs servido), recalculable e
-- idempotente. NUNCA cambia lo que se factura (se sigue cobrando por
-- headcount completo) ni bloquea el cierre — solo detecta y marca la
-- diferencia. Escrito antes que la función (recalcular_conciliacion),
-- según lo pedido.
begin;
select plan(7);

insert into auth.users (id) values ('00000000-0000-0000-0000-00000000009a');
insert into public.usuario (id, auth_uid, rol, nombre) values
  ('10000000-0000-0000-0000-00000000009a',
   '00000000-0000-0000-0000-00000000009a', 'administradora', 'María');

insert into public.empresa (id, razon_social) values
  ('20000000-0000-0000-0000-00000000009a', 'Minera Conciliación SpA');

-- Dos vigencias consecutivas con headcount distinto: la conciliación de
-- cada fecha debe usar el headcount vigente EN ESA fecha, no el actual.
insert into public.contrato_empresa (id, empresa_id, vigencia_desde, vigencia_hasta, headcount, tarifa_convenida, creado_por) values
  ('21000000-0000-0000-0000-00000000009a', '20000000-0000-0000-0000-00000000009a',
   '2026-01-01', '2026-01-31', 3, 20000, '10000000-0000-0000-0000-00000000009a'),
  ('21000000-0000-0000-0000-00000000009b', '20000000-0000-0000-0000-00000000009a',
   '2026-02-01', null, 2, 20000, '10000000-0000-0000-0000-00000000009a');

insert into public.trabajador (id, contrato_empresa_id, nombre) values
  ('22000000-0000-0000-0000-00000000009a', '21000000-0000-0000-0000-00000000009a', 'Trabajador Uno'),
  ('22000000-0000-0000-0000-00000000009b', '21000000-0000-0000-0000-00000000009a', 'Trabajador Dos'),
  ('22000000-0000-0000-0000-00000000009c', '21000000-0000-0000-0000-00000000009a', 'Trabajador Tres');

-- Día 2026-01-15: los 3 trabajadores comen sus 3 raciones -> conciliado.
insert into public.consumo (trabajador_id, tipo_racion, registrado_por, fecha_hora, uuid_idempotente)
select t.id, r.racion, '10000000-0000-0000-0000-00000000009a', '2026-01-15 12:00:00-03', gen_random_uuid()
from public.trabajador t
cross join (values ('desayuno'::tipo_racion), ('almuerzo'::tipo_racion), ('cena'::tipo_racion)) as r(racion)
where t.contrato_empresa_id = '21000000-0000-0000-0000-00000000009a';

select lives_ok(
  $$ select public.recalcular_conciliacion('21000000-0000-0000-0000-00000000009a', '2026-01-15') $$,
  'recalcular_conciliacion debe ejecutarse sin error para un día completo'
);

select is(
  (select estado::text from public.conciliacion_diaria
     where contrato_empresa_id = '21000000-0000-0000-0000-00000000009a' and fecha = '2026-01-15'),
  'conciliado',
  'Esperado 9 (3 trabajadores x 3 raciones) = servido 9 -> Conciliado'
);

select is(
  (select headcount_esperado from public.conciliacion_diaria
     where contrato_empresa_id = '21000000-0000-0000-0000-00000000009a' and fecha = '2026-01-15'),
  3,
  'headcount_esperado debe ser el vigente en esa fecha (3, vigencia de enero)'
);

-- Día 2026-01-16: solo 2 de 3 trabajadores comen sus 3 raciones -> falta 1.
insert into public.consumo (trabajador_id, tipo_racion, registrado_por, fecha_hora, uuid_idempotente)
select t.id, r.racion, '10000000-0000-0000-0000-00000000009a', '2026-01-16 12:00:00-03', gen_random_uuid()
from public.trabajador t
cross join (values ('desayuno'::tipo_racion), ('almuerzo'::tipo_racion), ('cena'::tipo_racion)) as r(racion)
where t.contrato_empresa_id = '21000000-0000-0000-0000-00000000009a'
  and t.id <> '22000000-0000-0000-0000-00000000009c';  -- Trabajador Tres no consume nada

select public.recalcular_conciliacion('21000000-0000-0000-0000-00000000009a', '2026-01-16');

select is(
  (select estado::text from public.conciliacion_diaria
     where contrato_empresa_id = '21000000-0000-0000-0000-00000000009a' and fecha = '2026-01-16'),
  'pendiente',
  'Esperado 9, servido 6 (falta un trabajador) y sin justificación -> Pendiente, no bloquea'
);

-- Se registra la justificación tipificada (HU-17) y se recalcula: pasa
-- a "con_diferencia_justificada" sin cambiar raciones_esperadas (nunca
-- se ajusta lo que se factura).
insert into public.justificacion_descuadre (conciliacion_diaria_id, motivo, supervisor_nombre, registrado_por)
select id, 'ausencia_justificada', 'Supervisor de Faena Pérez', '10000000-0000-0000-0000-00000000009a'
from public.conciliacion_diaria
where contrato_empresa_id = '21000000-0000-0000-0000-00000000009a' and fecha = '2026-01-16';

select public.recalcular_conciliacion('21000000-0000-0000-0000-00000000009a', '2026-01-16');

select is(
  (select estado::text from public.conciliacion_diaria
     where contrato_empresa_id = '21000000-0000-0000-0000-00000000009a' and fecha = '2026-01-16'),
  'con_diferencia_justificada',
  'Con justificación registrada, el recálculo debe pasar a Con diferencia justificada'
);

select is(
  (select headcount_esperado from public.conciliacion_diaria
     where contrato_empresa_id = '21000000-0000-0000-0000-00000000009a' and fecha = '2026-01-16'),
  3,
  'headcount_esperado sigue siendo 3 (la empresa factura por el contrato completo, siempre)'
);

-- Idempotencia: recalcular de nuevo el mismo día no debe crear una
-- segunda fila (unique(contrato_empresa_id, fecha) ya existía).
select recalcular_conciliacion('21000000-0000-0000-0000-00000000009a', '2026-01-16');
select is(
  (select count(*)::int from public.conciliacion_diaria
     where contrato_empresa_id = '21000000-0000-0000-0000-00000000009a' and fecha = '2026-01-16'),
  1,
  'Recalcular el mismo día dos veces no debe duplicar la fila de conciliación'
);

select * from finish();
rollback;
