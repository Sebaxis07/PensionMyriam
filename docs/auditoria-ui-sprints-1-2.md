# Auditoría y mejoras visuales — Sprints 1 y 2

Fecha de trabajo: 25 de octubre de 2026, America/Santiago.
Rama: `design/sprints-1-2-ui-ux`.
Base aislada: `8bd04a5ec610b90e3b87d3eed6fb5e42d0fa433b`.

## A. Referencia visual y alcance

La referencia con especificaciones concretas es [styles.css del kit digital](../Guiaestilos/PENSION_SEÑORA_MYRIAM_KIT_DIGITAL/03_PROTOTIPO_WEB-/PROTOTIPO_PAGINA_WEB/styles.css), leído completo. Se inspeccionaron los demás materiales de `Guiaestilos/`, el prototipo y [los tokens Tailwind](../app/tailwind.config.js). El PDF del kit es una guía de entrega del material, no un manual adicional de componentes de esta PWA.

| Token existente | Valor | Aplicación |
|---|---|---|
| `brand.sand` | `#e1dcd2` | Fondo general |
| `brand.sand-deep` | `#ebdcbe` | Fondos secundarios y selección |
| `brand.terracotta` | `#D9583B` | Identidad y acentos existentes |
| `brand.terracotta-deep` | `#731D0A` | Primarios y textos pequeños que necesitan mayor contraste |
| `brand.cactus` | `#1EAD50` | Acento de marca existente, sin reemplazar estados operativos |
| `brand.ink` | `#2a2418` | Títulos y textos; tinta con opacidad en ayudas |
| `brand.card` | `#fffaf1` | Tarjetas y formularios |
| `brand.border` | `#ddd0b3` | Bordes |
| `brand.muted` | `#7a6f5a` | Token conservado; se oscurecieron ayudas auditadas cuando el fondo lo requería |
| `estado.disponible` | `#16a34a` | Franja verde de habitación |
| `estado.ocupada` | `#eab308` | Franja amarilla de habitación |
| `estado.en_aseo` | `#dc2626` | Franja roja de habitación |
| `estado.en_mantencion` | `#6b7280` | Franja gris de habitación |

Se mantienen Georgia para títulos, DM Sans para cuerpo, los radios de 16/24 px y las sombras existentes. No se agregaron colores hexadecimales de diseño ni otra biblioteca de iconos. Las acciones principales siguen el patrón existente y los estados conservan texto e iconos además del color.

El blanco sobre terracota original tiene contraste aproximado de 3,88:1; sobre su variante oscura oficial, 11,00:1. Se utilizó esa variante en primarios y acentos pequeños auditados. Las superficies de alerta reutilizan las familias semánticas ya presentes.

Se corrigieron referencias a `brand-sand-light`, `brand-sand-dark`, `shadow-xs` y `shadow-2xs`, ausentes en la configuración actual, utilizando tokens/clases existentes. El CSS nuevo queda bajo `.ui-operativa`.

El alcance sigue el encargo explícito: HU-27/28 y HU-01..10, con los componentes de empresa/nómina necesarios para el flujo actual de HU-02. `docs/plan-sprints.md` conserva una distribución anterior diferente. Los criterios consultados fueron los de `docs/historia_v2/historias_usuario.csv`, archivo sin seguimiento disponible en la carpeta original al hacer la auditoría; no se modificó ni se trasladó al worktree. HU-02 y HU-06 siguen pendientes de validación formal según el encargo.

### Matriz del diagnóstico inicial

