-- Verifica RNF-06: toda operación reintentable tiene clave idempotente
-- única. El patrón real de sincronización usa
-- `INSERT ... ON CONFLICT (uuid_idempotente) DO NOTHING`, así que lo
-- que pgTAP debe probar es que la restricción UNIQUE existe y que un
-- reintento con la misma clave no duplica la fila.
begin;
select plan(3);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000b1');
insert into public.usuario (id, auth_uid, rol, nombre) values
  ('10000000-0000-0000-0000-0000000000b1',
   '00000000-0000-0000-0000-0000000000b1', 'encargada', 'Encargada Test');

insert into public.habitacion (id, numero, capacidad)
  values ('20000000-0000-0000-0000-0000000000b1', 1, 2);

-- 1) Primer registro de aseo: debe pasar
select lives_ok(
  $$ insert into public.aseo
       (habitacion_id, tipo, responsable, uuid_idempotente)
     values ('20000000-0000-0000-0000-0000000000b1', 'diario',
             '10000000-0000-0000-0000-0000000000b1',
             '30000000-0000-0000-0000-0000000000b1') $$,
  'Primer registro de aseo con uuid_idempotente nuevo debe insertarse'
);

-- 2) Reintento con LA MISMA clave (simula un corte de señal a mitad
--    de envío): el patrón de sincronización real usa ON CONFLICT DO
--    NOTHING, así que no debe fallar ni duplicar.
select lives_ok(
  $$ insert into public.aseo
       (habitacion_id, tipo, responsable, uuid_idempotente)
     values ('20000000-0000-0000-0000-0000000000b1', 'diario',
             '10000000-0000-0000-0000-0000000000b1',
             '30000000-0000-0000-0000-0000000000b1')
     on conflict (uuid_idempotente) do nothing $$,
  'Reintento con la misma uuid_idempotente vía ON CONFLICT no debe fallar'
);

select is(
  (select count(*)::int from public.aseo
    where uuid_idempotente = '30000000-0000-0000-0000-0000000000b1'::uuid),
  1,
  'El reintento no debe duplicar la fila: debe seguir existiendo solo una'
);

select * from finish();
rollback;
