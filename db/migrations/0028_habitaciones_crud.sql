-- =====================================================================
-- Migración 0028 (CAMBIO-01): CRUD de habitaciones en Ajustes, solo
-- para la Administradora.
--
-- QUÉ HABÍA ANTES
--
-- `habitacion` ya existía desde 0001_init.sql, pero: (a) no tenía forma
-- de "retirar" una pieza sin borrarla a mano en la base, (b) su policy
-- `habitacion_rw` (FOR ALL, USING app.rol() is not null) deja que
-- CUALQUIER rol autenticado inserte/actualice piezas — la Encargada
-- también, cuando la intención de CLAUDE.md es que la administración de
-- habitaciones sea exclusiva de la Administradora — y (c) no había
-- GRANT de DELETE en absoluto para `authenticated` (0021_privilegios_
-- minimos.sql solo concedió select/insert/update), así que un borrado
-- real era imposible incluso saltándose RLS.
--
-- QUÉ AGREGA ESTA MIGRACIÓN
--
--   1. `activa` (default true): retirar una pieza sin borrar su fila ni
--      su historial. No se reutiliza `estado` (disponible/ocupada/
--      en_aseo/en_mantencion) porque esos 4 valores son la máquina de
--      estados operativa de RNF-04 (CLAUDE.md) y no describen "esta
--      pieza ya no se arrienda".
--   2. `creado_por`/`created_at`: quién y cuándo se creó la fila. Las 12
--      piezas reales ya existentes (seed/migraciones) quedan con
--      `creado_por` NULL — nadie las "creó" desde el CRUD, y no hay
--      forma honesta de inventar un responsable retroactivo.
--   3. `habitacion_auditoria`: bitácora append-only de creación/edición/
--      desactivación/reactivación/eliminación, mismo principio que
--      `contrato_empresa_ajuste` (0026) — no se corrige una fila, se
--      agrega una nueva. Sobrevive a un DELETE real de la habitacion
--      (ON DELETE SET NULL + numero congelado en la propia fila de
--      auditoría), a diferencia de FK en cascada.
--   4. Triggers de defensa en profundidad (no confiar solo en la UI):
--      - sellar creado_por/actualizado_por en servidor;
--      - bloquear desactivar una pieza con reservas futuras o en curso;
--      - bloquear reducir la capacidad por debajo de las camas de esa
--        pieza que hoy tienen una reserva futura o en curso.
--   5. RLS: se reemplaza `habitacion_rw` (FOR ALL, cualquier rol) por
--      policies separadas — SELECT para cualquier rol autenticado (la
--      Encargada sigue necesitando ver las piezas para aseo/consumos),
--      INSERT/UPDATE/DELETE solo para `app.es_administradora()`.
--   6. GRANT: se agrega DELETE a `authenticated` (antes no existía ni
--      eso) — RLS y el trigger de bloqueo son quienes realmente
--      restringen qué fila se puede borrar, no la ausencia del
--      privilegio.
--
-- DECISIÓN QUE QUEDA ABIERTA (NO se resuelve acá, se documenta):
-- `capacidad` hoy NO es un tope duro sobre cuántas camas puede tener una
-- pieza — hay piezas dobles (capacidad 2) con 3 camas reales para
-- nómina de empresa (ver db/seed-demo-empresa.sh y db/seed-demo-
-- reunion-cliente.sh, ambos del equipo). El trigger de "reducir
-- capacidad" de acá solo bloquea hacia ADELANTE (una reducción futura
-- que dejaría camas con reserva activa por encima de la nueva
-- capacidad); no corrige ni re-valida las piezas que ya exceden su
-- capacidad nominal hoy. Esa es una decisión de negocio de la
-- Administradora, no una que corresponda tomar en esta migración.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 1. Columnas nuevas
-- ---------------------------------------------------------------------
alter table public.habitacion
  add column activa      boolean not null default true,
  add column creado_por  uuid references public.usuario(id),
  add column created_at  timestamptz not null default now();

comment on column public.habitacion.activa is
  'false = la pieza se retiró de servicio (no aparece en el mapa semanal ni en los selectores de reserva nuevos). No se borra la fila ni su historial.';
comment on column public.habitacion.creado_por is
  'Quién creó la fila desde el CRUD de Ajustes. NULL en las piezas que ya existían antes de esta migración (no hay un responsable honesto que asignarles).';

