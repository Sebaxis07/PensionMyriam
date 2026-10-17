# Documento de Contexto de Arquitectura — Sistema de Gestión Pensión Señora Myriam

**Método:** auditoría en modo solo lectura (sin ejecutar el proyecto, sin instalar dependencias, sin correr migraciones). Toda afirmación cita archivo y, cuando aplica, línea. Donde no se encontró evidencia, se indica explícitamente `NO ENCONTRADO` o `AUSENTE`. Donde algo requeriría ejecutar la aplicación para comprobarse con certeza, se marca `NO DETERMINABLE` con la razón.

**Advertencia principal, antes de cualquier otra cosa:** el informe de título que motivó esta auditoría declara "41 historias de usuario en 10 épicas" y un "Servicio de cuentas en Node/Express (HU-35)". Ninguna de las dos afirmaciones corresponde al repositorio actual. El backlog real, documentado y confirmado en código, es **HU-01 a HU-30, en 6 épicas (EP-01 a EP-06)** (`docs/Historia_de_usuarios_v2.md:10-19`; confirmación textual en `docs/plan-sprints.md:84`: *"100% de las 30 Historias de Usuario (HU-01 a HU-30) quedan implementadas y calendarizadas en los 6 Sprints"*). Este documento usa la numeración real (HU-01 a HU-30). Ver sección 7 para el detalle de esta y otras discrepancias.

---

## 1. Panorama general

### Árbol de carpetas (comentado, 2-3 niveles, excluyendo `node_modules`, `.git`, `dist`)

```
PensionMyriam/
├── CLAUDE.md                     # Instrucciones de proyecto para el agente
├── Guiaestilos/                  # Kit digital de diseño (fuentes, salidas, prototipo web) — no es código de la app
├── app/                          # Cliente PWA (React + Vite + TS)
│   ├── src/
│   │   ├── main.tsx              # Punto de entrada
│   │   ├── App.tsx               # Enrutador raíz
│   │   ├── lib/                  # PowerSync, Supabase, esquema local, idempotencia, PDF
│   │   ├── components/           # UI compartida (RoomCard, RoomSheet, SyncStatusBadge, etc.)
│   │   ├── features/             # Lógica de negocio por dominio (consumo, costos, empresas, nomina, etc.)
│   │   └── screens/               # Pantallas (Piezas, Login, AseoHoy, RackHotelero, Reservar, sprint2/, sprint4/)
│   ├── public/, dist/             # Assets estáticos y build (dist/ es artefacto, no fuente)
│   ├── package.json, vite.config.ts, tailwind.config.js, tsconfig.json
│   └── .env / .env.example
├── db/
│   ├── migrations/                # 0001 a 0014, SQL versionado a mano
│   ├── pgtap/                     # 8 archivos de pruebas pgTAP
│   └── dev-run.sh, seed-demo*.sh, volume-test-empresa.sh
├── infra/
│   ├── docker-compose.yml         # 5 servicios (Postgres, migrate, GoTrue, PostgREST, PowerSync, Caddy)
│   ├── Caddyfile
│   ├── powersync/config.yaml      # Sync rules / buckets de PowerSync Service
│   └── .env / .env.example
├── docs/                          # Historias de usuario, plan de sprints, contrato de UI, prueba formativa
└── e2e/                           # 2 specs Playwright (no ejecutables actualmente, ver sección 6)
```

No existe carpeta `.github/` (CI ausente, ver sección 6) ni ninguna carpeta `backend/`, `accounts/`, `server/` o similar fuera de `app/`, `db/` e `infra/` — es decir, **no hay un servicio backend propio en Node/Express** en el repositorio; toda la lógica de servidor vive en PL/pgSQL (PostgreSQL) o en los servicios de terceros del `docker-compose.yml`.

### Lenguajes y gestor de paquetes
- Cliente: TypeScript/TSX, gestionado con **npm** (`app/package-lock.json` presente, formato lockfile v2/v3 de npm).
- Backend/BD: SQL (PL/pgSQL) en `db/migrations/*.sql` y `db/pgtap/*.sql`.
- Infraestructura: YAML (`infra/docker-compose.yml`, `infra/powersync/config.yaml`) y Caddyfile (DSL propio de Caddy).

### Dependencias clave (de `app/package.json:13-37`)
| Paquete | Versión declarada |
|---|---|
| react / react-dom | ^18.3.1 |
| react-router-dom | ^6.26.2 |
| zod | ^3.23.8 |
| pdfmake | ^0.3.11 |
| exceljs | ^4.4.0 |
| @powersync/web | ^1.16.2 |
| @powersync/react | ^1.4.4 |
| @supabase/supabase-js | ^2.45.4 |
| driver.js | ^1.8.0 (tour guiado) |
| @fontsource/dm-sans | ^5.3.0 |
| vite | ^5.4.3 |
| vite-plugin-pwa | ^0.20.5 |
| typescript | ^5.5.4 |
| tailwindcss | ^3.4.10 |
| vitest | ^2.0.5 |

`app/package.json:39-42` fija explícitamente `allowScripts` para `@journeyapps/wa-sqlite@1.7.2` y `esbuild@0.21.5` — confirma que `wa-sqlite` entra como dependencia transitiva de `@powersync/web`, no como paquete configurado directamente por el equipo.

**AUSENTE** en `dependencies`/`devDependencies`: `@playwright/test`, `pg`, cualquier librería de estado global (Redux, Zustand, Jotai).

### Scripts disponibles (`app/package.json:6-11`)
- `dev` → `vite`
- `build` → `tsc --noEmit && vite build`
- `typecheck` → `tsc --noEmit`
- `preview` → `vite preview`
- `test` → `vitest run`

No hay script `test:e2e`, `test:pgtap`, `lighthouse` ni `k6` en `app/package.json`. La ejecución de pgTAP está en `db/dev-run.sh:69-86` (script de shell, no un script de npm).

---

## 2. Cliente (PWA)