| Pantalla/componente | HU | Estado visual inicial | Problema concreto | Mejora propuesta aplicada |
|---|---|---|---|---|
| Indicador de conexión | 27, 28 | Diseño existente que necesita mejoras | Online/Offline, letra pequeña, envío animado sin conexión | Español, estados diferenciados, mensajes y foco accesibles |
| Modal de conexión | 27, 28 | Diseño existente que necesita mejoras | Jerga, cierre sin nombre, altura no limitada | Explicación de guardado local, diálogo desplazable |
| Tarjetas de habitaciones | 05, 08 | Diseño existente que necesita mejoras | A 390 px se partían números y estados; franjas fuera del token operativo | Una columna estrecha y franjas oficiales |
| Reserva, avisos y confirmación | 01, 03 | Inconsistente con los tokens existentes | Fondos inexistentes, etiquetas sin asociar, selección con div | Tokens reales, controles nativos y ayudas legibles |
| Calendario y detalle | 04 | Diseño existente que necesita mejoras | Celdas solo accionables con puntero; navegación desbordaba a 320 px | Botones accesibles y navegación que puede envolver |
| Empresas y alta | 02, componente de apoyo | Diseño existente que necesita mejoras | Filtros pequeños, campos sin asociación, modal sin foco contenido | Controles táctiles, etiquetas y foco conservado |
| Contrato | 02 | Diseño existente que necesita mejoras | B2B/Headcount, ayudas pequeñas, pasos poco explícitos | Lenguaje cotidiano y pasos del flujo existente |
| Nómina y asignación | 02/06, componentes compartidos | Diseño existente que necesita mejoras | Fondos inexistentes, acciones pequeñas, controles sin nombre | Estilos coherentes y modal accesible |
| Ingreso y salida | 06, 07 | Diseño existente que necesita mejoras | Falta de texto de guardado y manejo de foco | Estados de presentación, Escape y retorno del foco |
| Aseo diario, filtros y confirmación | 08, 09 | Diseño existente que necesita mejoras | Filtros con div, mensajes sin anuncio accesible, controles secundarios pequeños | Botones, avisos accesibles y modal común |
| Mantención y liberación | 10 | Diseño existente que necesita mejoras | Campo sin asociación y diálogo sin límite de altura | Etiqueta, tamaños táctiles y desplazamiento |
| Cabecera y navegación compartidas | Transversal | Diseño existente que necesita mejoras | Escritorio demasiado apretado a 768 px, siete accesos comprimidos | Presentación móvil hasta 1024 px y navegación desplazable |

Las tarjetas, tipografías, iconos y jerarquía de base se conservaron: los cambios responden a problemas observados, sin reconstruir la identidad.

## B. Inventario final y verificación

Todas las verificaciones siguientes usan componentes reales con adaptadores y datos ficticios, en el servidor exclusivo de revisión. No prueban autorización de usuarios ni sincronización con el servidor.

| Pantalla | HU | Cambio realizado | Verificación visual/automatizada |
|---|---|---|---|
| Habitaciones | 05, 08 | Cuadrícula adaptada, números/estados legibles, colores oficiales | Capturas a 320, 390, 768, 1024 y 1280 px |
| Reserva | 01 | Fechas/campos asociados, selección por teclado, estado de carga | Cinco anchos, selección, guardado, error y flujo con navegador sin red |
| Confirmación de reserva | 03 | Jerarquía y ayudas legibles, presentación coherente | Confirmación real del componente con escritura simulada |
| Calendario y detalle | 04 | Celdas como botones, foco y acciones conservadas | Cinco anchos; matriz conserva desplazamiento horizontal interno |
| Empresas y alta | 02, apoyo | Búsqueda con nombre accesible y formulario/modal consistentes | Cinco anchos, formulario y retorno del foco |
| Contrato | 02 | Pasos existentes visibles, explicación de facturación completa | Cinco anchos, etiquetas, carga y éxito |
| Nómina y asignación | 02/06, apoyo | Tamaños, contraste y diálogo de camas | Cinco anchos y apertura/cierre del selector |
| Ingreso | 06 | Acción en español y texto de guardado | Cinco anchos y foco del diálogo |
| Salida | 07 | Acción clara y texto de guardado | Cinco anchos; no se cambiaron transiciones |
| Aseo diario y posterior a salida | 08, 09 | Filtros nativos, controles amplios y mensajes accesibles | Cinco anchos, vacío, confirmación masiva y éxito |
| Mantención | 10 | Campo asociado, guardado visible y diálogo común | Cinco anchos, formulario con motivo y liberación visible |
| Conexión y sincronización | 27, 28 | Sin red / pendientes / enviando / al día / error comunicado por SDK | Cinco anchos del modal, cinco estados y pruebas de componente |

