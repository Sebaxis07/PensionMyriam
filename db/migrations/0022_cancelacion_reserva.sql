-- Cancelar una reserva de turista antes de la llegada, sin cobro.
begin;
alter table public.reserva
  add column motivo_cancelacion text,
  add column cancelada_por uuid references public.usuario(id),
  add column cancelada_en timestamptz,
  add column uuid_cancelacion uuid unique;

alter table public.reserva add constraint cancelacion_datos_coherentes check (
  (motivo_cancelacion is null and cancelada_por is null and cancelada_en is null and uuid_cancelacion is null)
  or (estado = 'cancelada' and motivo_cancelacion is not null
      and length(btrim(motivo_cancelacion)) between 5 and 500
      and cancelada_por is not null and cancelada_en is not null and uuid_cancelacion is not null)
);

create function app.validar_cancelacion_reserva() returns trigger
language plpgsql set search_path = pg_catalog, public, app as $$
begin
  if tg_op = 'UPDATE' and old.estado = 'cancelada' then
    if new.estado is distinct from old.estado
       or row(new.motivo_cancelacion, new.cancelada_por, new.cancelada_en, new.uuid_cancelacion)
          is distinct from row(old.motivo_cancelacion, old.cancelada_por, old.cancelada_en, old.uuid_cancelacion) then
      raise exception 'La cancelación ya fue registrada y no se puede cambiar.' using errcode = '23514';
    end if;
    return new;
  end if;
  if new.estado = 'cancelada' then
    if tg_op = 'INSERT' then
      raise exception 'Primero debe existir una reserva confirmada.' using errcode = '23514';
    end if;
    if old.estado <> 'confirmada' or old.tipo_cliente <> 'turista' then
      raise exception 'Solo se puede cancelar una reserva de turista antes de su llegada.' using errcode = '23514';
    end if;
    -- UPDATE ya bloquea esta fila; el check-in toma el mismo bloqueo.
    if exists (select 1 from public.checkin where reserva_id = old.id) then
      raise exception 'El huésped ya ingresó. Registra su salida en Habitaciones.' using errcode = '23514';
    end if;
    if new.cancelada_por is distinct from (select id from public.usuario where auth_uid = app.uid()) then
      raise exception 'No se pudo identificar a quien cancela la reserva.' using errcode = '42501';
    end if;
    if new.motivo_cancelacion is null or length(btrim(new.motivo_cancelacion)) not between 5 and 500
       or new.cancelada_en is null or new.uuid_cancelacion is null then
      raise exception 'Escribe el motivo de cancelación (entre 5 y 500 caracteres).' using errcode = '23514';
    end if;
    new.motivo_cancelacion := btrim(new.motivo_cancelacion);
  end if;
  return new;
end;
$$;
create trigger validar_cancelacion_reserva before insert or update on public.reserva
  for each row execute function app.validar_cancelacion_reserva();

create function app.validar_reserva_antes_checkin() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
declare v_estado public.estado_reserva;
begin
  select estado into v_estado from public.reserva where id = new.reserva_id for update;
  if v_estado is distinct from 'confirmada'::public.estado_reserva then
    raise exception 'Esta reserva no está confirmada. Revisa si fue cancelada.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger validar_reserva_antes_checkin before insert on public.checkin
  for each row execute function app.validar_reserva_antes_checkin();

-- reserva ya tiene RLS, publicación lógica y select * en PowerSync.
notify pgrst, 'reload schema';
commit;
