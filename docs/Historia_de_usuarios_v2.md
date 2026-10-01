Historias de usuario

Roles del sistema

| **Rol**                        | **Descripción**                                                                                           | **Responsabilidades principales**                                                                                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R1 - Administradora**        | Dueña principal del negocio. Toma decisiones comerciales, valida pagos y supervisa la operación completa. | Gestionar reservas, aprobar evidencias de pago, definir tarifas, revisar indicadores de margen, dar de alta empresas contratistas y consolidar la facturación mensual con la contadora externa |
| **R2 – Encargada de Registro** | Colaboradora en terreno responsable del día a día operativo dentro de la pensión.                         | Registrar check-in/check-out, marcar consumos de raciones (desayuno/almuerzo/cena/colaciones), actualizar el estado de aseo y mantención de las habitaciones y cargar compras de insumos.      |

**Resumen de épicas**

| ID    | Épica                                                 | Dolor asociado                                                      |
| ----- | ----------------------------------------------------- | ------------------------------------------------------------------- |
| EP-01 | Gestión de Reservas, Pagos y Vista de Ocupación       | Dolor 5 - Informalidad en las reservas                              |
| EP-02 | Gestión del Ciclo de Vida de Habitaciones             | Dolor 3 - Gestión de disponibilidad a ciegas                        |
| EP-03 | Registro y Conciliación de Consumos B2B               | Dolor 1 - Descuadre B2B                                             |
| EP-04 | Control de Costos de Insumos y Margen                 | Dolor 2 - Perdida del margen de ganancia                            |
| EP-05 | Operación Offline y Sincronización                    | Dolor 4 - Brecha tecnológica e infraestructura (transversal)        |
| EP-06 | Dashboard con Doble Modo (Operativo / Administrativo) | Transversal – usabilidad para perfil de baja alfabetización digital |

**EP-01 – Gestión de Reservas, Pagos y Vista de Ocupación**

Objetivo: Formalizar el ciclo de vida de una reserva desde la solicitud hasta la confirmación, sin exigir abono de garantía —modelo descartado por la Administradora en la validación de requerimientos—, incluyendo comprobantes formales y una vista visual de ocupación tipo "rack hotelero".

HU-01 – Crear reserva de turista

Como Administradora, quiero registrar una reserva cuando un cliente solicita disponibilidad por WhatsApp o llamada, para dejarla agendada de inmediato, sin abono ni plazo de pago —conforme al modelo comercial validado con la Administradora, que no exige garantía de reserva en Paposo.

- Dado que existe al menos una habitación disponible, cuando la Administradora ingresa nombre del cliente, tipo (turista/empresa) y fechas, entonces el sistema crea la reserva directamente en estado "Confirmada" y bloquea la habitación seleccionada para esas fechas.
- Dado un cliente extranjero, cuando se registra la reserva, entonces el sistema no exige número de documento (RUT), bastando con el nombre completo.

Prioridad: Alta

HU-02 – Registrar reserva de empresa contratista

Como Administradora, quiero registrar un contrato con una empresa contratista indicando la cantidad de trabajadores y la tarifa convenida, para respetar el modelo comercial de facturación mensual a empresas: la empresa paga por la totalidad de trabajadores contratados durante la vigencia del contrato, independiente de cuántos consuman efectivamente cada día.

- **Dado** que selecciono tipo de cliente "Empresa", **cuando** ingreso la empresa, la cantidad de trabajadores (headcount) y la tarifa convenida, **entonces** el sistema crea un contrato de empresa (`contrato_empresa`) directamente en estado "Confirmada", con fecha de inicio de vigencia y sin aplicar TTL de pago.
- **Dado** un contrato de empresa confirmado, **cuando** se guarda, **entonces** el sistema solicita (opcionalmente) cargar la nómina de trabajadores asociada, la que asigna cada trabajador a una cama disponible (ver HU-12).
- **Dado** que el headcount o la tarifa de un contrato cambian durante su vigencia (ej. la empresa reduce a 25 trabajadores), **cuando** la Administradora registra el cambio, **entonces** el sistema cierra la vigencia anterior y abre una nueva vigencia con los valores actualizados, sin sobrescribir el contrato original, de modo que la conciliación de cada día siga usando el headcount vigente en esa fecha.

