# 03 — Casos prácticos del negocio

Cada caso usa **datos ficticios**, nunca huéspedes, trabajadores o empresas reales. Todos los nombres, RUT y montos de este documento son de práctica y deben borrarse del entorno de demostración después de cada sesión (ver `08-checklist-puesta-en-marcha.md`).

---

## Caso A — Reserva turística

**Contexto:** una persona escribe por WhatsApp preguntando por una cama para esta noche.
**Objetivo:** registrar la reserva completa y entregar el comprobante.
**Rol necesario:** Administradora o Encargada.
**Estado inicial:** al menos 1 pieza en estado "disponible" (verde).
**Datos ficticios:** nombre "Laura González", teléfono "+56 9 1111 2222", 1 noche.

**Pasos esperados:**
1. Ir a **Reservar**.
2. Elegir el atajo "Hoy (1 noche)" o escribir las fechas a mano.
3. Elegir una pieza disponible de la lista.
4. Escribir el nombre (obligatorio) y el teléfono (opcional).
5. Verificar en la tarjeta de resumen el total estimado ($tarifa por noche × noches).
6. Tocar **Confirmar Reserva**.
7. Descargar el comprobante en PDF o enviarlo por **💬 Enviar por WhatsApp**.

**Resultado esperado:** la pieza elegida queda bloqueada para esas fechas (deja de ofrecerse a otra persona); el comprobante muestra el nombre, la pieza, las fechas, el total y la cláusula "Sin abono ni garantía de reserva. Si cancelan, no se cobra nada."

**Errores frecuentes:** elegir fechas que se solapan con otra reserva ya confirmada en esa misma pieza (el sistema la rechaza e indica con cuál choca); dejar el nombre vacío (el botón de confirmar permanece deshabilitado).

**Verificación:** la pieza aparece amarilla recién después del check-in, no antes — una reserva confirmada todavía no cambia el color de la pieza, solo bloquea las fechas.

**Criterio de aprobación:** la participante completa el ciclo sin pistas y explica correctamente que no se cobra ningún abono.

---

## Caso B — Cancelación

**Contexto:** el huésped avisa que no llegará.
**Objetivo:** cancelar la reserva sin generar ningún cobro, y confirmar que la cama vuelve a estar disponible para otra persona.
**Rol necesario:** Administradora o Encargada.
**Estado inicial:** una reserva de turista "confirmada", sin check-in.
**Validación previa realizada por esta auditoría:** la función existe, está integrada en la rama de trabajo (`docs/cancelacion-reservas.md`) y tiene 16 pruebas automáticas más 4 pruebas de extremo a extremo aprobadas, aprobadas por Sebastián el 27/10/2026. **Se incluye como función entregada.**

**Pasos esperados:**
1. Ir a la pieza con la reserva pendiente (en Habitaciones o desde el Calendario), o al detalle de la habitación.
2. Tocar **Cancelar reserva**.
3. Escribir un motivo de 5 a 500 caracteres (ej.: "avisó por WhatsApp que no llega").
4. Confirmar.

**Resultado esperado:** la reserva queda en estado "Cancelada" con el motivo, quién la canceló y la fecha; las fechas de esa cama vuelven a estar disponibles para otra reserva; **no se registra ningún monto ni penalización**, porque el sistema no tiene ese concepto (decisión de negocio confirmada por la Administradora el 21/09/2026: "si cancelan, no se cobra nada").

**Errores frecuentes:** intentar cancelar una reserva donde el huésped ya hizo check-in (mensaje: "El huésped ya ingresó. Registra su salida en Habitaciones"); escribir un motivo de menos de 5 caracteres.

**Verificación:** crear una segunda reserva en las mismas fechas, en la misma cama, después de cancelar la primera — debe permitirlo sin problema, confirmando que la cama quedó libre.

**Criterio de aprobación:** la participante cancela sola, con un motivo válido, y confirma verbalmente que no se cobró nada y que el historial de la cancelación anterior sigue existiendo (no se borró).

---

