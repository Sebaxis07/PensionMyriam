#!/usr/bin/env bash
# Actualización masiva de fechas en el GitHub Project "pension-miriam-conciliacion"
# (owner Sebaxis07, proyecto #3). Maneja DOS pares de campos, cada uno con su
# propio significado y su propio archivo de entrada — nunca se mezclan:
#
#   PLANIFICADAS (tipo DATE, siempre conocidas): "Inicio planificado" /
#   "Término planificado". Vienen del cronograma oficial ES2
#   (Evtitu/PruebaS2.docx §VII) y son iguales para todas las HU de un mismo
#   Sprint. Fuente: docs/auditoria/fechas-planificadas-es2.csv (generado a
#   partir del cronograma, no a mano).
#
#   REALES (tipo texto libre, casi siempre vacías): "Fecha inicio" /
#   "Fecha término" (los campos ya existentes, anteriores a esta tarea).
#   Solo deben llevar una fecha cuando el equipo tiene evidencia real y la
#   aprueba a mano. Fuente: docs/auditoria/actualizaciones-aprobadas.csv.
#
# Este script NUNCA toca Status, Priority, Assignees ni los Pull Requests
# vinculados, y nunca cierra Issues. Por defecto corre en modo simulación
# (dry-run): no escribe nada remoto salvo que se invoque explícitamente con
# --apply, y eso debe ocurrir solo después de aprobación explícita.
#
# Formato de ambos CSV de entrada (idéntico, 6 columnas; una fila por HU):
#   hu,item_id,actual_1,actual_2,nuevo_1,nuevo_2
# Una fila se omite si nuevo_1 y nuevo_2 están vacíos, o si los valores
# nuevos son idénticos a los actuales (evita escrituras innecesarias y hace
# el script reintentable sin duplicar cambios).
#
# Uso:
#   bash scripts/actualizar-fechas-github-project.sh                      # dry-run, ambos pares
#   bash scripts/actualizar-fechas-github-project.sh --apply              # aplica tras aprobación
#   bash scripts/actualizar-fechas-github-project.sh --solo planificadas  # solo ese par
#   bash scripts/actualizar-fechas-github-project.sh --solo reales        # solo ese par
#   bash scripts/actualizar-fechas-github-project.sh --input-planificadas otro.csv
#   bash scripts/actualizar-fechas-github-project.sh --input-reales otro.csv
#
# Requiere: gh CLI autenticado con scope "project" y python3 (se usa para
# leer el JSON de gh en vez de jq, que no está instalado en esta máquina).

set -euo pipefail

# Fuerza UTF-8 en python3: en Windows, sin esto, "é" en "Fecha término" /
# "Término planificado" no coincide por un mismatch de códec de consola y
# el campo no se encuentra aunque exista.
export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8

OWNER="Sebaxis07"
PROJECT_NUMBER=3
INPUT_PLANIFICADAS="docs/auditoria/fechas-planificadas-es2.csv"
INPUT_REALES="docs/auditoria/actualizaciones-aprobadas.csv"
SOLO="ambos"
APPLY=false
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="docs/auditoria/respaldos"
LOG_FILE="$BACKUP_DIR/log-$TS.txt"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply) APPLY=true; shift ;;
    --solo) SOLO="$2"; shift 2 ;;
    --input-planificadas) INPUT_PLANIFICADAS="$2"; shift 2 ;;
    --input-reales) INPUT_REALES="$2"; shift 2 ;;
    *) echo "Argumento no reconocido: $1" >&2; exit 1 ;;
  esac
done

if [[ "$SOLO" != "ambos" && "$SOLO" != "planificadas" && "$SOLO" != "reales" ]]; then
  echo "ERROR: --solo debe ser 'planificadas', 'reales' o 'ambos'." >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: gh CLI no está instalado o no está en PATH." >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 no está instalado (se usa para leer el JSON de gh, en vez de jq)." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "== Resolviendo proyecto y campos ==" | tee -a "$LOG_FILE"
