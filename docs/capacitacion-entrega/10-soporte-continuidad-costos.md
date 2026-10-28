# 10 — Soporte, continuidad y costos

## 1. Qué servicios deben permanecer funcionando

El sistema depende de 5 piezas, todas descritas en `infra/docker-compose.yml` del repositorio (verificado el 28/10/2026):

| Servicio | Para qué sirve, en palabras simples |
|---|---|
| Base de datos (Postgres) | Donde vive toda la información: reservas, empresas, consumos, cuentas |
| Autenticación (GoTrue) | Revisa el correo y la contraseña cuando alguien entra |
| API (PostgREST) | El "mesero" que lleva los datos entre el teléfono y la base de datos |
| Sincronización (PowerSync) | El que avisa a cada teléfono qué cambió, y recibe lo que cada teléfono guardó sin señal |
| Servidor web (Caddy) | Entrega la aplicación al navegador del teléfono con conexión segura |

Si cualquiera de los 5 deja de funcionar, la aplicación deja de recibir o entregar datos nuevos — pero **lo ya guardado en cada teléfono no se borra**, y vuelve a sincronizarse solo cuando el servicio se restablece.

## 2. Cómo se mantienen

Según `CLAUDE.md` del proyecto: infraestructura autoalojada en un Droplet de DigitalOcean (1 vCPU / 1 GiB + 2 GB de swap), Ubuntu 24.04, con respaldo diario cifrado mediante `rclone` + `age`. Esto es lo que el proyecto declara como diseño; **esta auditoría no verificó que el Droplet esté efectivamente desplegado en producción hoy**, solo que la configuración de Docker Compose existe y es coherente con esa descripción. Confirmar el estado real del despliegue antes de prometerle continuidad a la Administradora.

## 3. Qué recursos tienen costos recurrentes (sin cifras inventadas)

| Recurso | ¿Tiene costo recurrente? | Cifra |
|---|---|---|
| Servidor (Droplet de DigitalOcean) | Sí, mientras esté desplegado | **No se fija ninguna cifra en este documento** — depende del plan contratado, que no está documentado en el repositorio al momento de esta auditoría |
| Dominio / certificado HTTPS | Caddy obtiene certificados automáticamente; el dominio en sí puede tener costo de registro anual | **No se fija ninguna cifra** |
| Respaldo (almacenamiento del backup cifrado) | Posiblemente, según dónde se almacene (`rclone` admite varios destinos) | **No se fija ninguna cifra** |
| WhatsApp, PDF, Excel | No — se generan en el propio teléfono, sin servicio externo de pago (`pdfmake`, `ExcelJS`, enlaces `wa.me` sin API de pago) | Sin costo adicional |

**No se supone que el equipo de desarrollo cobrará por el desarrollo o el mantenimiento.** Las condiciones económicas de infraestructura y soporte quedan sujetas a un acuerdo formal separado entre el equipo y la Sra. María, que este documento no reemplaza ni anticipa.

### Explicación sencilla para la Administradora

"El sistema necesita un computador prendido en internet, en algún lugar, todo el tiempo — como un servidor. Ese computador puede tener un costo mensual, dependiendo de dónde se contrate. Hoy ese costo no está decidido ni cobrado; cuando se decida, se lo explicaremos con el número exacto, por escrito, antes de pedirle que pague nada."

## 4. Qué respaldos existen y cómo se restauran

- **Diseño declarado:** respaldo diario, cifrado con `age`, subido con `rclone` (ver `CLAUDE.md`).
- **Restauración:** no está documentado en el repositorio un procedimiento paso a paso de restauración ante un desastre total del servidor. **Esto se marca como pendiente** en `11-pendientes-y-validaciones.md`: el equipo debe escribir y probar al menos una vez ese procedimiento antes de depender de él en producción real.
- Independientemente del respaldo del servidor, cada teléfono guarda una copia local de sus propios datos (SQLite local de PowerSync) — eso ya es una capa adicional de protección frente a la pérdida de un dato recién ingresado, aunque no reemplaza un respaldo completo de la base de datos central.

## 5. Qué ocurre ante una caída prolongada del servidor

