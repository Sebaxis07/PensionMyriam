#!/usr/bin/env bash
# Sprint 0 — aplica db/migrations/*.sql (en orden) dos veces desde cero
# contra un Postgres desechable (imagen Supabase, con pgTAP ya
# incluido) y corre los pgTAP mínimos. No toca ninguna base persistente.
#
# Requiere Docker. Uso: bash db/dev-run.sh
set -euo pipefail

CONTAINER=pension_myriam_pg_dev
IMAGE=supabase/postgres:15.8.1.049   # incluye pgTAP, pg_cron, uuid-ossp, btree_gist
PORT=54329
PGPASSWORD=devpassword

cd "$(dirname "$0")/.."

apply_migrations() {
  for m in db/migrations/*.sql; do
    echo "  -> $m"
    # "postgres" no es superusuario real en esta imagen (solo
    # "supabase_admin" lo es); estas migraciones necesitan superusuario
    # (create extension pg_cron, alter de roles reservados como
    # authenticator/supabase_auth_admin, bypassrls).
    docker exec -i -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" \
      psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -f /dev/stdin < "$m"
  done
}

start_fresh_postgres() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker run -d --name "$CONTAINER" \
    -e POSTGRES_PASSWORD="$PGPASSWORD" \
    -p "$PORT:5432" \
    "$IMAGE" >/dev/null

  # La imagen supabase/postgres arranca primero en modo temporal (solo
  # socket Unix, sin TCP) para correr sus migraciones internas de
  # bootstrap, y luego se reinicia a su modo final (que sí escucha TCP).
  # `pg_isready` sin -h usa el socket por defecto y detectaría como sana
  # esa instancia temporal, justo antes de que se apague para reiniciar
  # ("database system is shutting down"). Forzar TCP evita esa carrera.
  echo "Esperando a que Postgres acepte conexiones..."
  for i in $(seq 1 60); do
    docker exec "$CONTAINER" pg_isready -U postgres -h 127.0.0.1 >/dev/null 2>&1 && return 0
    sleep 1
  done
  echo "Postgres no respondió a tiempo." >&2
  exit 1
}

run_migrations_from_scratch() {
  echo "=== Levantando Postgres desechable (intento) ==="
  start_fresh_postgres
  echo "=== Aplicando migraciones ==="
  apply_migrations
  echo "=== Migraciones aplicadas limpias. Destruyendo contenedor. ==="
  docker rm -f "$CONTAINER" >/dev/null
}

echo ">>> Corrida 1 de 2 (desde cero)"
run_migrations_from_scratch
echo ">>> Corrida 2 de 2 (desde cero, contenedor nuevo otra vez)"
run_migrations_from_scratch
echo ">>> Las migraciones corrieron limpias dos veces desde cero. OK."

echo "=== Levantando Postgres para pgTAP (se deja arriba para los tests) ==="
start_fresh_postgres
apply_migrations

echo "=== Habilitando pgtap y corriendo pgTAP ==="
docker exec -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" \
  psql -U postgres -c "create extension if not exists pgtap;"

FAIL=0
for f in db/pgtap/*.sql; do
  echo "--- $f ---"
  docker exec -i -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" \
    psql -U postgres -v ON_ERROR_STOP=1 -f /dev/stdin < "$f" || FAIL=1
done

echo "=== Limpiando contenedor de desarrollo ==="
docker rm -f "$CONTAINER" >/dev/null

if [ "$FAIL" -ne 0 ]; then
  echo ">>> Hubo fallas en pgTAP. Revisar salida arriba."
  exit 1
fi
echo ">>> pgTAP OK. Sprint 0 / esquema: listo para Docker Compose."
