# Sprint 5 — revisión UX/UI

## A. Base utilizada

Fecha de revisión: 27/10/2026. Worktree independiente: `C:/Users/Sebaxis/.codex/worktrees/sprint-5-ui-ux/PensionMyriam`.
Rama de trabajo: `design/sprint-5-ui-ux`.

Base de integración local `integration/sprint-5-base-ui`, commit `6fb9b44`: conserva los siete commits de Claude hasta `7d25bb2` y el diseño 3–4 hasta `fa44b92`. Solo fue necesario combinar imports de `CierreMensualModal.tsx`; no se sustituyó ninguna implementación.

```text
origin/sprint-2 (2af5ee9, PR #47 y #48 integrados)
├── Claude: cd392fb … 7d25bb2 ────────────┐
└── diseño 3–4: … fa44b92 (PR #49) ──────┴─ 6fb9b44 integración local
                                           └─ design/sprint-5-ui-ux
```

PR #49 está integrado en `origin/design/publicacion-sprints-1-2-ui-ux`, no en `origin/sprint-2`. Sprint 5 no tiene rama remota propia. Para un futuro PR exclusivamente visual, primero debe existir una base publicada equivalente a la integración local. No abrir contra `sprint-2` mientras falten esas dependencias.

Se revisaron los cinco worktrees previos: principal con eliminación y archivos no seguidos en docs; Claude con CSV no seguido; antiguo diseño 1–2 con cambios locales; publicación 1–2 y diseño 3–4 limpios. Todos se conservan intactos. El CSV oficial se consultó desde el principal sin copiarlo ni añadirlo a Git.

## B. Diagnóstico previo

Inspección inicial de código, contratos y estilos; la clasificación no equivale a una prueba visual aprobada.

| HU | Pantalla | Estado visual | Problema | Mejora propuesta |
|---|---|---|---|---|
| 31 | Reserva, nómina, justificación | Mejorable | Formularios existentes; evitar datos sensibles en motivos | Revisar campos y conservar contratos; ayuda breve en privacidad |
| 32 | Voucher, prefactura, WhatsApp | Mejorable | Pie legal de 7–7,5 pt; canal depende de configuración | Conservar contenido jurídico; explicar correo de contacto en configuración; revisión de comprobantes |
| 33 | Cierre mensual | Incompleta | Cierre local presentado como definitivo; plazo presentado como aprobado | Confirmación, estado local explícito y política pendiente de validar |
| 34 | Perfil / privacidad | Incompleta | Confirmación inline sin foco; jerga, errores internos y éxito borrado por nueva búsqueda | Dialogo compartido, motivo asociado, espera y resultado conservado, límite de réplicas |
| 35 | Cuentas / nueva cuenta | Mejorable | Texto pequeño; sin aviso reactivo offline | Formulario legible, política real, estados de carga y error |
| 36 | Cuentas / listado | Incompleta | Correos truncados; vacío confundido con carga | Tarjetas con cuatro datos, vacío y carga separados |
| 37 | Ayuda de conciliación | Correcta | Diseño Sprint 4 disponible | Conservar y verificar ambos estados |
| 38 | Raciones | Mejorable | Botón de 42 px, texto genérico y filtros apretados | Botones grandes con servicio nombrado, estado seleccionado y lectura móvil |
| 39 | Perfil / pensión | Incompleta | Encargada puede escribir; etiquetas sin asociación; éxito local ambiguo | Lectura por rol, carga, formulario agrupado y estado de cola |
| 40 | Recorrido y menú | Inconsistente con la guía | Colores ajenos, controles 32–34 px | Paleta oficial, controles 44 px, foco, desplazamiento y movimiento reducido |
| 41 | Catálogo de extras | Mejorable | Acceso oculto a Encargada; sin confirmación al agregar | Mostrar acceso según contrato, feedback local y errores accesibles |

## Contratos offline

Consulta local: nómina, consumos, cuentas autorizadas, configuración y catálogo. Configuración, extras y cierre escriben localmente y esperan sincronización: ningún mensaje debe confirmar recepción del servidor. Alta de cuentas y supresión requieren Internet y respuesta del servidor. La UI reutiliza el indicador existente y no cambia la cola, las consultas ni la resolución de rechazos.