`Dialogo.tsx` limita el foco, admite Escape, respeta el autoFocus de formularios, devuelve el foco al control de origen y permite desplazar contenido largo. Los controles secundarios tienen al menos 44 px de altura y los primarios mantienen 48–52 px. Los campos usan 16 px. Se respeta la preferencia de movimiento reducido.

Los estados de error de PowerSync se leen únicamente para presentación. No se modificaron consultas de cola, conectores, subidas, reintentos, resolución de rechazos ni HU-42. La sección de operaciones rechazadas del modal conserva su contenido y acciones originales.

## C. Antes y después

- Habitaciones: dos columnas estrechas partían `#1` y «Disponible»; ahora hay una columna bajo 480 px y crecimiento progresivo para pantallas mayores.
- Tablet: la cabecera de escritorio comprimía palabras y controles; ahora usa el patrón móvil hasta 1024 px y la cabecera de escritorio puede distribuir sus grupos en varias filas.
- Calendario: «Hoy» desbordaba la página a 320 px; ahora envuelve dentro de la tarjeta. La tabla mensual mantiene su propio desplazamiento horizontal.
- Formularios: ayudas de 10–11 px y etiquetas sueltas pasan a tamaños legibles, nombres accesibles y asociaciones `label`/`id`.
- Conectividad: un teléfono sin red y con pendientes ya no simula un envío. El comienzo de envío se refleja aunque no cambie el número de pendientes. Los errores comunicados por el SDK no exponen detalles técnicos ni muestran «Sincronizado».
- Modales: se evita contenido inaccesible por altura y se conserva el foco al abrir/cerrar.

Las capturas «antes» se obtuvieron cargando las fuentes del commit base desde Git en un segundo servidor, con los mismos datos ficticios; no se revirtieron archivos.

| Evidencia | Antes | Después |
|---|---|---|
| Habitaciones, 390 px | [Antes](C:/Users/Sebaxis/.codex/visualizations/2026/10/25/01a17564-4529-7271-b0e0-0b458ff4f894/capturas/habitaciones-antes-390.png) | [Después](C:/Users/Sebaxis/.codex/visualizations/2026/10/25/01a17564-4529-7271-b0e0-0b458ff4f894/capturas/habitaciones-portada-390.png) |
| Reserva, 390 px | [Antes](C:/Users/Sebaxis/.codex/visualizations/2026/10/25/01a17564-4529-7271-b0e0-0b458ff4f894/capturas/reserva-antes-390.png) | [Después](C:/Users/Sebaxis/.codex/visualizations/2026/10/25/01a17564-4529-7271-b0e0-0b458ff4f894/capturas/reserva-390.png) |
| Contrato, 390 px | [Antes](C:/Users/Sebaxis/.codex/visualizations/2026/10/25/01a17564-4529-7271-b0e0-0b458ff4f894/capturas/contrato-antes-390.png) | [Después](C:/Users/Sebaxis/.codex/visualizations/2026/10/25/01a17564-4529-7271-b0e0-0b458ff4f894/capturas/contrato-390.png) |
| Aseo, 390 px | [Antes](C:/Users/Sebaxis/.codex/visualizations/2026/10/25/01a17564-4529-7271-b0e0-0b458ff4f894/capturas/aseo-antes-390.png) | [Después](C:/Users/Sebaxis/.codex/visualizations/2026/10/25/01a17564-4529-7271-b0e0-0b458ff4f894/capturas/aseo-390.png) |
| Ingreso, 390 px | [Antes](C:/Users/Sebaxis/.codex/visualizations/2026/10/25/01a17564-4529-7271-b0e0-0b458ff4f894/capturas/ingreso-antes-390.png) | [Después](C:/Users/Sebaxis/.codex/visualizations/2026/10/25/01a17564-4529-7271-b0e0-0b458ff4f894/capturas/ingreso-390.png) |