### Entrada y montaje
`app/src/main.tsx:15-19` monta `<App/>` con `ReactDOM.createRoot`. `app/src/App.tsx:31-44` resuelve la sesión de Supabase y decide render condicional.

### Enrutamiento
React Router define **solo dos rutas reales**: `"/"` (que internamente decide entre `Login` y `Piezas`) y `"*"` (→ `NotFound`) (`app/src/App.tsx:35-41`). Toda la navegación interna real — Piezas, Rack, Aseo, Consumo, Empresas, Costos, Reservar — ocurre por **estado de componente** (`tab`, `modo`) dentro de `Piezas.tsx:29-30, 266-525`, no por rutas de URL. Esto es una organización "SPA de pantalla única con pestañas internas", distinta de lo que sugeriría "enrutamiento con React Router" en sentido estricto — React Router está instalado y se usa, pero cubre solo el *gate* de autenticación y el 404, no la navegación de módulos.

Gates de rol son inline dentro de `Piezas.tsx` (ej. líneas 153, 187, 196, 506, 510: `usuario.rol === "administradora"`), no vía rutas protegidas de React Router.

### Organización de la UI
Por carpetas de *feature*: `app/src/features/{consumo, costos, empresas, nomina, conciliacion, reservaEmpresa, reportes, perfil, tour, usuarios, cierre}`, cada una con sus hooks (`use*.ts`) y acciones (`crear*.ts`, `registrar*.ts`). Las pantallas viven en `app/src/screens/` y `app/src/screens/{sprint2,sprint4}/` (nomenclatura por sprint, no por dominio).

### Manejo de estado
**AUSENTE** cualquier librería de estado global — no hay Redux/Zustand/Jotai/Context de app en `package.json` ni en `app/src/lib/`. El patrón es `useState` local + hooks `useQuery` de `@powersync/react` que leen reactivamente contra el SQLite local (ej. `app/src/screens/Piezas.tsx:28`). Esto es coherente con offline-first: la "fuente de verdad" de la UI es la base local, no un store en memoria.

### Service worker / manifest
`app/vite.config.ts:10-52` configura `vite-plugin-pwa`: manifest completo (nombre, colores, iconos, `display: standalone`), Workbox con `navigateFallbackDenylist` para excluir `/auth` y `/rest` del fallback de navegación, y `runtimeCaching` tipo `CacheFirst` específico para archivos `.wasm` de PowerSync. `globIgnores` excluye los `.wasm` del precache de Workbox (se cachean en runtime, no en build). `app/vite.config.ts:54-65` agrega headers `Cross-Origin-Opener-Policy`/`Cross-Origin-Embedder-Policy` (COOP/COEP), necesarios para `SharedArrayBuffer`, que requiere `wa-sqlite`. **IMPLEMENTADO** de forma completa y coherente con el stack declarado.

### Modo operativo/administrativo (HU-30)
**IMPLEMENTADO, pero sin PIN.** `app/src/screens/Piezas.tsx:30`: `const [modo, setModo] = useState<"operativo"|"admin">("operativo")`. El toggle para cambiar de modo solo es visible si `usuario.rol === "administradora"` (líneas 153-164); al activarlo renderiza `DashboardAdmin` en vez de la grilla operativa (líneas 267-280). `docs/plan-sprints.md:51` describe este modo como protegido con "PIN" — **no se encontró ningún mecanismo de PIN** en `Piezas.tsx` ni en `app/src/features/usuarios/**`; el cambio de modo depende únicamente del rol de la sesión activa, sin segundo factor.

`app/src/components/BotonExplicacion.tsx` y `app/src/features/tour/*` (con `driver.js`) son un **onboarding/tour guiado**, funcionalidad distinta del modo admin, no deben confundirse.

### Sesión en el cliente
`app/src/lib/useUsuarioActual.ts:14-29`: tras `supabase.auth.getSession()` (que resuelve `auth_uid`), un `useQuery` **local** (contra SQLite replicado, sin red) resuelve `usuario.id` interno con `select ... from usuario where auth_uid = ?`. Esto permite que la app funcione sin red una vez que la sesión ya fue cacheada — ver detalle en sección 3.

---

## 3. Offline y sincronización

### Esquema local de PowerSync
`app/src/lib/schema.ts:12-201` define **17 tablas locales**: `usuario, habitacion, cama, reserva, checkin, checkout, aseo, empresa, contrato_empresa, trabajador, consumo, producto_extra, tipo_consumo_config, conciliacion_diaria, justificacion_descuadre, insumo, compra_insumo`.

**No están en el esquema local** (y por tanto no se sincronizan al celular en absoluto): `configuracion_pension`, `bitacora_acceso_datos_personales`, `cierre_mensual` — las tres son `AUSENTE` como tabla real en toda la cadena (ver sección 4 y 7 para el detalle de cada caso).

### Sync rules / buckets (`infra/powersync/config.yaml:29-80`)
Existe **un solo bucket global `operacion`** que hace `select * from <tabla>` sobre prácticamente todas las tablas operativas (`usuario, habitacion, cama, reserva, checkin`, `checkout` con alias de PK, `aseo, empresa, contrato_empresa, trabajador, consumo, conciliacion_diaria, justificacion_descuadre, producto_extra, tipo_consumo_config, insumo, compra_insumo`), sin separación por rol ni parámetros de `request.jwt()`.

El propio archivo (`config.yaml:50-54`) y `app/src/lib/schema.ts:79-82` contienen comentarios cruzados que **prometen** un segundo bucket `empresa_tarifas`, exclusivo para la Administradora, para aislar `tarifa_convenida`. Ese bucket **no existe** en el archivo real (confirmado por búsqueda de texto: la única aparición de `empresa_tarifas` en todo el repo son esos dos comentarios). El bucket `operacion` sí incluye `select * from contrato_empresa`, es decir, **`tarifa_convenida` se sincroniza hoy a cualquier dispositivo conectado**, incluido el de la Encargada — contradice la regla de negocio de CLAUDE.md ("la Encargada no ve costos ni márgenes"). Ver discrepancia #4 en la sección 7.

