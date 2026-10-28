import { fechaHoySantiago, rangoHoySantiagoUTC } from "./fechaNegocio";

/**
 * Consulta combinada para HU-05/06/08: estado de cada pieza más lo que
 * la pantalla necesita mostrar de un vistazo sin pantallas aparte por
 * cada dato — quién la reservó para hoy (HU-01→HU-06), quién la ocupa
 * ahora mismo (para el check-out) y si ya tuvo su aseo de hoy (HU-08).
 *
 * "hoy" se calcula en zona America/Santiago (ver app/src/lib/fechaNegocio.ts),
 * NUNCA con `date('now')` de SQLite (que es UTC) — ver informe de
 * auditoría Sprint 3, defecto transversal de fechas. fecha_inicio/
 * fecha_fin de `reserva` son fechas de calendario puras (sin hora): se
 * comparan contra el día de negocio de hoy como parámetro. fecha_hora
 * de `aseo` es un instante real: se compara contra el RANGO UTC del
 * día de Santiago (parámetros p0/p1), no contra un solo string de fecha.
 */
export const QUERY_PIEZAS = `
with reserva_hoy as (
  select * from (
    select c.habitacion_id, r.id, coalesce(r.huesped_nombre,t.nombre,'Cupo ' || r.cupo_numero || ' — Pendiente de nombre') as huesped_nombre, r.tipo_cliente,
           case when r.cupo_numero is not null and r.trabajador_id is null then 1 else 0 end as sin_identificar,
           row_number() over (partition by c.habitacion_id order by r.created_at) as rn
    from reserva r
    join cama c on c.id = r.cama_id
    left join trabajador t on t.id = r.trabajador_id
    where r.estado = 'confirmada'
      and date(r.fecha_inicio) <= date(?)
      and (r.fecha_fin is null or date(r.fecha_fin) >= date(?))
      and not exists (select 1 from checkin ci where ci.reserva_id = r.id)
  ) where rn = 1
),
active_checkin as (
  select * from (
    select c.habitacion_id, ci.id as checkin_id, coalesce(r.huesped_nombre,t.nombre) as huesped_nombre,
           row_number() over (partition by c.habitacion_id order by ci.fecha_hora desc) as rn
    from checkin ci
    join reserva r on r.id = ci.reserva_id
    join cama c on c.id = r.cama_id
    left join trabajador t on t.id = r.trabajador_id
    left join checkout co on co.checkin_id = ci.id
    where co.checkin_id is null
  ) where rn = 1
),
aseo_hoy as (
  select habitacion_id, count(*) as n
  from aseo
  where fecha_hora >= ? and fecha_hora < ?
  group by habitacion_id
)
select
  h.id, h.numero, h.capacidad, h.estado, h.motivo_mantencion,
  rh.id as reserva_id, rh.huesped_nombre as reserva_nombre, rh.tipo_cliente as reserva_tipo,
  coalesce(rh.sin_identificar,0) as reserva_sin_identificar,
  ac.checkin_id as checkin_activo_id, ac.huesped_nombre as huesped_actual,
  coalesce(ah.n, 0) as aseo_hoy_count
from habitacion h
left join reserva_hoy rh on rh.habitacion_id = h.id
left join active_checkin ac on ac.habitacion_id = h.id
left join aseo_hoy ah on ah.habitacion_id = h.id
order by h.numero
`;

/** Parámetros posicionales de QUERY_PIEZAS, en orden: [hoySantiago, hoySantiago, desdeUTC, hastaUTC]. */
export function parametrosQueryPiezas(): [string, string, string, string] {
  const hoy = fechaHoySantiago();
  const { desde, hasta } = rangoHoySantiagoUTC();
  return [hoy, hoy, desde, hasta];
}

export type PiezaRow = {
  id: string;
  numero: number;
  capacidad: number;
  estado: string;
  motivo_mantencion: string | null;
  reserva_id: string | null;
  reserva_nombre: string | null;
  reserva_tipo: string | null;
  reserva_sin_identificar?: number;
  checkin_activo_id: string | null;
  huesped_actual: string | null;
  aseo_hoy_count: number;
};

/** Piezas libres para HU-01 (Reservar): sin reserva de hoy ya pendiente. */
export const QUERY_CAMAS_LIBRES = `
select c.id as cama_id, h.id as habitacion_id, h.numero, h.capacidad
from cama c
join habitacion h on h.id = c.habitacion_id
where h.estado = 'disponible'
  and not exists (
    select 1 from reserva r
    where r.cama_id = c.id
      and r.estado = 'confirmada'
      and date(r.fecha_inicio) <= date(?)
      and (r.fecha_fin is null or date(r.fecha_fin) >= date(?))
  )
order by h.numero
`;

/** Parámetros posicionales de QUERY_CAMAS_LIBRES: [hoySantiago, hoySantiago]. */
export function parametrosQueryCamasLibres(): [string, string] {
  const hoy = fechaHoySantiago();
  return [hoy, hoy];
}

export type CamaLibreRow = {
  cama_id: string;
  habitacion_id: string;
  numero: number;
  capacidad: number;
};
