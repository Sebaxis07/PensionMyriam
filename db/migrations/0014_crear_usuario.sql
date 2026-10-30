-- =====================================================================
-- Migración 0014: Creación de cuentas de usuario por la Administradora
-- Permite a la Sra. Miriam crear cuentas de rol 'encargada' o 'administradora'
-- directamente desde la interfaz web/móvil con validación de seguridad.
-- =====================================================================
begin;

-- Función con SECURITY DEFINER para crear el usuario en auth.users, auth.identities y public.usuario
create or replace function public.crear_cuenta_usuario(
  p_email text,
  p_password text,
  p_nombre text,
  p_rol text
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions, app
as $$
declare
  v_auth_uid uuid;
  v_usuario_id uuid;
  v_rol_enum rol_usuario;
  v_email_limpio text;
  v_nombre_limpio text;
begin
  -- 1. Validar que quien invoca la función sea Administradora o superusuario
  if current_user not in ('postgres', 'supabase_admin') and not coalesce(app.es_administradora(), false) then
    raise exception 'Solo la Administradora tiene autorización para crear nuevas cuentas.';
  end if;

  -- 2. Limpieza y validación de parámetros
  v_email_limpio := lower(trim(p_email));
  v_nombre_limpio := trim(p_nombre);

  if v_email_limpio is null or v_email_limpio = '' or v_email_limpio not like '%@%.%' then
    raise exception 'Debe ingresar un correo electrónico válido.';
  end if;

  if p_password is null or length(trim(p_password)) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres.';
  end if;

  if v_nombre_limpio is null or v_nombre_limpio = '' then
    raise exception 'Debe ingresar el nombre de la persona.';
  end if;

  if p_rol not in ('administradora', 'encargada') then
    raise exception 'Rol inválido. Los roles permitidos son "administradora" o "encargada".';
  end if;

  v_rol_enum := p_rol::rol_usuario;

  -- 3. Verificar si el correo ya existe en auth.users
  select id into v_auth_uid from auth.users where email = v_email_limpio;
  if v_auth_uid is not null then
    raise exception 'Ya existe una cuenta registrada con el correo %', v_email_limpio;
  end if;

  -- 4. Insertar nuevo usuario en auth.users con hash bcrypt
  v_auth_uid := gen_random_uuid();
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token,
    raw_app_meta_data,
    raw_user_meta_data,
    is_sso_user,
    is_anonymous,
    created_at,
    updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_auth_uid,
    'authenticated',
    'authenticated',
    v_email_limpio,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('nombre', v_nombre_limpio, 'rol', p_rol),
    false,
    false,
    now(),
    now()
  );

  -- 5. Insertar identidad en auth.identities (requerido por GoTrue para inicio de sesión por email)
  -- Nota: las columnas id (gen_random_uuid) y email (generated always) no deben especificarse
  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_auth_uid::text,
    v_auth_uid,
    jsonb_build_object('sub', v_auth_uid::text, 'email', v_email_limpio, 'email_verified', true, 'phone_verified', false),
    'email',
    now(),
    now(),
    now()
  );

  -- 6. Insertar en public.usuario para sincronización en PowerSync y auditoría
  v_usuario_id := gen_random_uuid();
  insert into public.usuario (id, auth_uid, rol, nombre)
  values (v_usuario_id, v_auth_uid, v_rol_enum, v_nombre_limpio);

  -- 7. Retornar confirmación
  return jsonb_build_object(
    'ok', true,
    'id', v_usuario_id,
    'auth_uid', v_auth_uid,
    'nombre', v_nombre_limpio,
    'rol', p_rol,
    'email', v_email_limpio
  );
end;
$$;

-- Wrapper en schema app para compatibilidad interna
create or replace function app.crear_cuenta_usuario(
  p_email text,
  p_password text,
  p_nombre text,
  p_rol text
) returns jsonb
language sql
security definer
as $$
  select public.crear_cuenta_usuario(p_email, p_password, p_nombre, p_rol);
$$;

-- Permitir a usuarios autenticados invocar la función (PostgREST expone el schema public)
grant execute on function public.crear_cuenta_usuario(text, text, text, text) to authenticated;
grant execute on function app.crear_cuenta_usuario(text, text, text, text) to authenticated;

commit;
