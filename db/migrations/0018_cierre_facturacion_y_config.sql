-- =====================================================================
-- Migración 0018: el hecho que dispara la retención (HU-33) y la
-- configuración del negocio que viaja a los dos celulares (HU-39).
--
-- POR QUÉ EXISTE ESTA MIGRACIÓN
--
-- HU-33 exige dos cosas que 0013_purga_ley21719.sql no podía cumplir:
--   (a) "Dado un contrato con período facturado Y CERRADO, cuando pasa
--        el plazo de gracia, entonces anonimiza…"
--   (b) "Dado un contrato FINALIZADO SIN FACTURAR, cuando corre el
--        proceso, entonces NO SE ANONIMIZA NADA."
--
-- La purga de 0013 se disparaba solo con `vigencia_hasta < hoy - 7d`.
-- Eso incumple (b) de frente: un contrato que terminó y nunca se
-- facturó quedaba anonimizado igual, destruyendo el nombre que la
-- pre-factura todavía necesita. Y para los supervisores era peor: se
-- anonimizaban a los 7 días de la FECHA DE LA CONCILIACIÓN, no del
-- cierre de facturación, borrando el respaldo del descuadre de un mes
-- que aún estaba abierto.
--
-- La causa de fondo es que el cierre de facturación NO EXISTÍA como
-- dato. `useCierreMensual` lo calcula al vuelo ("¿están todos los días
-- conciliados?") y emite la pre-factura, pero nada quedaba registrado.
-- Sin ese hecho persistido no hay forma de saber si un período fue
-- facturado, ni desde cuándo corre el plazo de gracia.
--
-- Se agrega entonces `cierre_facturacion`: una fila append-only por
-- (contrato, año, mes) que registra el cierre. Es el reloj legal de la
-- retención y, además, la evidencia de auditoría del cierre mensual.
--
-- OPEN: la regla exacta de cuándo se anonimiza al trabajador necesita
-- confirmación de la Administradora — ver docs/sprint-5-handoff-codex.md
-- §Decisiones pendientes. Acá se implementa la interpretación
-- conservadora (contrato terminado + su último período cerrado + plazo
-- de gracia), porque anonimizar al trabajador al cerrar el PRIMER mes
-- de un contrato de 2 años le borraría el nombre a la Encargada que
-- todavía le sirve el almuerzo todos los días.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 1. config_negocio: parámetros editables del negocio (HU-39)
--
-- Fila única (id = 'singleton'). Antes esto vivía SOLO en el
-- localStorage del navegador, así que la tarifa y los datos de
-- transferencia que editaba la Administradora en su celular no existían
-- en el de la Encargada — y el comprobante que ella emitiera saldría con
-- los valores de fábrica. Con la tabla replicada, los dos celulares ven
-- lo mismo y sigue funcionando sin señal (la réplica local de PowerSync
-- es la que leen los PDF).
--
-- Alcance deliberadamente acotado a lo que pide HU-39 (contacto, tarifa
-- base, datos de transferencia) más el plazo de gracia de HU-33. Los
-- umbrales de margen (15%/30%) NO se agregan acá: ninguna HU del Sprint
-- 5 los pide configurables y siguen pendientes de validación con la
-- Administradora (ver informe).
-- ---------------------------------------------------------------------
create table public.config_negocio (
  id                        text primary key default 'singleton'
                              check (id = 'singleton'),
  nombre_pension            text not null check (btrim(nombre_pension) <> ''),
  whatsapp_contacto         text not null check (btrim(whatsapp_contacto) <> ''),
  -- Canal por el que un titular ejerce sus derechos ARCO. Va impreso en
  -- el comprobante (HU-32), así que no puede quedar vacío.
  correo_contacto_arco      text not null check (correo_contacto_arco like '%@%.%'),
  banco_nombre              text not null check (btrim(banco_nombre) <> ''),
  tipo_cuenta               text not null check (btrim(tipo_cuenta) <> ''),
  titular_nombre            text not null check (btrim(titular_nombre) <> ''),
  rut_titular               text not null check (btrim(rut_titular) <> ''),
  -- Tarifa base por noche del turista (HU-03/HU-39). El techo no es
  -- burocracia: evita que un cero de más en el celular salga impreso en
  -- un comprobante. $15.000 es la tarifa fija vigente (CLAUDE.md).
  tarifa_base_noche         numeric(12, 2) not null
                              check (tarifa_base_noche > 0 and tarifa_base_noche <= 1000000),
  -- HU-33: "plazo de gracia (propuesto: 7 días, POR VALIDAR con la
  -- Administradora)". Se deja configurable justamente porque el propio
  -- criterio lo marca como no cerrado. Rango acotado para que nadie
  -- pueda dejarlo en 0 (purga inmediata) ni en años (retención
  -- indefinida, contraria al principio de limitación del plazo).
  dias_gracia_anonimizacion int not null default 7
                              check (dias_gracia_anonimizacion between 1 and 90),
  actualizado_por           uuid references public.usuario(id),
  updated_at                timestamptz not null default now()
);