-- ---------------------------------------------------------------------
-- 2. Bitácora append-only (mismo principio que contrato_empresa_ajuste)
-- ---------------------------------------------------------------------
create table public.habitacion_auditoria (
  id                  uuid primary key default gen_random_uuid(),
  -- SIN foreign key a habitacion(id) a propósito: una fila de 'eliminada'
  -- apunta a una habitacion que ya no existe, y un ON DELETE SET NULL
  -- dispararía un UPDATE sobre esta misma tabla append-only que el
  -- trigger de abajo bloquearía (se detectó probando el flujo
  -- completo: el DELETE de la habitación quedaba atrapado dentro de su
  -- propia transacción). `habitacion_numero` es el identificador
  -- durable para lectura humana; `habitacion_id` queda como referencia
  -- best-effort, sin integridad referencial.
  habitacion_id       uuid,
  habitacion_numero   int not null,
  accion              text not null check (accion in ('creada', 'editada', 'desactivada', 'reactivada', 'eliminada')),
  detalle             text,
  realizado_por       uuid not null references public.usuario(id),
  created_at          timestamptz not null default now()
);

create index on public.habitacion_auditoria (habitacion_id);
create index on public.habitacion_auditoria (habitacion_numero);

alter table public.habitacion_auditoria enable row level security;

-- Solo la Administradora administra habitaciones, así que solo ella
-- necesita leer su bitácora.
create policy habitacion_auditoria_select on public.habitacion_auditoria for select
  using (app.es_administradora());
create policy habitacion_auditoria_insert on public.habitacion_auditoria for insert
  with check (app.es_administradora());

grant select, insert on public.habitacion_auditoria to authenticated;

-- Append-only de verdad: ni UPDATE ni DELETE, igual que consumo/aseo.
create or replace function app.bloquear_edicion_habitacion_auditoria() returns trigger
language plpgsql as $$
begin
  raise exception 'La bitácora de habitaciones es de solo lectura (append-only).' using errcode = '23514';
end;
$$;

create trigger habitacion_auditoria_sin_update
  before update on public.habitacion_auditoria
  for each row execute function app.bloquear_edicion_habitacion_auditoria();
create trigger habitacion_auditoria_sin_delete
  before delete on public.habitacion_auditoria
  for each row execute function app.bloquear_edicion_habitacion_auditoria();

-- ---------------------------------------------------------------------
-- 3. Sellar creado_por/created_at/updated_at en servidor (nunca confiar
-- en lo que mande el cliente) — mismo patrón que
-- app.config_negocio_sellar_auditoria (0018).
-- ---------------------------------------------------------------------
create or replace function app.habitacion_sellar_auditoria() returns trigger
language plpgsql as $$
declare
  v_usuario uuid := (select u.id from public.usuario u where u.auth_uid = app.uid());
begin
  if tg_op = 'INSERT' then
    new.creado_por := v_usuario;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  -- UPDATE: el id, quién la creó y cuándo nunca cambian.
  new.id := old.id;
  new.creado_por := old.creado_por;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger habitacion_sella_auditoria
  before insert or update on public.habitacion
  for each row execute function app.habitacion_sellar_auditoria();

-- ---------------------------------------------------------------------
-- 3b. Registrar en la bitácora (habitacion_auditoria) creación/edición/
-- desactivación/reactivación. AFTER (no BEFORE) porque ya necesita los
-- valores finales que selló el trigger anterior. Solo se dispara con
-- UPDATE OF las columnas administrativas del CRUD — nunca con los
-- cambios de `estado` del día a día (check-in/check-out/aseo), que
-- siguen su propia máquina de estados (RNF-04) y no son parte de este
-- CRUD.
--
-- Si no hay un usuario resoluble desde app.uid() (p. ej. scripts de
-- mantención/demo que escriben directo como superusuario, sin pasar
-- por la API/RLS — ver db/seed-demo.sh), NO se inserta fila de
-- bitácora en vez de fallar: mismo criterio de tolerancia que
-- app.config_negocio_sellar_auditoria (0018), que hace COALESCE en vez
-- de exigir siempre un actor. `realizado_por` sigue NOT NULL porque
-- toda fila que SÍ se escribe debe tener un responsable real.
-- ---------------------------------------------------------------------
create or replace function app.habitacion_registrar_creacion() returns trigger
language plpgsql as $$
begin
  if new.creado_por is not null then
    insert into public.habitacion_auditoria (habitacion_id, habitacion_numero, accion, realizado_por)
      values (new.id, new.numero, 'creada', new.creado_por);
  end if;
  return new;
