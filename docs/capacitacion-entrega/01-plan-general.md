# 01 — Plan general de capacitación

Basado en el inventario de `00-auditoria-capacitacion.md`. Antes de leer este plan, el instructor debe haber leído ese documento completo: aquí no se repiten las referencias a código ni a HU, solo la organización pedagógica.

## 1. A quién capacitamos

| | Administradora (María) | Encargada (quien use el segundo teléfono: madre, cuñada o sobrina, según el día) |
|---|---|---|
| Qué ve en el sistema | Todo: habitaciones, reservas, empresas, nómina, consumos, conciliación, compras, cierre, panel ejecutivo, cuentas, privacidad, configuración | Habitaciones, reservas, nómina, consumos, aseo, catálogo de extras, su propio perfil. **No ve** empresas, compras, cierre, panel ejecutivo, cuentas ni privacidad — ni la pestaña ni el dato aparecen |
| Relación previa con tecnología | Celular para WhatsApp y llamadas; cuaderno físico para todo lo administrativo; reconoce aprensión por el salto tecnológico (acta 21/09/2026) | Variable según quién sea ese día; se asume el mismo nivel básico |
| Mayor temor esperado | "Voy a perder el cuaderno de años" / "¿Qué pasa si aprieto algo mal?" | "¿Cómo sé si ya se guardó?" |
| Principio rector de su track | Avanzar de lo que YA hacía en papel hacia lo mismo en el teléfono, un paso a la vez | Dominar primero las 3-4 acciones que hace todos los días, antes de ver nada más |

**Nunca se asume que ambas personas aprenden lo mismo al mismo tiempo.** El plan tiene un tronco común (orientación, habitaciones, consumos, sin conexión) y dos ramas separadas (empresas/contratos/compras/cierre/privacidad son solo de la Administradora).

## 2. Principios pedagógicos aplicados (no solo listados, con su consecuencia práctica)

| Principio | Cómo se aplica en este plan |
|---|---|
| Explicar antes de demostrar | Cada sesión del guion (`02-guion-instructor.md`) empieza con una frase de contexto de negocio, nunca con "toque este botón" |
| Demostrar lentamente | El instructor hace la operación completa UNA vez, en voz alta, sin apuro, antes de pedir que la participante toque nada |
| Usar una tarea real | Todos los casos prácticos (`03-casos-practicos.md`) parten de una situación que ya le pasó a la pensión: alguien llama por WhatsApp, una empresa manda 4 trabajadores, el recuento del almuerzo no calza |
| Pedir que repita | Después de cada demostración, la participante hace la MISMA operación con datos distintos, sin que el instructor toque la pantalla |
| Corregir con lenguaje sencillo | Nunca se dice "error de validación" o "constraint violado"; se dice qué pasó y qué hacer, en las palabras exactas de los mensajes del sistema (ver columna "Errores habituales" de cada sesión) |
| Evitar tecnicismos | "Sincronizar" se explica una sola vez, en la Sesión 1, con la metáfora de una carta que se envía cuando vuelve la señal; después se usa esa misma palabra sin volver a explicarla |
| Repetir funciones esenciales | Reservar, registrar check-in/check-out y marcar consumo se repiten en más de una sesión y en la jornada simulada final |
| Permitir preguntas | Cada bloque del guion tiene un cierre de 3-5 minutos sin agenda, antes del descanso |
| No introducir demasiado a la vez | Ninguna sesión enseña más de 3 operaciones nuevas. Si una pantalla tiene 5 botones, la primera clase usa 2 |
| Confirmar con práctica, no con "¿entendió?" | Cada sesión termina con una Evidencia de aprendizaje: algo que la participante hizo sola y que se puede comprobar mirando la pantalla o el PDF generado |

## 3. Por qué 8 sesiones y no 1 ni 12

Una sola sesión obligaría a enseñar 42 historias de usuario en un día: es la receta exacta para la "exposición técnica" que este encargo prohíbe. Doce sesiones fragmentarían tanto el aprendizaje que la Sra. María olvidaría la Sesión 1 antes de llegar a la 5. Ocho sesiones cortas (45-90 minutos cada una), agrupadas por tarea de negocio y no por pantalla técnica, permiten repetir lo esencial sin agotar a alguien que trabaja todo el día en la pensión.

## 4. Programa definitivo