-- Valores de fábrica: los mismos que la app traía escritos en el código
-- (app/src/features/perfil/useConfigPension.ts), para que esta migración
-- no cambie ningún comprobante por sí sola.
insert into public.config_negocio (
  id, nombre_pension, whatsapp_contacto, correo_contacto_arco,
  banco_nombre, tipo_cuenta, titular_nombre, rut_titular,
  tarifa_base_noche, dias_gracia_anonimizacion
) values (
  'singleton',
  'Pensión Señora Miriam',
  '+56 9 8765 4321',
  'pension.paposo@gmail.com',
  'BancoEstado',
  'CuentaRUT',
  'María (Pensión Señora Miriam)',
  '12.345.678-9',
  15000,
  7
) on conflict (id) do nothing;

alter table public.config_negocio enable row level security;

-- Ambos roles LEEN (la Encargada emite comprobantes y manda el mensaje
-- de confirmación por WhatsApp); solo la Administradora EDITA.
create policy config_negocio_select on public.config_negocio for select
  using (app.rol() is not null);
create policy config_negocio_update on public.config_negocio for update
  using (app.es_administradora()) with check (app.es_administradora());

-- Sin INSERT ni DELETE para nadie: la fila única la crea esta migración.
-- Que no exista el GRANT es lo que realmente lo impide (PostgREST
-- tampoco expone el verbo si no hay privilegio).
grant select, update on public.config_negocio to authenticated;

-- Nadie puede inventar una segunda fila de configuración ni borrar la
-- que existe, ni siquiera por psql con el rol de la aplicación.
-- La condición va dentro de la función y no en un WHEN del trigger:
-- Postgres no admite subconsultas en `when (...)`.
create or replace function app.config_negocio_fila_unica() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    -- BEFORE INSERT: la fila nueva todavía no está en la tabla, así que
    -- este exists() detecta si YA había una configuración.
    if exists (select 1 from public.config_negocio) then
      raise exception 'config_negocio es una fila única de parámetros: ya existe y solo se actualiza';
    end if;
    return new;
  end if;
  raise exception 'config_negocio es una fila única de parámetros: % no permitido', tg_op;
end;
$$;

create trigger config_negocio_sin_insert_extra
  before insert on public.config_negocio
  for each row execute function app.config_negocio_fila_unica();

create trigger config_negocio_sin_delete
  before delete on public.config_negocio
  for each row execute function app.config_negocio_fila_unica();

-- updated_at/actualizado_por no se confían al cliente.
create or replace function app.config_negocio_sellar_auditoria() returns trigger
language plpgsql as $$
begin
  new.id := old.id;                 -- el id nunca cambia
  new.updated_at := now();
  new.actualizado_por := coalesce(
    (select u.id from public.usuario u where u.auth_uid = app.uid()),
    old.actualizado_por
  );
  return new;
end;
$$;

create trigger config_negocio_sella_auditoria
  before update on public.config_negocio
  for each row execute function app.config_negocio_sellar_auditoria();

-- ---------------------------------------------------------------------
-- 2. cierre_facturacion: el hecho que arranca el plazo de retención
-- ---------------------------------------------------------------------
create table public.cierre_facturacion (
  id                   uuid primary key default gen_random_uuid(),
  contrato_empresa_id  uuid not null references public.contrato_empresa(id),
  periodo_anio         int not null check (periodo_anio between 2024 and 2100),
  periodo_mes          int not null check (periodo_mes between 1 and 12),
  -- Monto de la pre-factura emitida. Es dato financiero: se replica
  -- SOLO al celular de la Administradora (ver infra/powersync/config.yaml,
  -- bucket cierre_facturacion_administradora) igual que tarifa_convenida
  -- y los costos de insumos.
  total_facturado      numeric(14, 2) not null check (total_facturado >= 0),
  cerrado_por          uuid not null references public.usuario(id),
  cerrado_at           timestamptz not null default now(),
  -- RNF-06: el cierre se dispara desde el celular y puede reintentarse.
  uuid_idempotente     uuid not null unique,
  -- Un período de un contrato se cierra UNA vez. Un segundo intento
  -- choca acá (23505) y no mueve el reloj de la retención.
  unique (contrato_empresa_id, periodo_anio, periodo_mes)
);

create index cierre_facturacion_por_contrato
  on public.cierre_facturacion (contrato_empresa_id, periodo_anio, periodo_mes);

