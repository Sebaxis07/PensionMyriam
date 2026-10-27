# Sprint 5 — entrega a Codex (UX/UI)

**Rama:** `verify/sprint-5-seguridad-cuentas-configuracion` (base: `sprint-2`)
**Alcance:** HU-31 a HU-41 (EP-07 protección de datos, EP-08 cuentas, EP-09 ayuda contextual, EP-10 configuración).
**Qué contiene esta rama:** lógica de negocio, base de datos, migraciones, RLS, reglas de sincronización, hooks y pruebas. **Ningún rediseño de pantallas.**

Donde fue indispensable para probar una historia de punta a punta se agregó interfaz **mínima y marcada con un comentario** `diseño definitivo: Codex`. Esos bloques están pensados para reemplazarse, no para conservarse.

---

## 1. Resumen por historia: qué queda para Codex

| HU | Estado funcional | Qué necesita de Codex |
|---|---|---|
| HU-31 Minimización | Completa (es una propiedad del esquema) | Nada. Solo **no agregar** campos de datos sensibles a los formularios. |
| HU-32 Cláusula de privacidad | Completa | Revisión tipográfica del pie del voucher y de la pre-factura (tamaños 7–7,5 pt). |
| HU-33 Anonimización automática | Completa (servidor) | Bloque "Cerrar facturación del mes" en `CierreMensualModal` (hoy UI mínima). |
| HU-34 Derecho de supresión | Completa | Pestaña "Ley 21.719" del modal de perfil: buscador de titulares, confirmación y campo de motivo (hoy UI mínima). |
| HU-35 Alta de cuentas | Completa | Formulario de `GestionCuentasTab`: fuerza de contraseña, estados de carga y error. |
| HU-36 Listado de cuentas | Completa | Tarjeta de cuenta: jerarquía de nombre / correo / rol / fecha (hoy se muestran los 4 datos sin trabajo visual). |
| HU-37 Modal de Conciliación | Completa | Ya tiene diseño del Sprint 4; solo revisar los dos estados (con y sin descuadres). |
| HU-38 Raciones legibles | Lógica completa | **Principalmente Codex**: letra grande, alto contraste y botones táctiles en el panel de consumos. |
| HU-39 Configuración del negocio | Completa | Modal de configuración: agrupación de campos, validación visible, bloque del plazo de borrado (hoy UI mínima). |
| HU-40 Recorrido guiado | Completa (driver.js) | Tema visual de los popovers y revisión de los textos. |
| HU-41 Productos extra | Completa | Formulario del catálogo de extras (`CatalogoExtrasModal`, ya diseñado en Sprint 4): revisar que la Encargada también lo vea. |

---

## 2. Contratos de datos y hooks públicos

### 2.1 Configuración del negocio (HU-39, HU-33)

`app/src/features/perfil/useConfigPension.ts`

```ts
useConfigPension(): {
  config: ConfigPension;
  isLoading: boolean;
  actualizarConfig(nueva: ConfigPension): Promise<ConfigPension>;  // lanza si es inválida
  restaurarDefectos(): Promise<ConfigPension>;
}

interface ConfigPension {
  nombrePension: string;
  whatsappContacto: string;
  correoContacto: string;          // canal ARCO; va impreso en el comprobante
  bancoNombre: string;
  tipoCuenta: string;
  titularNombre: string;
  rutTitular: string;
  tarifaBaseNoche: number;         // entero, 1 .. 1.000.000
  diasGraciaAnonimizacion: number; // entero, 1 .. 90
}
```

**Cambio de contrato respecto del Sprint 4:** el campo `correoConfirmacion` pasó a llamarse `correoContacto`, y se agregó `diasGraciaAnonimizacion`. La fuente de verdad dejó de ser `localStorage` y es la tabla replicada `config_negocio`.

| Campo | Validación | Mensaje sugerido |
|---|---|---|
| `nombrePension` | no vacío | "Escribe el nombre de la pensión" |
| `whatsappContacto` | no vacío | "Escribe el teléfono de contacto" |
| `correoContacto` | formato correo | "Escribe un correo válido: va impreso en el comprobante" |
| `bancoNombre`, `tipoCuenta`, `titularNombre`, `rutTitular` | no vacíos | "Escribe el nombre del banco" / "…del titular de la cuenta" |
| `tarifaBaseNoche` | entero > 0 y ≤ 1.000.000 | "La tarifa por noche debe ser mayor que cero" |
| `diasGraciaAnonimizacion` | entero 1–90 | "El plazo debe ser de al menos 1 día" / "no puede superar los 90 días" |

- **Estados:** `isLoading` mientras no llegó la réplica; `actualizarConfig` es `async` y **lanza** con el primer mensaje de Zod (ya en lenguaje cercano — mostrarlo tal cual).
- **Por rol:** solo la Administradora puede guardar. La Encargada **debe ver los datos** (los necesita para emitir comprobantes) pero el formulario tiene que estar en modo lectura: si escribe, la fila se guarda local y el servidor la descarta, y ella creería haber guardado.
- **Offline:** se lee de la réplica local (funciona sin señal). Guardar sin señal es válido: entra a la cola y sube al reconectar.

