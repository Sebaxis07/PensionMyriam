# 00 — Auditoría para capacitación: qué existe realmente hoy

**Fecha de la auditoría:** 28/10/2026.
**Repositorio:** `Sebaxis07/PensionMyriam`.
**Modalidad:** solo lectura. No se modificó código, no se ejecutaron migraciones ni operaciones destructivas. Se corrieron únicamente `npx tsc --noEmit` y `npx vitest run` (de solo verificación, no escriben en ninguna base) para no afirmar "esto compila" o "esto pasa" sin haberlo comprobado en esta sesión.

## A. Qué versión se auditó y por qué

`main` en GitHub **no contiene el sistema**: tiene un único "first commit" (`8f3f00d`). La línea de integración real avanza por ramas de verificación y PRs ya fusionados sobre `sprint-2`. Al momento de esta auditoría, el estado más completo y verificado **no está en ninguna rama remota**: vive en el worktree local

```
D:/programacion/PensionMyriam   (rama local feat/liberacion-cupos-contrato, commit 21734df)
```

que es el resultado de integrar, en este orden, trabajo que **no se ha publicado ni fusionado**:

| Commit | Qué aporta | Quién |
|---|---|---|
| `6fb9b44` | Integra Sprint 5 (protección de datos, cuentas, configuración) con el diseño visual de Codex de Sprints 3-4 | integración manual |
| `30f7693` … `dc67e6c` | Estilo y accesibilidad del Sprint 5 (privacidad, cuentas, configuración, catálogo de extras, recorrido guiado) | Codex |
| `15b5c64` | Evidencia y cierre de la publicación visual del Sprint 5 | Codex |
| `24a3e90`, `4edce29` | Cancelación de reservas de turista antes de la llegada | Codex |
| `0c3c1b3` | Corrección de un error 403 al guardar contratos de empresa | Codex |
| `21734df` | Reserva de camas de empresa **antes** de tener la nómina ("cupos sin nombre") | Codex |

**Recomendación para la capacitación: usar exactamente este estado** (worktree de arriba, o una rama que lo contenga íntegro). Es el único lugar donde existen a la vez: el Sprint 5 completo, el diseño visual aplicado a los Sprints 1-4, y las tres funciones nuevas de esta semana (cancelación, cupos sin nómina, corrección del 403). Cualquier otra rama (incluida `origin/sprint-2`) está **atrasada** respecto de esto.

**Verificado en esta sesión, sobre ese mismo estado:**
- `npx tsc --noEmit` → sin errores.
- `npx vitest run` → **37 archivos, 249 pruebas, todas aprobadas**.
- No se corrió la batería de Playwright ni pgTAP en esta auditoría (requieren levantar Docker Compose; no era necesario para documentar, y las tres funciones nuevas ya traen su propio informe de verificación — ver columna "Estado de pruebas" abajo, con la fuente de cada cifra).

## B. Discrepancia de alcance que sigue sin resolver

`docs/plan-sprints.md` describe un Sprint 5 de **1 historia** (HU-21 + "controles Ley 21.719") sobre un backlog de 30 HU. `docs/historia_v2/historias_usuario.csv` —la versión que los informes de Sprint 5 usaron como vigente— tiene **42 HU** y asigna HU-31 a HU-41 al Sprint 5. Esta auditoría usa el CSV, porque es contra el que se construyó y verificó el Sprint 5 real. **`plan-sprints.md` no se actualizó**; es una decisión del equipo, no mía. No se construyó ningún ejercicio de capacitación sobre una HU que solo existe en la versión desactualizada.

## C. Inventario por módulo

Columnas: **Estado de integración** usa exactamente estas categorías — *Listo para demostración* / *Listo para capacitación guiada* / *Pendiente de integración* / *Pendiente de validación de negocio* / *Pendiente de UX/UI* / *No apto todavía para uso real*. Un módulo puede tener más de una etiqueta.

