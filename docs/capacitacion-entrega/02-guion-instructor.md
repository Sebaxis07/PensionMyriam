# 02 — Guion del instructor, minuto a minuto

Cualquier integrante del equipo puede dar estas clases leyendo este guion. Los nombres de pantallas, botones y mensajes son **literalmente los que aparecen en el sistema** (verificados contra el código el 28/10/2026 — ver `00-auditoria-capacitacion.md`). Si una pantalla cambia de texto en una futura actualización visual, hay que revisar este guion antes de volver a usarlo.

Convención de la tabla "Minuto": son rangos, no instantes exactos — permiten variar el ritmo real de la clase sin perder la estructura.

---

## SESIÓN 1 — Entrar y orientarse (45 min, Administradora + Encargada)

**Objetivo de aprendizaje:** al terminar, cada participante puede entrar sola, salir sola, nombrar los 4 colores de las piezas y explicar con sus palabras qué significa el círculo de la esquina superior.
**Requisitos previos:** ninguno.
**Material:** el teléfono real de cada persona, ya con la cuenta de demostración cargada (ver `08-checklist-puesta-en-marcha.md`).

| Minuto | Instructor | Participante | Pantalla o módulo | Resultado esperado |
|---|---|---|---|---|
| 0-5 | "Buenos días. Antes de tocar nada, quiero contarles qué es esto: es como el cuaderno de la pensión, pero que las dos pueden ver al mismo tiempo desde su teléfono, y que avisa cuando algo no se guardó. No va a reemplazar el cuaderno de inmediato; vamos a ir poco a poco." | Escucha | — | — |
| 5-12 | "Vamos a entrar. Toquen donde dice 'Correo electrónico' y escriban el correo que les dejé anotado." Muestra en su propio teléfono, despacio, letra por letra. | Escribe su correo y su contraseña en los campos "Correo electrónico" y "Contraseña" | Pantalla de **Ingresar** | Ve escrito su correo; la contraseña aparece oculta con puntos |
| 12-15 | "Ahora toquen el botón naranjo que dice 'Ingresar'." | Toca **Ingresar** | — | Entra a la pantalla principal (Habitaciones) |
| 15-17 | Si se equivocó: "Dice 'No se pudo ingresar. Revisa tu usuario y contraseña' — no se rompió nada, solo hay que escribirlo de nuevo con calma." | Reintenta | — | Entra correctamente |
| 17-27 | "Miren esta pantalla: cada cuadrito es una pieza de la pensión. El verde está libre, el amarillo está ocupada, el rojo necesita aseo, el gris está en mantención." Señala ejemplos reales en la demo. | Repite en voz alta qué significa cada color, señalando con el dedo | **Habitaciones** | Nombra los 4 colores sin ayuda |
| 27-35 | "Arriba, al lado del logo, hay un círculo. Ese círculo es como decir 'esta carta ya se envió' o 'todavía no hay cartero'. Cuando dice 'Sincronizado' quiere decir que todo lo que anotaron ya llegó a la nube. Si dice 'Sin red', quiere decir que no hay señal ahora, pero lo que anotaron queda guardado en el teléfono, esperando." Toca el indicador para abrir el detalle. | Observa el indicador, lo toca una vez | **SyncStatusBadge** (esquina superior) | Explica con sus palabras qué significa "Sincronizado" |
| 35-40 | "Si alguna vez ven un círculo rojo que dice 'registros necesitan revisión', no se asusten: tóquenlo y va a decir exactamente qué pasó y qué hacer. Lo vamos a practicar en la Sesión 7." | Escucha | — | — |
| 40-43 | "Para salir, busquen el botón de cerrar sesión." (Mostrar su ubicación real en el Header: ícono de puerta/salida, visible en la vista de escritorio o en el menú del celular). | Localiza y toca el botón de cerrar sesión | **Header** | Vuelve a la pantalla de Ingresar |
| 43-45 | "¿Alguna pregunta antes de seguir?" Cierre abierto. | Preguntas libres | — | — |

**Errores habituales:** escribir el correo con mayúsculas o espacios de más (el sistema es tolerante, pero puede generar confusión visual); confundir "Ingresar" con el logo (tocar el logo no hace nada, hay que insistir en el botón).
**Cómo resolverlos:** nunca decir "está mal escrito"; decir "vamos a escribirlo de nuevo, letra por letra, yo te acompaño".
**Preguntas frecuentes:** *"¿Si cierro la aplicación se pierde lo que anoté?"* No, queda guardado en el teléfono. *"¿Tengo que entrar todos los días con la clave?"* No necesariamente; la sesión queda guardada, pero es bueno saber cómo entrar si el teléfono se reinicia.
**Evidencia de aprendizaje:** la participante entra y sale sola, dos veces, sin que el instructor toque su pantalla.
**Criterio para pasar a S2:** logra la evidencia anterior. Si no, se repite al inicio de S2 antes de avanzar.

