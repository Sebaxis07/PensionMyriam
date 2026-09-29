-- HU-16 (corrección de alcance): conciliación diaria POR TIPO de
-- consumo. "esperado" es SIEMPRE el headcount del contrato vigente —
-- nunca el número de trabajadores realmente asignados/registrados — así
-- que si faltan trabajadores por asignar cama, esa diferencia queda
-- visible como descuadre justificable, no oculta. cama_noche se genera
-- con generar_cama_noche() (reprocesable para días atrasados) antes de
-- conciliar. "colacion" no factura por contrato completo (ver
-- tipo_consumo_config) y por eso no genera fila de conciliación.
-- Escrito antes de tocar las funciones, según lo pedido.
begin;
select plan(17);

insert into auth.users (id) values ('00000000-0000-0000-0000-00000000009a');
insert into public.usuario (id, auth_uid, rol, nombre) values
  ('10000000-0000-0000-0000-00000000009a',
   '00000000-0000-0000-0000-00000000009a', 'administradora', 'María');

insert into public.empresa (id, razon_social) values
  ('20000000-0000-0000-0000-00000000009a', 'Minera Conciliación SpA');

-- Contrato para 3 trabajadores, pero solo se alcanza a asignar cama a
-- 2 (el 3ro queda "por asignar" — caso real de nómina incompleta).
insert into public.habitacion (id, numero, capacidad) values
  ('30000000-0000-0000-0000-00000000009a', 93, 2);
insert into public.cama (id, habitacion_id, numero) values
  ('31000000-0000-0000-0000-00000000009a', '30000000-0000-0000-0000-00000000009a', 1),
  ('31000000-0000-0000-0000-00000000009b', '30000000-0000-0000-0000-00000000009a', 2);

insert into public.contrato_empresa (id, empresa_id, vigencia_desde, headcount, tarifa_convenida, creado_por) values
  ('21000000-0000-0000-0000-00000000009a', '20000000-0000-0000-0000-00000000009a',
   '2026-01-01', 3, 20000, '10000000-0000-0000-0000-00000000009a');

insert into public.trabajador (id, contrato_empresa_id, nombre, cama_id) values
  ('22000000-0000-0000-0000-00000000009a', '21000000-0000-0000-0000-00000000009a', 'Trabajador Uno', '31000000-0000-0000-0000-00000000009a'),
  ('22000000-0000-0000-0000-00000000009b', '21000000-0000-0000-0000-00000000009a', 'Trabajador Dos', '31000000-0000-0000-0000-00000000009b'),
  ('22000000-0000-0000-0000-00000000009c', '21000000-0000-0000-0000-00000000009a', 'Trabajador Tres', null);

-- 1) cama_noche: genera 1 fila por trabajador CON cama (2), nunca por
--    headcount (3) ni por el trabajador sin cama todavía.
select is(
  (select public.generar_cama_noche('2026-01-15')),
  2,
  'generar_cama_noche debe generar solo para los trabajadores con cama asignada (2 de 3)'
);

-- 2) Reprocesable: llamarla de nuevo para el mismo día atrasado no
--    duplica nada.
select is(
  (select public.generar_cama_noche('2026-01-15')),
  0,
  'generar_cama_noche debe ser idempotente (0 filas nuevas al reprocesar el mismo día)'
);

-- Día completo: los 2 trabajadores CON cama comen sus 3 raciones base.
insert into public.consumo (trabajador_id, tipo_consumo, registrado_por, fecha_hora, uuid_idempotente)
select t.id, r.tipo, '10000000-0000-0000-0000-00000000009a', '2026-01-15 12:00:00-03', gen_random_uuid()
from public.trabajador t
cross join (values ('desayuno'::public.tipo_consumo), ('almuerzo'::public.tipo_consumo), ('cena'::public.tipo_consumo)) as r(tipo)
where t.id in ('22000000-0000-0000-0000-00000000009a', '22000000-0000-0000-0000-00000000009b');