**Prioridad:** Alta

HU-03 – Generar voucher PDF oficial de reserva

- Como Administradora, quiero generar un comprobante PDF membretado con los datos de la reserva, el monto total y los datos de transferencia (CuentaRUT BancoEstado), para enviarlo al turista como confirmación formal, sin condicionar la reserva a un pago anticipado.
- Dado una reserva confirmada, cuando genero el voucher, entonces el PDF incluye el monto total de la estadía (tarifa turista fija, \$15.000 por noche) y los datos bancarios de la pensión para quien prefiera transferir.
- Dado el voucher generado, cuando lo comparto, entonces el sistema también ofrece un texto formateado listo para enviar por WhatsApp.

**Prioridad:** Media

**HU-04 – Ver calendario/matriz de ocupación (rack hotelero)**

**Como** Administradora, quiero ver una matriz mensual con las 8 habitaciones en filas y los días en columnas, coloreada según ocupación, para identificar de un vistazo la disponibilidad futura y crear reservas directamente haciendo clic en una celda.

- Dado el mes actual, cuando abro la vista de calendario, entonces veo las 8 habitaciones en filas y los días en columnas, cada coloreada según su estado (libre/reservada/ocupada).
- Dado que hago clic en una celda libre de una habitación y un día, cuando confirmo, entonces el sistema abre el formulario de nueva reserva prellenado con esa habitación y fecha.

**Prioridad:** Alta

**EP-02 – Gestion del Ciclo de Vida de Habitaciones**

**Objetivo:** Eliminar el control visual/memorístico del estado de las piezas mediante una maquina de estados con 4 estados posibles, trazabilidad de quien ocupa cada pieza y registro idempotente de limpieza.

HU-05 – Visualizar estado de habitaciones con código de color (4 estados)

Como Encargada de Registro, quiero ver todas las habitaciones numeradas con un color según su estado, para saber de un vistazo cuales están libres, ocupadas, en aseo o en mantención.

- Dado que abro la pantalla principal, cuando el sistema carga las habitaciones, entonces cada una se muestra con color verde (Disponible), amarillo (Ocupada), rojo (En Aseo) o gris/morado (En mantención).
- Dado una habitación en estado "Ocupada", cuando la selecciono, entonces el sistema solo me muestra a acción valida "Check-out" (no permite doble asignación).

Dado una habitación recién desocupada, cuando finaliza la estadía de un huésped, entonces el sistema no permite pasarla directamente a "Ocupada": exige pasar primero por "En Aseo" (rojo).

**Prioridad:** Alta

**HU-06 – Realizar check-in de huésped y asociar categoría**

**Como** Encargada Registro, **quiero** indicar si el huésped es Turista Particular o Contratista B2B (y en este ultimo caso la empresa asociada) al hacer check-in, **para** facilitar la auditoria y trazabilidad de cada habitación.

- **Dado** una habitación en estado "Disponible" y una reserva "Confirmada", **cuando** realizo el check-in, **entonces** la habitación cambia a "Ocupada" y queda vinculada a esa reserva.
- **Dado** que selecciono categoría "Contratista B2B", **cuando** confirmo el check-in, **entonces** el sistema exige seleccionar la empresa asociada de la lista de empresas activas.
- **Dado** un check-in de "Turista Particular", **cuando** lo confirmo, **entonces** no se solicita empresa asociada.

**Prioridad:** Alta

**HU-07 – Realizar check-out y disparar aseo**

**Como** Encargada de Registro, **quiero** marcar la salida de un huésped, **para** que la habitación pase automáticamente a estado "En aseo".

- **Dado** una habitación "Ocupada", **cuando** realizo el check-out, **entonces** el estado cambia a "En Aseo" (rojo) y se registra fecha/hora de salida.

**Prioridad:** Alta

HU-08 – Recordar aseo diario obligatorio

Como Administradora, quiero que el sistema recuerde que toda habitación ocupada debe asearse todos los días, sin excepción —regla confirmada por la Administradora, distinta a lo propuesto originalmente (aseo cada 2-3 días)—, para cumplir la política real de limpieza sin depender de la memoria del personal.