---

## SESIÓN 2 — Habitaciones: reservar, llegar, salir, cancelar (90 min, ambas)

**Objetivo:** resolver de principio a fin el ciclo de un turista: reservar, recibirlo, despedirlo, y cancelar si avisa que no llega.
**Requisitos previos:** S1 completada.
**Material:** datos ficticios — "Laura González", "+56 9 1111 2222".
**Casos de referencia:** A, B, G (`03-casos-practicos.md`).

| Minuto | Instructor | Participante | Pantalla o módulo | Resultado esperado |
|---|---|---|---|---|
| 0-6 | "Imaginemos que alguien les escribe por WhatsApp preguntando por una cama para esta noche. Primero vamos a ver qué piezas tenemos libres." | Observa | **Habitaciones** | Identifica las piezas verdes |
| 6-10 | "Vamos a tocar el botón 'Reservar' para registrar a esa persona." | Localiza el botón de reservar (navegación inferior o barra lateral, "Reservar") | **Reservar** | Entra a "Nueva Reserva de Pasajero" |
| 10-14 | "Arriba se ve cuántas piezas están libres en total. Abajo elegimos las fechas: pueden usar estos atajos — 'Hoy (1 noche)', 'Mañana', '2 Noches', '1 Semana' — o escribir la fecha a mano." | Toca el atajo "Hoy (1 noche)" | Bloque "1. Fechas de Estadía" | Las fechas Desde/Hasta se llenan solas |
| 14-20 | "Ahora elegimos la pieza. Las que están en gris claro no se pueden tocar; las disponibles se ven distinto." Demuestra tocando una pieza libre. | Toca una pieza disponible | Grilla de habitaciones | La pieza queda marcada como seleccionada |
| 20-27 | "Acá escribimos el nombre de la persona — obligatorio — y el teléfono, que es opcional pero sirve para mandarle el comprobante después." Escribe "Laura González" y el teléfono de ejemplo. | Repite escribiendo sus propios datos ficticios de práctica | Campos "Nombre del Pasajero / Turista" y "Teléfono / WhatsApp (opcional)" | Ambos campos llenos |
| 27-30 | "Fíjense en esta frase: 'Sin abono ni garantía de reserva. Si cancelan, no se cobra nada.' Eso es así porque así lo decidió la Sra. María: en Paposo no se trabaja con abonos." | Lee la frase en pantalla | Tarjeta de resumen de cobro | Repite con sus palabras por qué no se pide abono |
| 30-33 | "Para confirmar, tocamos 'Confirmar Reserva'." | Toca **Confirmar Reserva** | — | Aparece la confirmación con opción de descargar PDF o enviar por WhatsApp |
| 33-38 | "Pueden descargar el comprobante en PDF o enviarlo directo por WhatsApp si la persona dejó su teléfono." Demuestra el botón **💬 Enviar por WhatsApp**. | Toca **Descargar Comprobante (PDF)** | — | Se genera un PDF con los datos de la reserva |
| 38-40 | *(Descanso de 10 minutos)* | | | |
| 50-58 | "Ahora supongamos que Laura ya llegó. Vamos a Habitaciones y tocamos la pieza donde la reservamos." | Toca la pieza reservada | **Habitaciones** → ficha de la pieza (RoomSheet) | Se abre el detalle de la pieza |
| 58-63 | "Tocamos 'Registrar ingreso'." | Toca **Registrar ingreso** | — | La pieza cambia a amarillo (Ocupada) |
| 63-68 | "Ahora Laura se va. Volvemos a tocar la pieza y esta vez decimos 'Registrar salida'." | Toca la pieza, luego **Registrar salida** | — | La pieza pasa automáticamente a rojo (En aseo) — nunca puede quedar "disponible" directamente |
| 68-73 | "Fíjense: no quedó libre de inmediato, quedó en rojo. Eso es a propósito: siempre hay que limpiar antes de poder ocuparla otra vez. Para marcarla lista, tocamos 'Completar aseo'." | Toca **Completar aseo** | — | La pieza vuelve a verde (Disponible) |
| 73-80 | "Ahora el caso contrario: alguien reservó, pero avisa por WhatsApp que no va a llegar. Vamos a esa reserva y tocamos 'Cancelar reserva'." (Usar una segunda reserva de práctica, sin check-in todavía). | Toca la pieza con reserva pendiente, luego **Cancelar reserva** | Ficha de la pieza | Se abre el formulario de cancelación |
| 80-86 | "Hay que escribir el motivo — por ejemplo 'avisó que no llega' — mínimo 5 letras. Nunca se cobra nada." | Escribe un motivo y confirma | — | La reserva queda marcada como Cancelada; la fecha de esa cama vuelve a estar libre para otra persona |
| 86-90 | "¿Qué pasa si alguien ya hizo el check-in y después quieren cancelar? El sistema no lo va a dejar — va a decir que hay que registrar la salida en Habitaciones en vez de cancelar. Eso es correcto, no es un error." Cierre y preguntas. | Preguntas | — | — |