## Caso C — Contrato de empresa

**Contexto:** una empresa contrata alojamiento y alimentación para 4 trabajadores durante 30 días.
**Objetivo:** registrar la empresa y el contrato con sus condiciones.
**Rol necesario:** Administradora (único rol que ve el módulo Empresas).
**Estado inicial:** ninguna empresa con ese nombre registrada aún.
**Datos ficticios:** razón social "Constructora Minera Norte SpA", RUT "76.123.456-7" (opcional), 4 trabajadores, tarifa $25.000 por persona por día, vigencia 30 días desde hoy.

**Pasos esperados:**
1. Ir a **Empresas** → **Nueva Empresa**.
2. Completar Razón Social (obligatoria) y RUT (opcional).
3. Guardar.
4. En la tarjeta de la empresa, tocar **+ Contrato**.
5. Completar Vigencia Desde, Vigencia Hasta (opcional), Trabajadores contratados (4), Tarifa convenida ($ / persona).
6. Tocar **Confirmar contrato de empresa**.

**Resultado esperado:** la empresa y el contrato quedan registrados; la tarjeta de la empresa muestra el contrato vigente con sus 4 cupos disponibles para ocupar.

**Errores frecuentes:** dejar la Razón Social vacía; registrar dos contratos de la misma empresa con vigencias que se superponen (restricción de solape vigente).

**Verificación:** la Encargada, en su propio teléfono, no debe ver nunca el botón "Empresas" ni la tarifa convenida — verificar que la pestaña simplemente no existe en su navegación.

**Criterio de aprobación:** la Administradora registra sola la empresa y el contrato, con los 3 datos clave correctos (vigencia, headcount, tarifa).

---

## Caso D — Camas sin nómina

**Contexto:** la empresa todavía no entrega los nombres de los trabajadores.
**Estado real del módulo:** **implementado e integrado**, aprobado como extensión de HU-02/HU-12 (`docs/cupos-empresa-sin-nomina.md`), verificado con 21 pruebas automáticas nuevas más 4 pruebas de extremo a extremo. **Se incluye como función entregada.**
**Rol necesario:** Administradora o Encargada.
**Estado inicial:** un contrato de empresa vigente con cupos aún sin ocupar (ej.: el contrato del Caso C).

**Pasos esperados:**
1. Ir a **Empresas** → **Ver Nómina y Consumos** de la empresa, o **Nómina y Camas**.
2. En el panel "1 de 3 etapas", revisar los números: Contratados, Identificados, Camas reservadas.
3. Tocar **Reservar camas sin nómina**.
4. Elegir las camas disponibles durante todo el período del contrato (se comprueba automáticamente que estén libres todas las fechas, no solo hoy).
5. Confirmar.
6. Más adelante, cuando llegue cada nombre: tocar **Identificar cupo N**, escribir el nombre real, confirmar.

**Resultado esperado:** las camas quedan bloqueadas para otras personas durante todo el contrato, sin que exista todavía ningún trabajador ni ningún consumo creado a su nombre. El headcount y la facturación del contrato no cambian por esto.

**Errores frecuentes:** intentar reservar más camas que las que todavía faltan por cubrir; intentar el check-in de un cupo sin identificar antes (bloqueado con el mensaje "Cama reservada · Falta identificar a la persona").

**Verificación:** contar que "Camas reservadas" nunca supere el número de "Contratados".

**Criterio de aprobación:** reservar al menos 2 camas sin nombre y luego identificar correctamente a una persona en una de ellas, sin crear un trabajador duplicado.

---

## Caso E — Llegada de trabajadores

**Contexto:** la empresa envía la nómina real.
**Objetivo:** distinguir con claridad tres acciones distintas: registrar el trabajador (darle nombre a un cupo o crearlo desde cero), asignarle cama, y hacer su check-in.
**Rol necesario:** Administradora o Encargada.
**Estado inicial:** contrato con cupos reservados sin nombre (Caso D) o nómina a cargar manualmente.

