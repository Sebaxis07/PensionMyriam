# Revisión UX/UI de Sprints 3 y 4

Fecha: 26 de octubre de 2026. Trabajo local de presentación; pendiente de revisión visual del usuario.

## Base comprobada antes de implementar

- PR #46: **MERGED**, commit de integración `361455a3bed163a9302aea68c97aeba21f1d0686`, en `sprint-2`.
- PR #47: **OPEN**, base `sprint-2`, cabeza `verify/sprint-4-cierre-costos-dashboard`, `651c6a12341f6dae8dd1e4665fc6e2110b306558`. Se volvió a consultar al terminar la implementación: misma cabeza. Publicado no significa integrado.
- Sprint 3 (`2ad852c`) es ancestro de esa cabeza. `main` no contenía las funcionalidades necesarias.
- No había PR de diseño de Sprints 1 y 2. Sus cambios locales se conservaron mediante una integración controlada sobre la cabeza de #47, confirmada como `0cbbea165c8d96ae2dbcfbfeea8d1a98e881f735`. La rama original y su trabajo sin confirmar no se modificaron.
- Worktree separado: `C:\Users\Sebaxis\.codex\worktrees\sprints-3-4-ui-ux\PensionMyriam`.
- El worktree principal de otro integrante, `D:\programacion\PensionMyriam`, se consultó sin editarlo. No se encontró un proceso llamado `claude`; eso no descarta una sesión dentro de un editor. Sus cambios existentes se preservaron.
- Criterios oficiales consultados en `D:\programacion\PensionMyriam\docs\historia_v2\historias_usuario.csv`, ausente del nuevo checkout. No se copió ni modificó el archivo.

## A. Guía de estilos

Se utilizó `Guiaestilos/PENSION_SEÑORA_MYRIAM_KIT_DIGITAL/03_PROTOTIPO_WEB-/PROTOTIPO_PAGINA_WEB/styles.css` y se contrastó con `app/tailwind.config.js`.

Se respetaron sand `#e1dcd2`, sand-deep `#ebdcbe`, terracotta `#D9583B`, terracotta-deep `#731D0A`, cactus `#1EAD50`, ink `#2a2418`, card `#fffaf1`, border `#ddd0b3` y muted `#7a6f5a`. Georgia en títulos y DM Sans en texto. Los colores de habitación y los estados semánticos existentes se conservaron.

Se priorizó terracota oscura para botones y textos por contraste. Se sustituyeron clases inexistentes `sand-light`/`sand-dark` y `shadow-xs` por tokens existentes. No se agregaron bibliotecas, dependencias ni iconos externos.

Reutilización: `Dialogo`, `Header` y sus restricciones por rol, `BotonExplicacion`, iconos existentes y el indicador de sincronización anterior. Se incorporaron `AvisoInterfaz` y `RegistroRechazado` como componentes exclusivamente visuales. `ui-operativa` unifica foco, controles táctiles de al menos 44 px, campos de 16 px y desplazamiento de tablas. Las casillas mantienen su control nativo y un área de etiqueta pulsable.

Excepciones: tablas y rack semanal conservan desplazamiento horizontal dentro de su propio contenedor para no comprimir celdas. El PDF conserva su diseño independiente original; se verificó su legibilidad, sin editar el generador ni su contenido administrativo.

## B. Diagnóstico inicial y cambios por historia

El diagnóstico inicial se comunicó antes de las modificaciones. Se mantuvo lo que ya funcionaba visualmente.

