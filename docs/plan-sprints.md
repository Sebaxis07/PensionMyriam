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

## Sprint 4 — Costos, margen y doble modo · 17 – 23 nov (6 HU)
EP-04 (Costos y Margen) y EP-06 (Dashboard doble modo).
- HU-22: Registrar compra de insumos con costeo por Promedio Móvil Ponderado (PMP).
- HU-23: Categorizar compras y estimar rendimiento de insumos.
- HU-24: Proyectar margen de ganancia del mes en curso.
- HU-25: Calcular costo diario real por trabajador y tarifa mínima sugerida.
- HU-26: Recibir recomendación ante margen bajo (integrada desde backlog Could-Have).
- HU-30: Doble modo: cambiar entre modo operativo (Encargada) y administrativo (Administradora con PIN).
**Cierre:** verificación de KPI-06 (actualización del margen proyectado en menos de 24 horas tras cada compra de insumos).

## Sprint 5 — Protección de datos (Ley 21.719), seguridad y reportes externos · 24 – 30 nov (1 HU + cumplimiento normativo)
Transversal y extensión de EP-03.
- HU-21: Enviar reporte diario por WhatsApp al supervisor de faena (integrada desde backlog Could-Have).
- Cumplimiento estricto Ley N° 21.719 (Protección de Datos Personales):
  - Job de purga automática programada en `pg_cron`: eliminación y anonimización de nóminas y RUTs de trabajadores a los 7 días de cerrado el mes de facturación.
  - Minimización de datos y reforzamiento de políticas RLS en Postgres.
  - Bitácora de accesos y auditoría de eventos de datos personales.
- Verificación de seguridad OWASP ASVS Nivel 2 y auditoría Lighthouse PWA.
**Cierre:** verificación completa del KPI-08 (100% de controles de protección de datos verificados y 0 nóminas vigentes tras 7 días del cierre).

## Sprint 6 — Marcha blanca, verificación de KPIs y defensa final · 1 – 12 dic
Operación real, estabilidad y cierre del proyecto.
- Marcha blanca en producción: operación en paralelo en Pensión Señora Miriam (Paposo).
- Medición y validación de los 8 KPI SMART del proyecto:
  - KPI-01: Conciliación automática de consumos B2B (meta ≥ 98%).
  - KPI-02: Integridad ante desconexión (0 registros perdidos, 0 duplicados).
  - KPI-03: Tiempo de registro diario (< 2 minutos por jornada).
  - KPI-04: Tasa de adopción efectiva en el sistema (meta ≥ 85%).
  - KPI-05: Reducción de horas de auditoría manual (reducción ≥ 75%, ≤ 1 hora/mes).
  - KPI-06: Oportunidad de proyección de margen (< 24 h tras compra).
  - KPI-07: Sincronización offline en reconexión (≥ 95% en ≤ 5 minutos).
  - KPI-08: Cumplimiento de protección de datos Ley 21.719 (100% controles, 0 fugas).
- Monitoreo de los 4 SLAs (SLA-01 Disponibilidad, SLA-02 RTO/RPO, SLA-03 Sincronización, SLA-04 Tasa de Error).
- Capacitación presencial de la Sra. Miriam y entrega de manuales en lenguaje de baja alfabetización digital.
- Cierre del informe final de titulación y defensa del proyecto (12/12/2026).

---

## Cobertura Total del Backlog

**100% de las 30 Historias de Usuario (HU-01 a HU-30) quedan implementadas y calendarizadas en los 6 Sprints:**

| Sprint | Enfoque Principal | HUs Asignadas | Total HU |
|--------|-------------------|---------------|----------|
| Sprint 1 | Habitaciones y Ciclo de Vida | HU-01, 05, 06, 07, 08, 09, 10, 27, 28 | 9 HU |
| Sprint 2 | Empresas y Ledger de Consumos | HU-02, 11, 12, 13, 14, 15 | 6 HU |
| Sprint 3 | Conciliación, Cierre Mensual y Reportes | HU-03, 04, 16, 17, 18, 19, 20, 29 | 8 HU |
| Sprint 4 | Costos, Margen PMP y Modo Administrativo | HU-22, 23, 24, 25, 26, 30 | 6 HU |
| Sprint 5 | Ley 21.719 (Purga), Auditoría y Supervisor | HU-21 + Controles Ley 21.719 | 1 HU |
| Sprint 6 | Marcha Blanca, 8 KPIs SMART y Defensa | Monitoreo 8 KPIs, SLAs y Cierre | Validación |
| **Total** | **Proyecto Completo** | **HU-01 a HU-30** | **30 HU (100%)** |

**Ninguna HU queda descartada:**
- **HU-21** (WhatsApp a supervisores) se incorpora en el **Sprint 5**.
- **HU-26** (Recomendación ante margen bajo) se incorpora en el **Sprint 4**.
- La reunión 3 con la Administradora mantiene su checkpoint intermedio de 23 HU completas (~75% de avance funcional).
