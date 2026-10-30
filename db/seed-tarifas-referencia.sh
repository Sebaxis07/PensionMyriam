#!/usr/bin/env bash
# Carga la tabla `tarifa_general` (migración 0025) con las tarifas
# documentadas en ev/precios.txt (correo de Sebastián con los precios
# que entregó la Sra. María), como punto de partida de referencia —
# NO se aplican retroactivamente a ningún contrato_empresa ni
# config_negocio existente.
#
# No inventa nada que el documento no diga: a propósito NO carga
# almuerzo/cena de empresa (precios.txt solo da cama y desayuno para
# empresa) ni asume tratamiento de IVA salvo donde el documento lo dice
# explícitamente (cena especial). Ver comentarios en cada INSERT.
#
# Requiere: el Postgres de infra/docker-compose.yml ya levantado y al
# menos una usuaria con rol 'administradora' ya creada (ej. corriendo
# antes db/seed-demo.sh, o contra producción con la Administradora real
# ya dada de alta). Es seguro volver a correrlo: si el tipo de tarifa
# ya tiene una fila vigente, la omite en vez de duplicarla o pisarla.
#
# Uso: bash db/seed-tarifas-referencia.sh
set -euo pipefail

cd "$(dirname "$0")/.."

CONTAINER=pension-myriam-postgres-1
PGPASSWORD=changeme_dev_password

psql_admin() {
  docker exec -i -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 "$@"
}

ADMIN_ID=$(psql_admin -tAc "select id from public.usuario where rol = 'administradora' order by created_at asc limit 1")
if [ -z "$ADMIN_ID" ]; then
  echo "ERROR: no hay ninguna usuaria con rol 'administradora' todavía." >&2
  echo "Corre primero db/seed-demo.sh (o crea la cuenta real de la Administradora) y vuelve a intentar." >&2
  exit 1
fi
echo "Usando Administradora id=$ADMIN_ID como creado_por"

psql_admin -v admin_id="$ADMIN_ID" <<'SQL'
begin;

insert into public.tarifa_general (tipo, monto, iva_aplicable, nota, creado_por)
select v.tipo, v.monto, v.iva_aplicable, v.nota, :'admin_id'::uuid
from (values
  -- "Tarifa general por persona: $15.000": no aclara si incluye
  -- alimentación o es solo alojamiento. Se carga como 'cama_turista'
  -- (alojamiento) por ser la lectura más conservadora, coherente con
  -- que desayuno/almuerzo/cena se listan aparte en el mismo correo.
  -- PENDIENTE: confirmar con la Administradora antes de usar en cálculos reales.
  ('cama_turista'::public.tipo_tarifa_general, 15000::numeric, false,
   'ev/precios.txt: "Tarifa general por persona: $15.000". Ambigüedad: no aclara si incluye alimentación. PENDIENTE de confirmar con la Administradora.'),
  ('desayuno', 4500, false, 'ev/precios.txt, tarifa general.'),
  ('almuerzo', 7000, false, 'ev/precios.txt, tarifa general.'),
  ('cena', 7000, false, 'ev/precios.txt, tarifa general.'),
  -- Único monto del documento con tratamiento tributario explícito.
  ('cena_especial', 15000, true,
   'ev/precios.txt: "Cenas en fechas importantes: $15.000 + IVA (en caso de requerir factura)". IVA condicional al requerimiento de factura, no siempre aplica.'),
  ('cama_empresa', 13000, false, 'ev/precios.txt, tarifa empresa.'),
  ('desayuno_empresa', 4500, false, 'ev/precios.txt, tarifa empresa.')
  -- A propósito NO se incluye almuerzo_empresa ni cena_empresa: el
  -- documento fuente no las especifica y no deben inventarse.
) as v(tipo, monto, iva_aplicable, nota)
where not exists (
  select 1 from public.tarifa_general t
  where t.tipo = v.tipo and t.vigencia_hasta is null
);

commit;
SQL

echo "Listo. Revisa 'select * from tarifa_general' para confirmar lo cargado."