end;
$$;

create trigger trg_habitacion_registrar_creacion
  after insert on public.habitacion
  for each row execute function app.habitacion_registrar_creacion();

create or replace function app.habitacion_registrar_edicion() returns trigger
language plpgsql as $$
declare
  v_usuario uuid := (select u.id from public.usuario u where u.auth_uid = app.uid());
begin
  if v_usuario is not null then
    insert into public.habitacion_auditoria (habitacion_id, habitacion_numero, accion, detalle, realizado_por)
      values (
        new.id, new.numero, 'editada',
        format('número %s→%s, capacidad %s→%s', old.numero, new.numero, old.capacidad, new.capacidad),
        v_usuario
      );
  end if;
  return new;
end;
$$;

create trigger trg_habitacion_registrar_edicion
  after update of numero, capacidad, motivo_mantencion on public.habitacion
  for each row execute function app.habitacion_registrar_edicion();

create or replace function app.habitacion_registrar_activa() returns trigger
language plpgsql as $$
declare
  v_usuario uuid := (select u.id from public.usuario u where u.auth_uid = app.uid());
begin
  if v_usuario is not null then
    insert into public.habitacion_auditoria (habitacion_id, habitacion_numero, accion, realizado_por)
      values (
        new.id, new.numero, case when new.activa then 'reactivada' else 'desactivada' end,
        v_usuario
      );
  end if;
  return new;
end;
$$;

create trigger trg_habitacion_registrar_activa
  after update of activa on public.habitacion
  for each row execute function app.habitacion_registrar_activa();

-- ---------------------------------------------------------------------
-- 4. Bloquear desactivar una pieza con reservas futuras o en curso
-- ---------------------------------------------------------------------
create or replace function app.habitacion_validar_desactivacion() returns trigger
language plpgsql as $$
declare
  v_hoy date := (now() at time zone 'America/Santiago')::date;
  v_cantidad int;
begin
  if new.activa = false and old.activa = true then
    select count(*) into v_cantidad
    from public.reserva r
    join public.cama c on c.id = r.cama_id
    where c.habitacion_id = new.id
      and r.estado = 'confirmada'
      and (r.fecha_fin is null or r.fecha_fin >= v_hoy);

    if v_cantidad > 0 then
      raise exception 'No se puede desactivar: tiene % reserva(s) futura(s) o en curso. Revísalas antes de desactivar la pieza.', v_cantidad
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_habitacion_validar_desactivacion
  before update of activa on public.habitacion
  for each row execute function app.habitacion_validar_desactivacion();

-- ---------------------------------------------------------------------
-- 5. Bloquear reducir la capacidad por debajo de las camas con reserva
-- futura o en curso (ver nota de alcance al inicio del archivo: esto
-- NO re-valida piezas que ya exceden su capacidad nominal hoy).
-- ---------------------------------------------------------------------
create or replace function app.habitacion_validar_reduccion_capacidad() returns trigger
language plpgsql as $$
declare
  v_hoy date := (now() at time zone 'America/Santiago')::date;
  v_camas_ocupadas int;
begin
  if new.capacidad >= old.capacidad then
    return new;
  end if;

  select count(distinct c.id) into v_camas_ocupadas
  from public.cama c
  join public.reserva r on r.cama_id = c.id
  where c.habitacion_id = new.id
    and r.estado = 'confirmada'
    and (r.fecha_fin is null or r.fecha_fin >= v_hoy);

  if v_camas_ocupadas > new.capacidad then
    raise exception 'No se puede reducir la capacidad a %: hay % cama(s) de esta pieza con una reserva futura o en curso.', new.capacidad, v_camas_ocupadas
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger trg_habitacion_validar_reduccion_capacidad
  before update of capacidad on public.habitacion
  for each row execute function app.habitacion_validar_reduccion_capacidad();