- Dado el inicio de cada jornada, cuando el sistema revisa las habitaciones ocupadas, entonces muestra un recordatorio visual de aseo pendiente para todas ellas, priorizando el horario en que los huéspedes están fuera (contratistas 06:00–19:00; turistas, temprano en la mañana).

Prioridad: Alta

**HU-09 – Liberar habitación tras aseo completado con registro idempotente**

**Como** Encargada de Registro, **quiero** marcar con un solo toque que termine de limpiar una habitación dejando registrado quien y cuando, **para** que vuelva a estar disponible y quede trazabilidad, sin duplicar el registro si la app reintenta el envió por falta de señal.

- Dado una habitación "En Aseo", **cuando** presiono "Aseo completado", **entonces** el estado cambia a "Disponible" (verde), se reinicia el contador de días y se guarda un registro de limpieza con responsable y fecha/hora.
- Dado que la app reintenta enviar ese mismo registro de aseo por un corte de señal, cuando llega el servidor, entonces lo identifica por su clave idempotente y evita duplicarlo.

**Prioridad:** Alta

**HU-10 — Bloquear habitación por mantención**

**Como** Administradora, **quiero** marcar una habitación como "En Mantención" indicando el motivo (gas, baño, electricidad, etc.), **para** evitar que se asigne por error mientras está fuera de servicio.

- **Dado** una habitación en cualquier estado, **cuando** la marco "En Mantención" con un motivo, **entonces** el sistema la bloquea para nuevas asignaciones hasta que se libere manualmente.
- **Dado** una habitación en mantención, **cuando** intento hacer check-in en ella, **entonces** el sistema lo impide y muestra el motivo del bloqueo.

**Prioridad:** Media

**EP-03 — Registro y Conciliación de Consumos B2B (Dolor crítico)**

**Objetivo:** Reemplazar el cuaderno manual con un registro inmutable (tipo libro contable) que permita conciliar automáticamente lo servido contra la nómina de cada empresa contratista, con registro ágil, tipificación de descuadres y exportación en múltiples formatos.

**HU-11 — Dar de alta nueva empresa contratista**

**Como** Administradora, **quiero** registrar los datos de una nueva empresa (razón social, RUT, contacto y tarifa convenida por trabajador), **para** dejar el contrato formalizado antes de cargar su nómina.

- **Dado** que completo el formulario de nueva empresa, **cuando** lo guardo, **entonces** queda disponible en la lista de empresas activas para asociar reservas y habitaciones.

**Prioridad:** Alta

**HU-12 — Cargar nómina de trabajadores de una empresa**

**Como** Administradora, **quiero** ingresar el listado de trabajadores que la empresa contratista envía al instalarse y asignar cada uno a una cama, **para** tener la base de comparación para la conciliación diaria y saber quién ocupa cada cama.

- **Dado** un contrato de empresa confirmado, **cuando** cargo el listado de nombres de trabajadores, **entonces** el sistema crea un registro de `trabajador` por cada nombre, vinculado al contrato.
- **Dado** un trabajador recién cargado, **cuando** le asigno una cama disponible de las habitaciones reservadas para esa empresa, **entonces** el sistema genera su reserva individual sobre esa cama, dejando la cama bloqueada para el resto de la vigencia del contrato.
- **Dado** que la nómina trae más trabajadores que camas disponibles en las habitaciones asignadas a la empresa, **cuando** intento asignar el excedente, **entonces** el sistema lo impide y muestra cuántas camas faltan.

**Prioridad:** Alta

**HU-13 — Registrar consumo diario (libro inmutable, 5 tipos)**

**Como** Encargada de Registro, **quiero** marcar qué trabajador(es) recibieron cama-noche, desayuno, almuerzo o cena en el día, **para** dejar un registro exacto y con fecha/hora, reemplazando el cuaderno físico.

