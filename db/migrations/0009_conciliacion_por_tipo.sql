-- =====================================================================
-- Migración 0009 (Sprint 2, corrección de alcance): conciliación diaria
-- POR TIPO de consumo (no un solo agregado del día), generación
-- automática de cama_noche vía pg_cron (reprocesable para días
-- atrasados), y tabla de configuración de qué tipos facturan por
-- contrato completo vs por consumo real.
-- =====================================================================
begin;

-- 1) Qué tipos facturan por contrato completo (headcount x tarifa,
--    decisión de negocio ya validada) vs por consumo real. "colacion"
--    queda como SUPUESTO explícito, no como decisión confirmada — ver
--    columna `nota`.
create table public.tipo_consumo_config (
  tipo public.tipo_consumo primary key,
  factura_por_contrato_completo boolean not null,
  nota text
);

insert into public.tipo_consumo_config (tipo, factura_por_contrato_completo, nota) values
  ('cama_noche', true, null),
  ('desayuno', true, null),
  ('almuerzo', true, null),
  ('cena', true, null),
  ('colacion', false,
   'SUPUESTO pendiente de confirmar con la Administradora: se factura por consumo real (con tarifa ' ||
   'diferencial de producto_extra), no por contrato completo. Si la Administradora define lo contrario, ' ||
   'basta con actualizar esta fila a true — la función de conciliación ya lo respeta automáticamente.');

alter table public.tipo_consumo_config enable row level security;
create policy tipo_consumo_config_select on public.tipo_consumo_config for select
  using (app.rol() is not null);
grant select on public.tipo_consumo_config to authenticated;

-- 2) conciliacion_diaria pasa a ser por (contrato, fecha, TIPO). No hay
--    datos reales todavía (proyecto pre-lanzamiento) — se limpia lo que
--    había en vez de migrar filas agregadas que ya no tienen sentido
--    con la estructura nueva.
delete from public.justificacion_descuadre;
delete from public.conciliacion_diaria;

alter table public.conciliacion_diaria
  drop constraint conciliacion_diaria_contrato_empresa_id_fecha_key;

alter table public.conciliacion_diaria add column tipo public.tipo_consumo;
update public.conciliacion_diaria set tipo = 'desayuno' where tipo is null; -- no debería haber filas; solo por si acaso
alter table public.conciliacion_diaria alter column tipo set not null;

alter table public.conciliacion_diaria rename column raciones_esperadas to cantidad_esperada;
alter table public.conciliacion_diaria rename column raciones_servidas to cantidad_servida;

alter table public.conciliacion_diaria
  add constraint conciliacion_diaria_contrato_fecha_tipo_key unique (contrato_empresa_id, fecha, tipo);

-- 3) Conciliación por tipo. "esperado" para los tipos de contrato
--    completo es SIEMPRE el headcount contratado — nunca el número de
--    trabajadores realmente asignados con cama. Si la empresa contrató
--    30 y solo hay 25 con cama asignada, esa diferencia de 5 debe verse
--    como descuadre justificable, no desaparecer silenciosamente.
create or replace function public.recalcular_conciliacion(
  p_contrato_empresa_id uuid,
  p_fecha date
) returns void
language plpgsql as $$
declare
  v_headcount int;
  v_fila record;
  v_servido int;
  v_esperado int;
  v_tiene_justificacion boolean;
  v_estado estado_conciliacion;
  v_conciliacion_id uuid;