PROJECT_JSON="$(gh project view "$PROJECT_NUMBER" --owner "$OWNER" --format json)"
PROJECT_ID="$(echo "$PROJECT_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
PROJECT_TITLE="$(echo "$PROJECT_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["title"])')"
echo "Proyecto: $PROJECT_TITLE ($PROJECT_ID)" | tee -a "$LOG_FILE"

FIELDS_JSON="$(gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json)"
buscar_campo() {
  echo "$FIELDS_JSON" | python3 -c "
import json, sys
fields = json.load(sys.stdin)['fields']
print(next((f['id'] for f in fields if f['name'] == '$1'), ''))"
}

FIELD_INICIO_REAL="$(buscar_campo 'Fecha inicio')"
FIELD_TERMINO_REAL="$(buscar_campo 'Fecha término')"
FIELD_INICIO_PLAN="$(buscar_campo 'Inicio planificado')"
FIELD_TERMINO_PLAN="$(buscar_campo 'Término planificado')"

if [[ "$SOLO" != "planificadas" ]]; then
  if [[ -z "$FIELD_INICIO_REAL" || -z "$FIELD_TERMINO_REAL" ]]; then
    echo "ERROR: no se encontraron los campos 'Fecha inicio'/'Fecha término'." >&2
    exit 1
  fi
  echo "Campo 'Fecha inicio'          -> $FIELD_INICIO_REAL" | tee -a "$LOG_FILE"
  echo "Campo 'Fecha término'         -> $FIELD_TERMINO_REAL" | tee -a "$LOG_FILE"
fi
if [[ "$SOLO" != "reales" ]]; then
  if [[ -z "$FIELD_INICIO_PLAN" || -z "$FIELD_TERMINO_PLAN" ]]; then
    echo "ERROR: no se encontraron los campos 'Inicio planificado'/'Término planificado'." \
         "Deben crearse antes (gh project field-create ... --data-type DATE)." >&2
    exit 1
  fi
  echo "Campo 'Inicio planificado'    -> $FIELD_INICIO_PLAN" | tee -a "$LOG_FILE"
  echo "Campo 'Término planificado'   -> $FIELD_TERMINO_PLAN" | tee -a "$LOG_FILE"
fi

echo "== Respaldo del estado actual del Project ==" | tee -a "$LOG_FILE"
BACKUP_FILE="$BACKUP_DIR/project3-antes-$TS.json"
gh project item-list "$PROJECT_NUMBER" --owner "$OWNER" --format json -L 100 > "$BACKUP_FILE"
echo "Respaldo guardado en $BACKUP_FILE" | tee -a "$LOG_FILE"

MODE_LABEL="SIMULACIÓN (dry-run)"
$APPLY && MODE_LABEL="APLICACIÓN REAL"
echo "== Modo: $MODE_LABEL ==" | tee -a "$LOG_FILE"

TOTAL_GLOBAL=0
OMITIDAS_GLOBAL=0
CAMBIADAS_GLOBAL=0
ERRORES_GLOBAL=0