| # | Sesión | Objetivo | Para quién | Duración | Casos de `03-casos-practicos.md` |
|---|---|---|---|---|---|
| S1 | Entrar y orientarse | Iniciar y cerrar sesión sola, reconocer las 8 piezas por color, entender qué significa el círculo de sincronización, saber dónde está la ayuda | Ambas, juntas | 45 min | — |
| S2 | Habitaciones: reservar, llegar, salir, cancelar | Resolver de principio a fin una reserva de turista: crearla, recibir a la persona, despedirla, y cancelar si no llega | Ambas, juntas | 90 min | A, B, G |
| S3 | Empresas: contrato y camas sin nómina | La Administradora registra la empresa y el contrato; ambas ven cómo reservar camas antes de tener los nombres | Administradora completa; Encargada solo la mitad (ver nota) | 75 min | C, D |
| S4 | Llegada de trabajadores y consumos diarios | Completar la nómina cuando llegan los nombres, registrar el check-in, marcar las comidas servidas y entender por qué 15 personas comiendo no cambian lo que se factura por 30 | Ambas, juntas | 75 min | E, F |
| S5 | Administración: compras, costos y cierre del mes | Registrar una compra, entender qué significa el costo promedio, armar la pre-factura y diferenciar descargar un PDF de cerrar el mes de verdad | **Solo Administradora** | 90 min | H, I |
| S6 | Cuentas, privacidad y configuración | Crear una cuenta nueva, saber qué hacer si alguien pide eliminar sus datos, cambiar la tarifa base y los datos bancarios | **Administradora completa**; Encargada solo ve su propio perfil (15 min, dentro de S1 o como anexo) | 60 min | K |
| S7 | Trabajar sin señal | Reconocer qué sigue funcionando sin Internet, qué espera a que vuelva la señal, y qué significa cada color del indicador | Ambas, juntas | 45 min | J |
| S8 | Jornada simulada y evaluación | Resolver sola una mañana completa de la pensión, sin que el instructor indique los clics | Ambas, por separado | 90 min + 30 min de evaluación | Repite A-G integradas |

**Nota sobre S3 con la Encargada:** ella no entra a Empresas (no tiene el botón), pero sí necesita reconocer, desde Habitaciones o Nómina y Camas, un mensaje como "Cama reservada · Falta identificar a la persona" y saber qué significa. Su parte de S3 dura 20-25 minutos dentro de la sesión conjunta de Nómina y Camas; el resto (crear el contrato) lo observa sin participar, o se retira.

## 5. Calendario propuesto

No en un solo día. Se distribuye en **4 jornadas**, con al menos un día de por medio entre la 1 y la 2 para que lo aprendido se asiente (es exactamente lo que la literatura de capacitación a adultos con baja exposición tecnológica recomienda, y coincide con la "aprensión" que la propia Sra. María manifestó).

| Jornada | Sesiones | Duración total | Quién participa |
|---|---|---|---|
| Jornada 1 | S1 + S2 (con 1 descanso de 10 min entre medio) | ~2 h 15 min | Administradora + Encargada |
| Jornada 2 (2-3 días después) | S3 + S4 (con 1 descanso de 10 min) | ~2 h 40 min | Administradora + Encargada (parcial en S3) |
| Jornada 3 (2-3 días después) | S5 + S6 (con 1 descanso de 10 min) | ~2 h 50 min | Solo Administradora |
| Jornada 4 (después de 2-3 días de uso con acompañamiento, ver `10-soporte-continuidad-costos.md` sobre marcha blanca) | S7 + S8 + evaluación | ~2 h 45 min | Administradora + Encargada, evaluadas por separado |

**Total de horas de aula: Administradora ≈ 9 h 30 min repartidas en 4 jornadas; Encargada ≈ 6 h 40 min repartidas en 4 jornadas** (participa completa en S1, S2, S4, S7, S8; parcial en S3; no participa en S5 ni S6 salvo los 15 minutos de su propio perfil).

Entre la Jornada 3 y la Jornada 4 debe haber **al menos 2-3 días de uso real con acompañamiento a distancia** (llamada o WhatsApp disponible), no solo de espera — es lo que en `11-pendientes-y-validaciones.md` y en la Sección 10 se llama marcha blanca, y es la base de la evaluación de S8.

## 6. Descansos y ritmo

- Ninguna sesión supera los 90 minutos sin un descanso de al menos 10 minutos.
- Dentro de cada sesión, cada bloque de "explicación + demostración + práctica" de una sola operación no debe durar más de 20-25 minutos; si toma más, es señal de que la operación se dividió mal y hay que partirla en dos sub-pasos en el guion.
- Nunca se agenda una sesión nueva inmediatamente después de otra sin al menos un día de separación, salvo dentro de la misma jornada (dos sesiones seguidas con un descanso, como se definió arriba).

## 7. Criterios de progreso entre sesiones

Pasar de una sesión a la siguiente requiere que la participante haya completado la Evidencia de aprendizaje de la sesión anterior (definida sesión por sesión en `02-guion-instructor.md`), **no solo haber asistido**. Si no la completó:
- Se repite esa evidencia al inicio de la sesión siguiente, antes de avanzar (5-10 minutos).
- Si tras ese repaso sigue sin lograrla sola, se marca en el acta de capacitación (`09-acta-capacitacion-y-recepcion.md`) como "necesita refuerzo" y se agenda una sesión corta adicional antes de avanzar — nunca se avanza arrastrando un vacío, porque las sesiones siguientes dependen de las anteriores (ej.: S4 exige que S2 y S3 ya funcionen).

## 8. Material transversal necesario para todas las sesiones

- El teléfono real que usará cada persona (no un teléfono del equipo de desarrollo) — ver `08-checklist-puesta-en-marcha.md`.
- Datos de demostración cargados (empresas, contratos, reservas ficticias) — nunca datos de huéspedes o trabajadores reales.
- `06-guia-rapida.md` impresa, disponible desde la primera sesión, no solo al final.
- Cuaderno de la pensión a la vista durante las primeras sesiones: el objetivo no es reemplazarlo de inmediato, es mostrar cómo la misma información que hoy va al cuaderno pasa al sistema.
