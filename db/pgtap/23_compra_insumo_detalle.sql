-- Migración 0024: detalle real del comprobante de compra_insumo
-- (proveedor, medio de pago, N° de comprobante, desglose neto/IVA).
-- Caso de referencia: boleta de diésel aportada por la Administradora
-- (Copec, pago con tarjeta débito, N° de transacción 223505). Esa
-- boleta trae Subtotal neto $14.144 + IVA $2.687 pero un Total a pagar
-- de $15.000 (no $16.831): el combustible en Chile lleva además el
-- Impuesto Específico a los Combustibles (IEF/IEV, con un componente
-- variable que puede ser negativo), que esta tabla no modela como
-- campo aparte — por eso el caso real de diésel se carga SIN
-- monto_neto/monto_iva, y el desglose neto+IVA se prueba aparte con un
-- comprobante donde sí cuadra (abarrotes, IVA estándar 19%).
begin;
select plan(6);

insert into auth.users (id) values ('00000000-0000-0000-0000-00000000bb01');
insert into public.usuario (id, auth_uid, rol, nombre) values
  ('10000000-0000-0000-0000-00000000bb01',
   '00000000-0000-0000-0000-00000000bb01', 'administradora', 'María');

insert into public.insumo (id, nombre, categoria, unidad_medida, costo_promedio, cantidad_total)
  values
    ('20000000-0000-0000-0000-00000000bb01', 'Diesel', 'gas_combustible', 'litro', 0, 0),
    ('20000000-0000-0000-0000-00000000bb02', 'Arroz', 'abarrotes', 'kg', 0, 0);

-- 1) El caso real: proveedor, medio de pago y N° de comprobante quedan
--    guardados tal cual, SIN forzar un desglose de IVA que no cuadra
--    por el impuesto específico de combustibles.
insert into public.compra_insumo
    (insumo_id, categoria, monto_total, cantidad, registrado_por, uuid_idempotente,
     proveedor, medio_pago, referencia_comprobante)
  values ('20000000-0000-0000-0000-00000000bb01', 'gas_combustible', 15000, 9.572,
          '10000000-0000-0000-0000-00000000bb01', gen_random_uuid(),
          'Estación de servicio Copec', 'tarjeta_debito', '223505');

select is(
  (select proveedor from public.compra_insumo where referencia_comprobante = '223505'),
  'Estación de servicio Copec',
  'El proveedor del comprobante real queda guardado'
);

select is(
  (select medio_pago::text from public.compra_insumo where referencia_comprobante = '223505'),
  'tarjeta_debito',
  'El medio de pago queda guardado con el valor real de la boleta'
);

-- 2) Una compra SIN ningún dato de comprobante (caso mayoritario: feria,
--    abarrotes sin boleta detallada) sigue siendo válida — todo opcional.
select lives_ok(
  $$ insert into public.compra_insumo (insumo_id, categoria, monto_total, cantidad, registrado_por, uuid_idempotente)
     values ('20000000-0000-0000-0000-00000000bb01', 'gas_combustible', 8000, 5,
             '10000000-0000-0000-0000-00000000bb01', gen_random_uuid()) $$,
  'Una compra sin proveedor/medio de pago/IVA sigue siendo válida (todo opcional)'
);

-- 3) El desglose neto+IVA debe cuadrar con el total (con tolerancia de
--    $1 por redondeo) — si no cuadra, la base lo rechaza aunque la
--    aplicación también valide antes de enviarlo. $10.000 + $2.687
--    IVA no suma los $15.000 de total: debe fallar.
select throws_ok(
  $$ insert into public.compra_insumo (insumo_id, categoria, monto_total, cantidad, registrado_por, uuid_idempotente,
       monto_neto, monto_iva)
     values ('20000000-0000-0000-0000-00000000bb01', 'gas_combustible', 15000, 9.572,
             '10000000-0000-0000-0000-00000000bb01', gen_random_uuid(), 10000, 2687) $$,
  null,
  'El check constraint rechaza un neto+IVA que no cuadra con el total'
);

-- 4) Comprobante estándar donde SÍ cuadra: abarrotes con IVA 19%
--    (neto $10.084 + IVA $1.916 = total $12.000), más $1 de redondeo
--    tolerado para probar el margen del check.
select lives_ok(
  $$ insert into public.compra_insumo (insumo_id, categoria, monto_total, cantidad, registrado_por, uuid_idempotente,
       monto_neto, monto_iva)
     values ('20000000-0000-0000-0000-00000000bb02', 'abarrotes', 12001, 10,
             '10000000-0000-0000-0000-00000000bb01', gen_random_uuid(), 10084, 1916) $$,
  'Un desglose neto+IVA correcto (con $1 de redondeo tolerado) se acepta'
);

-- 5) El costeo PMP sigue usando monto_total (lo realmente pagado), no
--    monto_neto — el desglose es solo informativo del comprobante.
select is(
  (select round(costo_promedio, 2) from public.insumo where id = '20000000-0000-0000-0000-00000000bb01'),
  round((15000 + 8000) / (9.572 + 5), 2),
  'El PMP del Diesel se calcula con monto_total, no con monto_neto (el IVA informado es solo referencia del comprobante)'
);

select * from finish();
rollback;