**Errores habituales:** intentar reservar una pieza ocupada (el sistema la bloquea con un aviso amarillo de "⚠️" y explica por qué); intentar cancelar una reserva con check-in ya hecho (mensaje: "El huésped ya ingresó. Registra su salida en Habitaciones"); escribir un motivo de cancelación muy corto (menos de 5 letras).
**Cómo resolverlos:** leer el aviso en voz alta con la participante y traducirlo: "esto quiere decir que…".
**Preguntas frecuentes:** *"¿Y si cancelo por error?"* La reserva cancelada queda en el historial, no se borra — se puede ver después, aunque no se puede "descancelar" sola; hay que crear una reserva nueva. *"¿Tengo que cobrar algo si cancela el mismo día?"* No, nunca, por decisión de la Sra. María.
**Evidencia de aprendizaje:** la participante completa sola el ciclo reserva → check-in → check-out → aseo completado, y además cancela una reserva distinta con su motivo.
**Criterio para pasar a S3:** logra las dos evidencias anteriores sin pistas del instructor en el segundo intento.

---

## SESIÓN 3 — Empresas: contrato y camas sin nómina (75 min)

**Para quién:** Administradora completa (0-75 min). La Encargada participa solo del bloque 45-70 (Camas sin nómina), unos 25 minutos; el resto puede observar sin ejecutar o retirarse.
**Objetivo:** la Administradora registra una empresa y su contrato; ambas entienden cómo reservar camas antes de tener los nombres.
**Casos de referencia:** C, D.

| Minuto | Instructor | Participante | Pantalla o módulo | Resultado esperado |
|---|---|---|---|---|
| 0-6 | "Ahora vamos a las empresas contratistas. Esto solo lo ve la Administradora — por eso en el teléfono de la Encargada no va a aparecer este botón, y eso es correcto, es a propósito." | Escucha (solo Administradora en pantalla) | — | — |
| 6-10 | "Vamos a tocar 'Empresas' en el menú." | Toca **Empresas** | **Empresas** | Lista de empresas (puede estar vacía) |
| 10-14 | "Para agregar una nueva, tocamos 'Nueva Empresa'." | Toca **Nueva Empresa** | Modal "Registrar Empresa Contratista" | Se abre el formulario |
| 14-20 | "Escribimos la Razón Social — obligatoria — por ejemplo 'Constructora Minera Norte SpA', y el RUT de la empresa, que es opcional." | Escribe los datos ficticios | Campos "Razón Social" y "RUT de la Empresa (opcional)" | Formulario completo |
| 20-24 | Guarda y muestra la tarjeta de la empresa recién creada, con el botón "+ Contrato". | Observa | — | La empresa aparece en la lista |
| 24-30 | "Ahora el contrato: cuántas personas contrató y a qué tarifa. Tocamos '+ Contrato'." | Toca **+ Contrato** | **Nuevo Contrato de Hospedaje** | Se abre el formulario de contrato |
| 30-38 | "Escribimos 'Vigencia Desde', y si tiene fecha de término, 'Vigencia Hasta' — si no, se deja vacío. Después, 'Trabajadores contratados': en nuestro caso práctico son 4. Y la 'Tarifa convenida ($ / persona)'." | Completa con los datos del Caso C (4 trabajadores, 30 días) | Formulario de contrato | Formulario completo |
| 38-42 | "Tocamos 'Confirmar contrato de empresa'." | Confirma | — | El contrato queda creado; aparece en la tarjeta de la empresa |
| 42-45 | *(Descanso de 10 minutos)* | | | |
| 55-62 | *(Entra la Encargada, si corresponde)* "Vamos a 'Ver Nómina y Consumos' de esa empresa." Explica: "Si la empresa todavía no te mandó los nombres, igual puedes guardarle la cama." | Toca **Ver Nómina y Consumos** | **Nómina y Camas** | Se ve el panel "1 de 3 etapas · Contrato, nómina y llegada" |
| 62-70 | "Arriba se ve: Contratados, Identificados, Camas reservadas. Como todavía no hay nombres, tocamos 'Reservar camas sin nómina'." | Toca **Reservar camas sin nómina**, selecciona camas, confirma | Diálogo "Reservar camas sin nómina" | Las camas quedan marcadas como "Cupo 1 · Sin nombre asignado" |
| 70-75 | "Esas camas ya no se le ofrecen a nadie más durante todo el contrato, aunque no tengan nombre todavía. Cuando lleguen los nombres, los vamos a completar en la Sesión 4." Cierre y preguntas. | Preguntas | — | — |