### 2.2 Cuentas (HU-35, HU-36)

`app/src/features/usuarios/useGestionUsuarios.ts`

```ts
useGestionUsuarios(): {
  usuarios: UsuarioItem[];   // id, auth_uid, rol, nombre, email, created_at
  isLoading: boolean;
  guardando: boolean;
  error: string | null;
  crearUsuario(input: CrearUsuarioInput): Promise<boolean>;  // lanza con mensaje mostrable
}

export const LARGO_MINIMO_PASSWORD = 12;      // usar esta constante, no el número
export function validarDatosCuenta(input): DatosCuentaNormalizados;  // pura, reutilizable para validar al tipear
export function formatearFechaRegistro(creadoEn?: string | null): string;
```

- **HU-36 pide cuatro datos por cuenta:** nombre, **correo**, rol con distintivo visual, y **fecha de registro**. Los cuatro ya llegan; falta el trabajo visual.
- **Requiere conexión:** crear una cuenta no puede encolarse (hay que emitir la credencial). `crearUsuario` lanza "Se requiere conexión a Internet para dar de alta una nueva cuenta de acceso." — conviene deshabilitar el botón sin señal y explicar por qué.
- **La sesión de la Administradora NO se cierra** al crear una cuenta (va por RPC, no por `signUp`). No hace falta ningún aviso de "vuelve a iniciar sesión".
- **Mensajes de error del servidor** que pueden llegar y conviene mostrar tal cual: correo ya registrado, contraseña de menos de 12 caracteres, rol inválido.

### 2.3 Supresión de datos personales (HU-34)

`app/src/features/privacidad/supresionDatos.ts`

```ts
solicitarSupresionDatos({ tipoTitular: "trabajador" | "turista"; titularId: string; motivo: string })
  : Promise<ResultadoSupresion>   // { ok, ya_estaba_anonimizado, filas_afectadas, … }

registrarExportacionFichaTitular({ tipo_titular, titular_id }): Promise<boolean>
estaAnonimizado(tipo, nombre): boolean
MARCA_ANONIMIZADO: { trabajador: string; turista: string }
PLAZO_LEGAL_RESPUESTA_DIAS = 30
fechaLimiteRespuesta(fechaSolicitud: Date): Date
```

- **El motivo es obligatorio** (mínimo 5 caracteres, máximo 500): queda en la bitácora como respaldo del borrado. El botón de confirmar debe estar deshabilitado hasta que haya motivo.
- **Requiere conexión.** Mensaje ya redactado: "Para eliminar los datos de una persona necesitas conexión a Internet. El plazo legal es de 30 días, así que puedes hacerlo cuando vuelva la señal."
- **Es irreversible.** La confirmación debe decirlo con claridad y explicar qué NO se pierde: "Las raciones, las fechas y los montos del libro de cuentas quedan intactos."
- `ya_estaba_anonimizado: true` no es un error: mostrar "ya estaban eliminados, se registró la solicitud igual".
- **Operación que debe quedar inaccesible para la Encargada.** Ocultar la pestaña es correcto como comodidad, pero **no** es el control de acceso: el servidor la rechaza con "Eliminar datos personales es una facultad exclusiva de la Administradora." Si por cualquier camino llega a verla, ese mensaje es el que corresponde mostrar.

### 2.4 Cierre de facturación (HU-33)

`app/src/features/cierre/registrarCierreFacturacion.ts`

```ts
registrarCierreFacturacion({ contratoEmpresaId, anio, mes, totalFacturado, cerradoPor }): Promise<CierreFacturacionRow>
buscarCierrePeriodo(contratoEmpresaId, anio, mes): Promise<CierreFacturacionRow | null>
fechaAnonimizacionPrevista(cerradoAt: string, diasGracia: number): Date
```

- Es **idempotente**: volver a tocar el botón devuelve el cierre existente sin escribir nada. El botón puede tocarse sin miedo (la usuaria no sabe si alcanzó a guardarse cuando se cortó la señal).
- Dos estados a diseñar: **sin cerrar** (botón + explicación del plazo) y **ya cerrado** (fecha de cierre + fecha desde la que se borran los nombres).
- **Solo Administradora.** Lleva el monto facturado: en el celular de la Encargada esta tabla ni se replica.
- Texto ya redactado, en lenguaje cercano: *"Desde el DD-MM-AAAA el sistema reemplaza los nombres y RUT de esta nómina. Las raciones, las fechas y los montos quedan intactos."*

### 2.5 Ayuda contextual (HU-37, HU-40) y productos extra (HU-41)

- `components/BotonExplicacion.tsx` y `features/tour/` ya existen y no se tocaron en este sprint.
- `features/consumo/crearProductoExtra.ts` no cambió; lo que cambió es el permiso: **la Encargada ahora puede dar de alta un producto extra** (lo exige el texto de HU-41). Si el catálogo estaba oculto para ella, debe dejar de estarlo.
- El catálogo es **append-only**: no se diseña un botón de "editar precio" ni de "eliminar". Corregir un precio equivocado es crear otro producto — un consumo ya registrado apunta a su precio histórico.

