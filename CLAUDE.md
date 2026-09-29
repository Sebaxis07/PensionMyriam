# Sistema de Gestión – Pensión Señora Miriam (Paposo)

Proyecto de Título TIHI84 (Ingeniería en Informática). Cierre y defensa: 12/12/2026.
Equipo: Sebastián Vásquez (líder), Paolo Grassi, Benjamín Flores. Metodología: Scrum, sprints con Sprint Review alineados a las reuniones con la clienta.
Idioma: código y nombres de tablas en español (como el modelo de datos); commits y comentarios en español.

## Contexto de negocio
Microempresa familiar de hospedaje y alimentación. 8 habitaciones. Clientes: turistas (tarifa fija $15.000/noche todo el año) y empresas contratistas mineras (tarifa especial cama + alimentación, estadías de meses a 2 años).
Dolor central: descuadre entre el cuaderno de consumos de la pensión y la nómina de la empresa contratista.
Usuarias: Administradora (María) y Encargada de Registro. Solo usan celulares (2). Alfabetización digital básica. NO hay computador.
Conectividad: Wi-Fi permanente en la casa, pero la señal móvil de Paposo se corta por horas o días.
=> Todo debe ser mobile-first, simple, con botones grandes, pocas pantallas y cero jerga técnica.

## Stack decidido (ES2, no cambiar sin consultar)
Cliente: PWA con React + Vite + TypeScript, vite-plugin-pwa (Workbox), Tailwind CSS, React Router, Zod, pdfmake (voucher y pre-factura), ExcelJS (Excel de 2 hojas), enlaces wa.me para WhatsApp (sin API de WhatsApp Business).
Offline-first: PowerSync Web SDK (@powersync/web, @powersync/react), SQLite local (WASM), cola de subida con reintentos. Optimistic UI.
Backend (autoalojado con Docker Compose): PostgreSQL (imagen Supabase, pg_cron), GoTrue (auth), PostgREST + Row Level Security, PowerSync Service (Open Edition, replicación lógica), Caddy (HTTPS automático).
Cliente de API/auth: supabase-js.
Infra: DigitalOcean Droplet 1 vCPU / 1 GiB (+2 GB swap), Ubuntu 24.04, respaldo diario cifrado con rclone + age. Cuidar el consumo de memoria.
Pruebas: Vitest (cliente), pgTAP (BD), Playwright (E2E, incluye emulación offline), k6 (carga), Lighthouse (PWA).
CI: GitHub Actions. Ramas por Sprint, PRs.

## Reglas de negocio (validadas con la Administradora en la reunión 2)
- SIN abono ni garantía de reserva. Si cancelan, no se cobra nada. No integrar pasarelas de pago (RNF-05). Pago por transferencia o efectivo.
- Turistas extranjeros: no se pide RUT, basta el nombre.
- Habitaciones con 4 estados por color: verde=Disponible, amarillo=Ocupada, rojo=En aseo, gris=En mantención.
- Nunca se puede pasar de Libre a Ocupada sin pasar por Aseo. Check-out => En aseo automático. "Aseo completado" => Disponible.
- Aseo DIARIO obligatorio para toda pieza ocupada (no cada 2–3 días).
- Facturación por CONTRATO COMPLETO: si la empresa contrata 30 personas paga por 30 aunque ese día coman 15. La conciliación detecta diferencias y pide una justificación tipificada (Turno Extra, Almuerzo en Mina, Corte de Ruta, Ausencia Justificada, Otro) + nombre del supervisor que autorizó, pero NO cambia el monto facturado ni bloquea el cierre del día.
- Sin firma digital: la nómina física firmada sigue siendo el respaldo legal.
- Consumos = libro contable inmutable (Ledger). Prohibido UPDATE/DELETE en `consumo`. Las correcciones son una nueva fila con `consumo_corregido_id` y justificación (RNF-03).
- Toda operación reintentable (aseo, consumo, sync) lleva `uuid_idempotente` (RNF-06).
- Ley 21.719 (datos personales, vigente desde diciembre): 7 días después de cerrar la facturación mensual de una empresa, `pg_cron` anonimiza `trabajador` (nombre, RUT) y el nombre del supervisor guardado en `justificacion_descuadre`. Nunca toca `consumo`: el ledger conserva sus filas y sus IDs, solo pierde el nombre legible aguas arriba. La nómina física firmada es el respaldo legal si se necesita el nombre después.
- Semáforo de margen: la Administradora estima $3–4 millones/mes de ganancia líquida por 30 personas con pensión completa (~50% margen neto). Usar como referencia para umbrales (ej. alerta bajo 15%; tarifa mínima sugerida con 30% de margen).
- Costeo de insumos por Promedio Móvil Ponderado, calculado sobre el histórico inmutable de `compra_insumo` (nunca un campo que se sobrescribe).
- Compra de insumos: solo la Administradora la registra (RLS le da INSERT en `compra_insumo`; la Encargada no ve costos ni márgenes).
- Sin tabla de pagos: el cobro (transferencia o efectivo) queda fuera de alcance del sistema, conforme RNF-05.
- Sesión: tokens de GoTrue de larga duración; la PWA debe seguir siendo utilizable offline aunque el token haya vencido (no bloquear la cola local por sesión expirada). Sin autorregistro ni SMTP: reseteo de contraseña es un procedimiento manual del equipo por SSH, documentado aparte.

## Modelo de datos (PostgreSQL)
usuario (auth_uid, rol: administradora | encargada), habitacion (estado, motivo_mantencion, capacidad), cama (habitacion, numero), reserva (cama, empresa?/contrato_empresa?, creado_por, estado), checkin (realizado_por), aseo (habitacion, responsable, uuid_idempotente), empresa (razón social, RUT, contacto), contrato_empresa (empresa, vigencia_desde, vigencia_hasta, headcount, tarifa_convenida — versionado; headcount y tarifa nunca vivos en `empresa`), trabajador (contrato_empresa, cama asignada), consumo (tipo de ración, uuid_idempotente, consumo_corregido_id, append-only), conciliacion_diaria (contrato_empresa, fecha, esperado vs servido, recalculable e idempotente), justificacion_descuadre (motivo tipificado, supervisor — anonimizable), insumo (costo promedio, derivado del histórico), compra_insumo (categoría, monto, cantidad, rendimiento en raciones/camas-noche).
RLS en todas las tablas según rol. Todo corte de "día" (ledger, conciliación) se calcula en zona horaria `America/Santiago`, nunca en la del servidor (NYC3, UTC).

## Alcance funcional
Las 30 historias de usuario están en docs/Historia_de_usuarios_v2.md (6 épicas EP-01 a EP-06, priorización MoSCoW, RNF-01 a RNF-06).
Objetivo intermedio: ~75% (23 HU) funcionando antes de la reunión 3 (semana del 9–15 nov 2026). Plan de sprints y priorización vigentes en docs/plan-sprints.md.

## Cómo trabajar
1. Antes de programar, lee docs/ y propone un plan por sprints; espera mi OK.
2. Trabaja una historia de usuario a la vez, con sus criterios de aceptación como tests.
3. Cada tabla y regla crítica (Ledger inmutable, transición de estados, idempotencia, RLS, purga de datos) lleva test pgTAP.
4. Cada flujo offline lleva test Playwright que simula pérdida de red.
5. Prioriza simplicidad de UI sobre cantidad de funciones. Probar en viewport de celular de gama media.
6. Si algo contradice las reglas de este archivo, avísame en vez de decidir solo.