| Pantalla | Clasificación inicial | Problema | Mejora y componentes |
|---|---|---|---|
| Empresas, contratos y nómina | Correctas / mejorables | Base visual previa correcta; envolventes y navegación con tamaños dispares | Preservar flujo y formularios; normalizar contenedores, etiquetas y acciones |
| Comedor y registro masivo | Inconsistente | Texto pequeño, acciones y nombres comprimidos en móvil, errores por alert | Tarjetas apiladas, etiquetas, feedback en pantalla, Dialogo |
| Conciliación y justificación | Mejorable | Diferencia entre contrato y consumos poco explicada | Texto cotidiano por servicio, estados y formulario accesible |
| Sincronización y rechazos | Sin diseño adecuado para HU-42 | Códigos internos y poca explicación; cola vacía podía aparentar sincronización total | Tarjetas de rechazo, revisión persistente existente y prioridad en indicador |
| Cierre y exportaciones | Incompleta | Feedback escaso; estado definitivo no disponible en el modelo | Resumen legible, pendientes, carga y mensajes precisos de descarga |
| Resumen WhatsApp | Incompleta | Sin vista previa ni confirmación suficiente | Texto preparado, copiar, apertura y errores separados |
| Compras e insumos | Inconsistente con la guía | Tokens inexistentes, letra pequeña, campos sin asociación suficiente | Formulario táctil, categorías con texto, historial y avisos |
| Rentabilidad y resumen ejecutivo | Mejorable / incompleta | Jerarquía densa; cifras fijas sin medición y referencias económicas ambiguas | Distribución responsive, ayudas y referencias por validar; sin inventar filtros |

| Historia | Pantalla | Problema detectado | Cambio realizado | Verificación |
|---|---|---|---|---|
| HU-11 | Empresas y contratos | Envolvente y acciones desiguales | Unificación de módulo, sin alterar contratos | Cinco anchos y regresión de formulario |
| HU-12 | Nómina y camas | Flujo ya mejorado en Sprints 1/2 | Se conserva Contrato → Nómina → Asignación de cama | Regresión de nómina, contrato y asignación |
| HU-13 | Consumo individual y corrección | Mensajes, nombres y motivo poco claros | Persona visible, error anunciado y explicación del registro original inmutable | Registro individual; motivo obligatorio; Escape tras retirar subformulario |
| HU-14 | Consumo masivo | Barra y selección incómodas en móvil | Selección etiquetada y acción en flujo normal | Selección y registro en lote con adaptador aislado |
| HU-15 | Colaciones y extras | Campos y diálogo inconsistentes | Etiquetas y selección de producto / monto / persona | Apertura de opciones y formulario de extras |
| HU-16 | Conciliación diaria | Cantidades difíciles de interpretar | «La empresa contrató… Se registraron…» y recordatorio de tarifa completa | Datos ficticios 30 contratados / 15 registrados; cinco anchos |
| HU-17 | Justificación | Motivo, supervisor y confirmación poco accesibles | Dialogo con etiquetas, foco, error y estado justificado | Guardado visual con el motivo existente `almuerzo_mina` |
| HU-18 | Resumen mensual | Podía confundirse generación con cierre guardado | Días pendientes, revisión, carga y «Listo para preparar los reportes» | Estados pendiente, vacío, error y carga; no se simula «Cerrado» |
| HU-19 | Prefactura PDF | Feedback y explicación escasos | Acción visible y aviso de solicitud de descarga | Archivo real descargado; PDF renderizado e inspeccionado |
| HU-20 | Planilla Excel | Descarga sin contexto suficiente | Periodo y explicación, estado y feedback | Archivo real leído con ExcelJS: dos hojas con filas |
| HU-21 | Resumen diario | Falta de vista previa y distinción de envío | Texto solo lectura, copiar y abrir WhatsApp con mensajes precisos | Portapapeles real; URL conserva texto; apertura interceptada sin enviar; error de copia |
| HU-22 | Registro de compras | Formulario comprimido y confirmación débil | Etiquetas, categorías legibles y compra guardada localmente | Guardado, error y botón deshabilitado mientras guarda |
| HU-23 | Insumos y promedio | Historial y unidades poco legibles | Catálogo, búsqueda, cantidades y precios con mayor legibilidad | Cinco anchos; pruebas PMP originales sin cambios |
| HU-24 | Margen proyectado | Explicaciones de ganancia demasiado definitivas | Se presenta como estimación basada en registros | Panel con margen normal y bajo; fórmulas intactas |
| HU-25 | Semáforo | Referencias sin validación explícita | Referencias económicas identificadas como por validar | Ayuda con teclado; geometría y números originales |
| HU-26 | Tarifa sugerida | Podía prometer ganancia líquida definitiva | Referencia del 30% por validar y explicación de estimación | Datos ficticios y revisión visual; cálculo intacto |
| HU-29 | Estado de registros | Cola vacía no contempla rechazo pendiente | Mismo indicador; lectura de rechazos prioriza atención y evita afirmar sincronización | 15 pruebas del indicador, incluido error de consulta |
| HU-30 | Dashboard | Densidad, indicadores fijos y navegación de ayudas | Jerarquía responsive, «Sin medición», periodo actual explícito y ayudas comunes | Cinco anchos; navegación y ausencia de información financiera para Encargada |
| HU-42 | Operaciones rechazadas | SQL y detalle interno, acción ambigua | Identificación segura, fecha, causa comprensible y «Ya revisé este registro» con explicación | Seis unitarias; revisión/error visual; no se expone importe ni JSON |