- **Dado** un trabajador alojado, **cuando** marco "Almuerzo servido" para su cama, **entonces** el sistema genera una transacción inmutable (no editable ni eliminable) con fecha, hora y responsable del registro.
- **Dado** el corte de cada noche, **cuando** el sistema genera automáticamente la cama-noche de cada trabajador con cama asignada bajo un contrato vigente, **entonces** queda un registro por trabajador por noche, sin necesitar que nadie lo marque a mano (aunque también admite registro/corrección manual puntual, ej. un trabajador nuevo que la generación automática de esa noche todavía no alcanzó a incluir).
- **Dado** un trabajador que no durmió esa noche (ej. salió de franco), **cuando** se detecta después, **entonces** la cama-noche ya generada se corrige con una transacción explícita y justificada (igual que cualquier otro tipo) — la empresa la sigue pagando por contrato completo, pero queda trazabilidad de que no durmió.
- **Dado** que me equivoco al registrar, **cuando** intento corregir, **entonces** el sistema no permite borrar la transacción original, sino que exige registrar una transacción de corrección explícita y justificada.

**Prioridad:** Alta

**HU-14 — Registrar consumo masivo con barra de consumo rápido**

**Como** Encargada de Registro, **quiero** marcar cualquiera de los 5 tipos (cama-noche, desayuno, almuerzo, cena, colación) de varios trabajadores a la vez desde un panel de un toque en la pantalla principal, **para** no tener que navegar pantalla por pantalla en cada comida.

- **Dado** el panel de consumo rápido, **cuando** selecciono un tipo y marco varios trabajadores a la vez, **entonces** el sistema genera una transacción inmutable independiente por cada uno.

**Prioridad:** Alta

**HU-15 — Registrar colación de terreno o plato especial**

**Como** Encargada de Registro, **quiero** registrar cuando un trabajador consume una colación de terreno o un plato especial fuera del menú de casa, eligiendo el producto de una lista de precios, **para** que se cobre la tarifa diferencial correspondiente y no se pierda ese ingreso.

- **Dado** un trabajador, **cuando** marco "Colación" y elijo el producto (ej. "Colación de terreno", "Plato especial") de la lista de precios que carga la Administradora, **entonces** el sistema copia el precio de ese producto al monto de la transacción y deja el registro identificado como fuera de convenio.
- **Dado** que la lista de precios cambia más adelante, **cuando** reviso una colación ya registrada, **entonces** el monto que quedó cobrado en esa fila no cambia (el ledger es inmutable: el precio nuevo solo aplica a colaciones futuras).
- ⚠️ **Supuesto pendiente de confirmar con la Administradora:** la colación se factura **por consumo real** (cada unidad registrada), no por contrato completo como cama-noche/desayuno/almuerzo/cena — queda configurable por tipo en el sistema (`tipo_consumo_config`) para poder revertirlo sin cambios de esquema si la Administradora decide lo contrario.

**Prioridad:** Media

**HU-16 — Conciliar automáticamente consumos contra nómina, por tipo**

Como Administradora, quiero que el sistema compare diariamente, **para cada tipo por separado** (cama-noche, desayuno, almuerzo, cena), lo registrado contra la nómina esperada de cada empresa, para detectar diferencias antes de que se acumulen —sin que ello bloquee la facturación, ya que la empresa paga por la totalidad de trabajadores contratados, consuman o no cada día. Colación no entra en esta comparación (se factura por consumo real, ver HU-15).

Dado que la cantidad servida de un tipo coincide con los trabajadores contratados (headcount), cuando se ejecuta la conciliación del día, entonces ese tipo pasa automáticamente a "Conciliado" y factura por la totalidad de trabajadores contratados.

- Dado que hay una diferencia en algún tipo (ej. 10 trabajadores esperados vs. 8 almuerzos servidos — el "esperado" es siempre el headcount del contrato, nunca el número de trabajadores realmente asignados con cama), cuando se ejecuta la conciliación, entonces el sistema factura igualmente por los 10 trabajadores contratados y solicita una justificación auditable para ese tipo, sin detener el cierre del día.
- Dado que faltan camas por asignar a la nómina completa, cuando se genera la cama-noche de esa fecha, entonces el hueco entre el headcount contratado y las camas realmente asignadas queda visible como descuadre justificable — nunca oculto.

**Prioridad:** Alta

**HU-17 — Registrar justificación tipificada de descuadre**