| Módulo | HU | Funcionalidad real | Rol autorizado | Estado de integración | Estado de pruebas | ¿Se puede capacitar? |
|---|---|---|---|---|---|---|
| Login / sesión | RNF-02 | `Login.tsx`: correo + contraseña contra GoTrue; sesión cacheada, usable sin señal aunque el token esté vencido | Administradora, Encargada | Listo para capacitación guiada | Cubierto por los E2E de Sprint 1 (regresión verificada en Sprint 5: pasan) | Sí |
| Habitaciones (`Piezas.tsx`) | HU-05, HU-07, HU-09, HU-10, HU-27 | 8 piezas, 4 estados por color, máquina de estados (nunca libre→ocupada sin aseo), check-in, check-out, marcar mantención | Administradora, Encargada | Listo para capacitación guiada | pgTAP `06_maquina_estados_habitacion.sql`; E2E `offline-write-syncs.spec.ts` | Sí |
| Reserva de turista (`Reservar.tsx`) | HU-01 | Nombre + teléfono opcional (**sin campo de RUT, ni nacional ni extranjero** — ver §D.1), fechas con atajos, tarifa desde configuración, comprobante PDF, envío por WhatsApp | Administradora, Encargada | Listo para capacitación guiada | pgTAP `05_exclude_reserva_cama.sql` (no solape); E2E `rack-seleccion-fecha.spec.ts` | Sí, con la salvedad de §D.1 |
| Cancelación de reserva | — (extensión aprobada, fuera del CSV original) | `CancelarReservaModal`: motivo de 5-500 caracteres, libera las fechas de la cama, nunca cobra nada, bloquea si ya hubo check-in | Administradora, Encargada | **Listo para capacitación guiada** (aprobado por Sebastián el 27/10/2026, ver `docs/cancelacion-reservas.md`) | 16 pgTAP nuevas + 4 E2E reales (`docs/cancelacion-reservas.md`); no re-ejecutadas en esta auditoría | Sí |
| Calendario / Rack (`RackHotelero.tsx`) | HU-04 | Vista mensual de las 8 piezas; tocar una celda libre abre Reservar con pieza y fecha prellenadas | Administradora, Encargada | Listo para capacitación guiada | E2E `rack-seleccion-fecha.spec.ts` | Sí |
| Aseo de hoy (`AseoHoy.tsx`) | HU-10, RNF-04 | Lista de piezas que necesitan aseo diario u aseo post-salida; botón para marcar todas de una vez | Administradora, Encargada | Listo para capacitación guiada | cubierto por pgTAP de máquina de estados | Sí |
| Empresas (`EmpresasScreen.tsx`) | HU-02 | Alta de empresa (razón social + RUT opcional), lista de contratos por empresa | **Solo Administradora** (pestaña oculta a Encargada) | Listo para capacitación guiada | regresión pgTAP de seguridad de tarifa | Sí, solo para la Administradora |
| Contrato de empresa (`ContratoScreen.tsx`) | HU-02, HU-11 | Vigencia desde/hasta, trabajadores contratados (headcount), tarifa convenida por persona | **Solo Administradora** | Listo para capacitación guiada | corregido el 27/10/2026 (`docs/correccion-403-contratos.md`): el alta daba 403 por un detalle del conector; ya corregido, 4 pgTAP + 2 E2E nuevos | Sí |
| Reintentar contrato rechazado | — (parte de la corrección del 403) | Botón en el indicador de sincronización para reintentar el guardado de un contrato que quedó rechazado | **Solo Administradora** | Listo para capacitación guiada (recién corregido) | ver fila anterior | Sí, mencionar como "qué hacer si ves un contrato en rojo" |
| Nómina y Camas (`NominaScreen.tsx`) | HU-12 | Agregar trabajador a un contrato, asignar cama, dos métodos (manual y guiado) | Administradora, Encargada | Listo para capacitación guiada | pgTAP `04_exclude_contrato_vigencia.sql` | Sí |
| Camas sin nómina (`CuposEmpresaPanel.tsx`) | extensión de HU-02/HU-12 (fuera del CSV original) | Reservar camas de un contrato antes de tener los nombres; identificar la persona después; el check-in exige identificar antes | Administradora, Encargada | **Listo para capacitación guiada** (aprobado, `docs/cupos-empresa-sin-nomina.md`) | 21 pgTAP nuevas + 4 E2E reales; no re-ejecutadas en esta auditoría | Sí |
| Consumos diarios (`ConsumoScreen.tsx` / `ModuloConsumos.tsx`) | HU-13, HU-14, HU-15 | Marcar desayuno/almuerzo/cena/colación por persona o en lote; filtros Pendientes/Servidos/Todos; colaciones con precio de catálogo | Administradora, Encargada | Listo para capacitación guiada | E2E `consumo-masivo-offline.spec.ts` | Sí |
| Catálogo de extras (colaciones) | HU-41 | Dar de alta un producto extra (nombre + precio); append-only, nadie edita un precio ya usado | **Administradora y Encargada** (desde Sprint 5 ambos roles pueden) | Listo para capacitación guiada | pgTAP `17_config_negocio.sql` | Sí |
| Conciliación (`ConciliacionScreen.tsx`) | HU-16, HU-17 | Compara raciones esperadas (por contrato) vs. servidas; exige justificar con uno de 5 motivos tipificados + nombre del supervisor; **nunca** cambia el monto facturado | Administradora, Encargada | Listo para capacitación guiada | pgTAP `08_conciliacion.sql` | Sí |
| Cierre mensual y reportes (`CierreMensualModal.tsx`) | HU-18, HU-19, HU-20 | Bloquea el cierre si quedan días sin conciliar; descarga PDF/Excel **sin** cerrar; cerrar la facturación es una acción separada y explícita | **Solo Administradora** | Listo para capacitación guiada | E2E `cierre-y-reportes.spec.ts` | Sí |
| Compras e insumos (`ModuloCostos.tsx`) | HU-22, HU-23 | Registrar compra (categoría, nombre, monto, cantidad, rendimiento estimado); costo promedio ponderado automático | **Solo Administradora** (RLS le oculta el módulo a la Encargada) | Listo para capacitación guiada | pgTAP `10_pmp_insumo.sql`; E2E `registro-compra-costos.spec.ts` | Sí, solo Administradora |
| Panel ejecutivo / Modo administrativo (`DashboardAdmin.tsx`) | HU-24, HU-25, HU-26, HU-30 | Margen proyectado, tarifa mínima sugerida, recomendación en lenguaje llano; **sin PIN** (el acceso lo decide el rol, no un código) | **Solo Administradora** | Listo para demostración / guiada | E2E `dashboard-ejecutivo.spec.ts` (confirma además que a la Encargada no le aparece ni el botón) | Sí, solo Administradora |
| Resumen diario por WhatsApp | HU-21 | Texto con las raciones servidas, listo para copiar o abrir en WhatsApp; nunca incluye nombres ni RUT | Administradora, Encargada | Listo para capacitación guiada | prueba unitaria `resumenDiaTexto.test.ts` | Sí |
| Configuración del negocio (`PerfilConfigModal` → pestaña "Mi Pensión") | HU-39, HU-03 | Tarifa base, datos bancarios, correo de contacto; se replica a los dos teléfonos; la Encargada la ve pero no la edita | Lectura: ambos · Edición: **solo Administradora** | Listo para capacitación guiada | pgTAP `17_config_negocio.sql`; E2E `sprint5-configuracion-negocio.spec.ts` | Sí |
| Cuentas (`GestionCuentasTab.tsx`) | HU-35, HU-36 | Dar de alta cuentas (12 caracteres mínimo de clave), ver el listado con correo y fecha de registro | **Solo Administradora** (ni la pestaña ni los datos llegan al teléfono de la Encargada) | Listo para capacitación guiada | pgTAP `16_seguridad_cuentas.sql`; E2E `sprint5-cuentas-seguridad.spec.ts` | Sí, solo Administradora |
| Privacidad / Ley 21.719 (`PerfilConfigModal` → pestaña "Privacidad") | HU-31 a HU-34 | Buscar a una persona y entregar copia de sus datos o eliminarlos (exige motivo); la anonimización del cierre de facturación corre sola, automática | **Solo Administradora** | Listo para capacitación guiada | pgTAP `13`-`15`, `18`, `19`; E2E `sprint5-cuentas-seguridad.spec.ts` | Sí, solo Administradora |
| Recorrido guiado / ayuda (`features/tour/`) | HU-37, HU-40 | 11 pasos generales + 5 pasos del panel ejecutivo; botones "?" con explicación en lenguaje simple junto a términos técnicos | Administradora, Encargada (el del panel ejecutivo solo aplica a la Administradora) | Listo para capacitación guiada | `tour.test.ts` | Sí |
| Operación sin conexión | HU-27, HU-28, HU-42 | Guardado local inmediato, cola de envío, reintentos, aviso de "N registro(s) necesitan revisión" cuando algo se rechaza definitivamente | Administradora, Encargada | Listo para capacitación guiada | `offlinePersistencia.test.ts`, `operacionRechazadaPersistencia.test.ts`, E2E con corte real de red | Sí |

