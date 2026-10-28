# Camas de empresa sin nómina

Extensión aprobada de HU-02/HU-12. Rama local `codex/cupos-empresa-sin-nomina`, base `0c3c1b3`. Sin publicación remota.

En Empresas → Nómina y Camas, la administradora o encargada puede reservar camas durante toda la vigencia del contrato antes de recibir los nombres. La pantalla distingue contratados, identificados y camas reservadas. Los cupos pendientes no crean trabajadores ni consumos.

Cada cupo es una reserva real con número, cama, contrato y UUID idempotente. La identificación vincula una persona real nueva o existente a esa misma reserva. El check-in exige identificar antes. El headcount y la facturación del contrato no cambian.

La migración `0023_cupos_empresa.sql` está aplicada en el backend local. Los RPC autenticados validan autoría, vigencia, cupo máximo y disponibilidad; los lotes son atómicos y los reintentos no duplican reservas. La restricción común de solapamiento protege tanto reservas turísticas como empresariales. Cerrar una versión del contrato ajusta el fin de sus cupos activos.

Sin conexión se conserva la operación local y se informa que el bloqueo global depende de sincronizar. Si otro teléfono ocupa una cama o identifica el mismo cupo, el servidor resuelve el conflicto; el cliente restaura el estado confirmado y conserva el rechazo visible. No se inventan personas para completar cupos.

Validación: 21 comprobaciones pgTAP nuevas; 49 de regresión sobre solapamientos, habitaciones, zona horaria, permisos, cancelación y alta de contratos; cuatro escenarios Playwright contra backend real (persona existente, reserva e identificación offline, conflicto de camas e identificación concurrente). Pruebas con datos sintéticos eliminados al terminar. Evidencia visual revisada en viewport de 390 px.

Se conservan las reglas existentes de ingreso y estado por habitación. Esta extensión no cambia el comportamiento de check-in simultáneo de varias camas dentro de una habitación.