Capturas adicionales: [formulario de mantención](C:/Users/Sebaxis/.codex/visualizations/2026/10/25/01a17564-4529-7271-b0e0-0b458ff4f894/capturas/mantencion-formulario-390.png), [alta de empresa](C:/Users/Sebaxis/.codex/visualizations/2026/10/25/01a17564-4529-7271-b0e0-0b458ff4f894/capturas/empresa-formulario-390.png), [asignación de cama](C:/Users/Sebaxis/.codex/visualizations/2026/10/25/01a17564-4529-7271-b0e0-0b458ff4f894/capturas/asignacion-cama-390.png), [confirmación de aseo](C:/Users/Sebaxis/.codex/visualizations/2026/10/25/01a17564-4529-7271-b0e0-0b458ff4f894/capturas/aseo-confirmacion-390.png) y [error de conexión](C:/Users/Sebaxis/.codex/visualizations/2026/10/25/01a17564-4529-7271-b0e0-0b458ff4f894/capturas/sync-error-sync.png).

Las imágenes se guardan como evidencias locales fuera del repositorio. Sus enlaces corresponden a este equipo; al preparar un PR se pueden adjuntar las seleccionadas sin incorporar todas las capturas al historial Git.

## D. Pendientes para Claude y decisiones funcionales

1. **HU-02:** el CSV habla de habitación al crear la reserva empresarial, mientras el flujo actual es Contrato → Nómina → Asignación. El encargo lo deja pendiente de validación. No se impuso una habitación obligatoria ni se declaró aprobado el flujo.
2. **HU-06:** el criterio empresarial requiere empresa y asignación individual de camas. `RoomSheet` ejecuta el ingreso sobre la reserva existente. Revisar la cobertura funcional con la Administradora; se conservaron sus reglas.
3. **HU-10:** el CSV dice «cualquier estado», pero `RoomSheet` ofrece marcar mantención solo desde Disponible/En aseo. Resolver la discrepancia de requisitos y validar sus efectos antes de ampliar acciones.
4. **Errores de escritura en RoomSheet:** sus manejadores no tienen recuperación con `try/catch/finally`. Un fallo puede dejar la acción deshabilitada. Corregir en una tarea funcional; no se inventó una recuperación desde presentación.
5. **Errores de reserva:** el `catch` presenta cualquier fallo como conflicto de cama. Diferenciar almacenamiento/otros errores de un solape real en una tarea funcional.
6. **Documentación de sprints:** `docs/plan-sprints.md` y el CSV no distribuyen igual las HU. Actualizar la planificación oficial cuando el equipo lo confirme; esta intervención usa la enumeración explícita del encargo.
7. **Dependencia Sprint 3/4:** cierre y costos consultan el mismo contrato versionado, tarifa y ledger. Se conservaron esos módulos y sus datos; se ejecutó una prueba de navegación a administración/costos y las pruebas unitarias completas. No se sustituyó una integración de backend por esa comprobación visual.
8. **Acceso de pruebas:** documentar el restablecimiento manual por SSH y una creación de cuenta de demo sin reiniciar datos. No se encontró un procedimiento completo de reset en la documentación revisada.
9. El build advierte un chunk principal de aproximadamente 3,95 MB. No se abordó partición de paquetes ni optimización funcional en este trabajo visual.

No se cambiaron base de datos, migraciones, RLS, PowerSync, cálculos, validaciones de negocio, exportaciones ni contratos de API. Las nuevas lecturas de estados del SDK solo alimentan textos/iconos.

## E. Pruebas y límites de verificación

| Comprobación | Resultado |
|---|---|
| `npx tsc --noEmit` | Aprobado, sin errores |
| `npx vitest run` | 30 archivos, 163 pruebas aprobadas |
| `npx playwright test --config playwright.visual.config.ts` | 79 pruebas aprobadas en Chrome local |
| `npm run build` | Aprobado; advertencia de tamaño del chunk principal |
| `git diff --check` | Sin problemas de espacios en cambios versionados |