### `uploadData` / conector de subida (`app/src/lib/connector.ts:31-82`)
**IMPLEMENTADO**, con clasificación explícita de errores:
- Usa `supabase.from(op.table).upsert/update/delete` con `onConflict: pk` (líneas ~37-54), es decir, las escrituras van por `supabase-js` contra PostgREST, no directo a Postgres.
- Si el error tiene `status` 4xx o `code` que empieza con `"23"`, `"42"` o `"PGRST"` → se considera **no recuperable**: se descarta la operación (solo `console.warn`, sin relanzar) (líneas ~66-70).
- Para cualquier otro error (red, 5xx) → se **relanza** (línea ~73), lo que hace que PowerSync reintente la transacción completa más tarde.
- **No hay manejo de conflictos en sentido CRDT/merge.** Un conflicto real (dos dispositivos editando la misma fila) se resuelve por "el último upsert gana" vía `onConflict`, sin detección ni resolución explícita — esto es una simplificación consciente, no un bug, pero debe declararse como tal en el informe (hoy el informe no aclara esta limitación).

### Generación de UUID e idempotencia
`app/src/lib/idempotencia.ts:8-10`: `crypto.randomUUID()` generado en el dispositivo, una vez por acción, guardado en la columna `uuid_idempotente` de la fila. La deduplicación real ocurre en Postgres vía `unique` constraints (`reserva.uuid_idempotente`, `checkin.uuid_idempotente`, `checkout.uuid_idempotente`, `aseo.uuid_idempotente`, `consumo.uuid_idempotente`, `compra_insumo.uuid_idempotente` — todas `uuid not null unique`, `db/migrations/0001_init.sql` líneas 178, 200, 208, 220, 233, 292) combinado con `ON CONFLICT DO NOTHING` en las rutas de escritura. Probado en `db/pgtap/03_idempotencia.sql` (`plan(3)`).

### VFS de wa-sqlite (OPFS vs IndexedDB) y persistencia de almacenamiento
**NO ENCONTRADO.** `app/src/lib/powersync.ts:5-8` inicializa `new PowerSyncDatabase({schema, database: {dbFilename}})` sin ningún parámetro `flags`/`storage` explícito. No hay ninguna referencia en todo `app/src` a `OPFSCoopSyncVFS`, `IDBBatchAtomicVFS`, `wa-sqlite` (fuera del `allowScripts` de `package.json`), `navigator.storage.persist()` ni `navigator.storage.persisted()`. El comportamiento real de almacenamiento depende por completo del valor por defecto interno de `@powersync/web` y **no es verificable leyendo el código del proyecto** — requeriría ejecutar la app e inspeccionar en runtime (DevTools → Application → Storage) qué VFS elige la librería.

### Indicador de "pendientes de sincronizar" (HU-29)
**IMPLEMENTADO**, en dos piezas con fidelidad distinta:
- `app/src/components/SyncStatusBadge.tsx:17-30` usa `powersync.currentStatus` + `registerListener({statusChanged})`, pero su conteo de pendientes es en realidad un **booleano** (`dataFlowStatus.uploading ? 1 : 0`) — no es un conteo real de filas pendientes.
- `app/src/components/SyncStatusModal.tsx:48-58` sí hace un conteo real: `select count(*) as n from ps_crud` (la cola interna de PowerSync), con fallback al booleano si la consulta falla.

### Autenticación sin conexión
`app/src/lib/supabase.ts:9-15` configura `persistSession: true, autoRefreshToken: true`. Comentario explícito en el propio archivo (líneas ~4-8): la sesión persistida permite seguir usando la app aunque el `access_token` haya vencido; la cola local de escrituras no depende de una sesión "fresca", solo la necesita al momento de subir. `connector.ts` (`fetchCredentials()`, líneas ~20-29) solo devuelve `null` si no hay sesión en absoluto, delegando el refresco a `supabase-js`. Esto es coherente con la regla RNF declarada en CLAUDE.md ("no bloquear la cola local por sesión expirada").

### Tests E2E de desconexión
`e2e/offline-write-syncs.spec.ts` y `e2e/consumo-masivo-offline.spec.ts` existen como código, pero ver sección 6: son stubs explícitamente marcados como no ejecutados y no ejecutables con las dependencias actuales.

---

## 4. Backend y base de datos

### `infra/docker-compose.yml` — servicios reales

| Servicio | Imagen:versión | Puertos (host) | Límite memoria | Variables de entorno (solo nombres) |
|---|---|---|---|---|
| `postgres` | `supabase/postgres:15.8.1.049` (L13) | `127.0.0.1:5432:5432` (L41) | 420m (L54) | `POSTGRES_PASSWORD`, `JWT_SECRET` (L16-17) |
| `migrate` | `supabase/postgres:15.8.1.049` (L63), one-shot | — | **sin límite declarado** | `PGPASSWORD` (L69) |
| `gotrue` | `supabase/gotrue:v2.163.0` (L89) | `127.0.0.1:9999:9999` (L128) | 100m (L132) | `GOTRUE_*` (host, port, driver, db url, site url, jwt secret, jwt aud, jwt exp, disable signup, mailer autoconfirm, external email/phone), `API_EXTERNAL_URL`, `SITE_URL` (L97-121) |
| `postgrest` | `postgrest/postgrest:v12.2.3` (L135) | `127.0.0.1:3000:3000` (L157) | 100m (L161) | `PGRST_DB_URI`, `PGRST_DB_SCHEMA`, `PGRST_DB_ANON_ROLE`, `PGRST_JWT_SECRET`, `PGRST_JWT_AUD`, `PGRST_DB_USE_LEGACY_GUCS`, `PGRST_LOG_LEVEL` (L147-155) |
| `powersync` | `journeyapps/powersync-service:latest` (L164) | `127.0.0.1:8081:8080` (L182) | 300m (L186) | `POWERSYNC_CONFIG_PATH`, `PS_JWT_SECRET`, `PS_DB_URI` (L175-180) |
| `caddy` | `caddy:2.8-alpine` (L189) | `80:80`, `443:443`, `8080:8080` (L206-215) | 50m (L219) | `SITE_DOMAIN` (L200) |

