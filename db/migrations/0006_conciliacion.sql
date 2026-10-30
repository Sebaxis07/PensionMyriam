-- =====================================================================
-- Migración 0006 (Sprint 2, stretch de Sprint 3 adelantado): HU-16
-- conciliación diaria. Recalculable e idempotente (upsert por
-- unique(contrato_empresa_id, fecha), ya existente desde 0001_init.sql)
-- — nunca cambia lo que se factura (headcount contratado completo) ni
-- bloquea el cierre del día, solo detecta y marca la diferencia.
-- =====================================================================
begin;

create or replace function public.recalcular_conciliacion(
  p_contrato_empresa_id uuid,
  p_fecha date
) returns void
language plpgsql as $$
declare
  v_headcount int;
  v_servidas int;
  v_tiene_justificacion boolean;
  v_estado estado_conciliacion;
  v_conciliacion_id uuid;
begin
  -- El "esperado" usa el headcount vigente EN esa fecha, no el actual
  -- del contrato (decisión: contrato_empresa está versionado por
  -- vigencia justo para esto).
  select headcount into v_headcount
  from public.contrato_empresa
  where id = p_contrato_empresa_id
    and vigencia_desde <= p_fecha
    and (vigencia_hasta is null or vigencia_hasta >= p_fecha);

  if v_headcount is null then
    raise exception 'No hay contrato vigente para % en %', p_contrato_empresa_id, p_fecha;
  end if;

  -- "Servido" = raciones base (desayuno/almuerzo/cena) del libro
  -- VIGENTE (sin las filas ya corregidas). Colación extra y plato
  -- especial son adicionales fuera de convenio (HU-15): no forman
  -- parte del "esperado" del contrato, así que no se cuentan acá.
  select count(*) into v_servidas
  from public.v_consumo_vigente c
  join public.trabajador t on t.id = c.trabajador_id
  where t.contrato_empresa_id = p_contrato_empresa_id
    and app.fecha_santiago(c.fecha_hora) = p_fecha
    and c.tipo_racion in ('desayuno', 'almuerzo', 'cena');

  insert into public.conciliacion_diaria
    (contrato_empresa_id, fecha, headcount_esperado, raciones_esperadas, raciones_servidas, estado, calculado_at)
  values
    (p_contrato_empresa_id, p_fecha, v_headcount, v_headcount * 3, v_servidas, 'pendiente', now())
  on conflict (contrato_empresa_id, fecha) do update
    set headcount_esperado = excluded.headcount_esperado,
        raciones_esperadas = excluded.raciones_esperadas,
        raciones_servidas = excluded.raciones_servidas,
        calculado_at = now()
  returning id into v_conciliacion_id;

  select exists (
    select 1 from public.justificacion_descuadre where conciliacion_diaria_id = v_conciliacion_id
  ) into v_tiene_justificacion;

  if v_headcount * 3 = v_servidas then
    v_estado := 'conciliado';
  elsif v_tiene_justificacion then
    v_estado := 'con_diferencia_justificada';
  else
    -- Diferencia sin justificar todavía: NUNCA bloquea el cierre del
    -- día ni cambia lo facturado (RNF de negocio, HU-16).
    v_estado := 'pendiente';
  end if;

  update public.conciliacion_diaria set estado = v_estado where id = v_conciliacion_id;
end;
$$;

grant execute on function public.recalcular_conciliacion(uuid, date) to authenticated;

commit;