begin
  select headcount into v_headcount
  from public.contrato_empresa
  where id = p_contrato_empresa_id
    and vigencia_desde <= p_fecha
    and (vigencia_hasta is null or vigencia_hasta >= p_fecha);

  if v_headcount is null then
    raise exception 'No hay contrato vigente para % en %', p_contrato_empresa_id, p_fecha;
  end if;

  for v_fila in select tipo, factura_por_contrato_completo from public.tipo_consumo_config loop
    -- Los tipos que no facturan por contrato completo (hoy: colacion)
    -- no tienen un "esperado" de nómina que conciliar — se facturan
    -- aparte, por consumo real. No generan fila acá.
    continue when not v_fila.factura_por_contrato_completo;

    select count(*) into v_servido
    from public.v_consumo_vigente c
    join public.trabajador t on t.id = c.trabajador_id
    where t.contrato_empresa_id = p_contrato_empresa_id
      and app.fecha_santiago(c.fecha_hora) = p_fecha
      and c.tipo_consumo = v_fila.tipo;

    v_esperado := v_headcount;

    insert into public.conciliacion_diaria
      (contrato_empresa_id, fecha, tipo, headcount_esperado, cantidad_esperada, cantidad_servida, estado, calculado_at)
    values
      (p_contrato_empresa_id, p_fecha, v_fila.tipo, v_headcount, v_esperado, v_servido, 'pendiente', now())
    on conflict (contrato_empresa_id, fecha, tipo) do update
      set headcount_esperado = excluded.headcount_esperado,
          cantidad_esperada = excluded.cantidad_esperada,
          cantidad_servida = excluded.cantidad_servida,
          calculado_at = now()
    returning id into v_conciliacion_id;

    select exists (
      select 1 from public.justificacion_descuadre where conciliacion_diaria_id = v_conciliacion_id
    ) into v_tiene_justificacion;

    if v_esperado = v_servido then
      v_estado := 'conciliado';
    elsif v_tiene_justificacion then
      v_estado := 'con_diferencia_justificada';
    else
      v_estado := 'pendiente';
    end if;

    update public.conciliacion_diaria set estado = v_estado where id = v_conciliacion_id;
  end loop;
end;
$$;

-- 4) cama_noche automática: un trabajador con cama asignada bajo un
--    contrato vigente en p_fecha genera su fila de esa noche, sin
--    responsable humano (registrado_por queda null — ver
--    0008_ledger_tipos.sql). Reprocesable para días atrasados: se le
--    puede pasar cualquier fecha pasada y no duplica nada (el índice
--    único + el propio "not exists" lo protegen). Se factura por
--    headcount igual que el resto — si faltan trabajadores por asignar,
--    esa noche genera menos filas que el headcount y el hueco queda
--    visible en la conciliación, no oculto.
create or replace function public.generar_cama_noche(
  p_fecha date default (now() at time zone 'America/Santiago')::date
) returns integer
language plpgsql as $$
declare
  v_generadas int;
begin
  insert into public.consumo (id, trabajador_id, tipo_consumo, fecha_hora, uuid_idempotente)
  select
    gen_random_uuid(),
    t.id,
    'cama_noche',
    (p_fecha + time '12:00:00') at time zone 'America/Santiago',
    gen_random_uuid()
  from public.trabajador t
  join public.contrato_empresa ce on ce.id = t.contrato_empresa_id
  where t.cama_id is not null
    and ce.vigencia_desde <= p_fecha
    and (ce.vigencia_hasta is null or ce.vigencia_hasta >= p_fecha)
    and not exists (
      select 1 from public.consumo c
      where c.trabajador_id = t.id
        and c.tipo_consumo = 'cama_noche'
        and c.consumo_corregido_id is null
        and app.fecha_santiago(c.fecha_hora) = p_fecha
    );
  get diagnostics v_generadas = row_count;
  return v_generadas;
end;
$$;

grant execute on function public.recalcular_conciliacion(uuid, date) to authenticated;
grant execute on function public.generar_cama_noche(date) to authenticated;

-- 5) pg_cron nightly. La hora UTC es una aproximación a medianoche en
-- Santiago (pg_cron no soporta zonas horarias con nombre en el
-- schedule, y Chile cambia de UTC-3 a UTC-4 con el horario de verano)
-- — no es crítico acordar la hora exacta porque la función es
-- idempotente y reprocesable: si corre unas horas antes/después de
-- medianoche real, o si el droplet estuvo caído esa noche, se puede
-- volver a llamar a mano para la fecha que falte sin duplicar nada.
select cron.schedule(
  'generar_cama_noche_nocturno',
  '0 4 * * *',
  $$select public.generar_cama_noche()$$
);

commit;