## C. Mejoras implementadas

| HU | Pantalla | Problema | Solución UX/UI | Verificación |
|---|---|---|---|---|
| 31 | Privacidad y formularios existentes | Motivos sin orientación | Una sola entrada de motivo, recordatorio de evitar datos médicos; sin nuevos campos personales | Playwright HU-31, contratos y pruebas de minimización existentes |
| 32 | Voucher, prefactura y contacto | Cláusulas pequeñas y de poco contraste | Títulos 10 pt; texto 9,5 pt en voucher y 9 pt en prefactura; tinta oscura y espaciados. Canal de contacto explicado sin afirmar que está operativo | PDF real generado, render Poppler, inspección de páginas completas y pruebas de texto; contenido jurídico intacto |
| 33 | Cierre mensual | Acción directa y éxito ambiguo | Revisión previa, confirmación, cierre registrado localmente, error legible y explicación de conservación pendiente de validar | Playwright de confirmación, bloqueo por pendientes y error de escritura |
| 34 | Datos personales | Jerga, confirmación sin foco y éxito que desaparecía | Dialogo compartido, motivo 5–500, carácter irreversible, espera protegida, respuesta confirmada y advertencia de réplicas offline. Al terminar se limpian los resultados antiguos para no mostrar nombres obsoletos | Playwright de éxito, ya anonimizado, error, vacío, Escape, foco, red y carga |
| 35 | Nueva cuenta | Controles pequeños y rol inaccesible por teclado | Etiquetas, constante de largo mínimo, roles como botones nativos, bloqueo offline reactivo, entrada deshabilitada mientras crea y avisos visibles | Playwright de alta, validación mínima, teclado, carga, error y pérdida/recuperación de red |
| 36 | Cuentas | Truncado y vacío presentado como carga | Nombre y correo completos, distintivo de rol y fecha; vacío y carga diferenciados; acceso oculto a Encargada | Playwright visual y dos regresiones con backend real |
| 37 | Ayuda de conciliación | Diseño anterior ya correcto | Se conserva la interfaz Sprint 4 | Dos pruebas nuevas de navegador y siete pruebas de componente existentes, con y sin descuadres |
| 38 | Raciones del día | Acciones genéricas y filtros apretados | Reutiliza Sprint 3, nombre del servicio en acción/estado, controles 48 px, filtros que se ajustan al ancho y selección anunciada | Playwright en cinco anchos, registro local sin red, error y vacío |
| 39 | Pensión y banco | Edición desde Encargada y falta de etiquetas | Grupos contacto/tarifa y transferencia; lectura por rol; carga y escritura local explicadas; sincroniza el formulario al llegar configuración mientras no haya edición | Playwright de permisos, validación, carga, error y guardado offline |
| 40 | Ayuda y recorrido | Paleta ajena y controles 34 px | Georgia/DM Sans, arena/terracota oscura, botones 44 px, foco, scroll y preferencia de movimiento reducido. Se conservan driver.js y la secuencia | Recorrido real de driver.js en navegador, Escape, cinco anchos y medición de controles |
| 41 | Catálogo | Encargada no podía abrirlo desde Raciones | Entrada visible para ambos roles, confirmación local, errores anunciados y listado adaptable. Sin acciones de edición/eliminación | Playwright de acceso Encargada, alta, vacío y error |

El plazo de gracia se muestra como dato pendiente de validación, en lectura: el criterio HU-39 autoriza contacto, tarifa y transferencia, no aprobar una nueva política de retención desde este diseño. Se conserva el campo y el contrato funcional de Claude sin modificarlos.

## D. Evidencias

Carpeta temporal fuera del repositorio:

`C:/Users/Sebaxis/.codex/visualizations/2026/10/27/01a17fc3-fa9d-74a3-9b2d-b745a6193f7f/sprint5`

[Galería comparativa](C:/Users/Sebaxis/.codex/visualizations/2026/10/27/01a17fc3-fa9d-74a3-9b2d-b745a6193f7f/sprint5/indice.html).

