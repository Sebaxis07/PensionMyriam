#!/usr/bin/env bash
# Reinicia los datos de demo del Sprint 1 contra el Postgres de
# infra/docker-compose.yml (ya debe estar levantado). Deja: 8 piezas con
# capacidades y estados variados, 1 cama por pieza (turista reserva la
# pieza completa — decisión del Sprint 1; una pieza puede sumar más
# camas en el Sprint 2 para nómina de empresa, HU-12), 1 reserva de
# turista lista para check-in hoy, y las 2 usuarias de siempre
# (Administradora / Encargada), creándolas si todavía no existen.
#
# Uso: bash db/seed-demo.sh
set -euo pipefail

cd "$(dirname "$0")/.."

CONTAINER=pension-myriam-postgres-1
PGPASSWORD=changeme_dev_password
GOTRUE_URL=http://localhost:9999
JWT_SECRET=changeme_at_least_32_characters_long

psql_admin() {
  docker exec -i -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 "$@"
}

service_role_jwt() {
  node -e '
    const crypto = require("crypto");
    const b64url = (b) => Buffer.from(b).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
    const secret = process.argv[1];
    const now = Math.floor(Date.now()/1000);
    const h = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const p = b64url(JSON.stringify({ role: "service_role", iss: "supabase-demo", iat: now, exp: now + 10*365*24*3600 }));
    const sig = crypto.createHmac("sha256", secret).update(h + "." + p).digest();
    console.log(h + "." + p + "." + b64url(sig));
  ' "$JWT_SECRET"
}

crear_usuario_si_falta() {
  local email="$1" password="$2" rol="$3" nombre="$4" service_key="$5"
  local existing_id
  existing_id=$(psql_admin -tAc "select auth_uid from public.usuario where nombre = '$nombre'" || true)
  if [ -n "$existing_id" ]; then
    echo "  usuario '$nombre' ya existe ($existing_id)"
    return
  fi
  local resp auth_id
  resp=$(curl -s -X POST "$GOTRUE_URL/admin/users" \
    -H "Authorization: Bearer $service_key" -H "apikey: $service_key" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\",\"email_confirm\":true}")
  auth_id=$(node -e "console.log(JSON.parse(process.argv[1]).id)" "$resp")
  psql_admin -c "insert into public.usuario (auth_uid, rol, nombre) values ('$auth_id', '$rol', '$nombre')"
  echo "  usuario '$nombre' creado ($auth_id)"
}

echo "=== Usuarias de demo ==="
SERVICE_KEY=$(service_role_jwt)
crear_usuario_si_falta "admin@pension-myriam.local" "Paposo2026!" "administradora" "María (Administradora)" "$SERVICE_KEY"
crear_usuario_si_falta "encargada@pension-myriam.local" "Paposo2026!" "encargada" "Encargada de Registro" "$SERVICE_KEY"

echo "=== Reiniciando piezas, camas, reservas, check-in/out y aseo ==="
psql_admin <<'SQL'
begin;

-- El orden respeta las FK. No se toca usuario/auth.users.
delete from public.aseo;
delete from public.checkout;
delete from public.checkin;
delete from public.reserva where trabajador_id is null;  -- solo las de turista (Sprint 1)
delete from public.cama;
delete from public.habitacion;

-- 2, 6 y 8 arrancan Disponible a propósito: el check-in de más abajo
-- (vía su trigger normal) es lo que las deja Ocupada — igual que en la
-- operación real, nunca se fuerza el estado "ocupada" a mano.
with datos (numero, capacidad, estado, motivo) as (
  values
    (1, 2, 'disponible', null),
    (2, 2, 'disponible', null),
    (3, 3, 'en_aseo', null),
    (4, 2, 'en_mantencion', 'Baño con fuga'),
    (5, 2, 'disponible', null),
    (6, 4, 'disponible', null),
    (7, 2, 'disponible', null),
    (8, 2, 'disponible', null)
)
insert into public.habitacion (numero, capacidad, estado, motivo_mantencion)
select numero, capacidad, estado::estado_habitacion, motivo from datos;

-- Una cama por pieza: el turista reserva la pieza completa (Sprint 1).
insert into public.cama (habitacion_id, numero)
select id, 1 from public.habitacion;

-- Reserva de turista lista para check-in HOY, en la pieza #1
-- (Disponible) — demuestra HU-01 -> HU-06 de punta a punta.
insert into public.reserva (tipo_cliente, cama_id, huesped_nombre, fecha_inicio, creado_por, uuid_idempotente)
select 'turista', c.id, 'Carla Fuentes', current_date,
       (select id from public.usuario where nombre = 'María (Administradora)'),
       gen_random_uuid()
from public.cama c
join public.habitacion h on h.id = c.habitacion_id
where h.numero = 1;

-- Deja las piezas #2, #6 y #8 realmente Ocupadas con su check-in activo
-- (no solo el color): sin esto, "Salió" en la hoja de acción no tendría
-- un checkin_activo_id y HU-07 no se podría demostrar.
do $$
declare
  v_admin uuid := (select id from public.usuario where nombre = 'María (Administradora)');
  v_fila record;
  v_cama uuid;
  v_reserva uuid;
begin
  for v_fila in
    select h.id as habitacion_id, t.n as nombre
    from (values
      (2, 'Julio Álvarez'),
      (6, 'Minera Paposo Ltda. (contacto: R. Núñez)'),
      (8, 'Rosa Soto')
    ) as t(numero_pieza, n)
    join public.habitacion h on h.numero = t.numero_pieza
  loop
    select c.id into v_cama from public.cama c where c.habitacion_id = v_fila.habitacion_id limit 1;
    insert into public.reserva (id, tipo_cliente, cama_id, huesped_nombre, fecha_inicio, estado, creado_por, uuid_idempotente)
      values (gen_random_uuid(), 'turista', v_cama, v_fila.nombre, current_date - 1, 'confirmada', v_admin, gen_random_uuid())
      returning id into v_reserva;
    insert into public.checkin (reserva_id, realizado_por, fecha_hora, uuid_idempotente)
      values (v_reserva, v_admin, now() - interval '1 day', gen_random_uuid());
  end loop;
end $$;

-- Pieza #6 ya tuvo su aseo de hoy; #2 y #8 quedan pendientes (para
-- demostrar la pantalla "Aseo de hoy" con algo que hacer).
insert into public.aseo (habitacion_id, tipo, responsable, uuid_idempotente)
select h.id, 'diario', (select id from public.usuario where nombre = 'María (Administradora)'), gen_random_uuid()
from public.habitacion h where h.numero = 6;

commit;
SQL

echo "=== Demo lista ==="
psql_admin -c "select numero, capacidad, estado, motivo_mantencion from public.habitacion order by numero;"
