# Corrección del 403 al guardar contratos

Rama local `codex/fix-contratos-sync`, basada en `codex/cancelacion-reservas` (`4edce29`). Fecha de revisión: 27/10/2026 en America/Santiago.

## Causa comprobada

El conector subía el alta de `contrato_empresa` mediante `INSERT ... ON CONFLICT (id) DO UPDATE`. Esa sentencia exige SELECT sobre las columnas usadas en la actualización, incluida `tarifa_convenida`. La tarifa está protegida en la tabla base por las migraciones 0015/0021, incluso para el JWT de Administradora; se consulta mediante una vista y los buckets autorizados. Por eso el alta devolvía 403 aunque el rol pudiera crear contratos.

## Corrección

Solo los PUT de `contrato_empresa` usan ahora `ignoreDuplicates: true` (ON CONFLICT DO NOTHING). Esto permite el alta sin ampliar privilegios y evita que un reintento sobrescriba la tarifa o el headcount de una versión existente. Los PATCH de vigencia y las demás tablas conservan su comportamiento.

Los rechazos nuevos de contratos conservan también su ID en el respaldo local. Para intentos ya rechazados, la Administradora puede abrir el indicador de sincronización y pulsar **Reintentar guardado del contrato**. Requiere conexión. Se valida el respaldo, se busca primero el contrato en el servidor y se reutiliza su ID si existe. Si la réplica retiró la fila y un rechazo antiguo no conserva el ID, se recuperan los datos respaldados y se asigna un ID nuevo únicamente si el servidor no contiene ese contrato. La restricción de vigencias sigue impidiendo duplicados concurrentes.

El aviso se marca resuelto solo después de confirmar el contrato en el servidor; se conserva el historial. Si hay conflicto o falla la conexión, permanece pendiente. No se muestran tarifas ni payloads en el aviso y la Encargada no recibe el control de reintento.

## Verificación de esta sesión

- pgTAP nuevo: cuatro pruebas pasan, reproduciendo el error del upsert anterior, validando el alta corregida y el reintento sin sobrescritura.
- Regresión pgTAP de seguridad de tarifas: ocho pruebas pasan; la Encargada sigue sin leer la tarifa.
- Playwright con backend real: dos pruebas pasan, alta mediante la función y cola productivas, y recuperación desde el panel de rechazados usando el payload real de PowerSync. Se comprueba una sola fila en PostgreSQL y ninguna respuesta POST 403.
- TypeScript, Vitest completo y build Vite/PWA pasan. Las pruebas unitarias incluyen que otros upserts no cambian, recuperación sin copia local, contrato ya existente, rechazo del servidor, ausencia de conexión y rol Encargada.
- Las pruebas reales crean y limpian únicamente empresas y contratos sintéticos propios. No se reenvió ni se borró el contrato de la usuaria automáticamente.

No hay migraciones productivas nuevas, cambios de RLS, GRANT, autenticación ni buckets. No se hizo push, PR ni merge compartido. La app local continúa en `http://127.0.0.1:5196/`; recargar antes de reintentar el aviso anterior.