**Errores habituales:** intentar poner más camas que las contratadas (el sistema avisa: "La selección supera las camas contratadas que faltan por reservar"); elegir una cama que ya no está libre todo el período del contrato.
**Cómo resolverlos:** explicar que el número de camas sin nombre no puede superar lo que la empresa contrató.
**Preguntas frecuentes (Administradora):** *"¿Y si la empresa después contrata más gente?"* Se edita el contrato (fuera del alcance de esta sesión; se revisa en S5 si corresponde). *"¿Esto cambia lo que le voy a cobrar?"* No, lo que se factura es siempre el headcount contratado, tengan nombre o no.
**Evidencia de aprendizaje:** la Administradora crea sola una empresa y un contrato; ambas (donde corresponda) reservan al menos 2 camas sin nombre.
**Criterio para pasar a S4:** evidencias logradas sin ayuda en el segundo intento.

---

## SESIÓN 4 — Llegada de trabajadores y consumos diarios (75 min, ambas)

**Objetivo:** completar la nómina cuando llegan los nombres reales, registrar su llegada, y marcar las comidas servidas entendiendo la regla de facturación por contrato completo.
**Casos de referencia:** E, F.

| Minuto | Instructor | Participante | Pantalla o módulo | Resultado esperado |
|---|---|---|---|---|
| 0-6 | "Ahora la empresa nos manda la nómina real: 4 nombres. Vamos a 'Identificar cupo 1'." | Toca **Identificar cupo 1** (en cada cupo pendiente) | **Nómina y Camas** | Se abre el diálogo de identificación |
| 6-14 | "Escribimos el nombre real de la persona — por ejemplo 'Pedro Almonte' — y guardamos." Repite para los 4 cupos. | Escribe el nombre y confirma, repite para cada cupo | Diálogo de identificación | Cada cupo pasa de "Sin nombre asignado" a mostrar el nombre real; aparece "✓ Identificado · Llegada por registrar en Habitaciones" |
| 14-20 | "Ahora que ya tiene nombre, recién ahí se puede registrar su llegada, igual que con un turista: vamos a Habitaciones, tocamos la pieza, 'Registrar ingreso'." | Repite el flujo de check-in de S2 para una de las 4 personas | **Habitaciones** | La pieza/cama queda ocupada por esa persona |
| 20-23 | "Si intentan registrar la llegada ANTES de poner el nombre, el sistema no va a dejar — va a pedir que completen el nombre en Nómina y Camas primero." Demuestra el mensaje de bloqueo si el instructor lo provoca a propósito. | Observa el mensaje "Cama reservada · Falta identificar a la persona" | — | Entiende el orden obligatorio: nombre antes que llegada |
| 23-25 | *(Descanso de 5 minutos dentro del bloque, breve)* | | | |
| 30-36 | "Ahora los consumos. Vamos a 'Consumos'." | Toca **Consumos** | **Consumos** | Lista de personas con sus comidas pendientes |
| 36-42 | "Arriba hay 3 filtros: 'Pendientes', 'Servidos' y 'Todos'. Dejamos 'Pendientes' para ver quién falta." Elige el servicio "Almuerzo". | Selecciona el chip **Pendientes** y el servicio **Almuerzo** | Chips de filtro | Ve solo a quienes no han comido ese servicio |
| 42-48 | "Si Pedro Almonte baja a almorzar, buscamos su nombre y tocamos el botón de ese servicio — como elegimos Almuerzo, el botón dice 'Servir almuerzo'." | Busca el nombre en "Buscar trabajador por nombre…" y toca **Servir almuerzo** | — | Pedro queda marcado como servido, no se puede duplicar |
| 48-56 | "Ahora el caso real: la empresa contrató 30 personas, pero hoy solo bajaron 15 a almorzar. Vamos a marcar a esas 15 juntas: las seleccionamos con el cuadradito y tocamos 'Registrar en lote'." Simula con las 4 personas de la demo. | Selecciona varios trabajadores con el checkbox, toca **Registrar N almuerzo(s) en lote** | — | Las 15 (o 4, en la práctica) quedan marcadas de una vez |
| 56-65 | "Ahora la pregunta importante: ¿la empresa paga por 15 o por 30? Por 30 — por todo lo que contrató, coman o no. El sistema lo compara solo en Conciliación, pero NUNCA cambia el monto facturado por esto." Muestra brevemente (sin entrar a fondo, eso es de la Administradora en S5) la idea de diferencia. | Repite con sus palabras: "si comen menos, igual se cobra lo contratado" | — | Repite correctamente la regla de negocio |
| 65-70 | "Si una persona pidió algo fuera de lo normal, como una bebida, eso se anota como colación con su propio precio, en el catálogo de extras." Muestra brevemente el catálogo (HU-41, ambos roles pueden agregarlo). | Observa | Catálogo de extras / consumo tipo colación | Entiende que un extra se cobra aparte, con su propio precio |
| 70-75 | Cierre y preguntas. | Preguntas | — | — |

