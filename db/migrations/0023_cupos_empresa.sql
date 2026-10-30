-- HU-02/HU-12: reservar una cama sin inventar una persona.
begin;
alter table public.reserva add column cupo_numero integer,
  add column uuid_identificacion uuid unique;
alter table public.reserva drop constraint reserva_turista_o_empresa;
alter table public.reserva add constraint reserva_turista_o_empresa check (
  (tipo_cliente = 'turista' and huesped_nombre is not null and trabajador_id is null
    and contrato_empresa_id is null and cupo_numero is null and uuid_identificacion is null)
  or (tipo_cliente = 'empresa' and contrato_empresa_id is not null and huesped_nombre is null
    and (trabajador_id is not null or cupo_numero is not null))
);
alter table public.reserva add constraint cupo_numero_positivo check(cupo_numero is null or cupo_numero > 0);
alter table public.reserva add constraint identificacion_cupo_coherente check (uuid_identificacion is null or (cupo_numero is not null and trabajador_id is not null));
create unique index reserva_cupo_activo_unico on public.reserva(contrato_empresa_id,cupo_numero)
  where estado='confirmada' and cupo_numero is not null;

create function app.validar_cupo_empresa() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,app as $$
declare v_contrato public.contrato_empresa; v_trabajador public.trabajador;
begin
  if tg_op='UPDATE' and old.cupo_numero is not null then
    if row(new.cupo_numero,new.cama_id,new.contrato_empresa_id) is distinct from row(old.cupo_numero,old.cama_id,old.contrato_empresa_id) then
      raise exception 'El cupo ya tiene una cama reservada; no se puede cambiar su identidad.' using errcode='23514';
    end if;
    if old.trabajador_id is not null and new.trabajador_id is distinct from old.trabajador_id then
      raise exception 'Este cupo ya fue identificado por otro registro.' using errcode='23514';
    end if;
  end if;
  if tg_op='INSERT' and new.cupo_numero is not null and
    new.creado_por is distinct from (select id from public.usuario where auth_uid=app.uid()) then
    raise exception 'No se puede reservar un cupo a nombre de otra usuaria.' using errcode='42501';
  end if;
  if new.cupo_numero is null or new.estado <> 'confirmada' then return new; end if;
  select * into v_contrato from public.contrato_empresa where id=new.contrato_empresa_id for update;
  if not found or new.cupo_numero > v_contrato.headcount then
    raise exception 'El cupo supera la cantidad de personas contratadas.' using errcode='23514';
  end if;
  if new.fecha_inicio is distinct from v_contrato.vigencia_desde or new.fecha_fin is distinct from v_contrato.vigencia_hasta then
    raise exception 'Las fechas del cupo deben coincidir con la vigencia del contrato.' using errcode='23514';
  end if;
  if (select count(*) from public.reserva where contrato_empresa_id=new.contrato_empresa_id and estado='confirmada' and id<>new.id) >= v_contrato.headcount then
    raise exception 'Ya están reservadas todas las camas contratadas.' using errcode='23514';
  end if;
  if exists(select 1 from public.cama c join public.habitacion h on h.id=c.habitacion_id where c.id=new.cama_id and h.estado='en_mantencion') then
    raise exception 'La habitación está en mantención. Elige otra cama.' using errcode='23514';
  end if;
  if new.trabajador_id is not null then
    select * into v_trabajador from public.trabajador where id=new.trabajador_id;
    if not found or v_trabajador.contrato_empresa_id <> new.contrato_empresa_id then
      raise exception 'La persona debe pertenecer al mismo contrato que el cupo.' using errcode='23514';
    end if;
    if exists(select 1 from public.reserva where trabajador_id=new.trabajador_id and estado='confirmada' and id<>new.id
      and daterange(fecha_inicio,coalesce(fecha_fin,'infinity'::date),'[]') && daterange(new.fecha_inicio,coalesce(new.fecha_fin,'infinity'::date),'[]')) then
      raise exception 'La persona ya tiene una cama reservada en esas fechas.' using errcode='23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger validar_cupo_empresa before insert or update on public.reserva
  for each row execute function app.validar_cupo_empresa();

create function public.reservar_cupos_empresa(p_reservas jsonb) returns void
language plpgsql security definer set search_path=pg_catalog,public,app as $$
declare v jsonb; v_contrato uuid; v_usuario uuid; v_existente public.reserva;
begin
  if app.rol() is null then raise exception 'Se requiere una cuenta autorizada para reservar camas.' using errcode='42501'; end if;
  select id into v_usuario from public.usuario where auth_uid=app.uid();
  if jsonb_typeof(p_reservas)<>'array' or jsonb_array_length(p_reservas)=0 then
    raise exception 'Selecciona al menos una cama.' using errcode='23514';
  end if;
  v_contrato:=(p_reservas->0->>'contrato_empresa_id')::uuid;
  perform 1 from public.contrato_empresa where id=v_contrato for update;
  if not found then raise exception 'No se encontró el contrato.' using errcode='23514'; end if;
  for v in select * from jsonb_array_elements(p_reservas) loop
    if (v->>'contrato_empresa_id')::uuid <> v_contrato or (v->>'creado_por')::uuid is distinct from v_usuario then
      raise exception 'Las camas deben corresponder al mismo contrato y a quien las registra.' using errcode='42501';
    end if;
    select * into v_existente from public.reserva where id=(v->>'id')::uuid;
    if found then
      if row(v_existente.contrato_empresa_id,v_existente.cama_id,v_existente.cupo_numero,v_existente.uuid_idempotente)
        is distinct from row(v_contrato,(v->>'cama_id')::uuid,(v->>'cupo_numero')::integer,(v->>'uuid_idempotente')::uuid) then
        raise exception 'El identificador corresponde a otra reserva.' using errcode='23514';
      end if;
      continue; -- Reintento: no reabre ni sobrescribe un cupo identificado.
    end if;
    insert into public.reserva(id,tipo_cliente,cama_id,contrato_empresa_id,cupo_numero,fecha_inicio,fecha_fin,creado_por,uuid_idempotente,created_at)
    values((v->>'id')::uuid,'empresa',(v->>'cama_id')::uuid,v_contrato,(v->>'cupo_numero')::integer,
      (v->>'fecha_inicio')::date,(v->>'fecha_fin')::date,v_usuario,(v->>'uuid_idempotente')::uuid,(v->>'created_at')::timestamptz);
  end loop;