---

## 3. Pantallas con interfaz mínima a reemplazar

Buscar el comentario `diseño definitivo: Codex` / `queda para Codex`:

1. **`features/perfil/PerfilConfigModal.tsx`**
   - Bloque "Borrado de nóminas (Ley 21.719)" con el campo de días (HU-33/HU-39). Hoy es un `<input type="number">` suelto dentro del formulario de la pensión; conceptualmente pertenece a la pestaña de privacidad.
   - Campo de motivo en la confirmación de supresión (HU-34).
   - Aviso de error de validación del formulario de la pensión.
2. **`screens/sprint2/CierreMensualModal.tsx`**
   - Bloque "Cerrar facturación de \<mes\>" y su estado "ya cerrada".
3. **`features/usuarios/GestionCuentasTab.tsx`**
   - Tarjeta de cuenta con correo y fecha de registro (HU-36).
   - Pista de la política de contraseña: usar `LARGO_MINIMO_PASSWORD`, no el literal 12.

**Archivos que este sprint NO tocó** y que siguen siendo territorio de Codex: `ModalPlanAccionKpi.tsx`, `CatalogoExtrasModal.tsx`, `BotonExplicacion.tsx`, `DashboardAdmin.tsx`, `ConsumoScreen.tsx`, `ModuloConsumos.tsx` y todo `features/tour/`.

---

## 4. Restricciones por rol (resumen para la interfaz)

| Operación | Administradora | Encargada |
|---|---|---|
| Ver listado de cuentas | Sí | **No** (no le llega el dato ni replicado) |
| Crear cuenta | Sí (requiere conexión) | **No** (el servidor la rechaza) |
| Ver configuración del negocio | Sí | Sí (la necesita para los comprobantes) |
| Editar configuración | Sí | **No** (modo lectura) |
| Suprimir datos de un titular | Sí (requiere conexión + motivo) | **No** (el servidor la rechaza) |
| Cerrar facturación del mes | Sí | **No** |
| Dar de alta producto extra | Sí | **Sí** (cambió en este sprint) |
| Ver tarifas, costos y márgenes | Sí | **No** (sin cambios respecto del Sprint 4) |

---

## 5. Criterios de aceptación visual pendientes

- **HU-38** es la historia con más peso de diseño del sprint: "letra grande, tarjetas de alto contraste y estados claros" en el panel de consumos del día, con "botones táctiles grandes e íconos". La metadata de servicios (ícono, nombre corto, verbo) ya está en `features/consumo/serviciosInfo.ts`.
- **HU-36** pide el rol "con distintivo visual".
- **HU-40** pide que el recorrido "resalte paso a paso los botones principales" en lenguaje sencillo.
- Probar en viewport de celular de gama media (390 px), como el resto del proyecto.
- Toda la interfaz nueva debe seguir la paleta e identidad ya existentes. **No** introducir una identidad gráfica nueva.

---

## 6. Decisiones de negocio pendientes (no inventar en la interfaz)

1. **Plazo de gracia antes de anonimizar (HU-33).** El criterio oficial dice "propuesto: 7 días, **por validar** con la Administradora". Está implementado como parámetro configurable con 7 por defecto. No presentarlo como una política aprobada.
2. **Cuándo se anonimiza al trabajador.** Implementado de forma conservadora: cuando el contrato **ya terminó** y el período en que terminó **fue facturado y cerrado**, más el plazo de gracia. La alternativa literal de `CLAUDE.md` ("7 días después de cerrar la facturación mensual") borraría el nombre del trabajador al cerrar el primer mes de un contrato de dos años, dejando a la Encargada sin saber a quién le sirve el almuerzo. **Requiere confirmación de la Administradora.**
3. **Umbrales del semáforo de margen (15 % / 30 %).** Siguen sin validar y además hay una discrepancia detectada: `recomendarMargen.ts` usa 30/15 y la leyenda de `DashboardAdmin.tsx` usa 35/20, de modo que un margen del 32 % se pinta verde y a la vez se rotula "En observación (20 % a 34 %)". **No se tocó** (es alcance del Sprint 4 y una decisión de negocio). No diseñar nada que dé por buenos esos números.
4. **Colación facturada por consumo real vs. contrato completo** sigue marcado como supuesto en `tipo_consumo_config`.

---

## 7. Cómo levantar el entorno para revisar

```bash
cd infra && docker compose up -d          # Postgres + GoTrue + PostgREST + PowerSync + Caddy
cd .. && bash db/seed-demo.sh             # 8 piezas, reserva lista para check-in, 2 cuentas
bash db/seed-demo-empresa.sh              # empresa, contrato, nómina y consumos
cd app && npm run dev
```

Cuentas de demo: `admin@pension-myriam.local` y `encargada@pension-myriam.local` (la contraseña está en `db/seed-demo.sh`; son credenciales de desarrollo, no de producción).

> Los dos `seed-*.sh` deben correr **en ese orden y sobre una base limpia**. Volver a correr `seed-demo.sh` con datos de empresa ya cargados falla por una FK (`trabajador.cama_id`). Para repetir: `docker compose down -v && docker compose up -d`.