**Errores habituales:** intentar marcar dos veces el mismo almuerzo a la misma persona (el sistema simplemente no lo deja duplicar, y lo muestra como "✓ Ya comió"); intentar el check-in antes de identificar el cupo.
**Cómo resolverlos:** mostrar que el sistema ya "se acuerda" de lo que se hizo, por eso no hay que tener miedo de tocar dos veces.
**Preguntas frecuentes:** *"¿Si me equivoco de persona al marcar el almuerzo, lo puedo borrar?"* No se borra (el libro de consumos no se edita ni se elimina, por diseño); se corrige con un registro nuevo — este detalle de "cómo corregir" se revisa con la Administradora en S5/S6 si es necesario, no en el día a día de la Encargada.
**Evidencia de aprendizaje:** completar la nómina de 4 personas, registrar al menos un check-in, y marcar en lote las comidas de 3 de las 4 personas, dejando 1 pendiente a propósito para comprobar que el filtro "Pendientes" la sigue mostrando.
**Criterio para pasar a S5/S6 (Administradora) o S7 (ambas):** evidencia lograda por ambos roles en su alcance correspondiente.

---

## SESIÓN 5 — Administración: compras, costos y cierre del mes (90 min, SOLO Administradora)

**Objetivo:** registrar una compra de insumos, entender el costo promedio, y diferenciar "descargar un reporte" de "cerrar la facturación del mes de verdad".
**Casos de referencia:** H, I.