HU-02 y HU-06 conservan sus decisiones pendientes. No se reordenó su flujo ni se cambió autorización alguna.

## C. Evidencia visual

Resoluciones comprobadas: **320, 390, 768, 1024 y 1280 px**, altura de referencia 844 px. No se detectó desbordamiento horizontal del documento en las diez vistas principales. Los modales permiten alcanzar su última acción y las tablas desplazan dentro de su contenedor.

Carpeta de evidencia externa al repositorio:

`C:\Users\Sebaxis\.codex\visualizations\2026\10\25\01a17564-4529-7271-b0e0-0b458ff4f894\capturas-sprints34`

Convención reproducible:

| Pantalla | Antes móvil / escritorio | Después móvil / escritorio |
|---|---|---|
| Consumos | `consumos-antes-390.png`, `consumos-antes-1280.png` | `consumos-390.png`, `consumos-1280.png` |
| Conciliación | `conciliacion-antes-390.png`, `conciliacion-antes-1280.png` | `conciliacion-390.png`, `conciliacion-1280.png` |
| Rechazos | `rechazos-antes-390.png`, `rechazos-antes-1280.png` | `rechazos-390.png`, `rechazos-1280.png` |
| Cierre mensual | `cierre-antes-390.png`, `cierre-antes-1280.png` | `cierre-390.png`, `cierre-1280.png` |
| Compras e insumos | `costos-antes-390.png`, `costos-antes-1280.png` | `costos-390.png`, `costos-1280.png` |
| Dashboard | `dashboard-antes-390.png`, `dashboard-antes-1280.png` | `dashboard-390.png`, `dashboard-1280.png` |
| WhatsApp | `whatsapp-antes-390.png`, `whatsapp-antes-1280.png` | `whatsapp-despues-390.png`, `whatsapp-despues-1280.png` |

La captura `rechazo-detalle-390.png` muestra la explicación y acción de una tarjeta completa. Además hay capturas de los diez módulos a cada ancho, justificación, plan de margen y estados del cierre. La comparación anterior usa el commit `0cbbea1`: misma base funcional y mejoras previas de Sprints 1/2, antes de este trabajo.

