# 11 — Pendientes y validaciones

Todo lo que aparece aquí fue detectado en la auditoría del 28/10/2026 (`00-auditoria-capacitacion.md`). Ninguna de estas decisiones se atribuye a la Administradora: donde hay evidencia de que ella ya decidió algo, se cita la fuente (el acta de reunión correspondiente); donde no hay esa evidencia, se marca explícitamente como pendiente de validar con ella.

## A. Funciones incompletas o con comportamiento no confirmado

| # | Qué falta | Por qué importa para la capacitación | Qué se hizo al respecto en este material |
|---|---|---|---|
| 1 | El criterio de HU-01/HU-31 pide pedir el RUT solo si el turista es nacional; el sistema **no tiene ningún campo de RUT** para turistas, ni nacional ni extranjero | Si alguien pregunta "¿dónde pongo el RUT del pasajero chileno?", la respuesta correcta es "no existe ese campo", no "búsquelo, debe estar" | No se incluyó ningún paso de "ingresar RUT de turista" en ningún manual, caso ni guion |
| 2 | Restauración de respaldos del servidor: el diseño (respaldo diario cifrado) está declarado en `CLAUDE.md`, pero no se encontró un procedimiento de restauración escrito y probado en el repositorio | Si el servidor falla gravemente, el equipo necesita saber restaurar, no improvisar | Se marcó como pendiente en `10-soporte-continuidad-costos.md` §4; se recomienda escribirlo y probarlo antes de depender de él |
| 3 | Procedimiento de reseteo manual de contraseña por SSH: mencionado en `CLAUDE.md` como existente, pero no se encontró documentado paso a paso | El equipo necesita un procedimiento repetible, no depender de la memoria de quien lo hizo la última vez | Marcado como pendiente en `10-soporte-continuidad-costos.md` §7 |

## B. Decisiones de negocio no aprobadas, o aprobadas con una condición que sigue abierta

| # | Decisión | Estado real | Qué NO se debe afirmar en la capacitación |
|---|---|---|---|
| 1 | Plazo de gracia antes de anonimizar nóminas (hoy configurado en 7 días) | El propio criterio de HU-33 lo marca como "propuesto, por validar con la Administradora" | No decir "a los 7 días se borra el nombre" como un hecho cerrado; decir "hoy está en 7 días, y ese número todavía puede ajustarse con usted" |
| 2 | Umbrales del semáforo de margen (30 %/15 % en el cálculo vs. 35 %/20 % en la leyenda visual) | Inconsistencia real detectada en el código, no resuelta | No usar el semáforo de margen como ejemplo de un número "confiable" en ningún caso práctico; si aparece en pantalla durante una demostración, no explicarlo como si los dos conjuntos de números coincidieran |
| 3 | Rechazo de abonos/garantías de reserva | **Sí está validado**: la Administradora lo rechazó expresamente en la reunión del 21/09/2026 ("en un pueblo chico como Paposo no se trabaja con abonos de hotel") | Se puede afirmar con seguridad en S2 y Caso A/B |
| 4 | Aseo diario obligatorio (no cada 2-3 días) | **Sí está validado**: ajustado explícitamente a pedido de la Administradora en la misma reunión | Se puede afirmar con seguridad en S2/S7 y Caso G |
| 5 | Eliminación automática de datos personales al cierre de facturación | **Sí está validado** en su principio general: la propia Administradora propuso no conservar las nóminas tras el cierre (acta 21/09/2026) | El PRINCIPIO está validado; el NÚMERO EXACTO de días de gracia (punto B.1) sigue abierto |
| 6 | Costos y condiciones económicas de infraestructura (servidor, respaldo, soporte) | No hay ninguna cifra ni acuerdo documentado en el repositorio | Nunca mencionar una cifra en la capacitación; usar la explicación sencilla de `10-soporte-continuidad-costos.md` §3 |

## C. Discrepancia documental sin resolver