**Pasos esperados:**
1. Si hay cupos sin nombre: **Identificar cupo** con el nombre real (ver Caso D). La cama ya está asignada desde que se reservó el cupo.
2. Si no hay cupos previos: en **Nómina y Camas**, usar el método manual o el método guiado paso a paso para agregar al trabajador y asignarle una cama disponible.
3. Una vez con nombre y cama asignada, ir a **Habitaciones**, tocar la pieza y **Registrar ingreso**.

**Resultado esperado:** la diferencia entre "registrar trabajador" (dar un nombre), "asignar cama" (vincular a una cama física) y "check-in" (marcar la llegada real) queda clara: son tres pasos, no uno.

**Errores frecuentes:** confundir "ya tiene nombre" con "ya llegó" — una persona identificada en un cupo todavía no ha hecho check-in hasta que se registra en Habitaciones.

**Verificación:** revisar que el estado "✓ Identificado · Llegada por registrar en Habitaciones" cambie recién después del check-in real.

**Criterio de aprobación:** la participante explica correctamente los tres pasos por separado y los ejecuta en orden para al menos una persona.

---

## Caso F — Consumos diarios

**Contexto:** una empresa tiene 30 personas contratadas, pero solamente 15 consumen almuerzo.
**Objetivo:** registrar los consumos reales y comprender que la cantidad consumida no modifica lo contratado.
**Rol necesario:** Administradora o Encargada.
**Estado inicial:** contrato con trabajadores identificados; servicio "Almuerzo" del día aún no registrado para nadie.

**Pasos esperados:**
1. Ir a **Consumos**, elegir el servicio **Almuerzo**.
2. Usar el filtro **Pendientes** para ver quién falta.
3. Para una persona: buscarla por nombre y tocar el botón del servicio elegido — el texto cambia según el servicio: **Servir desayuno**, **Servir almuerzo**, **Servir cena** o **Entregar colación**.
4. Para varias a la vez: seleccionarlas con el checkbox y tocar **Registrar N almuerzo(s) en lote**.
5. Revisar que el filtro **Servidos** ahora muestre a esas personas, y que **Pendientes** muestre solo a las 15 que faltan.

**Resultado esperado:** las 15 personas que comieron quedan marcadas; las 15 que no comieron no generan ningún registro de consumo ese día, **pero la empresa sigue facturándose por las 30 contratadas** — eso lo decide la Administradora en Conciliación (Sesión 5), nunca lo cambia el hecho de marcar menos consumos.

**Errores frecuentes:** creer que "si no marco el consumo, se cobra menos" — es falso, la facturación es por contrato completo salvo que la Administradora justifique y ajuste en Conciliación (y aun así, el monto facturado no cambia automáticamente: solo queda la diferencia justificada).

**Verificación:** contar los registros de "Servidos" (deben ser 15) y comparar con el headcount del contrato (30) — deben quedar como números distintos, a propósito.

**Criterio de aprobación:** la participante marca correctamente un subgrupo en lote y explica sin ayuda por qué "menos consumos" no significa "menos factura".

---

## Caso G — Salida de un huésped

**Contexto:** registrar el check-out de una persona.
**Objetivo:** comprobar que la habitación pase obligatoriamente por aseo antes de quedar disponible.
**Rol necesario:** Administradora o Encargada.
**Estado inicial:** una pieza en estado "ocupada" con check-in activo.

**Pasos esperados:**
1. Ir a **Habitaciones**, tocar la pieza ocupada.
2. Tocar **Registrar salida**.
3. Observar que la pieza pasa a "En aseo" (rojo), nunca directo a "Disponible".
4. Tocar **Completar aseo** cuando corresponda.
5. Observar que la pieza pasa a "Disponible" (verde).

**Resultado esperado:** nunca es posible saltarse el paso de aseo; el sistema lo impide por diseño (máquina de estados), no solo por costumbre.

**Errores frecuentes:** buscar un botón para pasar directo de "ocupada" a "disponible" — no existe, y no debe inventarse ni simularse en la capacitación.

