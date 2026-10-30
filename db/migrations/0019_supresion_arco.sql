-- =====================================================================
-- Migración 0019: derecho de supresión alcanzable y auditado (HU-34).
--
-- QUÉ ESTABA MAL
--
-- 0013 creó `app.atender_derecho_supresion_trabajador()`, que sí
-- verificaba el rol y escribía la bitácora — pero vive en el schema
-- `app`, y PostgREST solo expone `public` (PGRST_DB_SCHEMA=public,
-- infra/docker-compose.yml). Era inalcanzable desde la app: nunca la
-- llamó nadie.
--
-- La pantalla resolvía la supresión por su cuenta, escribiendo en la
-- réplica local (`powersync.execute("update trabajador set …")`). Eso
-- rompía los dos criterios de HU-34:
--
--   * "se deja constancia en la bitácora con motivo y fecha": no se
--     escribía ninguna constancia, y el motivo nunca se pedía.
--   * "Dado un usuario con rol Encargada, cuando intenta usar la
--     supresión, entonces el sistema le bloquea el acceso": el único
--     freno era que la pestaña estaba oculta. La escritura local se
--     aceptaba igual, y la de `reserva` incluso llegaba al servidor
--     (la policy `reserva_rw` permite a ambos roles), anonimizando el
--     nombre de un huésped sin dejar rastro de quién lo hizo.
--
-- Ahora la supresión es UNA función en `public`, autorizada en el
-- servidor y con bitácora obligatoria. Lo que la Encargada ve o no ve
-- en pantalla pasa a ser comodidad, no el control de acceso.
-- =====================================================================
begin;

-- La versión en `app` se elimina: dejar dos caminos a la misma
-- operación sensible obliga a auditar los dos.
drop function if exists app.atender_derecho_supresion_trabajador(uuid, text);

create or replace function public.atender_derecho_supresion(
  p_tipo_titular text,   -- 'trabajador' | 'turista'
  p_titular_id   uuid,
  p_motivo       text
) returns jsonb
language plpgsql
security definer
set search_path = public, app
as $fn$
declare
  v_usuario_id uuid;
  v_motivo text;
  v_filas int := 0;
  v_ya_anonimizado boolean := false;
  v_nombre_previo text;