| Minuto | Instructor | Participante | Pantalla o módulo | Resultado esperado |
|---|---|---|---|---|
| 0-6 | "Esto solo lo ve usted. Ni la Encargada ni nadie más en el teléfono de ella va a ver los costos ni los márgenes — es una decisión de diseño, para que esa información quede solo con usted." | Escucha | — | — |
| 6-10 | "Vamos a 'Costos'." | Toca **Costos** | **Costos** | Pantalla de compras e insumos |
| 10-14 | "Tocamos '+ Anotar Compra'." | Toca **+ Anotar Compra** | Modal de registro de compra | Se abre el formulario |
| 14-22 | "Primero la categoría — hay botones grandes: Carnes y Pollo, Verduras y Frutas, Abarrotes y Despensa, Gas y Combustible, Aseo y Limpieza, Otros Gastos. Elegimos 'Carnes y Pollo'." | Toca la categoría correspondiente | — | Categoría seleccionada |
| 22-30 | "Después el nombre del insumo — por ejemplo 'Pollo entero' — el monto total que pagó y la cantidad, con su unidad: kilos, unidades." | Completa los campos con datos ficticios (ej.: $45.000, 10 kg) | Campos de nombre, monto, cantidad | Formulario completo |
| 30-36 | "Hay un campo de 'Rendimiento estimado' — para cuántas raciones o noches alcanza esa compra. Esto es lo que después ayuda a calcular si está ganando o perdiendo con cada contrato." | Completa el rendimiento estimado | — | Formulario completo |
| 36-40 | Guarda la compra. "Fíjense que el 'costo promedio' del pollo se actualizó solo — no hay que calcularlo a mano, el sistema pondera el precio nuevo con el que tenía antes." | Observa el catálogo de insumos actualizado | "Catálogo y Precios Promedio" | Entiende que el costo se recalcula automáticamente |
| 40-45 | *(Descanso de 10 minutos)* | | | |
| 55-62 | "Ahora el cierre del mes. Vamos al contrato de la empresa y tocamos 'Cierre Mensual y Pre-facturación'." | Navega al cierre mensual del contrato de práctica | **Cierre Mensual y Pre-facturación** | Se abre el panel del mes |
| 62-68 | "Si quedan días sin conciliar, el sistema bloquea el cierre y le dice exactamente cuáles faltan. Esto es a propósito: no se puede cerrar un mes con diferencias sin revisar." (Mostrar el caso bloqueado si hay días pendientes de práctica, o explicarlo si ya está todo conciliado). | Observa el mensaje de bloqueo o el estado "conciliable" | — | Entiende que el bloqueo es una protección, no un error |
| 68-75 | "Puede descargar la Pre-factura en PDF o la Planilla para la contadora en Excel, cuantas veces quiera — esto NO cierra el mes todavía, solo genera el documento." Toca **Descargar Pre-factura (PDF)**. | Descarga el PDF | — | Ve el aviso: "esto no confirma el cierre definitivo del periodo" |
| 75-85 | "Para cerrar de verdad, hay un botón separado: 'Cerrar facturación de [mes]'. Una vez que lo toca, empieza a correr el plazo para que el sistema borre los nombres de la nómina de ese mes, más adelante, solo, automáticamente." | Toca **Cerrar facturación de [mes]**, confirma | — | El período queda cerrado; aparece la fecha desde la cual se anonimizarán los nombres |
| 85-90 | "Las cantidades, las fechas y los montos del libro de consumos NUNCA se borran — solo los nombres, y solo después de cerrado el mes, para cumplir la ley de protección de datos. Esto lo vemos más a fondo en la próxima sesión." Cierre y preguntas. | Preguntas | — | — |

**Errores habituales:** confundir "descargar el PDF" con "ya cerré el mes" (son acciones distintas, y el sistema lo dice explícitamente en el aviso de descarga); intentar cerrar con días pendientes de conciliar.
**Cómo resolverlos:** repetir siempre la frase "descargar no cierra, cerrar es un botón aparte".
**Preguntas frecuentes:** *"¿Puedo volver a descargar el PDF del mes pasado?"* Sí, cuantas veces quiera. *"¿Si cierro por error, se pierde algo?"* No se pierde ningún monto ni fecha; lo único que cambia, y solo tiempo después, son los nombres.
**Evidencia de aprendizaje:** registrar sola una compra completa y distinguir en voz alta, sin apoyo, la diferencia entre "descargar" y "cerrar".
**Criterio para pasar a S6:** evidencia lograda.

---

## SESIÓN 6 — Cuentas, privacidad y configuración (60 min)

**Para quién:** Administradora completa (0-45 min) + un bloque de 15 minutos compartido con la Encargada sobre su propio perfil (puede darse al final de S1 en vez de aquí, según conveniencia del calendario).
**Objetivo:** crear una cuenta nueva, saber qué hacer ante una solicitud de eliminación de datos, y cambiar la configuración del negocio.
**Caso de referencia:** K.