- `antes/` y `despues/`: 60 capturas por versión. Pantallas raciones, privacidad, cuentas, pensión, ayuda, extras, cierre y dashboard; estados formulario de cuenta vacío, confirmación de supresión, recorrido abierto y datos bancarios.
- Anchos: 320, 390, 768, 1024 y 1280 px; alto de captura 900 px. Pruebas de flujo en 390 × 844.
- Los formularios de cuentas se capturan vacíos. No se guardan contraseñas ni tokens en las imágenes. Todos los nombres y contactos son ficticios.
- Voucher y prefactura reales de ejemplo antes/después, generados con pdfmake. Ambos documentos finales de ejemplo tienen una página LETTER. Render final revisado con Poppler; no se modificó contenido jurídico.
- Las carpetas `regresion12/` y `regresion34/` contienen evidencia de compatibilidad con pantallas previas.
- Los adaptadores viven en `app/pruebas-ui-sprint5/` y solo se activan con `vite.revision-sprint5.config.ts`. No forman parte de la entrada ni de los módulos JavaScript del build productivo.

## E. Pruebas de esta sesión

| Verificación | Resultado actual | Naturaleza y límites |
|---|---|---|
| `npx tsc --noEmit` | Pasa | Código productivo |
| `npx vitest run` | 33 archivos, 232 pruebas pasan | Clave ficticia de inicialización; mocks de servicios y pruebas SQLite local real según suite |
| `npm run build` | Pasa | Build Vite/PWA; advertencia existente de bundle principal grande (~3,97 MB sin comprimir) |
| Capturas Sprint 5 | 40 pasan | Componentes reales con datos/adaptadores ficticios; cinco anchos, cero errores de página ni overflow de documento |
| Estados Sprint 5 | 20 pasan | Formularios, supresión, driver.js real y configuración bancaria; controles visibles de al menos 44 × 44 px |
| Documentos HU-32 | 1 pasa | pdfmake real, cláusula completa, contacto configurado y plazo conservados |
| Flujos Sprint 5 | 30 pasan | Consulta/edición por rol, confirmaciones, errores, espera, vacío, teclado y emulación offline. No simulan un acuse del servidor para escrituras locales |
| Regresión Sprint 1–2 | 78 pasan | Adaptadores visuales existentes, incluye pérdida de red y guardado local |
| Regresión Sprint 3–4 | 69 pasan en suite inicial + 3 pasan al repetir casos afectados | Dos selectores se actualizaron a las etiquetas nuevas; el tercer caso requería levantar el servidor anterior en 5187. No se presenta como una ejecución única de 72 casos |
| Backend real HU-36 | 2 pasan | Postgres/GoTrue/PostgREST/PowerSync disponibles: réplica propia Encargada y directorio Administradora. Sin captura, vídeo ni trace de credenciales |
| PDFs | Render y revisión visual pasan | Un ejemplo de voucher y un ejemplo de prefactura completos; no garantiza toda nómina larga posible |
| `git diff --check` | Pasa | Sin errores de whitespace |

Comandos ejecutados desde `app/`:

`npx playwright test --config playwright.sprint5-ui.config.ts` (61 comprobaciones de capturas/estados/documentos y 30 flujos ejecutados en tandas; ver desglose).

`npx playwright test --config playwright.regresion-base.config.ts`

`npx playwright test --config playwright.sprints34.config.ts` y repetición dirigida de los tres casos indicados.

`npx playwright test --config playwright.sprint5-real.config.ts` (en Windows se definió NODE_PATH apuntando a app/node_modules para resolver imports desde e2e).

Incidencias resueltas durante la verificación: siete suites inicialmente no arrancaban sin variable de clave; al usar una clave ficticia aparecieron cinco inicializaciones SSR de SQLite en pruebas puras. Se añadieron mocks de PowerSync solo a esos cinco archivos de pruebas, conservando sus aserciones y la lógica productiva. La ejecución final de Vitest termina sin rechazos no manejados.

No se ejecutaron las pruebas reales que cambian roles, suprimen titulares, detienen PowerSync o reemplazan configuración compartida; las operaciones de escritura del nuevo diseño se verificaron con adaptadores. No se recrearon volúmenes, no se corrieron seeds ni se reiniciaron servicios. La suite de lectura reutilizada tiene un afterAll que intenta limpiar exclusivamente una cuenta de prueba de nombre aleatorio no creada en esa ejecución.

