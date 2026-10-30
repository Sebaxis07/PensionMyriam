# Mejoras operativas a partir de evidencia real (conciliación, tarifas, compras)

Fecha: 29-30/10/2026. Fuentes analizadas (carpeta local `ev/`, fuera del repositorio): la lista de precios enviada por la Administradora, una factura electrónica real de alimentación+alojamiento, una boleta real de compra de combustible, y la ficha de control de alimentación con firma del trabajador. Estos archivos contienen datos personales y comerciales reales (nombres, RUT, patente, montos) y **no se incluyen en el repositorio, no se referencian por nombre de archivo ni se citan textualmente en comentarios de código**; este documento resume su estructura, no su contenido literal.

## A. Auditoría — qué existía antes y qué faltaba

| Área | Estado antes de esta tarea | Evidencia que lo confirma |
|---|---|---|
| Conciliación por tipo de servicio (prioridad máxima del encargo) | **Ya implementada y correcta.** `recalcular_conciliacion()` (migración 0009) concilia por `(contrato, fecha, tipo)` — el "esperado" es siempre el headcount contratado, nunca el conteo real; no bloquea el cierre; la justificación no cambia lo facturado. Cubre exactamente el ejemplo obligatorio de la tarea (30 contratados / 15 servidos). | `db/pgtap/08_conciliacion.sql` (17 aserciones) |
| Habitaciones/camas: ¿cantidad fija en el código? | **No.** El esquema (`habitacion`, `cama`) nunca asume un número fijo; no hay validación de negocio que exija 8. | Revisión de `db/migrations/0001_init.sql` y de triggers de máquina de estados |
| Habitaciones/camas: copys de UI | **Hardcodeaban "8 habitaciones"** en 4 lugares (navegación, recorrido guiado, comentario de layout, fallback de métricas), pese a que el esquema ya era flexible. | `Header.tsx`, `tourConfig.ts`, `Piezas.tsx`, `useDashboardAdminMetricas.ts` (antes de esta tarea) |
| Compras de insumos | Registraba categoría, monto total, cantidad, rendimiento — sin proveedor, medio de pago, N° de comprobante ni desglose de IVA. | `db/migrations/0001_init.sql` (tabla `compra_insumo` original) |
| Tarifas | `contrato_empresa.tarifa_convenida` (versionado, por contrato) y `config_negocio.tarifa_base_noche` (un solo valor, sin historial) — sin un catálogo general versionado de tarifas base (desayuno/almuerzo/cena/cama) con vigencia. | `0001_init.sql`, `0018_cierre_facturacion_y_config.sql` |
| Prefacturación (desglose alimentación/alojamiento por separado, como en la factura real) | Ya existe un cierre mensual con PDF/Excel, pero no se auditó en profundidad su desglose contra el formato real de la factura — **no se tocó en esta tarea** (ver sección "Qué queda pendiente"). | `app/src/features/cierre/`, `app/src/features/reportes/` |
| Control de alimentación con evidencia de entrega / firma | No existe una distinción explícita en el modelo entre "registrado por la Encargada" y "confirmado por el trabajador" — el libro de consumos ya registra quién y cuándo, pero no un campo de confirmación del trabajador. **No se tocó en esta tarea.** | — |

## B. Mejoras implementadas

1. **`compra_insumo` — detalle real del comprobante** (migración `0024_compra_insumo_detalle.sql`): columnas opcionales `proveedor`, `descripcion`, `medio_pago` (enum: efectivo/transferencia/tarjeta_debito/tarjeta_credito/otro), `referencia_comprobante`, `monto_neto`, `monto_iva`, `observaciones`. El costeo PMP sigue usando `monto_total` exclusivamente (nunca se tocó esa fórmula). Un check constraint exige que `monto_neto + monto_iva ≈ monto_total` (tolerancia $1) **solo cuando ambos vienen informados** — nunca es obligatorio.
   - **Hallazgo importante durante las pruebas**: la boleta real de combustible NO cuadra con un desglose neto+IVA simple (Subtotal neto $14.144 + IVA $2.687 ≠ Total $15.000), porque el diésel en Chile lleva además el Impuesto Específico a los Combustibles. Por eso el formulario y la documentación advierten explícitamente no forzar ese desglose en comprobantes de combustible.
   - UI: `RegistrarCompraModal.tsx` agrega una sección plegable "Datos del comprobante (opcional)" para no alargar el formulario en el caso común (feria, abarrotes sin boleta detallada).

2. **`tarifa_general` — catálogo de tarifas versionado** (migración `0025_tarifa_general.sql`): tabla append-only (nunca UPDATE/DELETE de una fila ya creada, igual que el ledger de consumos) con `tipo`, `monto`, `iva_aplicable`, `vigencia_desde/hasta`, protegida contra vigencias solapadas del mismo tipo (`exclude using gist`, mismo patrón que `contrato_empresa`). RLS: todos leen, solo Administradora agrega versiones nuevas. **No reemplaza** `contrato_empresa.tarifa_convenida` ni `config_negocio.tarifa_base_noche` — es un catálogo nuevo y separado, para no alterar cálculos existentes ni contratos ya firmados.
   - Carga de referencia (`db/seed-tarifas-referencia.sh`, NO dentro de la migración — ver nota técnica abajo): tarifa general ($15.000 turista, $4.500/$7.000/$7.000 desayuno-almuerzo-cena, $15.000+IVA cena especial) y tarifa empresa (cama $13.000, desayuno $4.500). **A propósito no se cargó** almuerzo/cena de empresa: `ev/precios.txt` no los especifica y no deben inventarse — queda documentado como pendiente de confirmar con la Administradora.
   - Nota técnica: la primera versión de la migración intentaba auto-cargar estos datos dentro de sí misma, condicionado a que ya existiera una Administradora — pero una migración corre antes de que exista cualquier usuario, así que ese seed nunca se habría ejecutado en un despliegue real. Se corrigió moviéndolo a un script separado que corre después de crear las usuarias (mismo patrón que `db/seed-demo.sh`).