Como Administradora, quiero elegir el motivo del descuadre desde una lista predefinida (Turno Extra, Almuerzo en Mina, Corte de Ruta, Ausencia Justificada, Otro) e indicar el nombre del supervisor que autorizó, para dejar un respaldo auditable de por qué no todos consumieron, sin que esto afecte el monto facturado.

Dado un día con diferencia entre lo servido y lo esperado, cuando selecciono una categoría de motivo y escribo el nombre del supervisor que autorizó la variación, entonces el sistema guarda ambos datos permanentemente asociados al registro, como respaldo ante la empresa contratista.

- Dado un día ya conciliado y facturado, cuando la Administradora o el supervisor de la empresa consultan el detalle dentro de los 7 días siguientes al cierre de la facturación mensual, entonces pueden ver el motivo y el nombre del supervisor de cada diferencia registrada.
- Dado que pasan más de 7 días desde el cierre de la facturación mensual de una empresa, cuando alguien consulta una justificación de ese período, entonces el sistema muestra el motivo tipificado pero el nombre del supervisor aparece anonimizado (conforme Ley N° 21.719), sin afectar el monto ya facturado ni el resto del registro.

**Prioridad:** Alta

**HU-18 — Generar estado de cuenta pre-facturado mensual**

**Como** Administradora, **quiero** obtener un resumen consolidado de todos los días "Conciliados" del mes por empresa**, para** enviarlo directamente a la contadora externa sin recalcular manualmente.

- **Dado** que todos los días del mes de una empresa están "Conciliado" o "Facturable" **para los 4 tipos de contrato completo** (cama-noche, desayuno, almuerzo, cena), **cuando** solicito el cierre mensual, **entonces** el sistema genera un resumen con el total de cada tipo por trabajador — cama-noche ya es una transacción más del ledger (`consumo`, tipo `cama_noche`), no un cálculo aparte — más el detalle de colaciones consumidas (facturadas por separado, por consumo real).
- **Dado** que existen días aún no conciliados dentro del mes, **cuando** intento cerrar el mes, **entonces** el sistema lo impide y lista los días pendientes.

**Prioridad:** Alta

**HU-19 — Exportar pre-factura en PDF auditada**

**Como** Administradora, **quiero** exportar un PDF con membrete de la pensión, desglose por trabajador, tabla de justificaciones aprobadas y líneas de firma **para** mí y el supervisor de faena, para formalizar el cierre mensual con la empresa contratista.

- **Dado** un mes cerrado y conciliado, **cuando** exporto la pre-factura, **entonces** el PDF incluye desglose por trabajador, tabla de justificaciones aprobadas y espacio de firma física para ambas partes.

**Prioridad:** Media

**HU-20 — Exportar planilla Excel de dos hojas para la contadora**

**Como** Administradora, **quiero** exportar un archivo Excel con una hoja del libro inmutable de consumos y otra de auditoría de descuadres, **para** entregárselo directamente a la contadora externa.

**Dado** un mes cerrado, **cuando** exporto la planilla, **entonces** el archivo contiene una hoja con el detalle completo de consumos y otra hoja separada con el detalle de descuadres y sus justificaciones.

**Prioridad:** Media

**HU-21 — Enviar reporte diario por WhatsApp al supervisor de faena**

**Como** Administradora, **quiero** generar un mensaje de texto formateado con el resumen del día, **para** enviarlo por WhatsApp al jefe de faena y mantenerlo informado sin necesidad de llamadas.

- **Dado** el cierre del registro diario, **cuando** genero el reporte, **entonces** el sistema arma un texto formateado con el resumen de raciones servidas listo para copiar y enviar por WhatsApp.

**Prioridad:** Baja

**EP-04 — Control de Costos de Insumos y Margen**

**Objetivo:** Dar visibilidad temprana del margen de ganancia real por categoría de compra y por trabajador, evitando que el costo de insumos absorba las tarifas fijadas.

**HU-22 — Registrar compra de insumos**

**Como** Administradora, **quiero** ingresar el monto total pagado y la cantidad (kilos/unidades) en cada compra quincenal, **para** que el sistema calcule el costo actualizado por insumo.

