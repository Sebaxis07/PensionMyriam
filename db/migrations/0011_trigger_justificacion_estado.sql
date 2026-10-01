-- 0011_trigger_justificacion_estado.sql
-- Actualiza el estado de conciliacion_diaria a 'con_diferencia_justificada'
-- automáticamente en Postgres al registrarse una justificacion_descuadre.

-- 1. Función y trigger en Postgres
create or replace function public.tg_actualizar_estado_conciliacion_tras_justificacion()
returns trigger language plpgsql security definer as $$
begin
  update public.conciliacion_diaria
  set estado = 'con_diferencia_justificada'
  where id = NEW.conciliacion_diaria_id
    and cantidad_esperada <> cantidad_servida;
  return NEW;
end;
$$;

drop trigger if exists trg_justificacion_descuadre_estado on public.justificacion_descuadre;
create trigger trg_justificacion_descuadre_estado
after insert on public.justificacion_descuadre
for each row execute function public.tg_actualizar_estado_conciliacion_tras_justificacion();

-- 2. Corregir filas ya existentes justificadas
update public.conciliacion_diaria cd
set estado = 'con_diferencia_justificada'
where exists (
  select 1 from public.justificacion_descuadre jd
  where jd.conciliacion_diaria_id = cd.id
)
and cd.estado = 'pendiente'
and cd.cantidad_esperada <> cd.cantidad_servida;
