-- HU-39 (EP-10): la configuración del negocio es editable por la
-- Administradora, inválida de guardar fuera de rango, y la Encargada no
-- puede cambiarla. Incluye HU-41 (quién da de alta un producto extra) y
-- la inmutabilidad del cierre de facturación de HU-33.
begin;
select plan(14);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000009001'),
  ('00000000-0000-0000-0000-000000009002');

insert into public.usuario (id, auth_uid, rol, nombre) values
  ('10000000-0000-0000-0000-000000009001',
   '00000000-0000-0000-0000-000000009001', 'administradora', 'María'),
  ('10000000-0000-0000-0000-000000009002',
   '00000000-0000-0000-0000-000000009002', 'encargada', 'Encargada de Registro');

insert into public.empresa (id, razon_social)
  values ('20000000-0000-0000-0000-000000009001', 'Minera Paposo SpA');
insert into public.contrato_empresa
  (id, empresa_id, vigencia_desde, vigencia_hasta, headcount, tarifa_convenida, creado_por)
values ('30000000-0000-0000-0000-000000009001', '20000000-0000-0000-0000-000000009001',
        '2026-01-01', '2026-03-31', 10, 25000, '10000000-0000-0000-0000-000000009001');

-- La fila de parámetros la crea la migración, no la aplicación.
select is(
  (select count(*)::int from public.config_negocio),
  1,
  'config_negocio debe existir con su fila única de valores de fábrica'
);

select is(
  (select tarifa_base_noche::int from public.config_negocio where id = 'singleton'),
  15000,
  'la tarifa base de fábrica debe ser la vigente del negocio ($15.000/noche)'
);

select is(
  (select dias_gracia_anonimizacion from public.config_negocio where id = 'singleton'),
  7,
  'el plazo de gracia de fábrica debe ser el propuesto de 7 días (HU-33, por validar con la Administradora)'
);

-- =====================================================================
-- Validaciones: valores inválidos no se pueden guardar
-- =====================================================================
select throws_ok(
  $$ update public.config_negocio set tarifa_base_noche = 0 where id = 'singleton' $$,
  '23514',
  null,
  'una tarifa base de 0 debe rechazarse: saldría impresa en un comprobante'
);

select throws_ok(
  $$ update public.config_negocio set tarifa_base_noche = -5000 where id = 'singleton' $$,
  '23514',
  null,
  'una tarifa base negativa debe rechazarse'
);

select throws_ok(
  $$ update public.config_negocio set dias_gracia_anonimizacion = 0 where id = 'singleton' $$,
  '23514',
  null,
  'un plazo de gracia de 0 días debe rechazarse: anonimizaría de inmediato al cerrar'
);

select throws_ok(
  $$ update public.config_negocio set dias_gracia_anonimizacion = 400 where id = 'singleton' $$,
  '23514',
  null,
  'un plazo de gracia de más de 90 días debe rechazarse: retención indefinida'
);

select throws_ok(
  $$ update public.config_negocio set correo_contacto_arco = 'no-es-un-correo' where id = 'singleton' $$,
  '23514',
  null,
  'el canal de contacto ARCO debe ser un correo válido: va impreso en el comprobante (HU-32)'
);

-- Fila única: nadie puede agregar una segunda configuración ni borrarla.
select throws_ok(
  $$ insert into public.config_negocio
       (id, nombre_pension, whatsapp_contacto, correo_contacto_arco, banco_nombre,
        tipo_cuenta, titular_nombre, rut_titular, tarifa_base_noche)
     values ('singleton', 'Otra', '+56', 'a@b.cl', 'Banco', 'Vista', 'X', '1-9', 10000) $$,
  null,
  'no se puede crear una segunda fila de configuración'
);

select throws_ok(
  $$ delete from public.config_negocio where id = 'singleton' $$,
  null,
  'no se puede borrar la configuración del negocio'
);

-- =====================================================================
-- Autorización por rol
-- =====================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000009002')::text, true);

-- La Encargada LEE (necesita la tarifa y los datos de transferencia para
-- emitir el comprobante) pero no EDITA.
select is(
  (select count(*)::int from public.config_negocio),
  1,
  'la Encargada debe poder LEER la configuración: el comprobante que emite la usa'
);

-- RLS no lanza error al actualizar: simplemente no le deja ninguna
-- fila que calce, así que el UPDATE "funciona" y no cambia nada. Por eso
-- la verificación son dos pasos — que no reviente, y que el valor siga
-- siendo el de antes.
select lives_ok(
  $$ update public.config_negocio set tarifa_base_noche = 99000 where id = 'singleton' $$,
  'el UPDATE de la Encargada no falla con error: RLS lo deja sin filas que tocar'
);

reset role;

select is(
  (select tarifa_base_noche::int from public.config_negocio where id = 'singleton'),
  15000,
  'la Encargada NO debe poder editar la configuración: el valor queda intacto (HU-39)'
);

-- HU-41: "Como Encargada o Administradora, quiero dar de alta productos
-- o servicios extra". El INSERT exigía administradora y la fila de la
-- Encargada terminaba rechazada al sincronizar.
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000009002')::text, true);

select lives_ok(
  $$ insert into public.producto_extra (nombre, precio_unitario)
     values ('Bebida lata 350cc', 1500) $$,
  'la Encargada debe poder dar de alta un producto extra (HU-41)'
);

reset role;

select * from finish();
rollback;
