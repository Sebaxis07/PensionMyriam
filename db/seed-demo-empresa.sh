#!/usr/bin/env bash
# Datos de demo del Sprint 2 (EP-03): 1 empresa, contrato vigente,
# nómina con camas asignadas, un mes de consumos (cama_noche generada
# automáticamente igual que en producción, no a mano) y un día con
# descuadre ya justificado. Se ejecuta DESPUÉS de db/seed-demo.sh
# (Sprint 1) — no lo reemplaza, lo complementa.
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

echo "=== Empresa, contrato, nomina y consumos de demo ==="
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
  v_producto_colacion uuid;
  v_nombres text[] := array['Pedro Almonte', 'Luis Vergara', 'Manuel Rojas', 'Sergio Cortés'];
  v_piezas uuid[] := array[v_pieza5, v_pieza5, v_pieza7, v_pieza7];
  v_numeros_cama int[] := array[2, 3, 2, 3];
  v_dia date;
  i int;
begin
  -- Idempotente SIN borrar nada: `consumo` es un libro contable
  -- inmutable de verdad (ni este script puede saltarse el trigger que
  -- bloquea DELETE/UPDATE) — si la empresa demo ya existe, no se
  -- recrea. Para "resetear" el demo de empresa de verdad hay que partir
  -- de un volumen de Postgres nuevo (igual que en produccion: el ledger
  -- no se resetea, se archiva).
  if exists (select 1 from public.empresa where razon_social = 'Minera Paposo Demo Ltda.') then
    raise notice 'La empresa de demo ya existe: no se vuelve a crear (el ledger es inmutable). Nada que hacer.';
    return;
  end if;

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

    -- Un mes de raciones completas (desayuno/almuerzo/cena), salvo el
    -- trabajador #4 que falta un día completo (para tener algo que
    -- conciliar). cama_noche NO se inserta acá — se genera abajo con
    -- generar_cama_noche(), exactamente como en produccion (pg_cron).
    for v_dia in select generate_series(current_date - 29, current_date - 1, interval '1 day')::date loop
      if not (i = 4 and v_dia = current_date - 5) then
        insert into public.consumo (trabajador_id, tipo_consumo, registrado_por, fecha_hora, uuid_idempotente)
          values
            (v_trabajador, 'desayuno', v_admin, v_dia + time '07:30', gen_random_uuid()),
            (v_trabajador, 'almuerzo', v_admin, v_dia + time '13:00', gen_random_uuid()),
            (v_trabajador, 'cena', v_admin, v_dia + time '20:00', gen_random_uuid());
      end if;
    end loop;
  end loop;

  -- cama_noche: la misma funcion que corre pg_cron cada noche en
  -- produccion (0009_conciliacion_por_tipo.sql), reprocesada acá para
  -- los 29 días atrasados del demo. El trabajador #4 falta un día
  -- porque su cama_id se asigno igual (solo falto a comer ese día), así
  -- que su cama_noche SI se genera completa: el descuadre de este demo
  -- es de raciones, no de cama.
  for v_dia in select generate_series(current_date - 29, current_date - 1, interval '1 day')::date loop
    perform public.generar_cama_noche(v_dia);
  end loop;

  -- HU-15: una colacion de terreno de ejemplo, con su propio producto
  -- y precio — no forma parte del "esperado" del contrato (se factura
  -- aparte, por consumo real; ver tipo_consumo_config).
  insert into public.producto_extra (nombre, precio_unitario)
    values ('Colación de terreno', 3500)
    on conflict (nombre) do nothing;
  select id into v_producto_colacion from public.producto_extra where nombre = 'Colación de terreno';

  insert into public.consumo (trabajador_id, tipo_consumo, recargo, producto_extra_id, registrado_por, fecha_hora, uuid_idempotente)
    select id, 'colacion', 3500, v_producto_colacion, v_admin, current_date - 1 + time '11:00', gen_random_uuid()
    from public.trabajador
    where contrato_empresa_id = v_contrato
    limit 1;

  -- Recalcula la conciliacion de todo el mes (idempotente: puede
  -- correrse de nuevo sin duplicar filas). Genera 4 filas por día
  -- (cama_noche/desayuno/almuerzo/cena) — "colacion" no genera fila,
  -- se factura por consumo real.
  for v_dia in select generate_series(current_date - 29, current_date - 1, interval '1 day')::date loop
    perform public.recalcular_conciliacion(v_contrato, v_dia);
  end loop;

  -- El día con la diferencia (raciones del trabajador #4) queda
  -- justificado en cada tipo afectado, como en la operacion real
  -- (HU-17) — no cambia lo facturado, solo deja el respaldo.
  insert into public.justificacion_descuadre (conciliacion_diaria_id, motivo, supervisor_nombre, registrado_por)
    select id, 'ausencia_justificada', 'Supervisor de Faena R. Núñez', v_admin
    from public.conciliacion_diaria
    where contrato_empresa_id = v_contrato and fecha = current_date - 5
      and cantidad_esperada <> cantidad_servida;
  perform public.recalcular_conciliacion(v_contrato, current_date - 5);
end $$;

commit;
SQL

echo "=== Demo de empresa lista ==="
psql_admin -c "
  select ce.fecha, ce.tipo, ce.headcount_esperado, ce.cantidad_esperada, ce.cantidad_servida, ce.estado
  from public.conciliacion_diaria ce
  join public.contrato_empresa c on c.id = ce.contrato_empresa_id
  join public.empresa e on e.id = c.empresa_id
  where e.razon_social = 'Minera Paposo Demo Ltda.'
  order by ce.fecha desc, ce.tipo
  limit 8;
"
