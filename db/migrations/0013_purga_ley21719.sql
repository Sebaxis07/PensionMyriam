-- =====================================================================
-- Migración 0013: Cumplimiento Ley 21.719 (Protección de Datos Personales)
-- 1. Ampliación de acciones en bitácora para atención de derechos ARCO.
-- 2. Función de purga y anonimización automática post-facturación (7 días).
-- 3. Programación con pg_cron a las 03:00 AM (America/Santiago).
-- 4. Función de atención de derecho de supresión manual para Administradora.
-- =====================================================================

-- 1. Ampliar el check de bitacora_acceso_datos_personales
alter table public.bitacora_acceso_datos_personales
  drop constraint if exists bitacora_acceso_datos_personales_accion_check;

alter table public.bitacora_acceso_datos_personales
  add constraint bitacora_acceso_datos_personales_accion_check check (
    accion in (
      'carga_nomina',
      'exportacion_pdf',
      'exportacion_excel',
      'purga_automatica',
      'solicitud_derechos_arco'
    )
  );

-- ---------------------------------------------------------------------
-- 2. Función de Purga Automática (pg_cron)
-- Anonimiza nombres y RUTs de trabajadores y supervisores transcurridos
-- 7 días desde el término de vigencia del contrato o cierre mensual.
-- Respeta el principio de Seudonimización del Ledger: la tabla consumo
-- NO se toca, conservando el cuadre exacto de raciones y auditoría fiscal.
-- ---------------------------------------------------------------------
create or replace function app.purgar_datos_personales_facturados()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_trabajadores_purgados int := 0;
  v_supervisores_purgados int := 0;
  v_admin_id uuid;
begin
  -- Obtener ID de la administradora para firmar la bitácora
  select id into v_admin_id from public.usuario where rol = 'administradora' limit 1;

  -- A. Anonimizar trabajadores de contratos concluidos hace más de 7 días
  with contratos_vencidos as (
    select id from public.contrato_empresa
    where vigencia_hasta < ((now() at time zone 'America/Santiago')::date - interval '7 days')::date
  ),
  trabajadores_actualizados as (
    update public.trabajador t
    set nombre = 'TRABAJADOR ANONIMIZADO (LEY 21.719)',
        rut = null,
        anonimizado_at = now()
    from contratos_vencidos c
    where t.contrato_empresa_id = c.id
      and t.anonimizado_at is null
    returning t.id
  )
  select count(*) into v_trabajadores_purgados from trabajadores_actualizados;

  -- B. Anonimizar supervisores en justificaciones de descuadre antiguas
  with justificaciones_actualizadas as (
    update public.justificacion_descuadre jd
    set supervisor_nombre = 'SUPERVISOR ANONIMIZADO (LEY 21.719)',
        supervisor_anonimizado_at = now()
    from public.conciliacion_diaria cd
    where jd.conciliacion_diaria_id = cd.id
      and cd.fecha < ((now() at time zone 'America/Santiago')::date - interval '7 days')::date
      and jd.supervisor_anonimizado_at is null
    returning jd.id
  )
  select count(*) into v_supervisores_purgados from justificaciones_actualizadas;

  -- C. Registrar en la bitácora inmutable si hubo datos purgados
  if (v_trabajadores_purgados > 0 or v_supervisores_purgados > 0) and v_admin_id is not null then
    insert into public.bitacora_acceso_datos_personales (
      usuario_id,
      accion,
      detalle,
      fecha_hora
    ) values (
      v_admin_id,
      'purga_automatica',
      jsonb_build_object(
        'trabajadores_anonimizados', v_trabajadores_purgados,
        'supervisores_anonimizados', v_supervisores_purgados,
        'normativa', 'Ley 21.719 Art. 14 / Principio de Limitación del Plazo de Conservación'
      ),
      now()
    );
  end if;

  return jsonb_build_object(
    'trabajadores_purgados', v_trabajadores_purgados,
    'supervisores_purgados', v_supervisores_purgados,
    'ejecutado_at', now()
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Función para atención manual de Derecho de Supresión (Ley 21.719)
-- Permite a la Administradora atender una solicitud formal de un titular
-- dentro del plazo legal de 30 días corridos.
-- ---------------------------------------------------------------------
create or replace function app.atender_derecho_supresion_trabajador(
  p_trabajador_id uuid,
  p_motivo text default 'Solicitud de titular Ley 21.719'
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_usuario_id uuid;
begin
  if not app.es_administradora() then
    raise exception 'Solo la Administradora puede ejecutar acciones de supresión de datos personales (Ley 21.719)';
  end if;

  v_usuario_id := app.usuario_id();

  update public.trabajador
  set nombre = 'TRABAJADOR ANONIMIZADO (SOLICITUD TITULAR)',
      rut = null,
      anonimizado_at = now()
  where id = p_trabajador_id;

  insert into public.bitacora_acceso_datos_personales (
    usuario_id,
    accion,
    detalle,
    fecha_hora
  ) values (
    v_usuario_id,
    'solicitud_derechos_arco',
    jsonb_build_object(
      'tipo_derecho', 'supresion',
      'trabajador_id', p_trabajador_id,
      'motivo', p_motivo,
      'plazo_legal_maximo_dias', 30
    ),
    now()
  );

  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Programación diaria de purga en pg_cron (03:00 AM hora Santiago)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Desprogramar si ya existiera para evitar duplicados
    perform cron.unschedule('purga-datos-ley21719')
    where exists (select 1 from cron.job where jobname = 'purga-datos-ley21719');

    -- Programar a las 03:00 AM todos los días
    perform cron.schedule(
      'purga-datos-ley21719',
      '0 3 * * *',
      'select app.purgar_datos_personales_facturados();'
    );
  end if;
end;
$$;