Vitest amplía las pruebas existentes del indicador: sin red con pendientes, versión compacta en español, cambio a envío sin variar la cantidad y error del SDK sin revelar detalles técnicos. Las pruebas de persistencia SQLite y operaciones rechazadas existentes también pasaron.

Playwright cubre 12 vistas a cinco anchos (60 casos), foco/teclado, formularios, errores, carga, confirmaciones, cinco estados de conexión, apertura de los modales de empresa/cama/mantención, navegación compartida y comparación con el original. Incluye pérdida de red del navegador mediante `context.setOffline(true)` sobre el adaptador ficticio y el paso de calendario a reserva conservando habitación/fecha. Se actualizaron únicamente los selectores de los E2E originales de ingreso/salida y calendario para que sigan apuntando a las acciones accesibles; sus comprobaciones se conservaron.

**Límite:** no se ejecutaron los E2E existentes contra GoTrue/Postgres/PowerSync reales ni se validó una subida real después de reconectar. La prueba de pérdida de red verifica disponibilidad e interacción de la interfaz, no persistencia o idempotencia del servidor. No se ejecutaron pgTAP porque no se cambió ninguna regla o tabla. No se utilizaron credenciales reales ni se reiniciaron datos para tomar capturas.

Incidencias durante preparación: `npm ci` intentó compilar un módulo nativo sin Visual C++; se completó con `--ignore-scripts`. Una primera corrida de Vitest carecía de la clave requerida por una suite; la corrida completa aprobada usa una cadena ficticia exclusiva de pruebas, sin acceso a servicios. La primera prueba visual se reubicó dentro de `app/pruebas-ui/` para resolver sus dependencias sin cambiar los E2E existentes.

### Reproducir la revisión local

Desde `app/`, en una terminal:

```powershell
npx vite --config vite.revision-ui.config.ts --port 5182
```

En otra terminal, desde `app/`, para las capturas originales:

```powershell
$env:UI_ANTES='1'
npx vite --config vite.revision-ui.config.ts --port 5183
```