**Verificación:** intentar, a propósito, reservar esa misma pieza mientras está "en aseo" — el sistema debe seguir sin ofrecerla hasta que se complete el aseo.

**Criterio de aprobación:** la participante completa el ciclo check-out → aseo → disponible sin pistas.

---

## Caso H — Compras

**Contexto:** registrar una compra ficticia de alimentos o insumos.
**Objetivo:** entender cómo se registra el gasto y quién puede ver la información económica.
**Rol necesario:** **Solo Administradora** (la Encargada no tiene este módulo ni ningún dato de costos en su teléfono).
**Estado inicial:** cualquiera.
**Datos ficticios:** categoría "Carnes y Pollo", insumo "Pollo entero", monto $45.000, cantidad 10 (kg), rendimiento estimado 20 raciones.

**Pasos esperados:**
1. Ir a **Costos** → **+ Anotar Compra**.
2. Elegir la categoría con los botones grandes.
3. Completar nombre del insumo, monto total, cantidad y unidad.
4. Completar el rendimiento estimado (opcional pero recomendado).
5. Guardar.

**Resultado esperado:** la compra queda en el historial; el "costo promedio" de ese insumo en el catálogo se recalcula automáticamente (promedio móvil ponderado), sin que la Administradora tenga que calcular nada a mano.

**Errores frecuentes:** confundir el costo promedio con el precio de la última compra — son distintos a propósito, para suavizar variaciones de precio entre compras.

**Verificación:** registrar una segunda compra del mismo insumo a un precio distinto y comprobar que el costo promedio cambia, pero no al valor exacto de la última compra sola.

**Criterio de aprobación:** la Administradora registra sola una compra completa con sus 4 campos obligatorios.

---

## Caso I — Cierre y reportes

**Contexto:** preparar el resumen mensual.
**Objetivo:** distinguir un período listo para cerrar, un cierre ya persistido (guardado de forma definitiva) y una simple descarga de documentos.
**Rol necesario:** **Solo Administradora**.
**Estado inicial:** un contrato con todos los días del mes conciliados (o con días pendientes, para mostrar el bloqueo).

**Pasos esperados — descarga (no cierra nada):**
1. Ir al contrato → **Cierre Mensual y Pre-facturación**.
2. Si hay días sin conciliar, el sistema bloquea y lista cuáles faltan.
3. Una vez conciliado, tocar **Descargar Pre-factura (PDF)** o **Descargar Planilla Contadora (Excel)** cuantas veces se necesite — el propio sistema avisa: "esto no confirma el cierre definitivo del periodo".

**Pasos esperados — cierre real (sí persiste):**
4. Tocar **Cerrar facturación de [mes]** (botón distinto, en otra sección del mismo panel).
5. Confirmar.
6. El sistema queda con una fecha de cierre registrada, que es la que, más adelante y de forma automática, activa el borrado de los nombres de esa nómina (Ley 21.719).

**Resultado esperado:** tres estados distintos y reconocibles: "bloqueado, falta conciliar" / "conciliado, listo para cerrar, documentos disponibles para descargar" / "cerrado, con fecha de cierre registrada".

**Errores frecuentes:** creer que descargar el PDF ya cerró el mes (no es así, son dos botones distintos); intentar cerrar con días pendientes.

**Verificación:** después de cerrar, intentar cerrar el mismo período una segunda vez — el sistema debe reconocer que ya está cerrado y no debe duplicar el cierre ni cambiar la fecha original.

**Criterio de aprobación:** la Administradora nombra correctamente, sin ayuda, los tres estados del período.

---

## Caso J — Sin conexión

**Contexto:** simular una pérdida de conectividad, **en un entorno de pruebas**, nunca en el teléfono de producción con datos reales de huéspedes.
**Objetivo:** reconocer qué sigue funcionando, qué queda pendiente, y qué ocurre al reconectar.
**Rol necesario:** Administradora o Encargada.
**Estado inicial:** sesión iniciada, conectado.

