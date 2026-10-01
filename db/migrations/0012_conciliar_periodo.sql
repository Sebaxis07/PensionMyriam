-- 0012_conciliar_periodo.sql
-- Permite conciliar un período de fechas o un mes completo en una sola operación.

create or replace function public.conciliar_periodo(
  p_contrato_empresa_id uuid,
  p_desde date,
  p_hasta date
) returns integer
language plpgsql security definer as $$
declare
  v_fecha date;
  v_hoy date := (now() at time zone 'America/Santiago')::date;
  v_limite date := least(p_hasta, v_hoy);
  v_dias_procesados integer := 0;
begin
  v_fecha := p_desde;
  while v_fecha <= v_limite loop
    perform public.generar_cama_noche(v_fecha);
    perform public.recalcular_conciliacion(p_contrato_empresa_id, v_fecha);
    v_fecha := v_fecha + 1;
    v_dias_procesados := v_dias_procesados + 1;
  end loop;
  return v_dias_procesados;
end;
$$;

grant execute on function public.conciliar_periodo(uuid, date, date) to authenticated;
