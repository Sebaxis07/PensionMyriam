# Plan de sprints

Cronograma vigente: el del informe ES2 (`Evtitu/PruebaS2.docx`, sección VII «Ajustes del
Cronograma»), revisado contra el estado real del proyecto al 6 de octubre de 2026.
Reemplaza la planificación de 30 HU de la ES1. Cierre y defensa: 12/12/2026.

**Alcance vigente: 42 historias de usuario (HU-01 a HU-42)**, numeradas y agrupadas en
10 épicas (EP-01 a EP-10) según `docs/historia_v2/historias_usuario.csv` y
`docs/Historia_de_usuarios_v2.md`. El alcance creció de 30 a 42 HU tras la segunda
reunión de seguimiento con la Administradora (HU-31 a HU-42: protección de datos
personales Ley N.º 21.719, gestión de cuentas, guía contextual, configuración del
negocio y aviso de operaciones rechazadas al sincronizar).

Las fechas de cada Sprint son **planificación académica**, comprometida en el Sprint
Planning respectivo junto con las historias que lo componen, el incremento a entregar
y la instancia de validación con la Administradora (Schwaber & Sutherland, 2020). No
representan, por sí solas, cuándo una historia comenzó o terminó realmente: el avance
real reportado en cada sección usa evidencia técnica (commits, Pull Requests) tomada
de `docs/auditoria/tabla-hu-github-projects.csv`, que distingue explícitamente
planificación de ejecución y marca «Sin evidencia suficiente» donde no hay registro.
Una historia con avance real documentado no implica que esté aceptada por la
Administradora: esa aceptación, si existe, vive fuera del repositorio (actas de
reunión) y no se da por hecha aquí.

## Sprint 1 — Base técnica y sincronización · 01–21/09/2026 (3 semanas)
**Objetivo:** la app guarda los datos en el celular y los sincroniza al volver la
señal, con acceso autenticado.
**Historias:** HU-27, HU-28 (EP-05).
**Entregable:** base desplegada y sincronización inicial.
**Dependencias:** ninguna (primer incremento).
**Criterio de finalización:** operación offline con reintentos idempotentes verificada
end to end.
**Sprint Review:** Reunión 2 con la Administradora (21/09).
**Avance real documentado:** ambas HU están "Hecho" en GitHub Projects; hay evidencia
de commits de sincronización offline/online hasta el 27/10/2026, es decir, posterior
al cierre planificado de este Sprint — desarrollo iterativo continuado, no un
incumplimiento de la fecha de cierre original.

## Sprint 2 — Reservas, habitaciones y aseo · 22/09–12/10/2026 (3 semanas)
**Objetivo:** la Administradora registra reservas y controla el estado de las ocho
habitaciones.
**Historias:** HU-01 a HU-04 (EP-01), HU-05 a HU-10 (EP-02).
**Entregable:** reservas, check-in, check-out y aseo diario.
**Dependencias:** Sprint 1 (sincronización y modelo de datos base).
**Criterio de finalización:** Sprint finalizado el 12/10.
**Sprint Review:** cierre de Sprint (sin reunión formal intermedia).
**Avance real documentado:** HU-01, HU-03 a HU-10 en "Hecho"; HU-02 y HU-06 en
"En curso" en GitHub Projects. Evidencia de commits entre el 29/09 y el 25/10/2026.

## Sprint 3 — Conciliación diaria y sincronización avanzada · 13–26/10/2026 (2 semanas)
**Objetivo:** los consumos diarios de las empresas quedan registrados y conciliados
contra la nómina, aun sin señal.
**Historias:** HU-11 a HU-17 (EP-03), HU-29 y HU-42 (EP-05).
**Entregable:** conciliación diaria y prueba de desconexión de 72 horas (KPI-02).
**Dependencias:** Sprint 2 (empresas y habitaciones ya operativas).
**Criterio de finalización:** prueba de desconexión de 72 horas superada; conciliación
recalculable sin pérdida ni duplicación de registros.
**Sprint Review:** Reunión 3, prototipo y capacitación.
**Avance real documentado:** las 9 HU están "Hecho" en GitHub Projects. Varias
(HU-11 a HU-16) tienen evidencia de commits ya desde el 29/09/2026, antes del inicio
planificado de este Sprint — desarrollo adelantado respecto del ES2, no un error de
fecha: se mantiene su Sprint planificado y solo se documenta el adelanto.

## Sprint 4 — Cierre mensual, costos y doble modo · 27/10–09/11/2026 (2 semanas)
**Objetivo:** la Administradora cierra el mes con una pre-factura y conoce su margen.
**Historias:** HU-18 a HU-21 (EP-03), HU-22 a HU-26 (EP-04), HU-30 (EP-06).
**Entregable:** cierre mensual, reportes, costos y dashboard de doble modo.
**Dependencias:** Sprint 3 (conciliación diaria ya operativa — el cierre mensual
agrega los días conciliados).
**Criterio de finalización:** verificación de KPI-06 (margen proyectado actualizado en
menos de 24 horas tras cada compra de insumos).
**Sprint Review:** Reunión 4.
**Avance real documentado:** todas estas HU siguen en "Backlog" en GitHub Projects,
pero hay commits del 25/10/2026 (`feat(sprint-4): Control de costos PMP, margen
proyectado, tarifa sugerida y doble modo`, entre otros) que implementan HU-18 a HU-26
y HU-30. Esto es un adelanto de ejecución respecto del Status del Project — que no se
actualizó — y no una historia nueva ni un cambio de Sprint planificado.