Accesibilidad verificada: etiquetas, foco inicial y recuperación, Escape seguro, operación de roles con teclado, selección anunciada, estados role=status/alert, contraste reforzado y preferencia de movimiento reducido. No equivale a una auditoría WCAG completa, prueba de lector de pantalla o validación presencial en teléfono físico.

## F. Seguridad

El diff de diseño parte de `6fb9b44`: no modifica migraciones, esquema, RLS, roles, SECURITY DEFINER, autenticación, conectores, consultas PowerSync, replicación, cálculos, ledger ni reglas de supresión/retención. La única modificación de configuración del recorrido es respetar movimiento reducido; motor y pasos permanecen.

La ocultación de controles por rol es presentación: los permisos definitivos siguen en el servidor. No se añadieron consultas para completar información no autorizada. Los textos de error filtran detalles técnicos usando el componente previo. Las escrituras siguen por los mismos hooks/funciones.

## G. Pendientes de negocio / funcionales detectados

- HU-33: `AGENTS.md` dice cierre mensual; Claude aplica fin de contrato más cierre de su período final. El plazo de gracia sigue por validar. La UI no resuelve la discrepancia.
- HU-38: el contrato de lectura devuelve estado del servicio seleccionado, no un resumen de todos los servicios contratados por persona. No se inventan consultas ni indicadores de contratación.
- HU-32: los generadores tienen valores por defecto de contacto. La UI no puede verificar que esos canales estén operativos; requiere confirmación del negocio.
- Semáforo de margen: el handoff informa discrepancia entre umbrales y leyenda del Sprint 4. Fuera del alcance de este diseño.
- No existe acuse por operación en los contratos de configuración/cierre. Se muestra escritura local y se remite al indicador global; no se inventa confirmación del servidor.


### Problemas visuales

No quedan defectos bloqueantes detectados en las pantallas y tamaños probados. Falta validación con las usuarias y dispositivos físicos. El formulario y las pestañas son desplazables dentro del modal.

### Defectos funcionales para Claude

- La cláusula de la prefactura todavía describe anonimización tras el cierre mensual, mientras el servidor espera fin de contrato y cierre final. Se conservó el texto jurídico por prohibición expresa de editarlo; requiere revisión conjunta de negocio y Claude.
- El voucher existente dice que se puede abonar previamente, en contradicción con la regla de negocio «SIN abono». No se cambió ese contenido funcional.
- El parámetro de conservación continúa disponible en el contrato de Claude, pero no se ofrece como política aprobada en la interfaz.
- El resumen por persona de todos los servicios contratados no está disponible en el contrato de Raciones; no se inventó esa información.

### Dependencias de integración

Publicar primero una base que reúna el Sprint 5 funcional y el diseño de Sprints 3–4. Mantener los siete commits de Claude fuera del diff atribuido al diseño.

## H. Git

Commits locales de implementación:

- `30f7693`: privacidad, configuración y cierre local.
- `01edef1`: raciones y acceso al catálogo.
- `dfbdb9c`: cuentas y estados de conexión.
- `746ed82`: ayuda y accesibilidad del recorrido.
- `ce0b867`: tipografía de privacidad en comprobantes.
- `ef195b8`: áreas táctiles de controles secundarios.
- `dc67e6c`: pruebas de interfaz y aislamiento de pruebas puras.

Archivos de producto: `PerfilConfigModal.tsx`, `GestionCuentasTab.tsx`, `CierreMensualModal.tsx`, `ConsumoScreen.tsx`, `CatalogoExtrasModal.tsx`, nuevo `useConexionInterfaz.ts`, `TourMenuModal.tsx`, `TourWelcomeModal.tsx`, `driverTheme.css`, `useTour.ts` y los dos generadores PDF (solo estilos/espaciado). Además: pruebas aisladas, configuración de revisión, cinco mocks unitarios, dos selectores de regresión y este informe.

Rama recomendada para futuro PR: `design/sprint-5-ui-ux`. Base local de referencia: `integration/sprint-5-base-ui` / `6fb9b44`. No usar `sprint-2` como base mientras no reúna las dependencias. Estado final verificado con `git status --short`: árbol limpio en el worktree de diseño. No se hizo push, no se creó PR, no se fusionaron ramas compartidas ni se cerraron Issues. Los otros worktrees y cambios ajenos se conservan.