Volúmenes: `pg_data`, `caddy_data`, `caddy_config` (L221-224). Sin bloque `networks:` explícito (red *default* de Compose). Suma de límites de memoria declarados: 420+100+100+300+50 = **970 MB** sobre un droplet de 1 GiB, sin contar `migrate` (sin límite). Ver riesgo en sección 9.

`infra/.env.example` define (sin valores) `POSTGRES_PASSWORD`, `JWT_SECRET`, `SITE_URL`, `SITE_DOMAIN`.

**Servicio de cuentas en Node/Express (HU-35): AUSENTE.** No existe ningún servicio de este tipo en `docker-compose.yml` ni carpeta correspondiente en el repo. La creación de cuentas es la función PL/pgSQL `security definer` `public.crear_cuenta_usuario` (`db/migrations/0014_crear_usuario.sql:9-144`), invocada por RPC de PostgREST desde `app/src/features/usuarios/useGestionUsuarios.ts`.

### Caddyfile (`infra/Caddyfile`)
Un solo bloque de sitio `{$SITE_DOMAIN}` (L1). Rutas: `/auth/v1/*` → `gotrue:9999` (L35-41); `/rest/v1/*` → `postgrest:3000` (L43-49); `/sync/*` → `powersync:8080` (L52-58); todo lo demás → archivos estáticos (build de `app/dist`, L62-66). TLS: automático de Caddy 2 basado en `SITE_DOMAIN` (sin bloque TLS manual en el archivo) — en desarrollo, sin dominio real, no hay TLS efectivo.

### Respaldo y restauración
**AUSENTE en código.** `pg_dump`, `rclone` y cifrado `age` solo aparecen mencionados en `CLAUDE.md:19` y en `docs/Pruebaformativa_corregid2o_final - copia.md`. No existe ningún script `.sh`, job de `cron` de sistema, ni servicio en `docker-compose.yml` que ejecute un respaldo real. `db/dev-run.sh:1-88` es un runner de **desarrollo** (levanta Postgres desechable, aplica migraciones dos veces para verificar idempotencia y corre pgTAP), no un script de respaldo.

### Esquema real de la base (`db/migrations/0001_init.sql` salvo donde se indique)

Tablas creadas: `usuario` (L66-72), `habitacion` (L101-112), `cama` (L114-119), `empresa` (L124-130), `contrato_empresa` (L132-146), `trabajador` (L153-162), `reserva` (L167-188), `checkin` (L195-201), `checkout` (L204-209), `aseo` (L214-221), `consumo` (L226-240), `conciliacion_diaria` (L247-257), `justificacion_descuadre` (L259-267), `insumo` (L274-281), `compra_insumo` (L283-294), `bitacora_acceso_datos_personales` (L301-309); más adelante `producto_extra` (`0008_ledger_tipos.sql:17-22`) y `tipo_consumo_config` (`0009_conciliacion_por_tipo.sql:14-18`).

**Comparación contra las 16 tablas declaradas por el informe** (usuario, configuracion_pension, bitacora_acceso_datos_personales, habitacion, reserva, checkin, aseo, empresa, trabajador, consumo, producto_extra, conciliacion_diaria, justificacion_descuadre, cierre_mensual, insumo, compra_insumo):
- **Existen (14/16):** usuario, habitacion, reserva, checkin, aseo, empresa, trabajador, consumo, producto_extra, conciliacion_diaria, justificacion_descuadre, insumo, compra_insumo, bitacora_acceso_datos_personales.
- **AUSENTES como tabla (2/16):**
  - `configuracion_pension`: no existe en ninguna migración. En el cliente es `localStorage` por dispositivo (`app/src/features/perfil/useConfigPension.ts:23-45`, clave `pension_myriam_config_v1`) — **no sincroniza entre los dos celulares ni persiste en el servidor.**
  - `cierre_mensual`: no existe como tabla, función ni RPC que "cierre" el mes de forma inmutable. Es un cálculo derivado **en memoria**, en el cliente, sobre `contrato_empresa`/`conciliacion_diaria`/`justificacion_descuadre`/`consumo` (`app/src/features/cierre/useCierreMensual.ts:60-294`).
- **Tablas reales no declaradas por el informe:** `cama`, `checkout`, `tipo_consumo_config`.

### Valores exactos de CHECK constraints
- `estado_habitacion`: `disponible | ocupada | en_aseo | en_mantencion` (`0001_init.sql:41-42`).
- `estado_reserva`: `confirmada | cancelada | finalizada` (L44-45).
- `tipo_consumo` (tras `0008_ledger_tipos.sql:33`): `cama_noche | desayuno | almuerzo | cena | colacion`.
- `motivo_descuadre`: `turno_extra | almuerzo_mina | corte_ruta | ausencia_justificada | otro` (L55-56).

### Restricciones anti-solape
- Reservas: `reserva_no_solapa_cama`, `EXCLUDE` GIST sobre `(cama_id, daterange(...))` filtrado por `where estado = 'confirmada'` (`0003_sync_sprint1.sql:16-21`). **Sí existe.**
- Vigencias de contrato de empresa: `EXCLUDE` GIST en `contrato_empresa` (`0001_init.sql:142-145`).

### Inmutabilidad del ledger de `consumo`
- Constraint `correccion_requiere_justificacion` (`0001_init.sql:237-239`).
- Unicidad `consumo_unico_por_tipo_dia` sobre filas no corregidas (`0008_ledger_tipos.sql:84-86`).
- Triggers `consumo_sin_update` / `consumo_sin_delete` → función `app.bloquear_edicion_consumo()` con `RAISE EXCEPTION` (`0001_init.sql:316-329`). Probado en `db/pgtap/01_consumo_inmutable.sql` (`plan(4)`).