## Sprint 5 — Ley N.º 21.719, cuentas y experiencia de uso · 10–16/11/2026 (1 semana)
**Objetivo:** el sistema cumple la Ley 21.719 y queda listo para operar en la pensión.
**Historias:** HU-31 a HU-34 (EP-07), HU-35 y HU-36 (EP-08), HU-37 (EP-09), HU-38 a
HU-41 (EP-10).
**Entregable:** prueba de aceptación con la Administradora y verificación de controles
de seguridad.
**Dependencias:** modelo de datos, sincronización y conciliación ya en funcionamiento
(por eso EP-07 a EP-10 se ubican después del Sprint 3).
**Criterio de finalización:** 5 HU Must-Have completas (HU-31, HU-32, HU-33, HU-35,
HU-36); si el burnup muestra atraso, se recortan primero las Could-Have (HU-37,
HU-38, HU-41) y luego las Should-Have, sin mover la marcha blanca ni la defensa.
**Sprint Review:** prueba de aceptación con la Administradora.
**Avance real documentado:** todas estas HU siguen en "Backlog" en GitHub Projects,
pero hay commits del 27 y 28/10/2026 que implementan la mayoría (protección de datos
personales, gestión de cuentas, configuración del negocio). Mismo caso que el Sprint 4:
adelanto de ejecución no reflejado en el Status del Project.
**Riesgo declarado en ES2:** HU-31 a HU-42 aún no han sido validadas con la
Administradora y podrían cambiar de alcance.

## Sprint 6 — Marcha blanca y verificación de KPIs · 17–30/11/2026 (2 semanas)
**Objetivo:** la pensión opera con el sistema y se miden los indicadores de gestión.
**Historias:** ninguna nueva; corrección de hallazgos de la marcha blanca sobre las
42 HU ya desarrolladas.
**Entregable:** marcha blanca supervisada; medición de los 8 KPI SMART (KPI-01 a
KPI-08) y de los 4 SLA del proyecto.
**Dependencias:** Sprints 1 a 5 completos y desplegados en el entorno de producción.
**Criterio de finalización:** indicadores medidos y comparados contra su línea base.
**Sprint Review:** Reunión 5, cierre de marcha blanca.
**Avance real documentado:** sin evidencia suficiente — la marcha blanca no ha
comenzado a la fecha de este documento.

## Cierre · 01–09/12/2026
Entregar el informe final con los resultados medidos durante la marcha blanca.

## Defensa · 12/12/2026
Hito académico.

---

## Qué cambió respecto de la ES1 y por qué
El alcance creció de 30 a 42 HU tras la segunda reunión de seguimiento (HU-31 a HU-42).
Las HU-31 a HU-41 (EP-07 a EP-10) se ubicaron en el Sprint 5 porque dependen de que el
modelo de datos, la sincronización y la conciliación ya estén en funcionamiento. La
HU-42 pertenece a la épica EP-05 (operación sin conexión), por lo que se ubicó en el
Sprint 3 junto con las demás historias de sincronización. También se agregaron las
pruebas de desconexión de 72 horas al final del Sprint 3 y la prueba de aceptación
antes de la marcha blanca. La planificación pasó de una Carta Gantt de tareas a este
detalle de fases por Sprint, coherente con la metodología Scrum declarada.

## Duración de los Sprints
Scrum recomienda Sprints de duración fija. Los Sprints 1 y 2 se ejecutaron con tres
semanas cada uno; desde el Sprint 3 el equipo trabaja en Sprints de dos semanas. La
excepción es el Sprint 5, de una semana, porque la marcha blanca debe comenzar el
17 de noviembre para medir los indicadores durante dos semanas completas antes del
informe final y la defensa.

## Ruta crítica
El modelo de datos, la sincronización sin conexión y la conciliación diaria son la
ruta crítica: todo lo posterior (cierre mensual, reportes, costos) depende de que los
registros se guarden y concilien correctamente. Este orden resuelve primero el
problema central del negocio — el descuadre entre lo consumido y lo facturado —, que
queda operativo al cierre del Sprint 3, antes de las funciones de cierre mensual,
costos y cumplimiento normativo.

## Seguimiento del avance
El avance se controla con un gráfico burnup del release: la línea roja muestra las
historias que deberían estar terminadas al cierre de cada Sprint y la línea gris el
alcance total (30 → 42 HU tras la segunda reunión). Si el avance real queda bajo lo
planificado, el ajuste se hace recortando alcance según MoSCoW, no moviendo la marcha
blanca ni la defensa.

## Trazabilidad y estado real
El detalle HU por HU — Sprint ES2, estado actual en GitHub Projects, fechas
planificadas, evidencia de commits y acción propuesta — vive en
[`docs/auditoria/tabla-hu-github-projects.csv`](auditoria/tabla-hu-github-projects.csv),
para no duplicar esa información aquí y evitar que ambas fuentes se desalineen de
nuevo. Ese archivo es la referencia a actualizar cuando cambie el estado real de una
historia; este documento describe la planificación por Sprint y no debe usarse para
registrar fechas reales de ejecución.
