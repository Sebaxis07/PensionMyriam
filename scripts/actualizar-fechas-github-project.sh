#!/usr/bin/env bash
# Actualización masiva de "Fecha inicio" / "Fecha término" en el GitHub
# Project "pension-miriam-conciliacion" (owner Sebaxis07, proyecto #3).
#
# Contexto: ver docs/auditoria/auditoria-cronograma.md. Este script NUNCA
# toca Status, Priority, Assignees ni los Pull Requests vinculados — solo
# los dos campos de texto libre "Fecha inicio" y "Fecha término" de cada
# item. Por defecto corre en modo simulación (dry-run): no escribe nada
# remoto salvo que se invoque explícitamente con --apply, y eso debe
# ocurrir solo después de que el equipo apruebe el archivo de entrada.
#
# Entrada: un CSV con las columnas exactas
#   hu,item_id,status_actual,fecha_inicio_actual,fecha_termino_actual,fecha_inicio_nueva,fecha_termino_nueva
# (la plantilla en blanco está en docs/auditoria/actualizaciones-aprobadas.csv,
# generada a partir del estado real del Project — no inventar item_id a mano).
# Una fila se omite si fecha_inicio_nueva y fecha_termino_nueva están vacías,
# o si el valor nuevo es idéntico al actual (evita escrituras innecesarias
# y hace el script reintentable sin duplicar cambios).
#
# Uso:
#   bash scripts/actualizar-fechas-github-project.sh                    # dry-run (por defecto)
#   bash scripts/actualizar-fechas-github-project.sh --apply            # aplica tras aprobación
#   bash scripts/actualizar-fechas-github-project.sh --input otro.csv   # otro archivo de entrada
#
# Requiere: gh CLI autenticado con scope "project" (ya verificado: ver
# auditoria-cronograma.md §3) y python3 (se usa para leer el JSON de gh).

set -euo pipefail

# Fuerza UTF-8 en python3: en Windows, sin esto, "é" en "Fecha término"
# no coincide por un mismatch de códec de consola y el campo no se
# encuentra aunque exista.
export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8

OWNER="Sebaxis07"
PROJECT_NUMBER=3
INPUT_CSV="docs/auditoria/actualizaciones-aprobadas.csv"
APPLY=false
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="docs/auditoria/respaldos"
LOG_FILE="$BACKUP_DIR/log-$TS.txt"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply) APPLY=true; shift ;;
    --input) INPUT_CSV="$2"; shift 2 ;;
    *) echo "Argumento no reconocido: $1" >&2; exit 1 ;;
  esac
done

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: gh CLI no está instalado o no está en PATH." >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 no está instalado (se usa para leer el JSON de gh, en vez de jq)." >&2
  exit 1
fi
if [[ ! -f "$INPUT_CSV" ]]; then
  echo "ERROR: no se encontró el archivo de entrada: $INPUT_CSV" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "== Resolviendo proyecto y campos ==" | tee -a "$LOG_FILE"
PROJECT_JSON="$(gh project view "$PROJECT_NUMBER" --owner "$OWNER" --format json)"
PROJECT_ID="$(echo "$PROJECT_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
PROJECT_TITLE="$(echo "$PROJECT_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["title"])')"
echo "Proyecto: $PROJECT_TITLE ($PROJECT_ID)" | tee -a "$LOG_FILE"

FIELDS_JSON="$(gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json)"
FIELD_INICIO_ID="$(echo "$FIELDS_JSON" | python3 -c '
import json, sys
fields = json.load(sys.stdin)["fields"]
print(next((f["id"] for f in fields if f["name"] == "Fecha inicio"), ""))')"
FIELD_TERMINO_ID="$(echo "$FIELDS_JSON" | python3 -c '
import json, sys
fields = json.load(sys.stdin)["fields"]
print(next((f["id"] for f in fields if f["name"] == "Fecha término"), ""))')"

if [[ -z "$FIELD_INICIO_ID" || -z "$FIELD_TERMINO_ID" ]]; then
  echo "ERROR: no se encontraron los campos 'Fecha inicio'/'Fecha término' en el proyecto." \
       "Revisa docs/auditoria/auditoria-cronograma.md §4.3 antes de crear campos nuevos." >&2
  exit 1
fi
echo "Campo 'Fecha inicio' -> $FIELD_INICIO_ID" | tee -a "$LOG_FILE"
echo "Campo 'Fecha término' -> $FIELD_TERMINO_ID" | tee -a "$LOG_FILE"