| Minuto | Instructor | Participante | Pantalla o módulo | Resultado esperado |
|---|---|---|---|---|
| 0-5 | "Esta pestaña de Cuentas y la de Privacidad solo las ve usted. Ábralas tocando su nombre, arriba." | Abre su perfil | **Mi Perfil** | Se abren las pestañas disponibles para Administradora |
| 5-12 | "Para dar de alta a otra persona — digamos, si contratara a alguien nuevo para que también use el sistema — toca '+ Crear Nueva Cuenta'." | Toca **+ Crear Nueva Cuenta** | Pestaña **Cuentas** | Se abre el formulario "Nueva Cuenta" |
| 12-20 | "Nombre, correo, y una contraseña de al menos 12 letras y números — es más larga que las de antes, a propósito, para que sea más difícil de adivinar." Completa con datos ficticios. | Completa el formulario | — | Formulario completo |
| 20-24 | Guarda. "Fíjese que su propia sesión sigue abierta — no la saca a usted para meter a la otra persona." | Observa que sigue dentro de su sesión | — | Confirma que no se desconectó |
| 24-30 | "Más abajo ve la lista de todas las cuentas, con el correo y la fecha en que se creó cada una." | Observa la lista | Lista de cuentas | Reconoce los datos de cada cuenta |
| 30-33 | *(Descanso breve de 5 min)* | | | |
| 38-46 | "Ahora algo importante: si alguna vez una empresa o un huésped le pide, por derecho, que se eliminen sus datos, vamos a la pestaña 'Privacidad'. Buscamos a la persona por nombre o RUT." | Escribe un nombre ficticio en "Nombre o RUT de la persona" y toca **Buscar** | Pestaña **Privacidad** | Aparece la persona en "Titulares Encontrados" |
| 46-54 | "Hay que escribir por qué se está eliminando — por ejemplo 'la persona lo pidió por escrito' — y confirmar. El sistema reemplaza el nombre por una marca y borra el RUT, pero las cantidades y fechas del libro de consumos quedan intactas, para que la contabilidad siga cuadrando." | Escribe el motivo y confirma sobre un dato ficticio de práctica | — | El nombre cambia a la marca de anonimizado; queda registrado en una bitácora |
| 54-60 | "Esto no se puede deshacer, así que solo se hace cuando de verdad corresponde. Y recuerde: nunca se anota un dato de salud de nadie en este sistema, en ninguna pantalla — ni siquiera en el motivo de un descuadre." Cierre y preguntas. | Preguntas | — | — |
| *(bloque Encargada, 15 min, en S1 o aquí)* | "Toque su nombre arriba para ver su perfil. Puede ver los datos de la pensión —el banco, la tarifa— pero no puede cambiarlos; solo la Administradora puede editar esos campos." | Abre su perfil, observa los campos deshabilitados | Pestaña **Mi Pensión** (solo lectura para Encargada) | Reconoce que puede ver pero no editar |

**Errores habituales:** escribir una contraseña de menos de 12 caracteres (el sistema la rechaza con un mensaje claro); intentar eliminar datos sin escribir un motivo (el botón de confirmar permanece bloqueado hasta que hay motivo).
**Cómo resolverlos:** mostrar el mensaje exacto y traducirlo: "pide una clave más larga, probemos con una frase fácil de recordar para usted, de 12 letras o más".
**Preguntas frecuentes:** *"¿Puedo eliminar los datos de cualquiera, aunque no me lo pidan?"* No debería hacerlo sin que corresponda un motivo real: queda registrado con fecha y motivo en una bitácora que no se puede borrar. *"¿Esto borra también los montos facturados?"* No, nunca — solo el nombre y el RUT.
**Evidencia de aprendizaje:** crear sola una cuenta nueva y completar sola una solicitud de eliminación de datos sobre un registro de práctica.
**Criterio para pasar a S7:** evidencia lograda por la Administradora; la Encargada reconoce su perfil de solo lectura.

---

## SESIÓN 7 — Trabajar sin señal (45 min, ambas)

**Objetivo:** reconocer qué sigue funcionando sin Internet, qué espera a que vuelva la señal, y qué hacer ante un aviso de "registros que necesitan revisión".
**Caso de referencia:** J.
**Requisito de entorno:** entorno de pruebas, nunca el teléfono real de producción durante el ejercicio de corte de red — ver `08-checklist-puesta-en-marcha.md`.

