# Plan de sprints

Hoy: 28/09/2026. Cierre y defensa: 12/12/2026. Reunión 3 con la Administradora:
semana del 9–15 nov 2026 (confirmado). Objetivo intermedio: **~75% (23 de 30 HU)
funcionando antes de la reunión 3.**

Reordenado respecto de la propuesta inicial para que las 23 HU más valiosas
(las 17 Must-Have completas + 6 Should-Have baratas de agregar en el mismo
trabajo) estén listas para ese checkpoint, y no al cierre de un sprint
posterior.

## Sprint 0 — Fundaciones · 29 sep – 5 oct
Sin HU de negocio. Repo, Docker Compose, esquema SQL v1 + RLS + pgTAP,
PWA vacía que sincroniza offline de punta a punta, Droplet + respaldo diario.
Ver `CLAUDE.md` §Cómo trabajar y `db/migrations/0001_init.sql`.

## Sprint 1 — Habitaciones y ciclo de vida · 6 – 19 oct (9 HU)
HU-01, 05, 06, 07, 08, 09, 10, 27, 28.
HU-10 (mantención) se agrega aquí porque es la misma máquina de estados que
HU-05/07/09; no representa trabajo adicional relevante.
**Cierre:** despliegue a producción, arranca la marcha blanca con el módulo
de habitaciones. Primera medición de usabilidad (KPI-3).

## Sprint 2 — Empresas y ledger de consumos · 20 oct – 2 nov (6 HU)
HU-02, 11, 12, 13, 14, 15.
HU-15 (colación extra / plato especial) se agrega aquí porque es una
extensión directa del registro de consumo (HU-13/14), no una pantalla nueva.
**Cierre:** la clienta registra consumos reales en paralelo al cuaderno.
Este es el sprint que ataca el dolor central del negocio.

## Sprint 3 — Conciliación, cierre y reportes · 3 – 16 nov (8 HU)
HU-16, 17, 18, 04, 03, 19, 20, 29.
**Checkpoint de reunión 3 dentro de este sprint** (semana del 9–15 nov, hacia
el final de las dos semanas). Al llegar a esa fecha deberían estar cerradas
las 23 HU acumuladas (Sprints 1+2+3 = 9+6+8).

⚠️ **Riesgo declarado:** este sprint concentra la lógica más difícil del
proyecto (conciliación diaria recalculable, cierre mensual que bloquea, dos
exportaciones auditadas) en el mismo tramo que el checkpoint de la clienta.
Si algo no llega, el orden de recorte antes de sacrificar Must-Have es:
HU-29 → HU-20 → HU-19 → HU-03, en ese orden, dejando siempre HU-16/17/18/04
(Must-Have) intactas. Lo aviso apenas se vea venir, no al final del sprint.

## Sprint 4 — Costos, margen y dashboard · 17 – 30 nov (5 HU + 2 stretch)
Después del checkpoint de 75%, antes de la defensa.
HU-22, 23, 24, 25, 30 (Should-Have restantes).
Stretch si sobra tiempo: HU-21, HU-26 (Could-Have).

## Cierre · 1 – 12 dic
Medición final de los 8 KPI, Lighthouse, OWASP ASVS L2, capacitación
presencial, cierre de informe, defensa 12/12/2026.

---

## HU que quedan fuera del 75% de la reunión 3

No se sacrifican del proyecto: se mueven al Sprint 4, después del checkpoint.

| HU | Épica | Motivo para dejarla después |
|----|-------|------------------------------|
| HU-22 | Costos | Depende de tener consumos e ingresos reales corriendo (Sprint 2-3) antes de que el costeo tenga sentido. |
| HU-23 | Costos | Extiende HU-22. |
| HU-24 | Costos | Necesita HU-22/23 para proyectar margen. |
| HU-25 | Costos | Necesita HU-24. |
| HU-30 | Dashboard | Es una vista que combina indicadores de todo lo anterior; tiene más sentido cuando el resto ya existe. |
| HU-21 | Reportes (Could-Have) | Baja prioridad declarada en el MoSCoW original. |
| HU-26 | Costos (Could-Have) | Baja prioridad declarada; depende de HU-24. |

Total: 7 HU (23% del backlog), todas Should-Have o Could-Have — ninguna
Must-Have queda fuera del checkpoint de 75%.