### Máquina de estados (triggers, todos en `0001_init.sql`)
`trg_checkin_ocupa` (L356-358), `trg_checkout_aseo` (L384-386), `trg_aseo_completado` (L403-405, solo libera si `tipo = 'post_checkout'`), `trg_impedir_salto_estado` (L409-421, bloquea manualmente Ocupada→Disponible sin pasar por aseo). Probado en `db/pgtap/06_maquina_estados_habitacion.sql` (`plan(11)`).

### Costeo PMP
`trg_recalcular_costo` → función `app.recalcular_costo_promedio()`, disparada **de forma síncrona en cada `INSERT`** sobre `compra_insumo` (`0001_init.sql:424-453`). **No es un job de `pg_cron`** — es un trigger transaccional.

### RLS por rol
Activo en 16 tablas (`0001_init.sql:458-473`). Patrones:
- Tablas operativas (`habitacion`, `cama`, `reserva`, `checkin`, `checkout`, `aseo`, `justificacion_descuadre`): policy `for all using (app.rol() is not null)` para ambos roles (L482-498, 539-540).
- `consumo`: policy separada de `select`/`insert`, **sin policy de update/delete** (L500-505) — reforzado por los triggers de inmutabilidad.
- `empresa` / `contrato_empresa` / `trabajador` / `conciliacion_diaria`: `select` para ambos roles, `insert`/`update` solo `app.es_administradora()` (L511-537).
- `insumo` / `compra_insumo`: exclusivos de Administradora (L544-548).
- `bitacora_acceso_datos_personales`: solo lectura Administradora (L552-553); escritura solo vía funciones `security definer`.