- Cada teléfono sigue mostrando y permitiendo registrar lo que ya tenía (datos ya sincronizados antes de la caída, más lo que se agregue durante la caída, en cola local).
- Las operaciones que **requieren** conexión directa con el servidor en el momento (crear una cuenta nueva, atender una solicitud de eliminación de datos) no podrán completarse hasta que el servicio se restablezca.
- **No se garantiza ningún tiempo de recuperación específico** (no existe un RTO/RPO medido ni comprometido en este documento) — solo se declara el diseño (respaldo diario) sin afirmar un compromiso de servicio que no ha sido probado.

## 6. Qué ocurre si falla el teléfono

- Si el teléfono se rompe o se pierde: lo que ya estaba **sincronizado** (enviado a la nube) no se pierde — se recupera iniciando sesión en otro teléfono.
- Lo que estaba **pendiente de enviar** en ese teléfono en el momento de la falla **sí puede perderse**, si el teléfono no vuelve a encender. Por eso es importante no dejar pasar muchos días sin que el teléfono recupere señal y sincronice.
- Recomendación operativa (no una garantía técnica): sincronizar al menos una vez al día cuando sea posible, en especial después de una jornada con muchos registros.

## 7. Quién tiene acceso administrativo

Según el código auditado:
- La cuenta con rol **"administradora"** (la de la Sra. María) es la única que puede crear otras cuentas, ver costos y márgenes, cerrar la facturación mensual y atender solicitudes de eliminación de datos personales.
- El **acceso al servidor mismo** (SSH, administración de Docker Compose, restauración de respaldos) es responsabilidad exclusiva del equipo de desarrollo — la Administradora no tiene ni necesita ese acceso para su trabajo diario.
- El reseteo de contraseña de una cuenta de usuaria, cuando no hay forma de recuperarla desde la aplicación (no hay envío de correo automático configurado), es un procedimiento manual que el equipo de desarrollo realiza por SSH — **este procedimiento está mencionado en `CLAUDE.md` pero no se encontró documentado paso a paso en el repositorio**; se marca como pendiente en `11-pendientes-y-validaciones.md`.

## 8. Qué soporte puede comprometer realmente el equipo

Lo que se puede comprometer hoy, con evidencia:
- Revisar y responder consultas sobre el uso del sistema, por el canal que se acuerde con la Sra. María (WhatsApp, llamada).
- Atender errores reportados durante la marcha blanca (ver `09-acta-capacitacion-y-recepcion.md`, registro de incidencias).
- Resetear una contraseña olvidada, por el procedimiento manual mencionado arriba.

Lo que **no** se compromete en este documento, porque no está probado ni acordado:
- Un tiempo de respuesta garantizado ante una falla del servidor.
- Disponibilidad garantizada 24/7 (no existe un SLA firmado; `CLAUDE.md` menciona SLAs como objetivo de monitoreo del Sprint 6, no como compromiso vigente).
- Un costo fijo de mantenimiento mensual.

## 9. Procedimiento ante fallos (para el equipo, no para la Administradora)

1. Confirmar si el problema es del teléfono (batería, actualización, almacenamiento lleno) o del servidor (los 5 servicios de la sección 1).
2. Si es el servidor: revisar los registros de cada servicio (`docker compose logs <servicio>`), empezando por `postgres`, luego `gotrue`, `postgrest`, `powersync`, `caddy`, en ese orden de dependencia.
3. Si es necesario reiniciar, hacerlo fuera del horario de mayor uso de la pensión cuando sea posible, y avisar previamente a la Administradora por el canal acordado.
4. Documentar el incidente en el registro de `09-acta-capacitacion-y-recepcion.md` si ocurre durante la marcha blanca, o en un registro equivalente después de la entrega formal.

## 10. Responsables (a completar en la entrega formal)

| Rol | Nombre | Contacto |
|---|---|---|
| Responsable de infraestructura (servidor, respaldos) | _____________________ | _____________________ |
| Responsable de soporte funcional (dudas de uso) | _____________________ | _____________________ |
| Responsable de respaldo y su verificación periódica | _____________________ | _____________________ |

Estos campos se completan y firman junto con la sección de soporte de `09-acta-capacitacion-y-recepcion.md`, no antes.
