#!/usr/bin/env bash
# Prueba de volumen (Sprint 2): 30 trabajadores x 3 comidas x 30 días
# (2.700 filas de consumo) contra el Postgres real de infra/. Mide
# cuánto tarda la conciliación de todo el mes y una consulta típica de
# la app (nómina + consumo de hoy). No usa camas físicas (trabajador
#.cama_id queda null): esto es una prueba de volumen de datos y
# consultas, no una simulación de ocupación real de piezas — para eso
# está db/seed-demo-empresa.sh, con capacidad real de la pensión (8
# piezas).
#
# Uso: bash db/volume-test-empresa.sh
set -euo pipefail
cd "$(dirname "$0")/.."

CONTAINER=pension-myriam-postgres-1
PGPASSWORD=changeme_dev_password

psql_admin() {
  docker exec -i -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 "$@"
}

echo "=== Generando 30 trabajadores x 3 comidas x 30 días ==="
psql_admin <<'SQL'
\timing on

do $$
declare
  v_admin uuid := (select id from public.usuario where nombre = 'María (Administradora)');
  v_empresa uuid;
  v_contrato uuid;
  v_trabajador uuid;
  v_dia date;
  i int;
begin
  delete from public.consumo where trabajador_id in (
    select t.id from public.trabajador t
    join public.contrato_empresa ce on ce.id = t.contrato_empresa_id
    join public.empresa e on e.id = ce.empresa_id
    where e.razon_social = 'Volumen Test SpA'
  );
  delete from public.trabajador where contrato_empresa_id in (
    select ce.id from public.contrato_empresa ce
    join public.empresa e on e.id = ce.empresa_id
    where e.razon_social = 'Volumen Test SpA'
  );
  delete from public.contrato_empresa where empresa_id in (select id from public.empresa where razon_social = 'Volumen Test SpA');
  delete from public.empresa where razon_social = 'Volumen Test SpA';

  insert into public.empresa (razon_social) values ('Volumen Test SpA') returning id into v_empresa;
  insert into public.contrato_empresa (empresa_id, vigencia_desde, headcount, tarifa_convenida, creado_por)
    values (v_empresa, current_date - 30, 30, 25000, v_admin)
    returning id into v_contrato;

  for i in 1..30 loop
    insert into public.trabajador (contrato_empresa_id, nombre)
      values (v_contrato, 'Trabajador Volumen ' || i)
      returning id into v_trabajador;

    for v_dia in select generate_series(current_date - 29, current_date - 1, interval '1 day')::date loop
      insert into public.consumo (trabajador_id, tipo_racion, registrado_por, fecha_hora, uuid_idempotente)
        values
          (v_trabajador, 'desayuno', v_admin, v_dia + time '07:30', gen_random_uuid()),
          (v_trabajador, 'almuerzo', v_admin, v_dia + time '13:00', gen_random_uuid()),
          (v_trabajador, 'cena', v_admin, v_dia + time '20:00', gen_random_uuid());
    end loop;
  end loop;
end $$;

select count(*) as filas_consumo from public.consumo c
  join public.trabajador t on t.id = c.trabajador_id
  join public.contrato_empresa ce on ce.id = t.contrato_empresa_id
  join public.empresa e on e.id = ce.empresa_id
  where e.razon_social = 'Volumen Test SpA';

\echo '=== Tiempo: recalcular_conciliacion x 30 días ==='
do $$
declare
  v_contrato uuid := (select ce.id from public.contrato_empresa ce
                       join public.empresa e on e.id = ce.empresa_id
                       where e.razon_social = 'Volumen Test SpA');
  v_dia date;
begin
  for v_dia in select generate_series(current_date - 29, current_date - 1, interval '1 day')::date loop
    perform public.recalcular_conciliacion(v_contrato, v_dia);
  end loop;
end $$;

\echo '=== Tiempo: consulta típica (nómina + consumo de hoy, la que usa useConsumoHoy) ==='
select
  t.id, t.nombre,
  exists (
    select 1 from consumo c
    where c.trabajador_id = t.id and c.tipo_racion = 'almuerzo'
      and c.consumo_corregido_id is null and date(c.fecha_hora) = current_date - 1
  ) as ya_registrado
from trabajador t
join contrato_empresa ce on ce.id = t.contrato_empresa_id
join empresa e on e.id = ce.empresa_id
where e.razon_social = 'Volumen Test SpA';
SQL
