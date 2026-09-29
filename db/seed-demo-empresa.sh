#!/usr/bin/env bash
# Datos de demo del Sprint 2 (EP-03): 1 empresa, contrato vigente,
# nómina con camas asignadas y ~1 mes de consumos (con un día ya
# justificado). Se ejecuta DESPUÉS de db/seed-demo.sh (Sprint 1) — no lo
# reemplaza, lo complementa.
#
# Las 8 piezas de seed-demo.sh ya están todas ocupadas por el demo de
# turistas; para no chocar con eso, esta empresa usa camas ADICIONALES
# en las piezas #5 y #7 (Disponibles, sin reserva de turista pendiente),
# como si fueran piezas de varias camas para contratistas — coexisten
# con la cama #1 turista que ya tenían.
#
# Uso: bash db/seed-demo.sh && bash db/seed-demo-empresa.sh
set -euo pipefail

cd "$(dirname "$0")/.."

CONTAINER=pension-myriam-postgres-1
PGPASSWORD=changeme_dev_password

psql_admin() {
  docker exec -i -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 "$@"
}

echo "=== Empresa, contrato, nómina y consumos de demo ==="
psql_admin <<'SQL'
begin;

do $$
declare
  v_admin uuid := (select id from public.usuario where nombre = 'María (Administradora)');
  v_empresa uuid;
  v_contrato uuid;
  v_pieza5 uuid := (select id from public.habitacion where numero = 5);
  v_pieza7 uuid := (select id from public.habitacion where numero = 7);
  v_cama uuid;
  v_trabajador uuid;
  v_nombres text[] := array['Pedro Almonte', 'Luis Vergara', 'Manuel Rojas', 'Sergio Cortés'];
  v_piezas uuid[] := array[v_pieza5, v_pieza5, v_pieza7, v_pieza7];
  v_numeros_cama int[] := array[2, 3, 2, 3];
  v_dia date;
  i int;
begin
  -- Limpieza idempotente: borra solo lo que esta empresa de demo creó
  -- antes, para poder correr el script varias veces.
  delete from public.consumo where trabajador_id in (
    select t.id from public.trabajador t
    join public.contrato_empresa ce on ce.id = t.contrato_empresa_id
    join public.empresa e on e.id = ce.empresa_id
    where e.razon_social = 'Minera Paposo Demo Ltda.'
  );
  delete from public.reserva where trabajador_id in (
    select t.id from public.trabajador t
    join public.contrato_empresa ce on ce.id = t.contrato_empresa_id
    join public.empresa e on e.id = ce.empresa_id
    where e.razon_social = 'Minera Paposo Demo Ltda.'
  );
  delete from public.trabajador where contrato_empresa_id in (
    select ce.id from public.contrato_empresa ce
    join public.empresa e on e.id = ce.empresa_id
    where e.razon_social = 'Minera Paposo Demo Ltda.'
  );
  delete from public.contrato_empresa where empresa_id in (
    select id from public.empresa where razon_social = 'Minera Paposo Demo Ltda.'
  );
  delete from public.empresa where razon_social = 'Minera Paposo Demo Ltda.';
  delete from public.cama where habitacion_id in (v_pieza5, v_pieza7) and numero > 1;

  insert into public.empresa (razon_social, rut, contacto)
    values ('Minera Paposo Demo Ltda.', '76.111.222-3', 'Supervisor de Faena R. Núñez')
    returning id into v_empresa;

  insert into public.contrato_empresa (empresa_id, vigencia_desde, headcount, tarifa_convenida, creado_por)
    values (v_empresa, current_date - 30, 4, 25000, v_admin)
    returning id into v_contrato;

  -- Dos camas extra por pieza (además de la #1 turista ya existente):
  -- dos trabajadores por pieza.
  insert into public.cama (habitacion_id, numero) values (v_pieza5, 2), (v_pieza5, 3);
  insert into public.cama (habitacion_id, numero) values (v_pieza7, 2), (v_pieza7, 3);

  for i in 1..4 loop
    insert into public.trabajador (contrato_empresa_id, nombre)
      values (v_contrato, v_nombres[i])
      returning id into v_trabajador;

    select id into v_cama from public.cama where habitacion_id = v_piezas[i] and numero = v_numeros_cama[i];

    insert into public.reserva
        (tipo_cliente, cama_id, trabajador_id, contrato_empresa_id, fecha_inicio, estado, creado_por, uuid_idempotente)
      values ('empresa', v_cama, v_trabajador, v_contrato, current_date - 30, 'confirmada', v_admin, gen_random_uuid());
    update public.trabajador set cama_id = v_cama where id = v_trabajador;

    -- Un mes de consumos completos (3 raciones/día), salvo el trabajador
    -- #4 que falta un día completo (para tener algo que conciliar).
    for v_dia in select generate_series(current_date - 29, current_date - 1, interval '1 day')::date loop
      if not (i = 4 and v_dia = current_date - 5) then
        insert into public.consumo (trabajador_id, tipo_racion, registrado_por, fecha_hora, uuid_idempotente)
          values
            (v_trabajador, 'desayuno', v_admin, v_dia + time '07:30', gen_random_uuid()),
            (v_trabajador, 'almuerzo', v_admin, v_dia + time '13:00', gen_random_uuid()),
            (v_trabajador, 'cena', v_admin, v_dia + time '20:00', gen_random_uuid());
      end if;
    end loop;
  end loop;

  -- Recalcula la conciliación de todo el mes (idempotente: puede
  -- correrse de nuevo sin duplicar filas).
  for v_dia in select generate_series(current_date - 29, current_date - 1, interval '1 day')::date loop
    perform public.recalcular_conciliacion(v_contrato, v_dia);
  end loop;

  -- El día con la diferencia queda justificado, como en la operación
  -- real (HU-17) — no cambia lo facturado, solo deja el respaldo.
  insert into public.justificacion_descuadre (conciliacion_diaria_id, motivo, supervisor_nombre, registrado_por)
    select id, 'ausencia_justificada', 'Supervisor de Faena R. Núñez', v_admin
    from public.conciliacion_diaria
    where contrato_empresa_id = v_contrato and fecha = current_date - 5;
  perform public.recalcular_conciliacion(v_contrato, current_date - 5);
end $$;

commit;
SQL

echo "=== Demo de empresa lista ==="
psql_admin -c "
  select ce.fecha, ce.headcount_esperado, ce.raciones_esperadas, ce.raciones_servidas, ce.estado
  from public.conciliacion_diaria ce
  join public.contrato_empresa c on c.id = ce.contrato_empresa_id
  join public.empresa e on e.id = c.empresa_id
  where e.razon_social = 'Minera Paposo Demo Ltda.'
  order by ce.fecha desc
  limit 5;
"