# Procesa un CSV de 6 columnas (hu,item_id,actual_1,actual_2,nuevo_1,nuevo_2)
# contra un par de campos del Project. $1=csv  $2=field_id_1  $3=label_1
# $4=field_id_2  $5=label_2  $6=modo de escritura (--text o --date)
procesar_par() {
  local csv="$1" field1="$2" label1="$3" field2="$4" label2="$5" modo="$6"

  if [[ ! -f "$csv" ]]; then
    echo "ERROR: no se encontró el archivo de entrada: $csv" >&2
    exit 1
  fi

  echo "" | tee -a "$LOG_FILE"
  echo "== Procesando par: '$label1' / '$label2'  (fuente: $csv) ==" | tee -a "$LOG_FILE"

  local total=0 omitidas=0 cambiadas=0 errores=0

  # Usa process substitution (no pipe) para que los contadores sobrevivan
  # fuera del bucle (un pipe crearía un subshell). tr -d '\r' por si el CSV
  # tiene finales de línea CRLF (Windows).
  while IFS=, read -r hu item_id actual1 actual2 nuevo1 nuevo2; do
    total=$((total+1))

    if [[ -z "$nuevo1" && -z "$nuevo2" ]]; then
      omitidas=$((omitidas+1))
      continue
    fi

    local cambio=false
    [[ -n "$nuevo1" && "$nuevo1" != "$actual1" ]] && cambio=true
    [[ -n "$nuevo2" && "$nuevo2" != "$actual2" ]] && cambio=true

    if [[ "$cambio" == false ]]; then
      omitidas=$((omitidas+1))
      echo "SIN CAMBIO: $hu (valores nuevos iguales a los actuales)" | tee -a "$LOG_FILE"
      continue
    fi

    echo "---" | tee -a "$LOG_FILE"
    echo "$hu (item $item_id)" | tee -a "$LOG_FILE"
    [[ -n "$nuevo1" ]] && echo "  $label1: '$actual1' -> '$nuevo1'" | tee -a "$LOG_FILE"
    [[ -n "$nuevo2" ]] && echo "  $label2: '$actual2' -> '$nuevo2'" | tee -a "$LOG_FILE"

    if ! $APPLY; then
      continue
    fi

    if [[ -n "$nuevo1" && "$nuevo1" != "$actual1" ]]; then
      if gh project item-edit --id "$item_id" --project-id "$PROJECT_ID" \
           --field-id "$field1" "$modo" "$nuevo1" >>"$LOG_FILE" 2>&1; then
        cambiadas=$((cambiadas+1))
      else
        echo "  ERROR escribiendo $label1 de $hu" | tee -a "$LOG_FILE"
        errores=$((errores+1))
      fi
    fi
    if [[ -n "$nuevo2" && "$nuevo2" != "$actual2" ]]; then
      if gh project item-edit --id "$item_id" --project-id "$PROJECT_ID" \
           --field-id "$field2" "$modo" "$nuevo2" >>"$LOG_FILE" 2>&1; then
        cambiadas=$((cambiadas+1))
      else
        echo "  ERROR escribiendo $label2 de $hu" | tee -a "$LOG_FILE"
        errores=$((errores+1))
      fi
    fi
  done < <(tail -n +2 "$csv" | tr -d '\r')

  echo "-- Subtotal '$label1'/'$label2': filas $total | omitidas $omitidas | escrituras $cambiadas | errores $errores --" | tee -a "$LOG_FILE"
  TOTAL_GLOBAL=$((TOTAL_GLOBAL+total))
  OMITIDAS_GLOBAL=$((OMITIDAS_GLOBAL+omitidas))
  CAMBIADAS_GLOBAL=$((CAMBIADAS_GLOBAL+cambiadas))
  ERRORES_GLOBAL=$((ERRORES_GLOBAL+errores))
}

if [[ "$SOLO" != "reales" ]]; then
  procesar_par "$INPUT_PLANIFICADAS" "$FIELD_INICIO_PLAN" "Inicio planificado" \
               "$FIELD_TERMINO_PLAN" "Término planificado" --date
fi
if [[ "$SOLO" != "planificadas" ]]; then
  procesar_par "$INPUT_REALES" "$FIELD_INICIO_REAL" "Fecha inicio" \
               "$FIELD_TERMINO_REAL" "Fecha término" --text
fi

echo "" | tee -a "$LOG_FILE"
echo "== Resumen total ($MODE_LABEL) ==" | tee -a "$LOG_FILE"
echo "Filas leídas: $TOTAL_GLOBAL | Omitidas (sin cambio): $OMITIDAS_GLOBAL | Escrituras: $CAMBIADAS_GLOBAL | Errores: $ERRORES_GLOBAL" | tee -a "$LOG_FILE"

if $APPLY; then
  AFTER_FILE="$BACKUP_DIR/project3-despues-$TS.json"
  gh project item-list "$PROJECT_NUMBER" --owner "$OWNER" --format json -L 100 > "$AFTER_FILE"
  echo "Estado posterior guardado en $AFTER_FILE (comparar con $BACKUP_FILE)." | tee -a "$LOG_FILE"
else
  echo "Nada se escribió. Revisa el log y, si todo es correcto, vuelve a ejecutar con --apply tras aprobación explícita." | tee -a "$LOG_FILE"
fi