**Nota de diseño confirmada en el propio código** (`0005_empresas_consumo.sql:6-13`): estas RLS **no** protegen a la Encargada de recibir `tarifa_convenida` en su celular, porque PowerSync replica con un rol con `BYPASSRLS`. La única protección real sería un bucket separado en `infra/powersync/config.yaml` — que, como se documentó en la sección 3, **no se implementó** (discrepancia #4).

### pg_cron — solo 2 jobs reales (confirmado: solo 2 llamadas a `cron.schedule` en todo `db/migrations`)
1. `generar_cama_noche_nocturno`, `'0 4 * * *'` → `select public.generar_cama_noche()` (`0009_conciliacion_por_tipo.sql:177-181`).
2. `purga-datos-ley21719`, `'0 3 * * *'` → `select app.purgar_datos_personales_facturados()` (`0013_purga_ley21719.sql:161-165`).

La conciliación diaria **no** corre por `pg_cron`: `recalcular_conciliacion()` (`0009_conciliacion_por_tipo.sql:60-125`) y `conciliar_periodo()` (`0012_conciliar_periodo.sql:4-25`) son RPCs invocadas manualmente desde el cliente (`app/src/features/conciliacion/useConciliacion.ts`).

### Bug confirmado — Ley 21.719
`app.atender_derecho_supresion_trabajador()` llama a `v_usuario_id := app.usuario_id();` (`0013_purga_ley21719.sql:121`). **La función `app.usuario_id()` no se define en ninguna migración** (confirmado con `grep -rn "usuario_id" db/migrations/` — no aparece ningún `create function app.usuario_id`). Esta ruta fallaría en tiempo de ejecución con `function app.usuario_id() does not exist`.

### Servicio de cuentas — endpoints
No aplica: no existe el servicio. Ver arriba.

### Scripts de respaldo/restauración
AUSENTE, ver arriba.

### pgTAP (`db/pgtap/`, 8 archivos, 53 aserciones totales vía `plan()`)
1. `01_consumo_inmutable.sql` — `plan(4)`: ledger inmutable (RNF-03).
2. `02_rls_insumo_compra.sql` — `plan(4)`: RLS de `insumo`/`compra_insumo` solo Administradora.
3. `03_idempotencia.sql` — `plan(3)`: UNIQUE + `ON CONFLICT DO NOTHING` (RNF-06).
4. `04_exclude_contrato_vigencia.sql` — `plan(4)`: EXCLUDE de vigencias de contrato.
5. `05_exclude_reserva_cama.sql` — `plan(4)`: EXCLUDE de reservas por cama (HU-01).
6. `06_maquina_estados_habitacion.sql` — `plan(11)`: transiciones válidas/inválidas.
7. `07_consumo_unico_y_vigente.sql` — `plan(6)`: unicidad + vista `v_consumo_vigente` (HU-13).
8. `08_conciliacion.sql` — `plan(17)`: conciliación por tipo (HU-16).

No se ejecutaron en esta auditoría (modo solo lectura); solo se verificó el `plan()` declarado, no si pasan realmente — eso es `NO DETERMINABLE` sin ejecutar `db/dev-run.sh`.

---

## 5. Estado por historia de usuario (HU-01 a HU-30)

| HU | Épica | Estado | Archivo(s) evidencia | Nota |
|---|---|---|---|---|
| HU-01 Crear reserva turista | EP-01 | IMPLEMENTADO | `app/src/screens/Reservar.tsx`; `app/src/lib/queries.ts:66` | |
| HU-02 Registrar contrato empresa | EP-01 | IMPLEMENTADO | `app/src/features/reservaEmpresa/crearContratoEmpresa.ts:4,52`; test `crearContratoEmpresa.test.ts:27` | Versionado de vigencia confirmado |
| HU-03 Voucher PDF turista | EP-01 | IMPLEMENTADO | `app/src/features/reportes/generarVoucherTuristaPdf.ts`; `compartirWhatsApp.ts:14-47` | |
| HU-04 Rack hotelero | EP-01 | IMPLEMENTADO | `app/src/screens/RackHotelero.tsx`; `app/src/screens/sprint4/MatrizRackSemanal.tsx` | |
| HU-05 Estados por color | EP-02 | IMPLEMENTADO | `app/src/components/RoomSheet.tsx:18`; `Piezas.tsx` | |
| HU-06 Check-in + categoría | EP-02 | IMPLEMENTADO (con matiz) | `RoomSheet.tsx:39-43,171` | La categoría Turista/Empresa se fija al crear la reserva, no se vuelve a preguntar en el check-in |
| HU-07 Check-out → aseo | EP-02 | IMPLEMENTADO | `RoomSheet.tsx:50-62` | |
| HU-08 Aseo diario obligatorio | EP-02 | IMPLEMENTADO | `app/src/screens/AseoHoy.tsx`; `queries.ts:5` | |
| HU-09 Aseo completado idempotente | EP-02 | IMPLEMENTADO | `RoomSheet.tsx:62`; `app/src/lib/idempotencia.ts` | |
| HU-10 Mantención con motivo | EP-02 | IMPLEMENTADO | `RoomSheet.tsx:68-80,194-196` | |
| HU-11 Alta empresa | EP-03 | IMPLEMENTADO | `app/src/features/empresas/crearEmpresa.ts:4`; `EmpresasScreen.tsx` | |
| HU-12 Cargar nómina + asignar cama | EP-03 | IMPLEMENTADO | `app/src/features/nomina/asignarTrabajador.ts:6-69`; `NominaScreen.tsx` | |
| HU-13 Consumo diario ledger inmutable | EP-03 | IMPLEMENTADO | `registrarConsumo.ts:44`; `corregirConsumo.ts:5`; test `registrarConsumo.test.ts:68` | |
| HU-14 Consumo masivo rápido | EP-03 | IMPLEMENTADO | `consumoRapido.ts:10`; test `consumoRapido.test.ts:11` | |
| HU-15 Colación/plato especial | EP-03 | IMPLEMENTADO | `crearProductoExtra.ts:4`; `useProductosExtra.ts:5`; `schema.ts:121` | |
| HU-16 Conciliación automática por tipo | EP-03 | IMPLEMENTADO | `useConciliacion.ts:21,47,66`; `ConciliacionScreen.tsx` | |
| HU-17 Justificación tipificada | EP-03 | IMPLEMENTADO | `justificarDescuadre.ts:15` | |
| HU-18 Cierre mensual | EP-03 | **PARCIAL** | `useCierreMensual.ts`; `CierreMensualModal.tsx` | Cálculo en memoria, sin tabla ni marca de inmutabilidad real (ver sección 4) |
| HU-19 Pre-factura PDF auditada | EP-03 | IMPLEMENTADO | `generarPreFacturaPdf.ts:5-30,252-267` | Incluye líneas de firma física |
| HU-20 Excel 2 hojas | EP-03 | IMPLEMENTADO | `generarPlanillaExcel.ts:52,113` ("Libro de Consumos", "Auditoría de Descuadres") | |
| HU-21 Reporte WhatsApp a supervisor | EP-03 | **AUSENTE** | — | `compartirWhatsApp.ts` solo cubre confirmación a turista (HU-03); no hay función de resumen de raciones para supervisor de faena |
| HU-22 Compra insumos PMP | EP-04 | IMPLEMENTADO | `registrarCompraInsumo.ts:18`; test `costos.test.ts:62` | |
| HU-23 Categorizar/rendimiento | EP-04 | IMPLEMENTADO | `registrarCompraInsumo.ts:18` | |
| HU-24 Margen proyectado | EP-04 | IMPLEMENTADO | `useMargenProyectado.ts`; `GraficoTacometroMargen.tsx`; test `costos.test.ts:4` | |
| HU-25 Costo diario + tarifa mínima 30% | EP-04 | IMPLEMENTADO | `useMargenProyectado.ts:139-167`; test `costos.test.ts:78` | |
| HU-26 Recomendación margen bajo | EP-04 | IMPLEMENTADO | `recomendarMargen.ts:11-30`; `useMargenProyectado.ts:152` | |
| HU-27 Operar sin conexión | EP-05 | IMPLEMENTADO (cliente); **NO DETERMINABLE** extremo a extremo | `app/src/lib/powersync.ts`, `connector.ts` | Requiere ejecutar la app con red cortada; el E2E que lo probaría está deshabilitado |
| HU-28 Sincronizar al reconectar | EP-05 | **PARCIAL** | mismo código que HU-27; `e2e/offline-write-syncs.spec.ts` (no ejecutable) | Diseñado pero sin verificación real |
| HU-29 Ver estado de sincronización | EP-05 | IMPLEMENTADO | `SyncStatusBadge.tsx:6`; `SyncStatusModal.tsx` | Badge usa un booleano, no conteo real; el modal sí cuenta `ps_crud` |
| HU-30 Doble modo operativo/admin | EP-06 | **PARCIAL** | `Piezas.tsx:30,63,266-267` | `plan-sprints.md:51` describe protección con PIN; no implementado |

No se encontró en el código ninguna funcionalidad adicional que corresponda a una HU-31 o posterior; ver sección 7, discrepancia #1.

---

## 6. Pruebas

### Vitest (cliente)
15 archivos `*.test.ts` en `app/src/**`, aproximadamente **59 bloques `it(`/`test(`** en total (conteo por archivo vía `grep -c`): `consumoDiseno` (2), `consumoRapido` (2), `crearProductoExtra` (4), `registrarConsumo` (10), `costos` (9), `ley21719` (3), `perfilConfig` (3), `generarPlanillaExcel` (1), `generarVoucherTuristaPdf` (2), `crearContratoEmpresa` (5), `compartirWhatsApp` (2), `tour` (8), `gestionUsuarios` (3), `NotFound` (1), `modalPlanAccionKpi` (4).

Cubren: reglas de negocio de consumo/ledger, PMP y margen, Ley 21.719 (anonimización), generación de PDF/Excel, contratos, enlaces de WhatsApp, tour guiado, gestión de usuarios, modal de KPI.

**AUSENTE:** ningún test de cliente para `connector.ts`, `powersync.ts`, `idempotencia.ts`, ni para la máquina de estados de habitación (`RoomSheet`/`Piezas`) — es decir, la pieza más crítica del offline-first (el conector de subida) no tiene cobertura unitaria.

### Playwright (E2E)
`e2e/offline-write-syncs.spec.ts:1-7` trae un comentario del propio autor: *"NO EJECUTADO TODAVÍA... falta: instalar `@playwright/test` en package.json, un cliente `pg`... y credenciales de un usuario de prueba seedeado"*. Confirmado: `app/package.json` no tiene `@playwright/test` ni `pg`, no hay script `test:e2e`, y no existe `playwright.config.ts` en ningún lugar del repo. `e2e/consumo-masivo-offline.spec.ts:5-7` señala además que `ConsumoScreen` "hoy solo existe como pantalla mínima sin estilo... sin navegación". Los textos de UI esperados en los specs ("Todo sincronizado", "Sin conexión") **no coinciden literalmente** con los strings reales de `SyncStatusBadge.tsx` ("Sincronizado", "Sin red · Guardado local") — evidencia adicional de que estos specs nunca corrieron contra el código actual.

**Conclusión: ambos E2E son PARCIAL/STUB** — código de diseño, sin evidencia de ejecución y actualmente no ejecutables.

### pgTAP (BD)
Ver detalle completo en sección 4. 8 archivos, 53 aserciones declaradas vía `plan()`. No se ejecutaron en esta auditoría.

### k6 (carga)
**AUSENTE.** Única mención en todo el repo (fuera de `node_modules`) está en `CLAUDE.md` y `docs/Pruebaformativa_corregid2o_final - copia.md`. Ningún script `.js`/`.ts` de carga real.

### Lighthouse (PWA)
**AUSENTE** como automatización. Mismas dos menciones documentales, ningún script ni configuración de CI que lo ejecute.

### CI (GitHub Actions)
**AUSENTE.** No existe carpeta `.github` en la raíz del repositorio.

### Conclusión de pruebas de desconexión/conflictos/carga
No existe ninguna prueba de desconexión que se haya ejecutado realmente (los E2E son stubs), ninguna prueba de conflictos (ni siquiera diseñada — el conector no implementa detección de conflictos, ver sección 3), y ninguna prueba de carga (k6 ausente).

---

## 7. Discrepancias (de más a menos grave para una defensa)

1. **El universo de 41 HU / 10 épicas declarado por el informe no existe en el repositorio.** El backlog real y documentado es HU-01 a HU-30 en 6 épicas (`docs/Historia_de_usuarios_v2.md:10-19`, `docs/plan-sprints.md:84`). Esto afecta directamente la credibilidad de cualquier cifra de cobertura que el informe calcule sobre "41".

2. **El "Servicio de cuentas en Node/Express (HU-35)" no existe** — ni como historia de usuario, ni como servicio. La funcionalidad equivalente (crear cuentas) está implementada como función PL/pgSQL expuesta por RPC (`db/migrations/0014_crear_usuario.sql:9-144`), arquitectónicamente distinta de lo declarado.

3. **Bug de código confirmado en la ruta de Ley 21.719:** `app.usuario_id()` se invoca (`0013_purga_ley21719.sql:121`) pero nunca se define en ninguna migración — fallaría en ejecución. Esto es grave porque es justamente la ruta de cumplimiento normativo (derecho de supresión) que el informe presenta como garantía legal.

4. **Fuga de datos de margen por diseño incompleto en PowerSync.** `infra/powersync/config.yaml` y `app/src/lib/schema.ts` prometen (en comentarios) un bucket `empresa_tarifas` exclusivo para Administradora que **nunca se implementó**; el bucket único real sincroniza `tarifa_convenida` a cualquier dispositivo, violando la regla de negocio explícita de CLAUDE.md.

5. **El respaldo diario cifrado (pg_dump + rclone + age) declarado como parte de la arquitectura no tiene ninguna implementación en código** — es puramente documental.

6. **Los trabajos de `pg_cron` declarados no coinciden con la realidad:** solo existen 2 jobs (generación nocturna de `cama_noche` y purga Ley 21.719). La conciliación diaria es una RPC manual y el costeo PMP es un trigger síncrono, no jobs programados.

7. **2 de las 16 tablas declaradas no existen como tabla real:** `configuracion_pension` es `localStorage` por dispositivo (no sincroniza entre los dos celulares, contradice el caso de uso de dos usuarias con dos celulares) y `cierre_mensual` es un cálculo en memoria sin persistencia ni inmutabilidad real.

8. **No hay CI (GitHub Actions), ni k6, ni Lighthouse automatizado**, pese a estar declarados como parte del plan de pruebas. Los E2E de Playwright existen solo como código no ejecutable (faltan dependencias) y con evidencia textual de que nunca corrieron.

9. **HU-21 (reporte WhatsApp a supervisor de faena) está ausente.**

10. **HU-30 (modo administrativo) no tiene el PIN** que `docs/plan-sprints.md:51` describe como parte de su diseño.

11. **La organización de "enrutamiento con React Router" es parcialmente engañosa**: solo hay 2 rutas reales (login/404); toda la navegación de módulos es estado interno de un componente, no rutas de URL — una limitación menor para describir correctamente en el informe, no necesariamente un defecto.

12. **El VFS de almacenamiento de `wa-sqlite` (OPFS/IndexedDB) y el uso de `navigator.storage.persist()`, que el informe declara explícitamente, no tienen ninguna evidencia en el código** — dependen de un comportamiento interno de la librería no configurado ni verificado por el equipo.

13. **No hay manejo de conflictos de sincronización en sentido estricto** (CRDT o similar); es "último upsert gana" sin detección — esto puede ser aceptable para el caso de uso, pero el informe debería declararlo así en vez de implicar un manejo sofisticado de conflictos.

---

## 8. Datos para pruebas de memoria, carga y conflictos

- **Tabla `reserva`** (`db/migrations/0001_init.sql:167-188`): columnas incluyen `id` (PK, uuid), `cama_id` (FK → `cama`, not null), `empresa_id`/`contrato_empresa_id` (FK opcionales), `creado_por` (FK → `usuario`, not null), `estado` (`confirmada|cancelada|finalizada`, not null), `uuid_idempotente` (uuid, not null, unique). Restricción anti-solape: `EXCLUDE` GIST `reserva_no_solapa_cama` sobre `(cama_id, daterange(...))` filtrado por `estado = 'confirmada'` (`0003_sync_sprint1.sql:16-21`) — **sí existe** la restricción contra reservas solapadas en la misma cama/habitación.
- **Tabla `consumo`** (`0001_init.sql:226-240`, extendida en `0008_ledger_tipos.sql`): `id` (PK), `tipo_consumo` (`cama_noche|desayuno|almuerzo|cena|colacion`, not null), `producto_extra_id` (FK, solo si `colacion`), `registrado_por` (FK → `usuario`, nullable **solo** para `cama_noche`), `consumo_corregido_id` (FK autorreferencial, nullable), `uuid_idempotente` (not null, unique). `UPDATE`/`DELETE` bloqueados por trigger (`consumo_sin_update`/`consumo_sin_delete`, L316-329).
- **Tabla `trabajador`** (`0001_init.sql:153-162`): `id` (PK), `contrato_empresa_id` (FK, not null), `cama_id` (FK, asignación de cama), `nombre`, `rut` (columnas anonimizables por `pg_cron` a los 7 días post-facturación, según `0013_purga_ley21719.sql`).
- **Tabla `habitacion`** (`0001_init.sql:101-112`): `id` (PK), `estado` (`disponible|ocupada|en_aseo|en_mantencion`, not null), `motivo_mantencion` (nullable), `capacidad` (not null).
- **Tabla `usuario`** (`0001_init.sql:66-72`): `id` (PK uuid), `auth_uid` (FK lógica a GoTrue, not null, unique), `rol` (`administradora|encargada`, not null).
- **Servicio de Postgres en el compose:** `postgres` (`infra/docker-compose.yml:13`), puerto host `127.0.0.1:5432` (L41).
- **Rutas expuestas por Caddy:** `/auth/v1/*` → GoTrue (L35-41 de `infra/Caddyfile`), `/rest/v1/*` → PostgREST (L43-49), `/sync/*` → PowerSync Service (L52-58), resto → estáticos del build.
- **Obtención de un token de autenticación:** vía GoTrue, `POST /auth/v1/token?grant_type=password` (expuesto a través de Caddy en `/auth/v1/*`); en el cliente esto lo encapsula `supabase.auth` (`app/src/lib/supabase.ts`) — no hay otro mecanismo de login documentado en código.
- **Restricción contra reservas solapadas:** confirmada (ver arriba), probada en `db/pgtap/05_exclude_reserva_cama.sql` (`plan(4)`).

---

## 9. Riesgos técnicos

1. **Memoria en un servidor de 1 GiB.** Suma de límites de memoria declarados en `docker-compose.yml` (420+100+100+300+50 = 970 MB) deja prácticamente sin margen un droplet de 1 GiB, antes de contar el propio sistema operativo, el servicio `migrate` (sin límite) y el swap de 2 GB mencionado en `CLAUDE.md` pero no configurado en el compose. Evidencia: `infra/docker-compose.yml:54,132,161,186,219`.

2. **Conflictos de sincronización sin resolución real.** `connector.ts` resuelve todo con upsert "último gana"; en el escenario de dos celulares editando el mismo registro offline simultáneamente, no hay detección ni aviso al usuario — riesgo de pérdida silenciosa de una de las dos ediciones. Evidencia: ausencia de lógica de conflicto en `app/src/lib/connector.ts:31-82`.

3. **Pérdida de datos locales no verificable.** Al no estar confirmado el VFS de `wa-sqlite` (OPFS vs IndexedDB) ni el uso de `navigator.storage.persist()`, existe riesgo real de que el navegador purgue el almacenamiento local bajo presión de espacio, sin que el equipo lo haya mitigado explícitamente en código. Evidencia: ausencia total de estas referencias en `app/src/lib/powersync.ts` y el resto de `app/src`.

4. **Fuga de datos sensibles (margen/tarifas) a la Encargada**, por el bucket único de PowerSync sin la separación prometida (`empresa_tarifas`). Riesgo de negocio y de confianza con la clienta, más que solo técnico. Evidencia: `infra/powersync/config.yaml:29-80`, `0005_empresas_consumo.sql:6-13`.

5. **Función inexistente en la ruta de cumplimiento de Ley 21.719.** `app.usuario_id()` no definida — si se invoca, el derecho de supresión de datos de un trabajador fallaría en producción. Evidencia: `0013_purga_ley21719.sql:121` vs ausencia de definición en todo `db/migrations/`.

6. **Sin respaldo real implementado.** Ante cualquier falla del único Droplet, no hay mecanismo de recuperación de datos verificado en código — solo documentación. Riesgo de pérdida total de datos de producción.

7. **Deuda técnica en pruebas.** Sin CI, los specs de Playwright (offline, que es el riesgo más alto del proyecto) nunca se ejecutan automáticamente ni localmente de forma confirmada; la pieza de software más crítica (`connector.ts`) no tiene test unitario. Esto implica que cualquier regresión en la lógica de subida/reintentos no sería detectada antes de llegar a producción.

8. **Seguridad: RLS no es la barrera real para datos replicados.** El propio equipo documentó que PowerSync usa un rol `BYPASSRLS` — esto significa que cualquier futura tabla o columna sensible que se agregue sin pensar explícitamente en las sync rules quedará expuesta a todos los dispositivos por defecto, no por excepción. Es un patrón de riesgo estructural, no solo el caso puntual de `tarifa_convenida`. Evidencia: `0005_empresas_consumo.sql:6-13`.

---

*Fin del documento. Generado en modo solo lectura: no se modificó, creó ni borró ningún archivo del proyecto distinto de este mismo documento; no se ejecutaron migraciones, builds, tests ni despliegues.*