`docs/plan-sprints.md` describe un alcance de 30 historias de usuario con el Sprint 5 reducido a una sola historia; `docs/historia_v2/historias_usuario.csv` describe 42 historias con el Sprint 5 ampliado a HU-31 a HU-41. Esta capacitación se construyó sobre el CSV, que es la versión contra la que se verificaron las funciones de protección de datos, cuentas y configuración. **El equipo debe decidir y actualizar `plan-sprints.md`** para que ambos documentos cuenten la misma historia del proyecto; no es una decisión que corresponda resolver en este material de capacitación.

## D. Ausencia de infraestructura verificada en el momento de esta auditoría

- Esta auditoría **no verificó si el Droplet de producción está desplegado y accesible hoy**; solo confirmó que la configuración de Docker Compose en el repositorio es coherente con esa descripción.
- No se verificó la existencia de un dominio ni de certificados HTTPS activos en producción.
- **Antes de la Jornada 1 de capacitación**, el equipo debe confirmar con una prueba real (no solo revisando el código) que el entorno que se usará para capacitar está arriba y accesible desde los teléfonos reales que se van a usar — ver `08-checklist-puesta-en-marcha.md` §G.

## E. Limitaciones offline no resueltas

- No existe, en el material revisado, una medición real de "cuántos días puede estar un teléfono sin sincronizar sin riesgo de perder datos pendientes de envío". El manual y el guion solo dicen "mientras más tiempo pase, más importante es sincronizar" — es una recomendación prudente, no una cifra probada, y así se presentó en `04-manual-administradora.md` §14 y en el Caso J.
- No se simuló, para efectos de esta capacitación, un corte de señal de varios días consecutivos; solo cortes breves demostrativos (minutos). Si el equipo de desarrollo cuenta con una medición real de un corte prolongado (de otra sesión de verificación técnica), debe comunicarse a la Administradora con esa evidencia, no con una promesa genérica.

## F. Riesgos de seguridad a mantener presentes durante la marcha blanca

- Verificar, durante los primeros días de uso real, que ninguna cuenta de Encargada reciba o muestre datos de costos, tarifas o márgenes — es el comportamiento que el sistema debe tener según el código auditado, pero conviene confirmarlo observando el teléfono real de la Encargada en uso, no solo asumiéndolo por lo que dice el código.
- Verificar que las contraseñas de las cuentas reales (no las de demostración) cumplan la política de 12 caracteres mínimos desde la primera cuenta creada en producción.

## G. Falta de datos de prueba más allá de la demostración

Todos los casos prácticos de `03-casos-practicos.md` usan datos ficticios creados para esta capacitación. **No existe, en el repositorio, un conjunto de datos de demostración "oficial" y reutilizable** más allá de los scripts de siembra (`seed-demo.sh`, `seed-demo-empresa.sh`) usados en sesiones de verificación técnica anteriores. Se recomienda que el equipo mantenga un conjunto fijo de datos ficticios (los mismos nombres y empresas en cada capacitación), para no generar confusión por "el ejemplo cambió" entre jornadas.

## H. Dependencias de UX/UI

Según `docs/sprint-5-handoff-codex.md` (Sprint 5) y el estado del código al 28/10/2026, la mayor parte del diseño visual ya fue completada por Codex para los Sprints 1 a 5, incluidas las tres funciones más recientes (cancelación, cupos sin nómina, corrección del 403). **No se detectó, en esta auditoría, ningún módulo de los que se enseñan en este plan que dependa de un diseño visual todavía pendiente.** Las capturas de pantalla que faltan (listadas al final de `04-manual-administradora.md` y `05-manual-encargada.md`) son una tarea de documentación, no de diseño nuevo.

## I. Resumen para quien decide si se puede empezar a capacitar

Ninguno de los puntos anteriores impide iniciar la capacitación de las funciones ya integradas y probadas (la enorme mayoría del sistema, según `00-auditoria-capacitacion.md`). Lo que sí se pide, antes de la Jornada 1:
1. Confirmar que el entorno de demostración está arriba (punto D).
2. Decidir si se comunica o no, y cómo, el punto B.1 (plazo de 7 días) como "sujeto a ajuste" frente a la Sra. María.
3. No prometer en ningún manual ni sesión ninguna cifra de costo de infraestructura sin un acuerdo formal previo (punto B.6).
