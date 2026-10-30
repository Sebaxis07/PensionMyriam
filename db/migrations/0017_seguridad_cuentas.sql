-- =====================================================================
-- Migración 0017: seguridad real del alta de cuentas (HU-35) y datos
-- que el listado de cuentas necesita mostrar (HU-36).
--
-- Corrige TRES defectos detectados auditando 0014_crear_usuario.sql:
--
-- 1) ESCALAMIENTO DE PRIVILEGIOS (crítico). El control de autorización
--    estaba escrito como:
--        if current_user not in ('postgres','supabase_admin')
--           and not coalesce(app.es_administradora(), false) then ...
--    Dentro de una función SECURITY DEFINER `current_user` NO es quien
--    llama: es el DUEÑO de la función (acá `supabase_admin`, porque las
--    migraciones se aplican con ese rol — ver db/dev-run.sh). Entonces
--    la primera condición era siempre falsa, el `and` cortocircuitaba y
--    el chequeo de administradora NUNCA se evaluaba: cualquier cuenta
--    autenticada (incluida una Encargada) podía invocar el RPC y crear
--    una cuenta de rol 'administradora'. El rol real del invocador se
--    lee ahora con `session_user` (que SECURITY DEFINER no altera) y la
--    exigencia de `app.es_administradora()` dejó de ser cortocircuitable.
--
-- 2) POLÍTICA DE CONTRASEÑA. HU-35 exige "al menos 12 caracteres
--    (política propia del proyecto, superior al mínimo de 8 de OWASP
--    ASVS 5.0)"; la función aceptaba 6.
--
-- 3) HU-36 pide ver "nombre, correo, rol y fecha de registro" y
--    `public.usuario` no tenía el correo: vivía solo en `auth.users`,
--    que no se replica a los celulares. Se agrega la columna, se
--    rellena desde auth.users y la creación de cuentas la completa.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 1. Correo en public.usuario (HU-36)
-- ---------------------------------------------------------------------
alter table public.usuario add column if not exists email text;

-- Un mismo correo no puede quedar en dos cuentas. Se indexa en
-- minúsculas porque GoTrue normaliza el email a minúsculas al
-- autenticar, y así "Maria@..." y "maria@..." colisionan como deben.
create unique index if not exists usuario_email_unico
  on public.usuario (lower(email))
  where email is not null;

-- Relleno de las cuentas que ya existían (seed de demo y cuentas
-- creadas antes de esta migración).
update public.usuario u
   set email = a.email
  from auth.users a
 where a.id = u.auth_uid
   and u.email is null;