| Minuto | Instructor | Participante | Pantalla o módulo | Resultado esperado |
|---|---|---|---|---|
| 0-6 | "Vamos a apagar el Wi-Fi del teléfono de prueba a propósito, para mostrarles qué pasa cuando se corta la señal en Paposo — que ya sabemos que pasa seguido." | Observa | Configuración del teléfono (no de la app) | El teléfono queda sin red |
| 6-14 | "Ahora vamos a registrar un check-in, igual que en la Sesión 2." Demuestra el flujo completo. | Registra un check-in de práctica | **Habitaciones** | El check-in se guarda igual, de inmediato |
| 14-20 | "Miren el círculo de arriba: ahora dice 'Sin red · Cambios guardados en este celular'. Eso quiere decir que lo que acaban de hacer NO se perdió, solo está esperando que vuelva la señal." | Observa el indicador | **SyncStatusBadge** | Reconoce el mensaje de "Sin red" |
| 20-26 | "¿Qué funciones SÍ necesitan Internet sí o sí? Crear una cuenta nueva, y eliminar datos personales — esas dos, porque tienen que hablar con el servidor en el momento. Todo el resto del día a día (reservas, check-in, check-out, aseo, consumos) funciona igual sin señal." | Repite con sus palabras cuáles funciones necesitan señal | — | Nombra correctamente las 2 excepciones |
| 26-30 | *(Descanso breve)* | | | |
| 33-40 | "Ahora volvemos a prender el Wi-Fi." Espera a que el indicador cambie. "Van a ver que dice 'Enviando pendientes…' y después 'Sincronizado'. Eso es la carta llegando al cartero." | Observa el cambio de estado | — | Ve "Enviando pendientes…" y luego "Sincronizado" |
| 40-45 | "Y si alguna vez algo se cae de verdad —por ejemplo, dos personas reservaron la misma pieza al mismo tiempo sin verse— el sistema no lo deja pasar, y les va a avisar con un círculo rojo: 'N registro(s) necesitan revisión'. Ahí no se perdió nada, solo hay que mirar qué pasó y decidir qué hacer." Cierre y preguntas. | Preguntas | — | — |

**Errores habituales:** creer que "Sin red" significa que se perdió lo que se anotó (no es así); entrar en pánico ante el aviso rojo.
**Cómo resolverlos:** repetir siempre: "guardado en el teléfono, esperando el cartero".
**Preguntas frecuentes:** *"¿Y si se me acaba la batería del teléfono mientras está 'esperando'?"* Al volver a encenderlo y recuperar señal, sigue esperando enviar lo pendiente; no se pierde. *"¿Cuánto tiempo puede estar sin red antes de que se pierda algo?"* No hay un límite conocido y probado de días; mientras más tiempo pase, más importante es avisar al equipo de soporte si algo no cuadra — ver `10-soporte-continuidad-costos.md`.
**Evidencia de aprendizaje:** cada participante reconoce y nombra correctamente, sin ayuda, los 4 estados del indicador que vio en esta sesión y en la Sesión 1.
**Criterio para pasar a S8:** evidencia lograda.

---

## SESIÓN 8 — Jornada simulada y evaluación (90 min + 30 min de evaluación, ambas por separado)

Ver `07-evaluacion-aprendizaje.md` para la rúbrica completa. Aquí solo el guion de la jornada simulada que antecede a la evaluación formal.

| Minuto | Instructor | Participante | Pantalla o módulo | Resultado esperado |
|---|---|---|---|---|
| 0-5 | "Hoy no les voy a decir qué botón tocar. Les voy a contar lo que está pasando, como si fuera un día real, y ustedes van a decidir qué hacer en el sistema." | Escucha | — | — |
| 5-20 | "Llega un WhatsApp: alguien quiere una pieza para esta noche, se llama [nombre ficticio]." Observa sin intervenir, solo toma notas. | Resuelve sola: revisa disponibilidad, reserva, confirma | **Reservar** | Reserva creada sin pistas |
| 20-35 | "Esa persona llega. Después, a mitad de la jornada, avisa que se va." | Resuelve sola: check-in, luego check-out, luego aseo | **Habitaciones** | Ciclo completo resuelto |
| 35-50 | *(Solo si corresponde al rol)* "Llega una empresa nueva con 3 trabajadores, pero todavía sin nombres." | Resuelve sola: empresa, contrato, camas sin nómina | **Empresas** → **Nómina y Camas** | Camas reservadas sin nombre |
| 50-65 | "La empresa manda los 3 nombres y avisa que solo 2 van a almorzar hoy." | Resuelve sola: identificar cupos, check-in, marcar 2 almuerzos en lote dejando 1 pendiente | **Nómina y Camas** → **Consumos** | Nómina completa; consumos correctos |
| 65-75 | *(Solo Administradora)* "Fin de mes: la empresa quiere la pre-factura." | Resuelve sola: revisa conciliación, descarga PDF, cierra el mes si corresponde | **Cierre Mensual** | Reportes generados; distingue descarga de cierre |
| 75-90 | "Ahora vamos a apagar la red sin avisar el momento exacto. Sigan trabajando." Corta la red en un instante no anunciado. | Detecta el cambio de indicador y continúa trabajando con normalidad | — | Reconoce "Sin red" sin ayuda y sigue operando |

Al término de este bloque se aplica la evaluación formal de `07-evaluacion-aprendizaje.md`.