-- Append-only: es evidencia de auditoría y además el reloj legal de la
-- anonimización. Si se pudiera editar `cerrado_at`, se podría estirar o
-- adelantar a voluntad el plazo de conservación de datos personales.
create or replace function app.bloquear_edicion_cierre() returns trigger
language plpgsql as $$
begin
  raise exception 'cierre_facturacion es un registro de auditoría inmutable: % no permitido', tg_op;
end;
$$;

create trigger cierre_facturacion_sin_update
  before update on public.cierre_facturacion
  for each row execute function app.bloquear_edicion_cierre();

create trigger cierre_facturacion_sin_delete
  before delete on public.cierre_facturacion
  for each row execute function app.bloquear_edicion_cierre();

alter table public.cierre_facturacion enable row level security;

-- Cerrar la facturación del mes es facultad de la Administradora
-- (HU-18 lo emite ella; la Encargada no ve montos).
create policy cierre_facturacion_admin_only on public.cierre_facturacion
  for select using (app.es_administradora());
create policy cierre_facturacion_insert on public.cierre_facturacion
  for insert with check (app.es_administradora());

grant select, insert on public.cierre_facturacion to authenticated;

-- ---------------------------------------------------------------------
-- 3. Bitácora: inmutable de verdad y capaz de firmar el proceso automático
-- ---------------------------------------------------------------------
-- HU-33 pide "un evento INMUTABLE y auditable". Hasta ahora la
-- inmutabilidad era solo la ausencia de GRANT de update/delete: nada la
-- defendía frente a una conexión directa con el rol de la aplicación.
create or replace function app.bloquear_edicion_bitacora() returns trigger
language plpgsql as $$
begin
  raise exception 'la bitácora de acceso a datos personales es inmutable: % no permitido', tg_op;
end;
$$;

create trigger bitacora_sin_update
  before update on public.bitacora_acceso_datos_personales
  for each row execute function app.bloquear_edicion_bitacora();

create trigger bitacora_sin_delete
  before delete on public.bitacora_acceso_datos_personales
  for each row execute function app.bloquear_edicion_bitacora();

-- La purga la corre pg_cron, no una persona. Antes se firmaba con "la
-- primera administradora que aparezca" (`limit 1`), lo que atribuye a
-- una persona real una acción que no ejecutó — justo lo que una
-- bitácora no debe hacer. `usuario_id` nulo = proceso automático del
-- sistema.
alter table public.bitacora_acceso_datos_personales
  alter column usuario_id drop not null;

alter table public.bitacora_acceso_datos_personales
  drop constraint if exists bitacora_acceso_datos_personales_accion_check;

alter table public.bitacora_acceso_datos_personales
  add constraint bitacora_acceso_datos_personales_accion_check check (
    accion in (
      'carga_nomina',
      'exportacion_pdf',
      'exportacion_excel',
      'purga_automatica',
      'solicitud_derechos_arco',
      'cierre_facturacion'
    )
  );

-- Toda acción hecha por una persona debe quedar atribuida; solo la
-- purga automática puede ir sin usuario.
alter table public.bitacora_acceso_datos_personales
  add constraint bitacora_usuario_solo_nulo_si_automatica check (
    usuario_id is not null or accion = 'purga_automatica'
  );

-- ---------------------------------------------------------------------
-- 4. Purga automática corregida (HU-33)
-- ---------------------------------------------------------------------
create or replace function app.purgar_datos_personales_facturados()
returns jsonb
language plpgsql
security definer
set search_path = public, app
as $fn$
declare
  v_trabajadores_purgados int := 0;
  v_supervisores_purgados int := 0;
  v_dias_gracia int;
  v_corte timestamptz;
