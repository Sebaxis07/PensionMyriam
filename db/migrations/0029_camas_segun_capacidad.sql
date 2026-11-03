-- =====================================================================
-- Migración 0029: las camas de una pieza siguen su `capacidad`.
--
-- QUÉ HABÍA ANTES
--
-- `cama` (0001_init.sql) es una fila libre: nada en el esquema ni en la
-- app garantizaba que una pieza DOBLE (capacidad 2) tuviera 2 camas en
-- vez de 1. En la práctica, las 2 camas de una pieza doble para nómina
-- de empresa las creaban A MANO scripts de seed del equipo
-- (db/seed-demo-empresa.sh, db/seed-demo-reunion-cliente.sh) con
-- `insert into cama` directo — nunca la propia app. El flujo "Reservar
-- camas sin nómina" (features/nomina/cuposEmpresa.ts,
-- camasLibresParaContrato) simplemente ofrece las filas de `cama` que
-- ya existan: si una pieza doble solo tenía 1 cama (su estado real
-- después de crear la pieza desde el CRUD de Ajustes, CAMBIO-01, o
-- después de un reseteo de datos de desarrollo), la Administradora
-- nunca podía reservar la segunda cama de esa pieza para una empresa,
-- aunque la pieza fuera doble.
--
-- QUÉ HACE ESTA MIGRACIÓN
--
-- Un único trigger AFTER UPDATE OF capacidad en habitacion, que
-- mantiene `cama` sincronizada cuando la capacidad CAMBIA después de
-- creada la pieza: si sube, agrega las camas que falten (1..nueva
-- capacidad); si baja, borra SOLO las camas sobrantes que nunca
-- tuvieron una reserva ni un aseo (si alguna de más ya tiene
-- historial, se deja — el trigger de 0028 ya impide bajar la capacidad
-- mientras una de esas camas tenga una reserva ACTIVA; esto cubre
-- además el historial PASADO, que debe conservarse igual que una
-- pieza no se puede eliminar con historial).
--
-- DELIBERADAMENTE NO hay un trigger equivalente en INSERT: muchos
-- fixtures existentes (pgTAP, seeds) crean la habitación y enseguida
-- insertan su(s) propia(s) cama(s) a mano con numero=1 — un trigger de
-- auto-creación colisionaría con esa fila (unique
-- cama_habitacion_id_numero_key), como se detectó corriendo el suite
-- completo de pgTAP antes de cerrar esta migración. La creación desde
-- el CRUD de Ajustes (CAMBIO-01, app/src/features/habitaciones/
-- useGestionHabitaciones.ts) provisiona sus propias camas en el
-- mismo flujo de alta, sin depender de un trigger.
--
-- Backfill: completa las camas que falten en las 12 piezas reales que
-- ya existían antes de esta migración.
--
-- Esto NO cambia el criterio de Sprint 1 de que un turista reserva la
-- PIEZA completa (sigue usando la cama numero 1, como siempre) — solo
-- garantiza que las camas adicionales para nómina de empresa (numero 2,
-- 3, ...) existan de verdad cuando `capacidad` dice que deberían.
-- =====================================================================
begin;

-- SECURITY DEFINER: borrar camas requiere un privilegio que
-- `authenticated` nunca tuvo (0021_privilegios_minimos.sql no concedió
-- DELETE en `cama`, a propósito). El alcance queda acotado por el
-- propio trigger (solo camas de ESTA pieza, por encima de la nueva
-- capacidad, y solo si no tienen ningún historial) y por el trigger de
-- 0028 que ya bloqueó la reducción si alguna de esas camas tiene una
-- reserva activa — no abre una vía nueva para borrar camas en general.
create or replace function app.habitacion_ajustar_camas_por_capacidad() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, app as $$
begin
  if new.capacidad > old.capacidad then
    insert into public.cama (habitacion_id, numero)
    select new.id, n
    from generate_series(old.capacidad + 1, new.capacidad) as n
    where not exists (select 1 from public.cama c where c.habitacion_id = new.id and c.numero = n);
  elsif new.capacidad < old.capacidad then
    delete from public.cama c
    where c.habitacion_id = new.id
      and c.numero > new.capacidad
      and not exists (select 1 from public.reserva r where r.cama_id = c.id)
      and not exists (select 1 from public.aseo a where a.cama_id = c.id);
  end if;
  return new;
end;
$$;

create trigger trg_habitacion_ajustar_camas_por_capacidad
  after update of capacidad on public.habitacion
  for each row execute function app.habitacion_ajustar_camas_por_capacidad();

-- Backfill para las piezas que ya existían (ver nota arriba: las
-- dobles se habían quedado con 1 sola cama tras un reseteo de datos de
-- desarrollo).
do $$
declare v_habitacion record;
begin
  for v_habitacion in select id, capacidad from public.habitacion loop
    insert into public.cama (habitacion_id, numero)
    select v_habitacion.id, n
    from generate_series(1, v_habitacion.capacidad) as n
    where not exists (select 1 from public.cama c where c.habitacion_id = v_habitacion.id and c.numero = n);
  end loop;
end $$;

commit;