end;
$$;

create function public.identificar_cupo_empresa(p_reserva_id uuid,p_trabajador_id uuid,p_nombre text,p_uuid_identificacion uuid,p_creado_en timestamptz) returns void
language plpgsql security definer set search_path=pg_catalog,public,app as $$
declare v_reserva public.reserva; v_trabajador public.trabajador;
begin
  if app.rol() is null then raise exception 'Se requiere una cuenta autorizada para identificar cupos.' using errcode='42501'; end if;
  select * into v_reserva from public.reserva where id=p_reserva_id for update;
  if not found or v_reserva.cupo_numero is null or v_reserva.estado <> 'confirmada' then
    raise exception 'El cupo ya no está disponible. Revisa la reserva.' using errcode='23514';
  end if;
  if v_reserva.trabajador_id is not null then
    if v_reserva.trabajador_id=p_trabajador_id and v_reserva.uuid_identificacion=p_uuid_identificacion then return; end if;
    raise exception 'Este cupo ya fue identificado en otro teléfono.' using errcode='23514';
  end if;
  if p_nombre is null or length(btrim(p_nombre))=0 or p_uuid_identificacion is null then
    raise exception 'Escribe el nombre real de la persona.' using errcode='23514';
  end if;
  select * into v_trabajador from public.trabajador where id=p_trabajador_id for update;
  if found then
    if v_trabajador.contrato_empresa_id<>v_reserva.contrato_empresa_id or v_trabajador.cama_id is not null then
      raise exception 'La persona pertenece a otro contrato o ya tiene una cama.' using errcode='23514';
    end if;
  else
    insert into public.trabajador(id,contrato_empresa_id,nombre,created_at)
    values(p_trabajador_id,v_reserva.contrato_empresa_id,btrim(p_nombre),p_creado_en);
  end if;
  update public.reserva set trabajador_id=p_trabajador_id,uuid_identificacion=p_uuid_identificacion where id=p_reserva_id;
  update public.trabajador set cama_id=v_reserva.cama_id where id=p_trabajador_id;
end;
$$;

-- Una cama sin persona no permite registrar una llegada.
create function app.checkin_cupo_identificado() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
  if exists(select 1 from public.reserva where id=new.reserva_id and tipo_cliente='empresa' and trabajador_id is null) then
    raise exception 'Falta identificar a la persona antes de registrar su llegada.' using errcode='23514';
  end if;
  return new;
end;
$$;
create trigger checkin_cupo_identificado before insert on public.checkin for each row execute function app.checkin_cupo_identificado();
revoke all on function public.reservar_cupos_empresa(jsonb) from public,anon;
revoke all on function public.identificar_cupo_empresa(uuid,uuid,text,uuid,timestamptz) from public,anon;
grant execute on function public.reservar_cupos_empresa(jsonb) to authenticated;
grant execute on function public.identificar_cupo_empresa(uuid,uuid,text,uuid,timestamptz) to authenticated;
create or replace function app.validar_cancelacion_reserva() returns trigger
language plpgsql set search_path = pg_catalog, public, app as $
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
    if old.estado <> 'confirmada' then
      raise exception 'Solo se puede liberar una reserva antes de su llegada.' using errcode = '23514';
    end if;
    -- UPDATE ya bloquea esta fila; el check-in toma el mismo bloqueo.
    if exists (select 1 from public.checkin where reserva_id = old.id) then
      raise exception 'El huésped ya ingresó. Registra su salida en Habitaciones.' using errcode = '23514';
    end if;
    if old.tipo_cliente = 'empresa' then
      new.motivo_cancelacion := coalesce(new.motivo_cancelacion, 'Liberación de cama de empresa');
      new.cancelada_por := coalesce(new.cancelada_por, (select id from public.usuario where auth_uid = app.uid()));
      new.cancelada_en := coalesce(new.cancelada_en, now());
      new.uuid_cancelacion := coalesce(new.uuid_cancelacion, gen_random_uuid());
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
$;


-- Al cerrar una versión del contrato, sus cupos dejan de bloquear
-- fechas posteriores. No se cambia headcount ni tarifa de esa versión.
create function app.ajustar_vigencia_cupos() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $
begin
  if row(new.vigencia_desde,new.vigencia_hasta) is distinct from row(old.vigencia_desde,old.vigencia_hasta) then
    update public.reserva set fecha_inicio=new.vigencia_desde,fecha_fin=new.vigencia_hasta
      where contrato_empresa_id=new.id and cupo_numero is not null and estado='confirmada';
  end if;
  return new;
end;
$;
create trigger ajustar_vigencia_cupos after update on public.contrato_empresa for each row execute function app.ajustar_vigencia_cupos();

notify pgrst,'reload schema';
commit;