echo "== Respaldo del estado actual del Project ==" | tee -a "$LOG_FILE"
BACKUP_FILE="$BACKUP_DIR/project3-antes-$TS.json"
gh project item-list "$PROJECT_NUMBER" --owner "$OWNER" --format json -L 100 > "$BACKUP_FILE"
echo "Respaldo guardado en $BACKUP_FILE" | tee -a "$LOG_FILE"

MODE_LABEL="SIMULACIÓN (dry-run)"
$APPLY && MODE_LABEL="APLICACIÓN REAL"
echo "== Modo: $MODE_LABEL ==" | tee -a "$LOG_FILE"

TOTAL=0
OMITIDAS=0
CAMBIADAS=0
ERRORES=0

# Salta la cabecera del CSV. Usa process substitution (no pipe) para que
# los contadores sobrevivan fuera del bucle (un pipe crearía un subshell).
while IFS=, read -r hu item_id status_actual fi_actual ft_actual fi_nueva ft_nueva; do
  TOTAL=$((TOTAL+1))

  if [[ -z "$fi_nueva" && -z "$ft_nueva" ]]; then
    OMITIDAS=$((OMITIDAS+1))
    continue
  fi

  CAMBIO=false
  if [[ -n "$fi_nueva" && "$fi_nueva" != "$fi_actual" ]]; then CAMBIO=true; fi
  if [[ -n "$ft_nueva" && "$ft_nueva" != "$ft_actual" ]]; then CAMBIO=true; fi

  if [[ "$CAMBIO" == false ]]; then
    OMITIDAS=$((OMITIDAS+1))
    echo "SIN CAMBIO: $hu (valores nuevos iguales a los actuales)" | tee -a "$LOG_FILE"
    continue
  fi

  echo "---" | tee -a "$LOG_FILE"
  echo "$hu (item $item_id)" | tee -a "$LOG_FILE"
  [[ -n "$fi_nueva" ]] && echo "  Fecha inicio:  '$fi_actual' -> '$fi_nueva'" | tee -a "$LOG_FILE"
  [[ -n "$ft_nueva" ]] && echo "  Fecha término: '$ft_actual' -> '$ft_nueva'" | tee -a "$LOG_FILE"

  if ! $APPLY; then
    continue
  fi

  if [[ -n "$fi_nueva" && "$fi_nueva" != "$fi_actual" ]]; then
    if gh project item-edit --id "$item_id" --project-id "$PROJECT_ID" \
         --field-id "$FIELD_INICIO_ID" --text "$fi_nueva" >>"$LOG_FILE" 2>&1; then
      CAMBIADAS=$((CAMBIADAS+1))
    else
      echo "  ERROR escribiendo Fecha inicio de $hu" | tee -a "$LOG_FILE"
      ERRORES=$((ERRORES+1))
    fi
  fi
  if [[ -n "$ft_nueva" && "$ft_nueva" != "$ft_actual" ]]; then
    if gh project item-edit --id "$item_id" --project-id "$PROJECT_ID" \
         --field-id "$FIELD_TERMINO_ID" --text "$ft_nueva" >>"$LOG_FILE" 2>&1; then
      CAMBIADAS=$((CAMBIADAS+1))
    else
      echo "  ERROR escribiendo Fecha término de $hu" | tee -a "$LOG_FILE"
      ERRORES=$((ERRORES+1))
    fi
  fi
done < <(tail -n +2 "$INPUT_CSV" | tr -d '\r')

echo "== Resumen ($MODE_LABEL) ==" | tee -a "$LOG_FILE"
echo "Filas leídas: $TOTAL | Omitidas (sin cambio): $OMITIDAS | Escrituras: $CAMBIADAS | Errores: $ERRORES" | tee -a "$LOG_FILE"

if $APPLY; then
  AFTER_FILE="$BACKUP_DIR/project3-despues-$TS.json"
  gh project item-list "$PROJECT_NUMBER" --owner "$OWNER" --format json -L 100 > "$AFTER_FILE"
  echo "Estado posterior guardado en $AFTER_FILE (comparar con $BACKUP_FILE)." | tee -a "$LOG_FILE"
else
  echo "Nada se escribió. Revisa el log y, si todo es correcto, vuelve a ejecutar con --apply tras aprobación explícita." | tee -a "$LOG_FILE"
fi