## D. Lo que no está terminado, y no se incluyó como función entregada

### D.1 — RUT de turista nacional (HU-01 / HU-31)
El criterio oficial de HU-01 dice "el RUT solo si es nacional" y HU-31 lo repite. En el código actual, `Reservar.tsx` **no tiene ningún campo de RUT** — ni para nacionales ni para extranjeros — y la tabla `reserva` no tiene esa columna. Es una minimización de datos más estricta que lo que describe el criterio, pero **el criterio tal como está escrito no está implementado**. No se incluye ningún ejercicio donde la participante "ingrese el RUT del turista nacional": ese paso no existe en el sistema. Se documenta como pendiente en `11-pendientes-y-validaciones.md`.

### D.2 — Umbrales del semáforo de margen
`features/costos/recomendarMargen.ts` usa 30 %/15 % como cortes; la leyenda visual de `DashboardAdmin.tsx` usa 35 %/20 %. Un margen de 32 % se pinta verde en una parte de la pantalla y se rotula "en observación" en otra. **No se demuestra este número como un hecho confiable** en ningún caso práctico; se advierte al instructor en el guion.

### D.3 — Plazo de gracia antes de anonimizar nóminas
Configurado en 7 días por defecto, pero el propio criterio de HU-33 lo marca como "propuesto, por validar con la Administradora". No se afirma en ningún manual que "7 días" sea una decisión cerrada.

