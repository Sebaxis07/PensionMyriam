# Auditoría del cronograma, GitHub Projects y trazabilidad de las 42 HU

Fecha del análisis: 29 de octubre de 2026. Elaborado a partir de `Evtitu/Prueba1Corregido.docx` (ES1), `Evtitu/PruebaS2.docx` (ES2, §VII "Ajustes del Cronograma"), `docs/plan-sprints.md`, `docs/historia_v2/historias_usuario.csv`, `CLAUDE.md`/`AGENTS.md`, el historial de Git (`git log --all`) y el GitHub Project `pension-miriam-conciliacion` (proyecto #3, 42 items, consultado vía `gh project item-list`/`gh issue list`/`gh pr list`).

Ambos DOCX estuvieron accesibles (se extrajo su texto a `Evtitu_Prueba1Corregido.docx.txt` y `Evtitu_PruebaS2.docx.txt` en el scratchpad de la sesión); no fue necesario detener la auditoría.

## 1. Cronograma ES1 vs. ES2

- **ES1** (10/09/2026): planificación original con 30 HU (HU-01 a HU-30).
- **ES2** (22/10/2026, §VII): el alcance creció a 42 HU tras la segunda reunión con la Administradora. Se agregaron HU-31 a HU-42 (EP-07 a EP-10: Ley 21.719, cuentas, guía contextual, configuración del negocio, aviso de rechazos de sincronización). El cronograma pasó de una Carta Gantt de tareas a un detalle de fases por Sprint, coherente con Scrum. Revisado contra el estado real del proyecto al 6 de octubre de 2026.

El cronograma ES2 (confirmado en el DOCX, sección "Ajustes del Cronograma") es:

| Sprint | Fechas | HU |
|---|---|---|
| Sprint 1 | 01/09–21/09/2026 (3 sem.) | HU-27, HU-28 (EP-05) |
| Sprint 2 | 22/09–12/10/2026 (3 sem.) | HU-01 a HU-10 (EP-01, EP-02) |
| Sprint 3 | 13/10–26/10/2026 (2 sem.) | HU-11 a HU-17 (EP-03), HU-29 y HU-42 (EP-05) |
| Sprint 4 | 27/10–09/11/2026 (2 sem.) | HU-18 a HU-26 (EP-03/EP-04), HU-30 (EP-06) |
| Sprint 5 | 10/11–16/11/2026 (1 sem.) | HU-31 a HU-41 (EP-07 a EP-10) |
| Sprint 6 | 17/11–30/11/2026 (2 sem.) | Sin HU nuevas; marcha blanca y corrección de hallazgos |
| Cierre | 01/12–09/12/2026 | Informe final |
| Defensa | 12/12/2026 | Hito académico |

Estas son fechas de **planificación académica**, no de ejecución real demostrada. Se conservan como tales.

## 2. Discrepancia mayor: documentación operativa del repo vs. ES2

`CLAUDE.md`, `AGENTS.md` (archivo nuevo, sin seguimiento aún) y `docs/plan-sprints.md` **no reflejan el ajuste de la ES2**: describen un alcance de 30 HU ("Las 30 historias de usuario están en docs/Historia_de_usuarios_v2.md... Objetivo intermedio: ~75% (23 HU) antes de la reunión 3") y un calendario distinto (Sprint 0: 29/09–5/10; Sprint 1: 6–19/10; Sprint 2: 20/10–2/11; Sprint 3: 3–16/11; Sprint 4: 17–23/11; Sprint 5: 24–30/11; Sprint 6: 1–12/12), con fecha "hoy" interna de 28/09/2026.

`docs/historia_v2/historias_usuario.csv` (también sin seguimiento aún) sí contiene las 42 HU, con una columna `sprint_original` que usa una tercera numeración de sprints (p. ej. HU-11 a HU-20 en "Sprint 3", HU-27/28/42 repartidas entre "Sprint 1" y "Sprint 3") distinta tanto del ES2 como de `plan-sprints.md`.

**Conclusión**: existen tres calendarios distintos convivendo en el repositorio (ES2, `plan-sprints.md`, y la columna `sprint_original` del CSV), y ninguno de los dos documentos locales fue actualizado tras el crecimiento de 30 a 42 HU. No se resuelve aquí cuál debe prevalecer — se reporta como hallazgo para que el equipo decida; esta auditoría usa el **ES2** como referencia por ser el documento formal más reciente, según la instrucción recibida.

> **Actualización 29/10/2026:** `docs/plan-sprints.md`, `CLAUDE.md` y `AGENTS.md` se
> actualizaron para reflejar el alcance de 42 HU y el cronograma ES2 descrito arriba.
> La columna `sprint_original` de `docs/historia_v2/historias_usuario.csv` se deja
> intacta como dato histórico de ese archivo (no es un cronograma vigente) y no se
> sobrescribe. El hallazgo de esta sección se conserva para que quede registro de la
> discrepancia detectada antes de la corrección.

## 3. Lo que muestra GitHub (evidencia técnica, no fechas reales)

- El Project `pension-miriam-conciliacion` (proyecto #3) tiene 42 items, uno por HU, con 21 campos. Existen los campos de texto libre **"Fecha inicio"** y **"Fecha término"** (no son campos de tipo fecha nativos de GitHub) además de los campos nativos **"Start date"** y **"Target date"** (sin usar). Solo **HU-01** tiene "Fecha inicio"/"Fecha término" rellenas (`2026-10-08` / `2026-10-10`); las 41 restantes están vacías.
- Los **42 Issues se crearon el mismo día, 2026-10-24, en una ventana de pocos minutos** (p. ej. issue #2 "HU-01" creado y cerrado el `2026-10-24T03:49:25Z`/`T03:49:28Z`). Esto confirma que los Issues fueron generados por un script de carga masiva, no abiertos de forma orgánica al comenzar cada HU: **su `createdAt`/`closedAt` no es evidencia de inicio o término real de trabajo**, solo de cuándo se creó el registro de seguimiento.
- Solo existen **7 Pull Requests** en el repositorio, todos entre el 2026-10-01 y el 2026-10-27 (`sprint-2` abierto el 01/10 y aún sin mergear; `verify/sprint-1-offline-sync`, `verify/sprint-2-...`, `verify/sprint-3-...`, `verify/sprint-4-...`, `design/publicacion-sprints-1-2-ui-ux`, `design/sprints-3-4-ui-ux`, todos mergeados entre el 24 y el 27 de octubre).
- `git log --all` muestra actividad real en dos bloques: **29/09–01/10/2026** (base de datos, Sprints 1 a 4 en borrador) y **24/10–28/10/2026** (verificación, pruebas E2E/pgTAP reales, diseño UI, Sprint 5 completo — protección de datos Ley 21.719, cuentas, configuración — y la rama actual `feat/liberacion-cupos-contrato`). Hay un commit aislado el 17/10 (`Cambiosv2`).
- **`main` solo tiene un commit** ("first commit", 29/09/2026). Todo el trabajo real (Sprints 1 a 5, diseño, verificación) vive en ramas (`verify/*`, `design/*`, `codex/*`, `feat/liberacion-cupos-contrato`) que **no están integradas a `main`**.
- El `Status` del Project muestra HU-01, HU-03 a HU-17, HU-27 a HU-29 y HU-42 en **"Hecho"**; HU-02 y HU-06 en **"En curso"**; el resto (HU-18 a HU-26, HU-30 a HU-41) en **"Backlog"**. Sin embargo, hay commits del 25 al 28 de octubre que implementan explícitamente varias de esas HU "Backlog" (p. ej. `feat(sprint5): proteccion de datos personales Ley 21.719 (HU-31 a HU-34)`, `feat(sprint5): gestion segura de cuentas (HU-35, HU-36)`, `feat(sprint-4): Control de costos PMP...`). **El campo Status del Project no se actualizó para reflejar ese avance**; esto es una desviación a documentar, no una razón para cambiarlo nosotros (instrucción explícita: no tocar Status).

## 4. Tabla previa (Entregable B)

Ver [`tabla-hu-github-projects.csv`](tabla-hu-github-projects.csv): las 42 HU con Épica, Sprint ES2, Estado actual del Project, Inicio/Término planificado (según ES2), Inicio/Término real (solo donde hay evidencia, o "Sin evidencia suficiente"), evidencia de commits por HU, el valor ya cargado en el Project, y una acción propuesta por fila según las reglas de la sección 4.4 del encargo (conservar Status, no inventar fechas reales, marcar adelantos como desviación sin reasignar Sprint).

Ninguna fila asigna una fecha real de término a una HU en curso, ni asume que el cierre de un Issue equivale a la aceptación de la Administradora (no hay registro de aceptación documentado para ninguna HU en las fuentes revisadas).

## 5. Riesgos y datos no verificables

- No hay evidencia en el repositorio ni en el Project de validación/aceptación de la Administradora para ninguna HU — ni siquiera las marcadas "Hecho". El respaldo de aceptación, si existe, está fuera del repositorio (actas en `docs/infoentr/*.docx`, no procesadas en esta auditoría).
- Las fechas de "Fecha inicio"/"Fecha término" de HU-01 en el Project (08–10/10/2026) no coinciden con ningún Sprint de ES2 (que ubica HU-01 en Sprint 2, 22/09–12/10) ni con `plan-sprints.md` (que ubica HU-01 en Sprint 1, 6–19/10): cae dentro de ambos rangos, pero no hay registro de por qué se eligieron esos dos días exactos. Se reporta como "sin evidencia suficiente" para el origen del dato, no se sobrescribe.
- Los commits que mencionan una HU en su mensaje son indicio de trabajo relacionado, no prueba de que la HU completa esté terminada ni de que sus criterios de aceptación se verificaron; varios commits con fecha 24–27/10 son correcciones (`fix`) sobre trabajo ya existente, no el inicio del desarrollo.
- HU-05, HU-07, HU-09, HU-23 a HU-25, HU-38 y HU-40 no aparecen mencionadas por número en ningún mensaje de commit de `git log --all`: no se les asigna evidencia de ejecución real, aunque varias (HU-05, HU-07, HU-09) están marcadas "Hecho" en el Project — probablemente implementadas junto con HU-06/HU-08/HU-10 sin mencionarse explícitamente. No se infiere una fecha a partir de esa suposición.

## 6. No se modificó nada remoto

Esta auditoría es de solo lectura: no se cambiaron Status, fechas, prioridades ni relaciones con Pull Requests en el Project. El script de la sección siguiente queda en modo simulación hasta aprobación explícita.