**Pasos esperados:**
1. Apagar el Wi-Fi/datos del teléfono de pruebas.
2. Realizar operaciones del día a día (check-in, consumo, aseo) y comprobar que se guardan igual, de inmediato.
3. Observar el indicador: pasa a "Sin red · Cambios guardados en este celular" (o "Sin red · Guardado local" si no hay nada pendiente).
4. Reconectar la red.
5. Observar la secuencia: "Enviando pendientes…" → "Sincronizado".

**Lo que SÍ necesita conexión, sin excepción:** crear una cuenta nueva (HU-35) y atender una solicitud de eliminación de datos personales (HU-34). Todo lo demás —reservas, cancelaciones, check-in/out, aseo, consumos, compras, cupos sin nómina— se guarda local y se sincroniza después.

**No prometer:** que todos los cambios estarán sincronizados de inmediato al volver la señal — puede tardar según la cantidad de cambios pendientes y la calidad de la señal. No se afirma ningún tiempo exacto garantizado.

**Errores frecuentes:** entrar en pánico al ver "Sin red"; apagar la aplicación pensando que "se cortó" en vez de seguir usándola con normalidad.

**Verificación:** confirmar en una segunda sesión de prueba, desde otro teléfono o después de recuperar la señal, que lo registrado sin conexión llegó correctamente al servidor.

**Criterio de aprobación:** la participante sigue operando con normalidad durante el corte simulado y reconoce los 4 estados del indicador sin ayuda.

---

## Caso K — Usuarios y privacidad

**Contexto:** entender qué puede hacer cada perfil y cómo proteger la cuenta.
**Objetivo:** reconocer los límites de cada rol y las reglas de protección de datos personales.
**Rol necesario:** principalmente Administradora; la Encargada participa en la parte que le corresponde.

**Qué puede hacer cada perfil (verificado contra el código, no supuesto):**
- La Administradora ve y puede todo: habitaciones, reservas, cancelaciones, empresas, contratos, nómina, cupos, consumos, conciliación, compras, costos, cierre, panel ejecutivo, cuentas, privacidad y configuración del negocio.
- La Encargada ve y puede: habitaciones, reservas, cancelaciones, nómina, cupos, consumos, catálogo de extras, y su propio perfil (en modo lectura para los datos del negocio). **No tiene** el botón de Empresas, Costos, panel ejecutivo, Cuentas ni Privacidad — ni la pestaña ni el dato existen en su réplica.

**Cómo proteger la cuenta:**
- No compartir la contraseña propia con nadie, ni siquiera con la otra persona del equipo (cada una tiene su propia cuenta).
- Cerrar sesión si el teléfono se presta o se pierde de vista por un período largo.

**Qué hacer cuando otra persona usa el teléfono:**
- Cerrar sesión antes de prestarlo (Sesión 1); quien lo reciba debe entrar con su propia cuenta, nunca compartir la sesión abierta de otra persona.

**Qué datos personales deben tratarse con cuidado:**
- Nombre y RUT de trabajadores (se anonimizan automáticamente después de cerrada la facturación).
- Nombre de huéspedes turistas.
- **Nunca** se anota un dato de salud, creencia, biometría ni cualquier dato sensible, en ninguna pantalla del sistema — ni siquiera en el motivo de un descuadre, que solo acepta 5 motivos tipificados (Turno Extra, Almuerzo en Mina, Corte de Ruta, Ausencia Justificada, Otro).

**Qué funciones requieren supervisión de la Administradora:**
- Crear cuentas nuevas.
- Eliminar o consultar datos personales de un titular.
- Cambiar la configuración del negocio (tarifa base, datos bancarios).
- Cerrar la facturación de un mes.

**Importante:** durante esta clase **no se realiza ninguna operación destructiva con datos reales**. Toda demostración de eliminación de datos se hace sobre un registro de práctica creado específicamente para el ejercicio, y se confirma su borrado al final de la sesión.

**Criterio de aprobación:** cada participante explica correctamente, para su propio rol, qué puede y qué no puede hacer, sin consultar el manual.