Revisión interactiva local: [Galería comparativa](http://127.0.0.1:5186/pruebas-ui-sprints34/galeria.html). Requiere ambos servidores de revisión. Desde Consumos se puede abrir el resumen de WhatsApp. La galería permite elegir pantalla, ancho y escenario; todo usa información ficticia.

Exportaciones conservadas en la carpeta de evidencia: `prefactura-ejemplo.pdf`, `prefactura-render-1.png`, `planilla-ejemplo.xlsx`, `hojas-exportadas.json`. PDF de una página, tablas y firmas legibles. Excel: **Libro de Consumos** (5 filas) y **Auditoría de Descuadres** (5 filas).

Pendientes visuales condicionados por lógica: no existe estado persistido «Cerrado»; no hay metadatos de carga/error ni filtros arbitrarios de fecha en el hook del dashboard; se conserva el periodo actual. No se fabricaron esos estados ni controles.

## D. Pruebas y alcance

- TypeScript: `npx tsc --noEmit`, aprobado.
- Vitest: **172/172**, 31 archivos aprobados.
- Playwright Sprints 3/4: **72/72**, aprobadas.
- Playwright regresión Sprints 1/2 sobre este worktree: **78/78**, aprobadas. Total Playwright: **150/150**.
- `npm run build`: aprobado; advertencia de tamaño del paquete principal existente (~3,96 MB sin comprimir). No se cambiaron configuración ni dependencias para ocultarla.
- `git diff --check`: aprobado.

Las nueve pruebas existentes de persistencia local de PowerSync/SQLite (cola, reapertura y rechazos) se ejecutaron realmente dentro de Vitest. También pasaron las pruebas existentes del conector, PMP, reportes y reglas de consumo. Esto no sustituye una prueba de sincronización de extremo a extremo.

Docker no tenía su daemon disponible. No se ejecutaron regresiones con servidor PostgreSQL/PowerSync/Supabase real ni una auditoría RLS. No se iniciaron servicios que pudieran modificar datos del equipo. La comprobación de rol con Playwright usa el árbol real de navegación y revisa DOM, pero sesión y datos son ficticios: prueba presentación, no seguridad del servidor.

Los adaptadores solo están referenciados desde `vite.revision-sprints34.config.ts` y las páginas de pruebas. La configuración productiva, los imports productivos de PowerSync y los hooks originales no se sustituyen en el build. La descarga usa los generadores reales sin editar, alimentados con datos ficticios. WhatsApp se intercepta en la prueba para verificar el texto sin enviar mensajes.

La primera ejecución de Vitest sin variables falló al importar el conector porque `VITE_SUPABASE_ANON_KEY` estaba vacía. Se repitió con `clave-ficticia-solo-unitarias` y pasaron todas. No se modificó autenticación ni se utilizaron credenciales reales. Durante iteración se corrigieron fixtures incompletos y una falla real de Escape tras retirar un subformulario; las pruebas se conservaron.

### Reproducción

Desde `app`, en dos terminales independientes:

```powershell
npx vite --config vite.revision-sprints34.config.ts --port 5186
```

```powershell
$env:UI_ANTES='1'
npx vite --config vite.revision-sprints34.config.ts --port 5187
```

En otra terminal, sin `UI_ANTES`:

```powershell
$env:VITE_SUPABASE_ANON_KEY='clave-ficticia-solo-unitarias'
npx tsc --noEmit
npx vitest run
npm run build
npx playwright test --config playwright.sprints34.config.ts
npx playwright test --config playwright.regresion-base.config.ts
```

Opcional: `CAPTURAS_UI34` permite elegir una carpeta externa. La regresión anterior omite exclusivamente la antigua prueba de capturas que apuntaba a otro checkout/puerto; sus 78 pruebas de comportamiento y responsive se ejecutan sobre este código. La nueva suite produce las comparaciones correctas.

## E. Git y dependencias

Rama: `design/sprints-3-4-ui-ux`. Worktree indicado arriba. Sin push, merge, PR ni cierre de issues.

El commit `0cbbea1` es una dependencia visual de Sprints 1/2, no un cambio de negocio. Los siguientes commits separan componentes compartidos/sincronización, Sprint 3, cierre/reportes, costos/dashboard y pruebas/documentación. Commits locales de implementación:

+ `0cbbea1`: base visual preservada de Sprints 1 y 2.
+ `b20cf5a`: rechazos, estados de sincronización y componentes compartidos.
+ `6e73534`: consumos y conciliación.
+ `c0155bc`: resumen mensual y exportaciones.
+ `75de4d9`: compras, costos y dashboard.
+ Commit final `test(ui): verificar sprints 3 y 4 y documentar revisión local`: suites, galería, informe y normalización de finales de línea del dashboard. Su identificador corresponde a HEAD de esta entrega.

Estado de entrega: trabajo confirmado localmente y árbol limpio, comprobado después del commit final. Consultar `git log --oneline 651c6a1..HEAD`.

Archivos de implementación modificados en esta etapa: `src/index.css`; componentes `Dialogo`, `BotonExplicacion`, `CatalogoExtrasModal`, `SyncStatusBadge` y su prueba, `SyncStatusModal`; nuevos `MensajeInterfaz`, `RegistroRechazado` y su prueba; pantallas `ConsumoScreen`, `ConciliacionScreen`, `CierreMensualModal`, `ModuloConsumos`, `ModuloEmpresas`; pantallas Sprint 4 `DashboardAdmin`, `GraficoComparativaRaciones`, `GraficoTacometroMargen`, `MatrizRackSemanal`, `ModuloCostos`, `RegistrarCompraModal`, `InsumosHistorialModal`, `ModalPlanAccionKpi`. Se agregaron los dos configs de Playwright, config Vite de revisión, carpeta `pruebas-ui-sprints34`, este informe y exclusión de evidencia temporal en `.gitignore`.

Comparado con `0cbbea1`, no hay cambios en `app/src/features`, `app/src/lib`, `infra`, migraciones, SQL, RLS, permisos, autenticación, API, generadores ni ledger. `Piezas.tsx` y `Header.tsx` tampoco cambian en esta etapa: se conserva el control de autorización financiera original. No cambia `package.json` ni el lockfile.

Dependencia para un futuro PR: #47 sigue abierto. Si se compara ahora contra `sprint-2`, aparecerán también sus funcionalidades. Al autorizar publicación conviene elegir una base que realmente contenga #47 y el diseño previo; revisar el diff antes de crear un PR. No asumir que el diseño 1/2 esté integrado por existir esta copia local.

## F. Pendientes para Claude

| Archivo / área | Comportamiento observado y reproducción | Seguimiento funcional |
|---|---|---|
| `features/cierre/useCierreMensual.ts` | Abrir un mes conciliado: solo expone `estaCerrable`, totales y pendientes. Descargar reportes no crea un cierre persistido | Definir operación y estado auditable de cierre si el criterio HU-18 exige distinguir «Cerrado» |
| `features/reportes/generarPreFacturaPdf.ts` y `CierreMensualModal.tsx` | La función PDF devuelve `void` y dispara `.download`; el `await` de la pantalla no espera finalización interna | Exponer promesa/resultado si se requiere capturar errores asíncronos. El aviso actual confirma solicitud, no archivo guardado |
| `screens/sprint4/useDashboardAdminMetricas.ts` | El panel solo trabaja con el mes actual; no expone metadatos de carga/error ni acepta un filtro libre | Si HU-30 exige esos estados/filtros, ampliar contrato del hook con validación de negocio |
| `features/costos/recomendarMargen.ts`, `GraficoTacometroMargen.tsx`, `DashboardAdmin.tsx` | El semáforo funcional usa referencias 15/30, mientras el gráfico/textos históricos usan 20/35 | Validar con administradora y unificar después; no se alteró ningún umbral ni fórmula en esta tarea |
| `features/costos/useMargenProyectado.ts` | Sin historial suficiente utiliza supuestos de costo diario, piso y tarifa turista; la sugerencia divide por 0,7 | Validar supuestos y distinguir medición frente a estimación antes de uso contable; interfaz ya los llama referencia |
| Indicador de atraso y plan de acción | La base presentaba 0 días y 93% de ahorro fijos, sin medición en hooks | Se retiraron esas afirmaciones visuales. Implementar medición si debe existir ese KPI |
| HU-42 / `features/sync/operacionesRechazadas.ts` | La acción existente marca revisada la evidencia, no corrige ni reenvía la operación | Se conserva su lógica y se explica el alcance. Si se desea un flujo de reparación/enlace automático, definirlo aparte |
| HU-42 identificación | Reservas muestran huésped cuando existe; consumos muestran tipo; tablas genéricas solo su nombre seguro | Si se exige identificación humana más precisa, proveer un resumen seguro por entidad; evitar volcar JSON financiero a Encargada |
| HU-02 / HU-06 y umbrales | Decisiones pendientes según criterios y documentación | Validar con administradora; no se resolvieron por decisión de diseño |
| Seguridad e integración | UI de Encargada comprobada con datos ficticios; servidor no disponible | Ejecutar RLS, roles reales, subida/rechazo, conciliación y cierre con el stack autorizado antes de publicar una versión operativa |

Ninguna de estas observaciones se envió como mensaje externo ni se arregló mediante cambios de reglas de negocio.

## G. Preparación para publicación

El trabajo está preparado para revisión visual local y puede convertirse en un PR de diseño independiente cuando el usuario lo autorice, eligiendo la base que contenga sus dependencias. Eso no certifica funcionalidades pendientes ni seguridad de extremo a extremo.

No se publicó nada. Antes de una entrega operativa siguen siendo necesarias la revisión de la administradora y las regresiones de integración que requieren el stack real.
