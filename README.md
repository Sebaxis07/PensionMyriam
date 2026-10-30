# Pensión Señora Miriam

*Sistema de conciliación y gestión operativa para hospedaje rural.*

Aplicación web progresiva (PWA) para administrar reservas, habitaciones, consumos y conciliación de una pensión familiar en Paposo (Región de Antofagasta, Chile), que hospeda tanto a turistas como a empresas contratistas mineras. Proyecto de título de Ingeniería en Informática, INACAP Antofagasta.

## Problema y enfoque

La pensión registra hoy sus consumos en un cuaderno físico y concilia manualmente contra la nómina de cada empresa contratista al cierre del mes, lo que produce descuadres difíciles de rastrear. A esto se suman la administración manual de las 8 habitaciones y una conectividad móvil que en Paposo se corta por horas o incluso días, mientras el Wi‑Fi de la casa es estable.

El sistema aborda esto con:

- Un **libro de consumos inmutable** (solo inserciones, sin `UPDATE`/`DELETE`) que compara diariamente lo servido contra la nómina vigente de cada contrato y expone las diferencias con una justificación tipificada, sin bloquear el cierre del día.
- Una **PWA offline-first**: cada operación se guarda localmente de inmediato y se sincroniza en segundo plano cuando vuelve la señal, con claves idempotentes para evitar duplicados al reintentar.
- Pantallas pensadas para **celulares de gama media**, con botones grandes y pocos pasos, para usuarias con alfabetización digital básica y sin computador en el lugar.