begin
  -- 1. Autorización en el servidor. `session_user` no cambia dentro de
  -- SECURITY DEFINER; `current_user` sí (sería el dueño de la función),
  -- por eso no se usa para decidir permisos — ese fue el defecto de
  -- 0014, corregido en 0017.
  if not coalesce(app.es_administradora(), false) then
    raise exception 'La supresión de datos personales es facultad exclusiva de la Administradora (Ley 21.719).'
      using errcode = '42501';
  end if;

  select u.id into v_usuario_id from public.usuario u where u.auth_uid = app.uid();
  if v_usuario_id is null then
    raise exception 'No se pudo identificar la cuenta que ejecuta la supresión.'
      using errcode = '42501';
  end if;

  -- 2. El motivo es obligatorio: la bitácora tiene que poder explicar
  -- por qué se destruyó un dato personal (HU-34).
  v_motivo := btrim(coalesce(p_motivo, ''));
  if v_motivo = '' then
    raise exception 'Debe indicar el motivo de la solicitud de supresión.'
      using errcode = '22023';
  end if;
  if length(v_motivo) > 500 then
    raise exception 'El motivo no puede superar los 500 caracteres.'
      using errcode = '22023';
  end if;

  if p_titular_id is null then
    raise exception 'Debe indicar a qué titular corresponde la solicitud.'
      using errcode = '22023';
  end if;

  -- 3. Anonimización. Idempotente: repetir la solicitud no vuelve a
  -- tocar una fila ya anonimizada (y la bitácora lo deja dicho).
  if p_tipo_titular = 'trabajador' then
    select t.nombre, t.anonimizado_at is not null
      into v_nombre_previo, v_ya_anonimizado
      from public.trabajador t where t.id = p_titular_id;

    if v_nombre_previo is null then
      raise exception 'No existe el trabajador indicado.' using errcode = '22023';
    end if;

    update public.trabajador
       set nombre = 'TRABAJADOR ANONIMIZADO (SOLICITUD TITULAR)',
           rut = null,
           anonimizado_at = now()
     where id = p_titular_id
       and anonimizado_at is null;
    v_filas := coalesce((select count(*) from public.trabajador
                          where id = p_titular_id and anonimizado_at is not null), 0);

  elsif p_tipo_titular = 'turista' then
    select r.huesped_nombre into v_nombre_previo
      from public.reserva r
     where r.id = p_titular_id and r.tipo_cliente = 'turista';

    if v_nombre_previo is null then
      raise exception 'No existe la reserva de turista indicada.' using errcode = '22023';
    end if;

    v_ya_anonimizado := v_nombre_previo = 'TURISTA ANONIMIZADO (SOLICITUD TITULAR)';

    -- `huesped_nombre` no puede quedar nulo: el check
    -- reserva_turista_o_empresa (0001_init.sql) lo exige para
    -- tipo_cliente = 'turista'. Se reemplaza por la marca, igual que en
    -- trabajador, de modo que el ledger y la ocupación histórica
    -- conserven la fila y su id.
    update public.reserva
       set huesped_nombre = 'TURISTA ANONIMIZADO (SOLICITUD TITULAR)'
     where id = p_titular_id
       and tipo_cliente = 'turista'
       and huesped_nombre <> 'TURISTA ANONIMIZADO (SOLICITUD TITULAR)';
    v_filas := 1;

  else
    raise exception 'Tipo de titular inválido: debe ser "trabajador" o "turista".'
      using errcode = '22023';
  end if;

  -- 4. Constancia inmutable (HU-34). Nunca guarda el nombre que se
  -- acaba de suprimir: eso reintroduciría el dato personal justo en la
  -- tabla que además la Administradora puede leer para siempre.
  insert into public.bitacora_acceso_datos_personales (
    usuario_id, accion, detalle, fecha_hora
  ) values (
    v_usuario_id,
    'solicitud_derechos_arco',
    jsonb_build_object(
      'tipo_derecho', 'supresion',
      'tipo_titular', p_tipo_titular,
      'titular_id', p_titular_id,
      'motivo', v_motivo,
      'ya_estaba_anonimizado', v_ya_anonimizado,
      'plazo_legal_maximo_dias', 30,
      'normativa', 'Ley 21.719 — derecho de supresión'
    ),
    now()
  );

  return jsonb_build_object(
    'ok', true,
    'tipo_titular', p_tipo_titular,
    'titular_id', p_titular_id,
    'ya_estaba_anonimizado', v_ya_anonimizado,
    'filas_afectadas', v_filas
  );
end;
$fn$;

revoke all on function public.atender_derecho_supresion(text, uuid, text) from public;
grant execute on function public.atender_derecho_supresion(text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- Registro de las exportaciones de datos personales (HU-32/HU-34)
-- ---------------------------------------------------------------------
-- La pantalla permite descargar la "ficha del titular" (derecho de
-- acceso y portabilidad). Esa descarga es una salida de datos
-- personales del sistema y la bitácora existe precisamente para eso
-- ('exportacion_pdf'/'exportacion_excel' ya estaban contemplados en
-- 0001_init.sql, pero no había forma de escribir desde el cliente: la
-- tabla no tiene GRANT de insert, a propósito).
create or replace function public.registrar_acceso_datos_personales(
  p_accion  text,
  p_detalle jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public, app
as $fn$
declare
  v_usuario_id uuid;
begin
  if app.rol() is null then
    raise exception 'Sesión no válida.' using errcode = '42501';
  end if;

  -- Solo las acciones de salida/consulta de datos. La purga automática y
  -- el cierre los escribe el servidor, no el cliente, y 'carga_nomina'
  -- la registra el flujo de nómina.
  if p_accion not in ('exportacion_pdf', 'exportacion_excel') then
    raise exception 'Acción de bitácora no permitida desde el cliente: %', p_accion
      using errcode = '22023';
  end if;

  select u.id into v_usuario_id from public.usuario u where u.auth_uid = app.uid();
  if v_usuario_id is null then
    raise exception 'No se pudo identificar la cuenta.' using errcode = '42501';
  end if;

  insert into public.bitacora_acceso_datos_personales (usuario_id, accion, detalle, fecha_hora)
  values (v_usuario_id, p_accion, coalesce(p_detalle, '{}'::jsonb), now());
end;
$fn$;

revoke all on function public.registrar_acceso_datos_personales(text, jsonb) from public;
grant execute on function public.registrar_acceso_datos_personales(text, jsonb) to authenticated;

commit;