Abrir [la revisión de habitaciones](http://127.0.0.1:5182/pruebas-ui/?vista=habitaciones). Los adaptadores y datos ficticios solo se aplican a esta configuración, no a la entrada de producción. No se hallaron archivos ni datos de prueba en `app/dist/` tras compilar.

Desde una tercera terminal de `app/`:

```powershell
npx playwright test --config playwright.visual.config.ts
$env:VITE_SUPABASE_ANON_KEY='clave-ficticia-solo-pruebas-sin-acceso'
npx vitest run
npx tsc --noEmit
```

`UI_ANTES` debe permanecer solo en la terminal del servidor de comparación. Las capturas por defecto van a `output/revision-ui/`, excluido de Git. Para elegir otra ubicación se puede definir `CAPTURAS_UI`.

## F. Git y preparación para revisión

- Worktree: `C:/Users/Sebaxis/.codex/worktrees/sprints-1-2-ui-ux/PensionMyriam`.
- Rama: `design/sprints-1-2-ui-ux`.
- Commits locales nuevos: ninguno; los cambios quedan sin confirmar para revisión.
- Base: `8bd04a5ec610b90e3b87d3eed6fb5e42d0fa433b`, tomada después de la autorización del usuario.
- Estado: cambios de presentación, pruebas y documentación aislados. La carpeta original conserva su trabajo en curso.
- Push, merge y PR remoto: no realizados.
- La rama original avanzó después de crear el worktree con `0ff6aed`, `28d3a0d` y `ccd4276` (configuración PowerSync, paquetes y E2E de Sprint 4). No hay solape de archivos con los cambios de presentación. Antes del PR se debe actualizar/integrar la base y volver a comprobar dependencias y E2E; estos avances no se sustituyeron desde la rama de diseño.
- Preparación para PR: diff local y pruebas disponibles; confirmar los cambios y autorizar publicación cuando el equipo lo decida. Título sugerido: «Mejorar presentación móvil de reservas, habitaciones y conectividad».
- Pendientes: decisiones funcionales de D, procedimiento de cuenta y E2E reales de integración; no condicionan la revisión de este diff visual.

Archivos del cambio:

- `.gitignore`
- `app/playwright.visual.config.ts`
- `app/pruebas-ui/README.md`
- `app/pruebas-ui/datos.tsx`
- `app/pruebas-ui/index.html`
- `app/pruebas-ui/revision.tsx`
- `app/pruebas-ui/ui-sprints-1-2.visual.ts`
- `app/src/components/Dialogo.tsx`
- `app/src/components/Header.tsx`
- `app/src/components/RoomCard.tsx`
- `app/src/components/RoomSheet.tsx`
- `app/src/components/SyncStatusBadge.test.tsx`
- `app/src/components/SyncStatusBadge.tsx`
- `app/src/components/SyncStatusModal.tsx`
- `app/src/index.css`
- `app/src/screens/AseoHoy.tsx`
- `app/src/screens/Piezas.tsx`
- `app/src/screens/RackHotelero.tsx`
- `app/src/screens/Reservar.tsx`
- `app/src/screens/sprint2/ContratoScreen.tsx`
- `app/src/screens/sprint2/EmpresasScreen.tsx`
- `app/src/screens/sprint2/NominaScreen.tsx`
- `app/vite.revision-ui.config.ts`
- `docs/auditoria-ui-sprints-1-2.md`
- `e2e/offline-write-syncs.spec.ts`
- `e2e/rack-seleccion-fecha.spec.ts`

## G. Acceso legítimo a la Administradora de pruebas

La cuenta prevista en `db/seed-demo.sh` es **`admin@pension-myriam.local`**, con rol Administradora y nombre de demo María. No se muestra ninguna contraseña.

El script crea usuarios faltantes mediante el endpoint administrativo local de GoTrue y luego crea su fila en `public.usuario`. Si la usuaria ya existe, la conserva: **no restablece su contraseña**. Además reinicia habitaciones/camas/reservas/aseos de demo; por ello no se ejecutó sobre la base compartida ni se propone usarlo para recuperar acceso.

Para un entorno nuevo y expresamente desechable, el procedimiento existente exige levantar el stack de `infra/docker-compose.yml`, preparar las variables de desarrollo desde sus archivos `.env.example` y aplicar las migraciones con el procedimiento del equipo. Solo allí corresponde ejecutar `bash db/seed-demo.sh`. Después se inicia el cliente habitual desde `app/` con `npm run dev -- --port 5174` y se abre `http://localhost:5174`, usando la cuenta prevista y una contraseña de pruebas conocida por el equipo. El seed requiere Bash, Docker y su configuración local autorizada.

Para la base que ya está funcionando: ingresar con esa cuenta y la contraseña que entregue el equipo. No se buscaron contraseñas almacenadas en cuentas ni se cambió ninguna. El repositorio declara un reset manual por SSH, pero no se encontró una guía operativa completa que permita presentarlo como procedimiento oficial. Si hace falta restablecer, el equipo debe documentar y autorizar ese paso usando el mecanismo administrativo de GoTrue; no debe añadirse autorregistro, SMTP ni una modificación directa improvisada de contraseñas SQL.

Si se necesita otra cuenta ficticia sin reiniciar datos, la propuesta es extraer el patrón de creación de GoTrue + `public.usuario` del seed en un procedimiento específico, con contraseña nueva elegida por el responsable y sin la sección de reinicio. Es una propuesta pendiente, no una cuenta creada ni una acción ejecutada.

La revisión visual en el puerto 5182 puede abrirse **sin iniciar sesión** porque utiliza exclusivamente adaptadores y registros ficticios; no es acceso a una cuenta ni un reemplazo de autenticación de la aplicación real.