3. **Habitaciones: eliminación de "8" hardcodeado en copys de UI** (`Header.tsx`, `tourConfig.ts`, `Piezas.tsx`, `useDashboardAdminMetricas.ts`). El esquema ya era flexible; esto solo corrige textos que afirmaban un número que podía ser falso (la operación real documentada es de 9 habitaciones dobles + 3 individuales = 12, no 8).

## C. Datos y seguridad

- Ningún dato personal ni comprobante real de `ev/` se commiteó: ni los archivos originales, ni sus montos/nombres/RUT citados textualmente en código, tests o documentación. Los ejemplos de prueba usan datos ficticios o, cuando reproducen un cálculo real (ej. litros/precio del diésel), omiten identidad del proveedor/cliente.
- RLS de `tarifa_general`: mismo patrón ya validado por el equipo para `config_negocio` (todos leen, solo Administradora escribe) — no se inventó un modelo de permisos nuevo.
- `compra_insumo` mantiene su RLS existente (solo Administradora); las columnas nuevas no cambian quién puede leer/escribir la tabla.
- No se tocaron migraciones existentes, RLS existentes ni la configuración de PowerSync más allá de registrar las columnas nuevas en `schema.ts` del cliente (el bucket ya replica `SELECT *` de ambas tablas, así que no hizo falta tocar `infra/powersync/config.yaml`).

## D. Pruebas

| Comando | Resultado |
|---|---|
| `npm run typecheck` | 0 errores |
| `npm run build` | compiló correctamente (PWA generada) |
| `npm run test` | **253/253 tests pasaron** (38 archivos), incluidos los 13 de `src/features/costos/` (9 preexistentes + 4 nuevos de `registrarCompraInsumo.test.ts`) y sin regresiones en reservas, cancelación, check-in/out, aseo, usuarios, sync |
| pgTAP (`db/pgtap/23_compra_insumo_detalle.sql`, `24_tarifa_general.sql`) | **Escritos pero NO ejecutados** — Docker no está disponible en esta sesión/máquina (mismo bloqueo documentado en la integración anterior). Quedan pendientes de correr con `bash db/dev-run.sh` antes de dar la migración por verificada en base de datos real. |
| Playwright E2E (18 escenarios del encargo) | **No ejecutados.** Requieren el stack completo (`docker-compose` + `npm run dev`), igual que pgTAP. No se escribieron specs E2E nuevos en esta tarea — las funcionalidades nuevas (compras con comprobante, tarifa_general) son extensiones aditivas de módulos ya cubiertos por los E2E existentes (`registro-compra-costos.spec.ts`), pero ese spec no se amplió para los campos nuevos. |

No se eliminó ni se reemplazó ninguna prueba existente. No se declaran como aprobadas las pruebas pgTAP/E2E que no se pudieron ejecutar.

## E. Documentación actualizada

- `CLAUDE.md`: modelo de datos (tarifa_general, compra_insumo ampliada, nota sobre habitaciones flexibles).
- Este documento (`docs/auditoria/mejoras-operativas.md`).
- Comentarios extensos en las migraciones 0024/0025 explicando el porqué de cada decisión (igual que el resto del repo).

No se modificaron `docs/Historia_de_usuarios_v2.md` ni ningún informe académico (ES1/ES2). Las HU afectadas (HU-22/23 compras, EP-01/EP-04 tarifas, EP-02 habitaciones) se amplían, no se reescriben: sus criterios de aceptación originales siguen cumpliéndose tal cual.

## F. Qué queda pendiente (fuera del alcance de esta tarea)

Dado el tamaño del encargo original (10 áreas funcionales, 18 escenarios E2E, overhaul de UI de alimentación con firma, reestructuración de prefacturación), esta sesión priorizó lo que tenía evidencia real más concreta y menor riesgo de romper el sistema existente. Quedan explícitamente **sin implementar**:

- Overhaul del módulo de consumos con distinción visual Registrado/Confirmado/Pendiente/Justificado y exportación con espacio de firma (sección 3 del encargo).
- Pantalla de administración para crear/deshabilitar habitaciones desde la UI (el esquema ya lo permite; falta la pantalla).
- Actualización de `db/seed-demo.sh` a 9 dobles + 3 individuales: evaluado y descartado por ahora porque el script tiene referencias a números de pieza específicos más abajo (reservas/check-ins de demo) que no se pudieron verificar sin Docker — cambiarlo a ciegas era el riesgo que la tarea pidió evitar.
- Reestructuración de la prefacturación para replicar exactamente el desglose de la factura real (alimentación/alojamiento como líneas separadas con IVA).
- Los 18 escenarios E2E y los pgTAP nuevos quedan escritos pero sin ejecutar (ver sección D).
- Auditoría UX completa de las secciones 10-11 del encargo.

## G. Estado final

Lo entregado (compras con comprobante, catálogo de tarifas versionado, limpieza de hardcodes de habitaciones) está verificado por typecheck, build y 253 tests unitarios sin regresiones, pero **no por pgTAP ni E2E reales** (bloqueo de Docker). Antes de fusionar o dar por buena esta rama en producción, el equipo debería: (1) levantar el stack y correr `db/dev-run.sh` + la suite Playwright completa; (2) revisar y aprobar (o corregir) las notas de "pendiente de confirmar con la Administradora" en la carga de `tarifa_general`; (3) decidir si quiere abordar las áreas explícitamente no tocadas en un siguiente PR.
