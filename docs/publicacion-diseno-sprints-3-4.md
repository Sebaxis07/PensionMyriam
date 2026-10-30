# Publicación del diseño de Sprints 3 y 4

Esta nota actualiza el estado histórico del informe `auditoria-ui-sprints-3-4.md`. No se volvieron a diseñar pantallas ni se modificaron reglas de negocio.

## Dependencias comprobadas

- #46: fusionado en `sprint-2`.
- #47: **fusionado por el usuario**, commit `53d59b2e61b87f612ac9f4ca3fc177e1d6781689`. Al comenzar el diagnóstico de publicación seguía abierto; se actualizó la estrategia tras la confirmación del usuario y se verificó mediante GitHub y fetch.
- PR visual 1: **#48**, `design/publicacion-sprints-1-2-ui-ux` → `sprint-2`, abierto y listo para revisión, sin conflictos al comprobarlo.
- PR visual 2: `design/sprints-3-4-ui-ux` → `design/publicacion-sprints-1-2-ui-ux`, apilado y **Draft** mientras #48 no esté integrado.

La rama de este segundo diseño contiene realmente la base del primero. Se preservaron los commits originales completos, sus autores y mensajes. Los commits locales de integración solo actualizan ascendencia e incorporan la documentación/capturas del PR anterior. No se reescribió ninguna rama compartida.

Respecto de su base, el segundo PR contiene exclusivamente sus componentes visuales, estilos, pruebas y documentación. No repite las tarjetas de habitaciones, reservas, calendario ni los otros cambios exclusivos del primer PR. No modifica `src/features`, `src/lib`, `Header.tsx`, `Piezas.tsx`, migraciones, SQL, RLS, autenticación, conectores, configuración de PowerSync, permisos, generadores, API, cálculos ni el ledger. Los generadores se usan sin editar.

## Verificación repetida para esta publicación

| Comprobación | Resultado |
|---|---|
| TypeScript | Aprobado |
| Vitest | 172/172 |
| Build | Aprobado; advertencia existente de tamaño del paquete principal |
| Playwright Sprints 3/4 | 72/72 |
| Regresión visual Sprints 1/2 sobre este código | 78/78 |
| Total Playwright | 150/150 |
| Anchos | 320, 390, 768, 1024 y 1280 px |

La actualización de ascendencia no cambia los árboles de código verificados. La integración posterior de evidencia del primer PR solo agrega sus cuatro PNG y su nota de publicación. Los adaptadores visuales están aislados de producción y contienen datos ficticios. PDF y Excel se descargaron realmente usando los generadores existentes; se comprobó la estructura de dos hojas de Excel. WhatsApp se intercepta para verificar el mensaje preparado sin enviarlo.

Vitest ejecutó las regresiones existentes de SQLite local, rechazos, conectores simulados, consumos, PMP y reportes. No son prueba RLS ni sincronización de extremo a extremo. Docker no estaba disponible y no se ejecutaron regresiones contra el servidor real. La clave usada para cargar unitarias era ficticia. GitHub Actions no tiene workflows configurados; no se afirma que haya una CI aprobada.

## Selección de evidencia

| Pantalla | Antes | Después |
|---|---|---|
| Rechazos, 390 px | [Antes](evidencia-diseno-3-4/rechazos-antes-390.png) | [Después](evidencia-diseno-3-4/rechazos-390.png) |
| Dashboard, 1280 px | [Antes](evidencia-diseno-3-4/dashboard-antes-1280.png) | [Después](evidencia-diseno-3-4/dashboard-1280.png) |
| WhatsApp, 390 px | [Antes](evidencia-diseno-3-4/whatsapp-antes-390.png) | [Después](evidencia-diseno-3-4/whatsapp-despues-390.png) |

Capturas de la ejecución de publicación, con datos ficticios. La versión anterior es `0cbbea1`, que ya contiene el primer diseño. Las demás capturas responsive, conciliación, cierre y compras quedan en la evidencia temporal externa descrita en la auditoría; no se incorporaron masivamente al repositorio.

## Pendientes funcionales conservados

- `features/cierre/useCierreMensual.ts`: no hay operación/estado persistido de cierre definitivo; la UI no inventa «Cerrado».
- `features/reportes/generarPreFacturaPdf.ts`: descarga iniciada mediante función `void`; falta resultado/promesa para manejar la finalización y los errores internos asíncronos.
- `screens/sprint4/useDashboardAdminMetricas.ts`: faltan metadatos de carga/error y filtros libres de fecha; se conserva el mes actual.
- `features/costos/recomendarMargen.ts`, `useMargenProyectado.ts` y gráfico: validar con administradora referencias 15/30 frente a 20/35, supuestos de costos y margen objetivo. Se conservaron números y fórmulas.
- Medir el atraso de facturación antes de presentar un KPI real; se retiraron las cifras fijas sin medición durante el trabajo visual anterior.
- HU-42: la acción existente marca revisada la evidencia; no repara ni reenvía. La UI explica ese alcance. Una reparación guiada requeriría otra tarea funcional.
- Repetir permisos financieros, roles, subida/rechazo y conciliación contra el stack real cuando esté disponible.

## Orden de integración

#47 (ya fusionado) → **#48, diseño 1/2** → **PR de diseño 3/4**. Tras integrar #48, revisar cómo GitHub conserva su ascendencia (merge/squash) y actualizar la base del segundo PR a `sprint-2` verificando el diff. No fusionar automáticamente ni usar force push. Si el método de integración cambia el grafo, preparar una actualización segura antes de retargetear.

No se fusionó ningún PR ni se cerraron issues durante esta publicación. Las ramas originales y el worktree principal de otro integrante se preservaron.