- **Dado** que realizo una compra a un distribuidor, **cuando** ingreso monto total y cantidad adquirida, **entonces** el sistema recalcula el costo promedio móvil de ese insumo.

**Prioridad:** Media

**HU-23 — Categorizar compras y estimar rendimiento**

**Como** Administradora, **quiero** clasificar cada compra por rubro (Carnes, Verduras, Abarrotes, Gas/Combustible, Aseo, etc.) e indicar cuántas raciones o noches de cama rinde, **para** tener un costeo más preciso por categoría.

- **Dado** que registro una compra, **cuando** selecciono su categoría y cantidad, **entonces** el sistema calcula y guarda cuántas raciones o camas-noche estima que rinde esa compra.

**Prioridad:** Media

**HU-24 — Proyectar margen de ganancia del mes**

**Como** Administradora, **quiero** ver una proyección del margen estimado según lo servido versus el costo actualizado de insumos, **para** anticipar si voy a perder rentabilidad antes de que termine el mes.

- **Dado** que existen raciones servidas registradas y costos de insumos actualizados, **cuando** abro el panel de indicadores, **entonces** el sistema muestra el margen proyectado del mes en curso.
- **Dado** que el margen proyectado cae bajo un umbral definido (ej. 15%), **cuando** se calcula la proyección, **entonces** el sistema muestra una alerta visual (semáforo amarillo/rojo) en la pantalla de inicio.

**Prioridad:** Media

**HU-25 — Calcular costo diario real por trabajador y tarifa mínima sugerida**

**Como** Administradora, **quiero** ver el costo real diario que me cuesta un trabajador (1 cama + 3 comidas) y una tarifa mínima recomendada que asegure un margen del 30%, **para** negociar con criterio nuevas tarifas con las empresas.

- **Dado** el costeo actualizado del mes, **cuando** abro el panel financiero, **entonces** el sistema muestra el costo diario real por trabajador y la tarifa mínima sugerida para no bajar del 30% de margen.

**Prioridad:** Media

**HU-26 — Recibir recomendación ante margen bajo**

**Como** Administradora, **quiero** que el sistema me sugiera ajustar compras o renegociar tarifas cuando el margen esté en riesgo, **para** tomar decisiones a tiempo y no descubrir la pérdida al cierre del mes.

Dado una alerta de margen bajo activa, cuando la reviso, entonces el sistema muestra un mensaje simple sugiriendo ajustar compras o revisar tarifas (sin jerga técnica).

**Prioridad:** Baja

**EP-05 — Operación Offline y Sincronización (transversal)**

**Objetivo:** Garantizar que toda la operación diaria (check-in, consumos, aseo) funcione sin conexión estable, dado que Paposo tiene señal celular intermitente y las usuarias no disponen de computador.

**HU-27 — Registrar operaciones sin conexión a internet**

**Como** Encargada de Registro, **quiero** que la aplicación funcione con normalidad, aunque no tenga señal, **para** no interrumpir el registro diario de consumos y habitaciones.

- **Dado** que el teléfono no tiene conexión a internet, **cuando** registro un check-in, consumo o cambio de estado de habitación, **entonces** la app guarda la operación localmente y la pantalla se actualiza al instante, sin mensajes de error ni tiempos de carga.

**Prioridad:** Alta (requisito no funcional crítico)

**HU-28 — Sincronizar automáticamente al recuperar señal**

**Como** Encargada de Registro, **quiero** que las operaciones guardadas offline se envíen solas al servidor cuando vuelva la señal, **para** no tener que hacer nada manual para sincronizar.

- **Dado** operaciones pendientes en la cola local, **cuando** el dispositivo detecta señal celular estable, **entonces** el sistema las envía automáticamente en segundo plano.
- **Dado** que una operación ya fue enviada previamente (ej. por un corte de red a mitad de envío), **cuando** se reintenta el envío, **entonces** el servidor la identifica por su identificador único y evita duplicarla.

**Prioridad:** Alta (requisito no funcional crítico)

**HU-29 — Ver estado de sincronización**

