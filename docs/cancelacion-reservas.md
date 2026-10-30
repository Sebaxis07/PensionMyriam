# Cancelación de reservas antes de la llegada

Solicitud y plan aprobados por Sebastián el 27/10/2026. Rama `codex/cancelacion-reservas`, dependiente del diseño Sprint 5 (`15b5c64`), sin modificar sus commits ni ramas compartidas.

## Uso

En Calendario, tocar una reserva de turista pendiente de llegada y elegir **Cancelar reserva**. También está disponible en el detalle de la habitación para una reserva pendiente de hoy. Escribir un motivo de 5 a 500 caracteres y confirmar. No se cobra nada. Se conserva la reserva con estado Cancelada, motivo, responsable, fecha y UUID de cancelación.

Las fechas de esa cama quedan libres para otra reserva. No se fuerza la habitación a Disponible: si está ocupada por otra persona, en aseo o en mantención, conserva ese estado. Después del check-in corresponde registrar la salida y completar el aseo; la cancelación no lo reemplaza.

## Implementación

- Migración `0022_cancelacion_reserva.sql`: cuatro columnas de respaldo en `reserva`, coherencia de datos y motivo, autoría verificada con la sesión y respaldo que no se sobrescribe después de cancelar. Las cancelaciones antiguas sin metadatos se conservan.
- Cancelación y check-in bloquean la misma reserva en el servidor, para decidir correctamente si dos teléfonos operan a la vez. No admite check-in de una reserva cancelada ni cancelación de una reserva con check-in.
- Se mantienen RLS y permisos vigentes de `reserva`, así como las reglas de aseo y el libro de consumos. Tanto Administradora como Encargada pueden cancelar reservas de turista.
- PowerSync ya publica y replica `reserva` con `select *`; no se cambian buckets ni credenciales. Se añaden las columnas al esquema SQLite del cliente.
- Una sola escritura local guarda cancelación y respaldo; se conserva el identificador al reintentar. Las consultas de disponibilidad existentes ya excluyen reservas canceladas.
- Si el servidor rechaza una cancelación porque el huésped ingresó desde otro teléfono, se recupera el estado autorizado, se revierte la cancelación local y se conserva un registro rechazado visible. Si no se puede recuperar el estado, no se completa la cola y se reintenta.
- En la carrera inversa, un check-in rechazado por reserva cancelada no envía el cambio optimista a Ocupada y recupera el estado de habitación del servidor.

## Verificación

- pgTAP, backend local real: 16 comprobaciones nuevas pasan (motivo, autoría, ambos roles, bloqueo sin sesión, liberación de fechas, idempotencia y check-in). Datos de prueba dentro de transacción revertida.
- Regresiones pgTAP reales: 4 comprobaciones de solapamiento, 12 de estados/aseo y 5 de zona horaria pasan.
- Playwright real, sin mocks: cuatro flujos pasan, cancelación en línea (escritorio), cancelación sin conexión (390 px) y rechazo por llegada registrada en otro teléfono, y cancelación desde el detalle de habitación a 320 px. Se verifica el estado en PostgreSQL, el motivo y que otra reserva pueda usar esas fechas. La prueba offline desconecta el SDK además de emular pérdida de red, porque el worker de PowerSync no depende exclusivamente del contexto del navegador.
- Pruebas unitarias nuevas: seis del caso de uso y tres de reversión/reintento del conector. No alteran el código para simular éxito.
- TypeScript y build Vite/PWA pasan; Vitest completo: 35 archivos y 241 pruebas pasan. Persiste la advertencia anterior del tamaño del bundle; no se cambió el stack.
- Las pruebas reales crean y limpian exclusivamente habitaciones/reservas sintéticas propias; no borran ni cancelan reservas de usuarias. No corren seeds ni recrean volúmenes.
- Evidencia temporal externa: `C:/Users/Sebaxis/.codex/visualizations/2026/10/27/01a17fc3-fa9d-74a3-9b2d-b745a6193f7f/cancelacion/`. Capturas de confirmación con datos ficticios, sin credenciales.

La migración está aplicada al backend de desarrollo local. No se aplicó en producción ni se hizo push, PR o merge compartido. Para otros entornos, aplicar la migración antes de publicar este cliente. El frontend local de revisión continúa en `http://127.0.0.1:5196/`.