Estos mecanismos están implementados y cubiertos por pruebas automatizadas (ver [Pruebas](#pruebas)); su efectividad en producción aún no se ha medido en campo, ya que el proyecto se encuentra en etapa de integración y verificación (ver [Estado del proyecto](#estado-del-proyecto)).

## Funcionalidades

### Reservas y habitaciones
Reserva de turistas y de empresas (con cupos provisionales antes de recibir la nómina), comprobante PDF y texto para WhatsApp, matriz mensual de ocupación, cancelación con motivo, check-in/check-out y máquina de estados de habitación (Disponible → Ocupada → En aseo → Disponible, más En mantención) con aseo diario obligatorio.

### Empresas y trabajadores
Registro de empresas y contratos (tarifa y dotación versionadas, nunca sobrescritas), carga de nómina, asignación de trabajadores a cama, y ajuste de contrato vigente.

### Consumos y conciliación
Registro de cama-noche, desayuno, almuerzo, cena y colación/plato especial por trabajador, panel de registro masivo de un toque, conciliación diaria recalculable (esperado según el contrato vigente vs. servido) y justificación tipificada del descuadre (Turno Extra, Almuerzo en Mina, Corte de Ruta, Ausencia Justificada, Otro) con nombre del supervisor que autorizó.

### Compras y costos
Registro de compras de insumos con costeo por Promedio Móvil Ponderado sobre el histórico de compras, categorización y rendimiento estimado, proyección de margen y tarifa mínima sugerida, con alerta visual cuando el margen cae bajo el umbral definido.

### Reportes y administración
Cierre mensual con pre-factura en PDF (firma física) y planilla Excel de dos hojas (consumos y auditoría de descuadres) para la contadora externa, resumen diario para WhatsApp, panel con doble modo (operativo / administrativo con PIN), gestión de cuentas de usuario (Administradora / Encargada) y un recorrido guiado por las pantallas.

### Protección de datos y seguridad
Minimización de datos capturados, cláusulas de privacidad en comprobantes, anonimización automática programada de nombre y RUT de trabajadores a los 7 días de cerrada la facturación del contrato (en cumplimiento de la Ley N.º 21.719), y una función protegida para atender solicitudes individuales de eliminación de datos.

### Operación sin conexión
Persistencia local en SQLite (WASM) vía PowerSync, cola de sincronización con reintentos, indicador de operaciones pendientes y aviso explícito cuando una operación hecha sin señal es rechazada al sincronizar (p. ej. una reserva que quedó solapada).

> Esta agrupación describe el alcance funcional que el código del repositorio implementa a la fecha de este README; no implica que cada flujo haya sido validado en producción o aceptado formalmente por la Administradora de la pensión.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Cliente | React 18 + TypeScript + Vite, Tailwind CSS, React Router, Zod |
| PWA / offline | vite-plugin-pwa (Workbox), PowerSync Web SDK (`@powersync/web`, `@powersync/react`), SQLite local (WASM) |
| Exportación / mensajería | pdfmake (voucher y pre-factura), ExcelJS (planilla de dos hojas), enlaces `wa.me` para WhatsApp |
| Guía de uso | driver.js (recorrido guiado) |
| Backend (Docker Compose) | PostgreSQL (imagen `supabase/postgres`, con pgTAP y pg_cron), GoTrue (autenticación), PostgREST (API REST con Row Level Security), PowerSync Service (Open Edition, replicación lógica), Caddy (HTTPS automático) |
| Cliente de API/auth | `@supabase/supabase-js` |
| Infraestructura | DigitalOcean Droplet (1 vCPU / 1 GiB + 2 GB swap), Ubuntu 24.04 |
| Pruebas | Vitest (cliente), pgTAP (base de datos), Playwright (E2E, incluida emulación offline) |

## Arquitectura

- **Cliente**: PWA que guarda cada operación primero en SQLite local y actualiza la pantalla de inmediato (UI optimista); una cola de sincronización la envía al backend cuando hay señal.
- **Sincronización**: PowerSync replica de forma lógica entre Postgres y el SQLite local de cada celular, y resuelve conflictos devolviendo al cliente un aviso explícito cuando el servidor rechaza una operación (p. ej. por un solape de reservas).
- **API y autenticación**: PostgREST expone las tablas de Postgres según las políticas de Row Level Security de cada rol; GoTrue emite y valida los tokens de sesión.
- **Base de datos central**: PostgreSQL con el libro de consumos como tabla append-only, conciliación diaria recalculable y un job de `pg_cron` que anonimiza datos personales conforme a la Ley N.º 21.719.
- **Borde HTTPS**: Caddy, con certificados automáticos, frente a GoTrue, PostgREST y el servicio de PowerSync.
- Todas las reglas de negocio críticas (máquina de estados de habitación, inmutabilidad del libro de consumos, idempotencia, RLS, purga de datos personales) están descritas en `CLAUDE.md` y verificadas con pruebas pgTAP en `db/pgtap/`.

## Requisitos previos

- Node.js 20+ y npm (el repositorio no fija una versión exacta vía `.nvmrc`; se recomienda una LTS reciente compatible con Vite 5).
- Docker y Docker Compose, para levantar el backend (`infra/docker-compose.yml`).
- Un cliente de PostgreSQL (opcional, para inspección manual).

## Instalación y ejecución local

```bash
git clone https://github.com/Sebaxis07/PensionMyriam.git
cd PensionMyriam

# 1. Backend: Postgres + GoTrue + PostgREST + PowerSync + Caddy
cp infra/.env.example infra/.env   # editar si es necesario
cd infra && docker compose up -d && cd ..

# 2. Cliente web
cd app
cp .env.example .env               # valores de desarrollo ya preconfigurados
npm install
npm run dev
```

La aplicación queda disponible en la URL que imprime Vite (por defecto `http://localhost:5173` o `5174` según el puerto libre). El archivo `app/.env.example` documenta que la clave anónima incluida es un secreto de desarrollo desechable, generado para el `JWT_SECRET` de ejemplo de `infra/.env.example`; en un despliegue real se reemplazan ambos.

Para aplicar las migraciones y ejecutar las pruebas pgTAP contra un Postgres descartable (sin tocar ninguna base persistente):

```bash
bash db/dev-run.sh
```

## Pruebas

| Herramienta | Qué cubre | Cómo ejecutarla |
|---|---|---|
| Vitest | Lógica de hooks y features del cliente (`app/src/features/**/*.test.ts`) | `cd app && npm run test` |
| pgTAP | Reglas críticas de base de datos: inmutabilidad del libro de consumos, RLS, idempotencia, máquina de estados, purga Ley 21.719, entre otras (`db/pgtap/`) | `bash db/dev-run.sh` |
| Playwright | Flujos E2E, incluida la emulación de pérdida de red (`e2e/`, con configuraciones específicas por sprint en `app/playwright.*.config.ts`) | `cd app && npx playwright test -c playwright.config.ts` (y los demás archivos `playwright.*.config.ts` según el flujo a probar) |

No se reportan aquí porcentajes de cobertura ni conteos de pruebas aprobadas: esos números no están consolidados en el repositorio y no deben inferirse de los nombres de archivo.

## Estructura del repositorio

```
app/            PWA (React + Vite): screens, features por módulo, lib de PDF/sync
db/
  migrations/   Esquema SQL incremental (Postgres)
  pgtap/        Pruebas de base de datos por regla de negocio
infra/          docker-compose.yml, Caddyfile, configuración de PowerSync
e2e/            Especificaciones Playwright multi-sprint
docs/           Historias de usuario, plan de sprints, documentación de diseño y auditoría
```

## Documentación

- Historias de usuario: [`docs/Historia_de_usuarios_v2.md`](docs/Historia_de_usuarios_v2.md), [`docs/historia_v2/historias_usuario.csv`](docs/historia_v2/historias_usuario.csv)
- Plan de sprints: [`docs/plan-sprints.md`](docs/plan-sprints.md)
- Reglas de negocio y modelo de datos: [`CLAUDE.md`](CLAUDE.md)
- Auditoría de cronograma y GitHub Projects: [`docs/auditoria/`](docs/auditoria/)
- Documentación de diseño UI por sprint: `docs/evidencia-diseno-*`, `docs/auditoria-ui-*`

## Estado del proyecto

El repositorio implementa código funcional para la mayor parte de las 42 historias de usuario vigentes (base técnica y sincronización, reservas y habitaciones, consumos y conciliación B2B, costos y margen, protección de datos Ley N.º 21.719, cuentas y seguridad), con pruebas Vitest, pgTAP y Playwright asociadas. Este trabajo vive en ramas de verificación y diseño (`verify/*`, `design/*`) que aún no se han integrado a `main`, por lo que el proyecto está en etapa de **integración y verificación**, no de operación en producción: no se ha registrado marcha blanca con la Administradora ni medición de los indicadores de gestión definidos para el cierre del proyecto. El calendario académico vigente (ES2) programa la marcha blanca entre el 17 y el 30 de noviembre de 2026, antes del informe final y la defensa del 12 de diciembre de 2026.

## Equipo

Proyecto de título, carrera de Ingeniería en Informática, INACAP Antofagasta (2026):

- Sebastián Vásquez
- Benjamín Flores
- Paolo Grassi

## Licencia

Este repositorio no incluye un archivo de licencia. El código no debe considerarse de código abierto hasta que el equipo defina y publique una licencia explícita.
