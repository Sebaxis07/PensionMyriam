-- Registro opcional de aseo por habitación y cama (mejora propuesta por
-- el equipo tras la auditoría del módulo — NO es un checklist exigido
-- por la clienta: María solo confirmó que el aseo diario es una
-- práctica real, sin frecuencia de cambio de sábanas ni lista de
-- tareas obligatoria documentada). Todo lo que agrega esta migración
-- es ESTRICTAMENTE OPCIONAL: ninguna columna nueva es NOT NULL salvo
-- las que tienen un default seguro (`modalidad`, `pendiente`).
--
-- La máquina de estados de habitación (checkin/checkout/aseo) definida
-- en 0001_init.sql NO se toca: los triggers que la gobiernan
-- (app.checkin_ocupa_habitacion, app.checkout_dispara_aseo,
-- app.aseo_completado_libera_habitacion, app.impedir_salto_estado_habitacion)
-- siguen mirando únicamente la columna `tipo` (diario/post_checkout),
-- que tampoco se modifica. Esta migración es una bitácora ADICIONAL
-- que coexiste con ese flujo sin alterarlo.

-- ---------------------------------------------------------------------
-- 1) Columnas nuevas en `aseo`
-- ---------------------------------------------------------------------
create type modalidad_aseo as enum ('rapido', 'detallado');

alter table public.aseo
  add column cama_id              uuid references public.cama(id),
  add column modalidad            modalidad_aseo not null default 'rapido',
  -- JSON array de claves de tarea seleccionadas, ej '["barrer","cambio_sabanas"]'.
  -- Se guarda como texto (no jsonb) para replicarse 1:1 a PowerSync/SQLite,
  -- igual que el resto del esquema (ver comentario de cabecera de
  -- app/src/lib/schema.ts).
  add column tareas                text,
  add column observaciones         text,
  add column pendiente             boolean not null default false,
  -- Nombre libre de quien hizo la limpieza, cuando no es quien la
  -- registra (ej. "cuñada de María") — distinto de `responsable`
  -- (siempre el usuario autenticado que hizo el INSERT).
  add column responsable_declarado text,
  add column aseo_corregido_id     uuid references public.aseo(id),
  add column justificacion_correccion text,
  add constraint aseo_correccion_requiere_justificacion check (
    aseo_corregido_id is null or justificacion_correccion is not null
  );

comment on column public.aseo.cama_id is
  'Opcional: cama específica del registro. NULL = limpieza general de la habitación completa.';
comment on column public.aseo.modalidad is
  'rapido = un toque sin detalle; detallado = con tareas/observaciones/cama. No confundir con `tipo` (diario/post_checkout), que sigue gobernando la máquina de estados.';
comment on column public.aseo.pendiente is
  'Marca explícita de "queda algo por hacer" dejada por quien registra. La AUSENCIA de registro de aseo nunca debe interpretarse como pendiente ni como sucio — eso se resuelve en la UI, no acá.';

-- ---------------------------------------------------------------------
-- 2) Si se indica cama_id, debe pertenecer a la misma habitación.
-- ---------------------------------------------------------------------
create or replace function app.validar_cama_de_aseo() returns trigger
language plpgsql as $$
begin
  if new.cama_id is not null and not exists (
    select 1 from public.cama where id = new.cama_id and habitacion_id = new.habitacion_id
  ) then
    raise exception 'La cama % no pertenece a la habitación %', new.cama_id, new.habitacion_id;
  end if;
  return new;
end;
$$;

create trigger trg_validar_cama_aseo
  before insert on public.aseo
  for each row execute function app.validar_cama_de_aseo();

-- ---------------------------------------------------------------------
-- 3) `aseo` pasa a ser un ledger inmutable con corrección, igual que
--    `consumo` (RNF-03). Hoy la policy `aseo_rw` (0001_init.sql) es
--    FOR ALL y en teoría permite UPDATE/DELETE reales -- a diferencia
--    de `consumo`, que solo tiene policies de select/insert. Nada en
--    la app usa hoy esa posibilidad (solo se hace INSERT sobre aseo),
--    así que cerrarla no rompe ningún flujo existente, y es necesaria
--    para que "corregir un registro" (nueva fila con
--    aseo_corregido_id) sea la única vía posible, igual que ya exige
--    CLAUDE.md para el libro de consumos.
--
--    El grant de tabla SIGUE incluyendo UPDATE (0021_privilegios_minimos.sql)
--    porque el conector de PowerSync sube cada inserción como un
--    upsert (`INSERT ... ON CONFLICT (id) DO UPDATE`) y Postgres exige
--    ese privilegio para la sentencia aunque no haya conflicto que
--    resolver. Sin policy de UPDATE, ese UPDATE simplemente no
--    encuentra fila bajo RLS (0 filas afectadas, no error) -- mismo
--    mecanismo que ya usa `consumo` hoy.
-- ---------------------------------------------------------------------
drop policy aseo_rw on public.aseo;

create policy aseo_select on public.aseo for select
  using (app.rol() is not null);

create policy aseo_insert on public.aseo for insert
  with check (app.rol() is not null);

-- Tercera barrera (defensa en profundidad, mismo patrón que
-- `consumo_sin_update`/`consumo_sin_delete`): aunque alguien lograra
-- saltarse RLS, el trigger de fila rechaza la edición igual.
create or replace function app.bloquear_edicion_aseo() returns trigger
language plpgsql as $$
begin
  raise exception 'aseo es un libro de bitácora inmutable: use una fila de corrección (aseo_corregido_id), no % directo', tg_op;
end;
$$;

create trigger aseo_sin_update
  before update on public.aseo
  for each row execute function app.bloquear_edicion_aseo();

create trigger aseo_sin_delete
  before delete on public.aseo
  for each row execute function app.bloquear_edicion_aseo();
