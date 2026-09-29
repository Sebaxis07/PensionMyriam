#!/usr/bin/env bash
# Prueba de volumen (Sprint 2): 30 trabajadores x 4 tipos (cama_noche +
# 3 comidas) x 30 dias (3.600 filas de consumo) contra el Postgres real
# de infra/. Mide cuanto tarda generar cama_noche, conciliar todo el mes
# y una consulta tipica de la app. No usa camas fisicas (trabajador
# .cama_id queda null): esto es volumen de datos y consultas, no una
# simulacion de ocupacion real de piezas — para eso esta
# db/seed-demo-empresa.sh, acotado a la capacidad real de 8 piezas.
#
# `consumo` es un libro inmutable de verdad (ni este script puede
# borrarlo): cada corrida usa un nombre de empresa distinto (sufijo
# aleatorio) en vez de borrar la anterior — los datos de corridas
# previas quedan acumulados en el volumen de desarrollo, igual que
# quedarian en produccion.
#
# Uso: bash db/volume-test-empresa.sh
set -euo pipefail
cd "$(dirname "$0")/.."

CONTAINER=pension-myriam-postgres-1
PGPASSWORD=changeme_dev_password
SUFIJO=$(date +%s)
EMPRESA="Volumen Test SpA #$SUFIJO"

psql_admin() {
  docker exec -i -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 "$@"
}

echo "=== Generando 30 trabajadores x 4 tipos x 30 dias ($EMPRESA) ==="
psql_admin <<SQL
\timing on

do \$\$
declare
  v_admin uuid := (select id from public.usuario where nombre = 'María (Administradora)');
  v_empresa uuid;
  v_contrato uuid;
  v_trabajador uuid;
  v_dia date;
  i int;
begin
  insert into public.empresa (razon_social) values ('$EMPRESA') returning id into v_empresa;
  insert into public.contrato_empresa (empresa_id, vigencia_desde, headcount, tarifa_convenida, creado_por)
    values (v_empresa, current_date - 30, 30, 25000, v_admin)
    returning id into v_contrato;

  for i in 1..30 loop
    insert into public.trabajador (contrato_empresa_id, nombre)
      values (v_contrato, 'Trabajador Volumen ' || i)
      returning id into v_trabajador;

    for v_dia in select generate_series(current_date - 29, current_date - 1, interval '1 day')::date loop
      insert into public.consumo (trabajador_id, tipo_consumo, registrado_por, fecha_hora, uuid_idempotente)
        values
          (v_trabajador, 'desayuno', v_admin, v_dia + time '07:30', gen_random_uuid()),
          (v_trabajador, 'almuerzo', v_admin, v_dia + time '13:00', gen_random_uuid()),
          (v_trabajador, 'cena', v_admin, v_dia + time '20:00', gen_random_uuid());
    end loop;
  end loop;
end \$\$;

select count(*) as filas_consumo from public.consumo c
  join public.trabajador t on t.id = c.trabajador_id
  join public.contrato_empresa ce on ce.id = t.contrato_empresa_id
  join public.empresa e on e.id = ce.empresa_id
  where e.razon_social = '$EMPRESA';

\echo '=== Tiempo: generar_cama_noche x 30 dias (trabajadores sin cama: 0 filas, pero recorre igual) ==='
do \$\$
declare
  v_dia date;
begin
  for v_dia in select generate_series(current_date - 29, current_date - 1, interval '1 day')::date loop
    perform public.generar_cama_noche(v_dia);
  end loop;
end \$\$;

\echo '=== Tiempo: recalcular_conciliacion x 30 dias ==='
do \$\$
declare
  v_contrato uuid := (select ce.id from public.contrato_empresa ce
                       join public.empresa e on e.id = ce.empresa_id
                       where e.razon_social = '$EMPRESA');
  v_dia date;
begin
  for v_dia in select generate_series(current_date - 29, current_date - 1, interval '1 day')::date loop
    perform public.recalcular_conciliacion(v_contrato, v_dia);
  end loop;
end \$\$;

\echo '=== Tiempo: consulta tipica (nomina + consumo de hoy, la que usa useConsumoHoy) ==='
select
  t.id, t.nombre,
  exists (
    select 1 from consumo c
    where c.trabajador_id = t.id and c.tipo_consumo = 'almuerzo'
      and c.consumo_corregido_id is null and date(c.fecha_hora) = current_date - 1
  ) as ya_registrado
from trabajador t
join contrato_empresa ce on ce.id = t.contrato_empresa_id
join empresa e on e.id = ce.empresa_id
where e.razon_social = '$EMPRESA'
limit 5;
SQL
