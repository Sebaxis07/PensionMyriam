-- HU-22: Promedio Móvil Ponderado (PMP) de insumo.
--
-- 1-3) El trigger app.recalcular_costo_promedio() recalcula correctamente
--      con compras sucesivas, sin intervención del cliente.
-- 4)   Demuestra POR QUÉ connector.ts debe omitir el PATCH local a
--      insumo (ver comentario en uploadData()): el rol "authenticated"
--      SÍ tiene permiso de UPDATE sobre insumo (Supabase otorga
--      privilegios amplios por defecto a ese rol; la restricción real
--      la impone RLS, que permite escribir a la Administradora) — así
--      que si ese PATCH optimista llegara a sincronizarse ANTES del
--      insert de su propia compra, el trigger volvería a sumar la MISMA
--      compra sobre un insumo que el PATCH ya había actualizado,
--      duplicándola en el promedio. Se reproduce ese escenario a mano
--      (simulando lo que el cliente habría enviado) para probar que el
--      resultado queda mal — confirmando que omitir el envío, como hace
--      connector.ts, es necesario y no solo una precaución de más.
begin;
select plan(5);

insert into auth.users (id) values ('00000000-0000-0000-0000-00000000aa01');
insert into public.usuario (id, auth_uid, rol, nombre) values
  ('10000000-0000-0000-0000-00000000aa01',
   '00000000-0000-0000-0000-00000000aa01', 'administradora', 'María');

insert into public.insumo (id, nombre, categoria, unidad_medida, costo_promedio, cantidad_total)
  values ('20000000-0000-0000-0000-00000000aa01', 'Aceite', 'abarrotes', 'litro', 1000, 10);

-- 1) Primera compra adicional: 10 litros a $1200 c/u ($12.000 total).
--    PMP esperado: ((10*1000) + 12000) / (10+10) = 22000/20 = 1100.
insert into public.compra_insumo
    (insumo_id, categoria, monto_total, cantidad, registrado_por, uuid_idempotente)
  values ('20000000-0000-0000-0000-00000000aa01', 'abarrotes', 12000, 10,
          '10000000-0000-0000-0000-00000000aa01', gen_random_uuid());

select is(
  (select costo_promedio from public.insumo where id = '20000000-0000-0000-0000-00000000aa01'),
  1100::numeric,
  'Primera compra: PMP recalculado correctamente por el trigger (1100)'
);

select is(
  (select cantidad_total from public.insumo where id = '20000000-0000-0000-0000-00000000aa01'),
  20::numeric,
  'cantidad_total acumulada correctamente (20)'
);

-- 2) Segunda compra: 5 litros a $1400 c/u ($7.000 total).
--    PMP esperado: ((20*1100) + 7000) / (20+5) = 29000/25 = 1160.
insert into public.compra_insumo
    (insumo_id, categoria, monto_total, cantidad, registrado_por, uuid_idempotente)
  values ('20000000-0000-0000-0000-00000000aa01', 'abarrotes', 7000, 5,
          '10000000-0000-0000-0000-00000000aa01', gen_random_uuid());

select is(
  (select costo_promedio from public.insumo where id = '20000000-0000-0000-0000-00000000aa01'),
  1160::numeric,
  'Segunda compra consecutiva: PMP sigue el cálculo ponderado correcto (1160), sin duplicar la primera'
);

-- 3) Estado previo a esta prueba: cantidad_total=25, costo_promedio=1160
--    (10@1000 + 10@1200 + 5@1400, ver pasos 1-2). Simula lo que pasaría
--    SI el PATCH optimista del cliente (ver registrarCompraInsumo.ts)
--    llegara a sincronizarse antes del insert de su propia compra: una
--    tercera compra de 5 litros a $1400 c/u ($7.000) con PMP correcto
--    ((25*1160)+7000)/30 = 36000/30 = 1200 — el cliente la aplicaría de
--    una vez por adelantado...
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000aa01')::text, true);

update public.insumo set cantidad_total = 30, costo_promedio = 1200
  where id = '20000000-0000-0000-0000-00000000aa01';

reset role;

-- ...y acá se ve el problema: cuando SU PROPIA compra_insumo igual se
-- inserta (como haría la cola real de PowerSync, en la misma
-- transacción), el trigger lee cantidad_total/costo_promedio que YA
-- incluyen esta compra, y vuelve a sumarla — el resultado queda mal
-- (1200 esperado, pero duplicado da más).
insert into public.compra_insumo
    (insumo_id, categoria, monto_total, cantidad, registrado_por, uuid_idempotente)
  values ('20000000-0000-0000-0000-00000000aa01', 'abarrotes', 7000, 5,
          '10000000-0000-0000-0000-00000000aa01', gen_random_uuid());

select isnt(
  (select costo_promedio from public.insumo where id = '20000000-0000-0000-0000-00000000aa01'),
  1200::numeric,
  'Si el PATCH optimista del cliente llegara a sincronizarse, la compra queda contada dos veces (PMP ya no es 1200) — por eso connector.ts debe omitirlo'
);

-- 4) El histórico de compra_insumo es la única fuente — nunca se
--    sobrescribe (coherente con "compra_insumo es el histórico
--    inmutable" del comentario de 0001_init.sql).
select is(
  (select count(*)::int from public.compra_insumo where insumo_id = '20000000-0000-0000-0000-00000000aa01'),
  3,
  'Las 3 compras quedan como filas separadas del histórico, ninguna se sobrescribe'
);

select * from finish();
rollback;