-- ---------------------------------------------------------------------
-- 6. Eliminar de verdad: solo sin historial. Función SECURITY DEFINER
-- para dejar la bitácora Y el borrado en una sola transacción atómica
-- (si el DELETE falla por FK, la fila de auditoría tampoco queda).
-- `on delete cascade` de `cama` hacia `habitacion` ya existía desde
-- 0001_init.sql (no se agrega ninguno nuevo acá) — es seguro porque
-- esta función ya comprobó que esas camas no tienen ninguna reserva.
-- ---------------------------------------------------------------------
create or replace function public.eliminar_habitacion(p_habitacion_id uuid, p_motivo text default null)
returns void
language plpgsql security definer set search_path = pg_catalog, public, app as $$
declare
  v_habitacion public.habitacion;
  v_usuario uuid := (select u.id from public.usuario u where u.auth_uid = app.uid());
  v_tiene_reservas boolean;
  v_tiene_aseo boolean;
begin
  if not app.es_administradora() then
    raise exception 'Solo la Administradora puede eliminar habitaciones.' using errcode = '42501';
  end if;

  select * into v_habitacion from public.habitacion where id = p_habitacion_id for update;
  if not found then
    raise exception 'La habitación ya no existe.' using errcode = '23514';
  end if;

  select exists (
    select 1 from public.reserva r join public.cama c on c.id = r.cama_id
    where c.habitacion_id = p_habitacion_id
  ) into v_tiene_reservas;

  select exists (
    select 1 from public.aseo where habitacion_id = p_habitacion_id
  ) into v_tiene_aseo;

  if v_tiene_reservas or v_tiene_aseo then
    raise exception 'No se puede eliminar: la pieza tiene historial (reservas o registros de aseo). Desactívala en vez de eliminarla.' using errcode = '23514';
  end if;

  insert into public.habitacion_auditoria (habitacion_id, habitacion_numero, accion, detalle, realizado_por)
    values (p_habitacion_id, v_habitacion.numero, 'eliminada', p_motivo, v_usuario);

  delete from public.habitacion where id = p_habitacion_id;
end;
$$;

revoke all on function public.eliminar_habitacion(uuid, text) from public, anon;
grant execute on function public.eliminar_habitacion(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 7. RLS: reemplaza la policy FOR ALL por policies separadas por rol
--
-- OJO con UPDATE: la máquina de estados operativa de RNF-04
-- (app.checkin_ocupa_habitacion, app.checkout_dispara_aseo,
-- app.aseo_completado_libera_habitacion — todas 0001_init.sql) hace
-- `update habitacion set estado = ...` SIN `security definer`, como la
-- Encargada (no solo la Administradora). Si la policy de UPDATE exige
-- `app.es_administradora()` para CUALQUIER columna, esas llamadas
-- quedan bloqueadas por RLS y el check-in/check-out/aseo de la
-- Encargada deja de poder liberar u ocupar una pieza (se detectó
-- porque rompía 20_cancelacion_reserva.sql). Por eso la policy de
-- UPDATE se mantiene permisiva para cualquier rol autenticado, igual
-- que antes — y es el trigger de abajo (no RLS) el que de verdad
-- restringe los campos administrativos del CRUD (numero/capacidad/
-- activa) a la Administradora, sin tocar estado/motivo_mantencion.
-- ---------------------------------------------------------------------
drop policy if exists habitacion_rw on public.habitacion;

create policy habitacion_select on public.habitacion for select
  using (app.rol() is not null);
create policy habitacion_insert on public.habitacion for insert
  with check (app.es_administradora());
create policy habitacion_update on public.habitacion for update
  using (app.rol() is not null) with check (app.rol() is not null);
create policy habitacion_delete on public.habitacion for delete
  using (app.es_administradora());

create or replace function app.habitacion_validar_permiso_edicion() returns trigger
language plpgsql as $$
begin
  if app.es_administradora() then
    return new;
  end if;
  if new.numero is distinct from old.numero
     or new.capacidad is distinct from old.capacidad
     or new.activa is distinct from old.activa then
    raise exception 'Solo la Administradora puede editar el número, la capacidad o el estado activo/inactivo de una habitación.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger trg_habitacion_validar_permiso_edicion
  before update of numero, capacidad, activa on public.habitacion
  for each row execute function app.habitacion_validar_permiso_edicion();

-- Antes no había NINGÚN privilegio de DELETE para `authenticated`
-- (0021_privilegios_minimos.sql solo concedió select/insert/update).
-- RLS (policy de arriba) y el chequeo de historial de
-- eliminar_habitacion() son las dos barreras reales; el GRANT por sí
-- solo no permite nada.
grant delete on public.habitacion to authenticated;

notify pgrst, 'reload schema';
commit;