-- ---------------------------------------------------------------------
-- 2. Alta de cuentas con autorización no cortocircuitable (HU-35)
-- ---------------------------------------------------------------------
create or replace function public.crear_cuenta_usuario(
  p_email text,
  p_password text,
  p_nombre text,
  p_rol text
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions, app
as $fn$
declare
  v_auth_uid uuid;
  v_usuario_id uuid;
  v_rol_enum rol_usuario;
  v_email_limpio text;
  v_nombre_limpio text;
  -- Mantenimiento = una persona del equipo entrando por psql/SSH para el
  -- procedimiento manual de recuperación de acceso (no hay SMTP ni
  -- autorregistro, ver CLAUDE.md). Se reconoce por DOS condiciones
  -- juntas, no por una:
  --   * no hay ningún JWT en vuelo (`request.jwt.claims` vacío): un
  --     request de PostgREST SIEMPRE trae uno, así que esto por sí solo
  --     ya descarta cualquier llamada desde la app; y
  --   * la sesión se abrió con un rol de superusuario.
  -- Exigir la ausencia de JWT es lo que hace que el `SET ROLE` no sirva
  -- de atajo: `session_user` no cambia con SET ROLE, de modo que una
  -- sesión abierta como `postgres` que se hiciera pasar por
  -- `authenticated` seguiría viéndose como mantenimiento si solo se
  -- mirara el rol.
  v_es_mantenimiento boolean :=
    coalesce(nullif(current_setting('request.jwt.claims', true), ''), '') = ''
    and session_user in ('postgres', 'supabase_admin');
begin
  -- 1. Autorización: facultad exclusiva de la Administradora.
  if not v_es_mantenimiento and not coalesce(app.es_administradora(), false) then
    raise exception 'Solo la Administradora tiene autorización para crear nuevas cuentas.'
      using errcode = '42501';
  end if;

  -- 2. Limpieza y validación de parámetros
  v_email_limpio := lower(trim(p_email));
  v_nombre_limpio := trim(p_nombre);

  if v_email_limpio is null or v_email_limpio = '' or v_email_limpio not like '%@%.%' then
    raise exception 'Debe ingresar un correo electrónico válido.'
      using errcode = '22023';
  end if;

  -- HU-35: 12 caracteres, política propia del proyecto por sobre el
  -- mínimo de 8 de OWASP ASVS 5.0. Se cuenta sobre el valor SIN recortar
  -- (una contraseña puede empezar o terminar con espacio a propósito);
  -- solo se rechaza la que es únicamente espacios.
  if p_password is null or length(p_password) < 12 or btrim(p_password) = '' then
    raise exception 'La contraseña debe tener al menos 12 caracteres.'
      using errcode = '22023';
  end if;

  if v_nombre_limpio is null or v_nombre_limpio = '' then
    raise exception 'Debe ingresar el nombre de la persona.'
      using errcode = '22023';
  end if;

  if p_rol not in ('administradora', 'encargada') then
    raise exception 'Rol inválido. Los roles permitidos son "administradora" o "encargada".'
      using errcode = '22023';
  end if;

  v_rol_enum := p_rol::rol_usuario;

  -- 3. Verificar si el correo ya existe
  select id into v_auth_uid from auth.users where email = v_email_limpio;
  if v_auth_uid is not null then
    raise exception 'Ya existe una cuenta registrada con el correo %', v_email_limpio
      using errcode = '23505';
  end if;

  -- 4. Insertar nuevo usuario en auth.users con hash bcrypt.
  --
  -- ACOPLE CONOCIDO: estas columnas (email_confirmed_at, is_sso_user,
  -- phone_change, …) y la tabla auth.identities NO las crea la imagen de
  -- Postgres: las agrega GoTrue al aplicar SUS migraciones cuando el
  -- contenedor arranca. Por eso esta rama solo se puede verificar contra
  -- el stack real (ver e2e/sprint5-cuentas-seguridad.spec.ts) y no en el
  -- Postgres desechable de db/dev-run.sh, cuyo schema `auth` es el
  -- inicial de la imagen. Si algún día se sube la versión de GoTrue hay
  -- que revisar esta lista junto con ella.
  v_auth_uid := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at, confirmation_token,
    recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token,
    reauthentication_token, raw_app_meta_data, raw_user_meta_data,
    is_sso_user, is_anonymous, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_auth_uid,
    'authenticated',
    'authenticated',
    v_email_limpio,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(), '', '', '', '', '', '', '', '',
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    -- El rol vive en public.usuario (lo lee app.rol() para RLS). No se
    -- duplica en el metadata del JWT: un claim que el propio usuario
    -- pudiera llegar a influir no debe decidir permisos.
    jsonb_build_object('nombre', v_nombre_limpio),
    false, false, now(), now()
  );

  -- 5. Identidad para inicio de sesión por email (requerido por GoTrue)
  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    v_auth_uid::text,
    v_auth_uid,
    jsonb_build_object('sub', v_auth_uid::text, 'email', v_email_limpio,
                       'email_verified', true, 'phone_verified', false),
    'email',
    now(), now(), now()
  );

  -- 6. Fila de aplicación (la que se replica a los celulares)
  v_usuario_id := gen_random_uuid();
  insert into public.usuario (id, auth_uid, rol, nombre, email)
  values (v_usuario_id, v_auth_uid, v_rol_enum, v_nombre_limpio, v_email_limpio);

  -- 7. Confirmación. Nunca devuelve la contraseña ni su hash.
  return jsonb_build_object(
    'ok', true,
    'id', v_usuario_id,
    'auth_uid', v_auth_uid,
    'nombre', v_nombre_limpio,
    'rol', p_rol,
    'email', v_email_limpio
  );
end;
$fn$;

-- El wrapper en `app` era una segunda puerta a la misma operación (y
-- heredaba el mismo defecto). PostgREST solo expone `public`
-- (PGRST_DB_SCHEMA=public, infra/docker-compose.yml), así que no tenía
-- ningún usuario: se elimina en vez de mantener dos caminos que hay que
-- auditar por separado.
drop function if exists app.crear_cuenta_usuario(text, text, text, text);

-- `public` (el pseudo-rol "todos") nunca debe poder ejecutarla: el
-- EXECUTE por defecto de Postgres se otorga a PUBLIC al crear la
-- función, lo que la dejaría al alcance de `anon` (requests sin sesión).
revoke all on function public.crear_cuenta_usuario(text, text, text, text) from public;
grant execute on function public.crear_cuenta_usuario(text, text, text, text) to authenticated;

commit;