**Como** Administradora, **quiero** ver si el celular que estoy usando tiene operaciones propias sin enviar, y cuándo se conectó por última vez cada dispositivo del equipo, **para** confiar en que la información que reviso está actualizada.

- **Dado** que mi propio dispositivo tiene operaciones en su cola local sin confirmar por el servidor, **cuando** abro el resumen, **entonces** el sistema muestra un indicador claro de "Datos pendientes de sincronizar" con la cantidad de operaciones en cola.
- **Dado** que quiero saber si el dispositivo de la Encargada de Registro está al día, **cuando** abro el resumen, **entonces** el sistema muestra la fecha/hora de la última sincronización exitosa de ese dispositivo (no puede mostrar su cola local, que solo existe en ese celular y no es visible mientras esté sin señal).

**Prioridad:** Media

**EP-06 — Dashboard con Doble Modo (Operativo / Administrativo)**

**Objetivo:** Reducir la carga cognitiva mostrando en la pantalla de inicio solo la información relevante según el momento del día y el rol de quien la usa.

**HU-30 — Cambiar entre modo operativo y modo administrativo**

**Como** Administradora, **quiero** alternar en la pantalla de inicio entre un modo operativo (piezas por limpiar, llegadas del día, registro rápido) y un modo administrativo (métricas financieras, semáforo de margen, conciliaciones pendientes), **para** enfocarme en lo que necesito según el momento del día.

- **Dado** que estoy en modo operativo, **cuando** cambio el switch a "Administrativo", **entonces** la pantalla muestra indicadores financieros, semáforo de margen y conciliaciones pendientes.
- **Dado** que estoy en modo administrativo, **cuando** cambio a "Operativo", **entonces** la pantalla vuelve a mostrar las tareas del día (aseo, llegadas, registro rápido).

**Prioridad:** Media

**Matriz Resumen de Priorización (MoSCoW)**

| Épica                             | Historias Must-Have                             | Historias Should-Have      | Historias Could-Have |
| --------------------------------- | ----------------------------------------------- | -------------------------- | -------------------- |
| EP-01 Reservas, Pagos y Ocupación | HU-01, HU-02, HU-04                             | HU-03                      |                      |
| EP-02 Habitaciones                | HU-05, HU-06, HU-07, HU-08, HU-09               | HU-10                      |                      |
| EP-03 Consumos B2B                | HU-11, HU-12, HU-13, HU-14, HU-16, HU-17, HU-18 | HU-15, HU-19, HU-20        | HU-21                |
| EP-04 Costos y Margen             |                                                 | HU-22, HU-23, HU-24, HU-25 | HU-26                |
| EP-05 Offline y Sync              | HU-27, HU-28                                    | HU-29                      |                      |
| EP-06 Dashboard doble modo        |                                                 | HU-30                      |                      |

**Requisitos No Funcionales Asociados (complemento IEEE830)**

| ID     | Requisito                                                                                                                                                                                                                                   | Épicas relacionadas |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| RNF-01 | La aplicación debe ser 100% funcional en dispositivos móviles de gama media/baja, sin requerir computador de escritorio.                                                                                                                    | Transversal         |
| RNF-02 | Toda operación critica (check-in, consumo, cambio de estado) debe responder de formar instantánea en la interfaz, independiente de la conectividad (Optimistic UI).                                                                         | EP-05               |
| RNF-03 | Los registros de consumo (Ledger) no deben ser editables ni eliminables directamente; toda corrección se realiza mediante una transacción explicita.                                                                                        | EP-03               |
| RNF-04 | La interfaz debe minimizar la carga cognitiva: mostrar solo acciones validas según el estado actual (Progressive Disclosure) y usar codificación por color universal.                                                                       | EP-02, EP-06        |
| RNF-05 | El sistema no debe integrar pasarelas de pago automatizadas (Stripe, MercadoPago, etc.); el flujo de pago se basa en transferencia bancaria o efectivo, sin abono de garantía, conforme al modelo comercial validado con la Administradora. | EP-01               |
| RNF-06 | Todo registro generado por procesos que puedan reintentarse por falla de conectividad (ej. Aseo, sincronización) debe incluir un clave idempotente para evitar duplicados.                                                                  | EP-02, EP-05        |