select lives_ok(
  $$ select public.recalcular_conciliacion('21000000-0000-0000-0000-00000000009a', '2026-01-15') $$,
  'recalcular_conciliacion debe ejecutarse sin error'
);

-- 3) Genera exactamente 4 filas (cama_noche, desayuno, almuerzo, cena)
--    — nunca una para "colacion" (no factura por contrato completo).
select is(
  (select count(*)::int from public.conciliacion_diaria
     where contrato_empresa_id = '21000000-0000-0000-0000-00000000009a' and fecha = '2026-01-15'),
  4,
  'Debe generar 4 filas (una por tipo de contrato completo), ninguna para colacion'
);

select is(
  (select bool_or(tipo = 'colacion') from public.conciliacion_diaria
     where contrato_empresa_id = '21000000-0000-0000-0000-00000000009a' and fecha = '2026-01-15'),
  false,
  'colacion no debe tener fila de conciliación (se factura por consumo real, no por contrato)'
);

-- 4) cama_noche: esperado = headcount (3), servido = 2 (los que tienen
--    cama) -> descuadre visible, NO oculto por usar el conteo de
--    trabajadores asignados como "esperado".
select is(
  (select cantidad_esperada from public.conciliacion_diaria
     where contrato_empresa_id = '21000000-0000-0000-0000-00000000009a' and fecha = '2026-01-15' and tipo = 'cama_noche'),
  3,
  'cama_noche: esperado=headcount (3) aunque solo 2 trabajadores tengan cama asignada'
);
select is(
  (select cantidad_servida from public.conciliacion_diaria
     where contrato_empresa_id = '21000000-0000-0000-0000-00000000009a' and fecha = '2026-01-15' and tipo = 'cama_noche'),
  2,
  'cama_noche: servido=2 (solo los que tienen cama) — descuadre visible'
);
select is(
  (select estado::text from public.conciliacion_diaria
     where contrato_empresa_id = '21000000-0000-0000-0000-00000000009a' and fecha = '2026-01-15' and tipo = 'cama_noche'),
  'pendiente',
  'cama_noche con descuadre sin justificar queda Pendiente'
);

-- 5) desayuno/almuerzo/cena: esperado = headcount (3), servido = 2
--    (mismo motivo: el trabajador sin cama tampoco comió) -> pendiente.
select is(
  (select count(*)::int from public.conciliacion_diaria
     where contrato_empresa_id = '21000000-0000-0000-0000-00000000009a' and fecha = '2026-01-15'
       and tipo in ('almuerzo', 'cena', 'desayuno')
       and cantidad_esperada = 3 and cantidad_servida = 2 and estado = 'pendiente'),
  3,
  'Las 3 raciones base también usan headcount (3) como esperado, no el conteo de comensales'
);

-- 6) Justificar la diferencia de cama_noche: pasa a con_diferencia_justificada
--    y NO cambia cantidad_esperada (nunca se ajusta lo facturado).
insert into public.justificacion_descuadre (conciliacion_diaria_id, motivo, supervisor_nombre, registrado_por)
select id, 'ausencia_justificada', 'Supervisor Pérez', '10000000-0000-0000-0000-00000000009a'
from public.conciliacion_diaria
where contrato_empresa_id = '21000000-0000-0000-0000-00000000009a' and fecha = '2026-01-15' and tipo = 'cama_noche';

select public.recalcular_conciliacion('21000000-0000-0000-0000-00000000009a', '2026-01-15');

select is(
  (select cantidad_esperada from public.conciliacion_diaria
     where contrato_empresa_id = '21000000-0000-0000-0000-00000000009a' and fecha = '2026-01-15' and tipo = 'cama_noche'),
  3,
  'Justificar cama_noche no cambia cantidad_esperada (sigue siendo el headcount)'
);
select is(
  (select estado::text from public.conciliacion_diaria
     where contrato_empresa_id = '21000000-0000-0000-0000-00000000009a' and fecha = '2026-01-15' and tipo = 'cama_noche'),
  'con_diferencia_justificada',
  'Justificar cama_noche pasa el estado a Con diferencia justificada'
);