begin
  select dias_gracia_anonimizacion into v_dias_gracia
    from public.config_negocio where id = 'singleton';
  v_dias_gracia := coalesce(v_dias_gracia, 7);

  -- Un cierre cuenta como "vencido" cuando su `cerrado_at` quedó más
  -- atrás que el plazo de gracia.
  v_corte := now() - make_interval(days => v_dias_gracia);

  -- A. Trabajadores: su contrato ya terminó Y el período en que terminó
  --    fue facturado y cerrado hace más del plazo de gracia.
  --
  --    Las dos condiciones juntas son lo que cumple el criterio (b) de
  --    HU-33: si el contrato terminó pero nunca se cerró su facturación,
  --    el `join` con cierre_facturacion no encuentra fila y no se
  --    anonimiza nada.
  --
  --    `anonimizado_at is null` hace la operación idempotente: correr la
  --    purga dos veces el mismo día no vuelve a tocar ni a recontar
  --    filas ya anonimizadas (RNF-06).
  with trabajadores_actualizados as (
    update public.trabajador t
       set nombre = 'TRABAJADOR ANONIMIZADO (LEY 21.719)',
           rut = null,
           anonimizado_at = now()
      from public.contrato_empresa c
      join public.cierre_facturacion cf
        on cf.contrato_empresa_id = c.id
       and cf.periodo_anio = extract(year from c.vigencia_hasta)::int
       and cf.periodo_mes  = extract(month from c.vigencia_hasta)::int
     where t.contrato_empresa_id = c.id
       and t.anonimizado_at is null
       and c.vigencia_hasta is not null
       and c.vigencia_hasta < (now() at time zone 'America/Santiago')::date
       and cf.cerrado_at < v_corte
    returning t.id
  )
  select count(*) into v_trabajadores_purgados from trabajadores_actualizados;

  -- B. Supervisores de justificaciones de descuadre: el nombre deja de
  --    ser necesario una vez cerrada la facturación del mes al que
  --    pertenece la conciliación que justificó. Acá sí es mes a mes (no
  --    se espera el fin del contrato): el supervisor no cumple ningún
  --    rol operativo después del cierre.
  with justificaciones_actualizadas as (
    update public.justificacion_descuadre jd
       set supervisor_nombre = 'SUPERVISOR ANONIMIZADO (LEY 21.719)',
           supervisor_anonimizado_at = now()
      from public.conciliacion_diaria cd
      join public.cierre_facturacion cf
        on cf.contrato_empresa_id = cd.contrato_empresa_id
       and cf.periodo_anio = extract(year from cd.fecha)::int
       and cf.periodo_mes  = extract(month from cd.fecha)::int
     where jd.conciliacion_diaria_id = cd.id
       and jd.supervisor_anonimizado_at is null
       and cf.cerrado_at < v_corte
    returning jd.id
  )
  select count(*) into v_supervisores_purgados from justificaciones_actualizadas;

  -- C. HU-33: "Dado que el proceso termina, cuando finaliza, entonces
  --    queda un evento inmutable y auditable en la bitácora". Se
  --    registra SIEMPRE, también cuando no hubo nada que anonimizar:
  --    la evidencia de que el control corrió es justamente lo que pide
  --    el KPI-08, y una corrida sin cambios es un resultado, no un
  --    no-evento. Antes solo se escribía si había purgado algo, así que
  --    un proceso caído y un proceso sin trabajo pendiente se veían
  --    idénticos en la bitácora: vacíos.
  insert into public.bitacora_acceso_datos_personales (
    usuario_id, accion, detalle, fecha_hora
  ) values (
    null,  -- proceso automático (pg_cron), no una persona
    'purga_automatica',
    jsonb_build_object(
      'trabajadores_anonimizados', v_trabajadores_purgados,
      'supervisores_anonimizados', v_supervisores_purgados,
      'dias_gracia_aplicados', v_dias_gracia,
      'origen', 'pg_cron:purga-datos-ley21719',
      'normativa', 'Ley 21.719 — principio de limitación del plazo de conservación'
    ),
    now()
  );

  return jsonb_build_object(
    'trabajadores_purgados', v_trabajadores_purgados,
    'supervisores_purgados', v_supervisores_purgados,
    'dias_gracia_aplicados', v_dias_gracia,
    'ejecutado_at', now()
  );
end;
$fn$;

-- Que no quede al alcance de un request autenticado: la purga la corre
-- pg_cron y nadie más. Es SECURITY DEFINER, así que un EXECUTE abierto
-- (Postgres se lo otorga a PUBLIC al crear la función) sería una forma
-- de anonimizar nóminas a voluntad desde la app.
revoke all on function app.purgar_datos_personales_facturados() from public;

-- `postgres` sí: es el rol administrativo con el que pg_cron ejecuta los
-- jobs en esta imagen y con el que corre la batería pgTAP
-- (db/dev-run.sh). No es el rol de PostgREST (`authenticated`), que es
-- el que debe quedar fuera.
grant execute on function app.purgar_datos_personales_facturados() to postgres;

-- ---------------------------------------------------------------------
-- 5. Publicación lógica para PowerSync
-- ---------------------------------------------------------------------
-- config_negocio tiene que llegar a los dos celulares (los PDF la leen
-- de la réplica local, también sin señal). cierre_facturacion viaja solo
-- al de la Administradora por sus reglas de bucket, pero igual debe
-- estar en la publicación para que PowerSync pueda replicarla.
alter publication powersync add table public.config_negocio, public.cierre_facturacion;

-- PowerSync necesita identificar la fila para emitir el UPDATE. El PK
-- basta (REPLICA IDENTITY DEFAULT), pero config_negocio se actualiza
-- siempre sobre la misma fila y conviene ser explícito.
alter table public.config_negocio replica identity full;

commit;