### D.4 — Nada quedó pendiente de integración
A diferencia de otros cortes de este proyecto, en esta auditoría **no se encontró ningún módulo de los 42 HU del CSV vigente que exista solo como código sin conectar a una pantalla** (que sí ocurría en auditorías anteriores). Las tres funciones más recientes (cancelación, cupos sin nómina, corrección del 403) están efectivamente conectadas y navegables, según el código revisado.

## E. Personas y datos reales del negocio (de las actas de reunión)

- **Administradora:** María Gonzales (el sistema la llama "María" en los textos de ayuda). Participó en las reuniones del 27/08/2026 y 21/09/2026.
- **Solo existen dos celulares**, y según el acta del 21/09/2026 **solo el teléfono de la Sra. María recibe reservas**. El segundo teléfono lo usa, según el día, su madre (hace las compras) o quien haga el aseo (su cuñada o su sobrina). **Para la capacitación, "la Encargada" es un rol, no necesariamente una sola persona fija** — conviene aclararlo así con la Sra. María antes de empezar.
- **Rechazó expresamente un abono con retención por cancelación tardía**: "en un pueblo chico como Paposo no se trabaja con abonos de hotel, y si alguien cancela, no se cobra nada". Esto es la razón de negocio detrás de que `cancelarReserva.ts` no tenga ningún campo de monto ni penalización — no es una limitación técnica, es una decisión de la clienta. **Debe explicarse así en el caso de cancelación**, no como "el sistema todavía no cobra penalizaciones".
- **Ganancia estimada:** $3.000.000–$4.000.000 líquidos al mes por 30 personas con pensión completa (~50 % de margen neto). Es la cifra que calibra el semáforo de margen (ver D.2 sobre la inconsistencia de los umbrales).
- **Retención de datos:** ella misma propuso que, una vez retirada la empresa y emitida la factura, no le interesa conservar las nóminas — de ahí sale la anonimización automática de HU-33.
- **Sin firma digital**: la nómina física firmada sigue siendo el respaldo legal. Esto se repite en el manual como un punto de tranquilidad: el sistema no reemplaza ese papel, lo acompaña.
- Tiene **aprensión reconocida sobre el salto tecnológico** desde el cuaderno físico. Esto es la base de los principios pedagógicos de `01-plan-general.md`.

## F. Qué puede capacitarse hoy, en una frase

Con el worktree de la sección A, **las 42 historias de usuario del CSV vigente, más las tres extensiones de esta semana, están integradas, navegables y con pruebas automatizadas que pasaron en algún momento documentado**. Las únicas reservas son las de la sección D: un campo que el criterio pide y no existe (D.1), una cifra con dos valores distintos en pantalla (D.2), y dos decisiones de negocio que el propio proyecto marca como pendientes de validar con la clienta (D.3 y el detalle del plazo de retención). Ninguna de las tres impide capacitar; solo exigen que el instructor no afirme más de lo que el sistema realmente hace.