-- Día distinto, con los 3 trabajadores (incluye el que no tenía cama,
-- para probar el caso "todos comen" -> conciliado sin descuadre).
insert into public.consumo (trabajador_id, tipo_consumo, registrado_por, fecha_hora, uuid_idempotente)
select t.id, r.tipo, '10000000-0000-0000-0000-00000000009a', '2026-01-16 12:00:00-03', gen_random_uuid()
from public.trabajador t
cross join (values ('desayuno'::public.tipo_consumo), ('almuerzo'::public.tipo_consumo), ('cena'::public.tipo_consumo)) as r(tipo)
where t.contrato_empresa_id = '21000000-0000-0000-0000-00000000009a';

select public.recalcular_conciliacion('21000000-0000-0000-0000-00000000009a', '2026-01-16');

select is(
  (select bool_and(estado = 'conciliado') from public.conciliacion_diaria
     where contrato_empresa_id = '21000000-0000-0000-0000-00000000009a' and fecha = '2026-01-16'
       and tipo in ('almuerzo', 'cena', 'desayuno')),
  true,
  'Cuando comen los 3 (=headcount), las 3 raciones quedan Conciliado'
);

-- 7) colacion con producto_extra: se registra, pero sigue sin generar
--    fila de conciliación (no es un tipo de contrato completo).
insert into public.producto_extra (id, nombre, precio_unitario) values
  ('40000000-0000-0000-0000-00000000009a', 'Colación de terreno', 3500);

select lives_ok(
  $$ insert into public.consumo
       (trabajador_id, tipo_consumo, recargo, producto_extra_id, registrado_por, fecha_hora, uuid_idempotente)
     values ('22000000-0000-0000-0000-00000000009a', 'colacion', 3500,
             '40000000-0000-0000-0000-00000000009a', '10000000-0000-0000-0000-00000000009a',
             '2026-01-16 10:00:00-03', gen_random_uuid()) $$,
  'colacion con producto_extra debe registrarse sin problema'
);

select throws_ok(
  $$ insert into public.consumo (trabajador_id, tipo_consumo, registrado_por, fecha_hora, uuid_idempotente)
     values ('22000000-0000-0000-0000-00000000009a', 'colacion',
             '10000000-0000-0000-0000-00000000009a', '2026-01-17 10:00:00-03', gen_random_uuid()) $$,
  '23514',
  null,
  'colacion SIN producto_extra debe rechazarse (constraint colacion_requiere_producto)'
);

select public.recalcular_conciliacion('21000000-0000-0000-0000-00000000009a', '2026-01-16');
select is(
  (select count(*)::int from public.conciliacion_diaria
     where contrato_empresa_id = '21000000-0000-0000-0000-00000000009a' and fecha = '2026-01-16' and tipo = 'colacion'),
  0,
  'Registrar una colacion no debe crear una fila de conciliación para ese tipo'
);

-- 8) cama_noche puede quedar sin responsable humano (generada por
--    pg_cron); el resto de los tipos sí lo exige.
select is(
  (select registrado_por is null from public.consumo
     where trabajador_id = '22000000-0000-0000-0000-00000000009a' and tipo_consumo = 'cama_noche'
     order by fecha_hora limit 1),
  true,
  'cama_noche generada automáticamente debe quedar sin registrado_por (system-generated)'
);

select throws_ok(
  $$ insert into public.consumo (trabajador_id, tipo_consumo, fecha_hora, uuid_idempotente)
     values ('22000000-0000-0000-0000-00000000009a', 'almuerzo', '2026-01-20 12:00:00-03', gen_random_uuid()) $$,
  '23514',
  null,
  'Cualquier tipo que no sea cama_noche sigue exigiendo registrado_por (constraint, ahora que la columna es nullable)'
);

select * from finish();
rollback;
