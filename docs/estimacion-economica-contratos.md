# Estimación económica de contratos de empresa

Rama `feat/estimacion-economica-contratos`, base `main` (`cc5c3fe`). Migración `0026_condiciones_economicas_contrato.sql`.

## Qué significa `tarifa_convenida`

No cambió de significado: sigue siendo un monto **por persona y por día** — la unidad que ya usaban `useMargenProyectado.ts` y `useCierreMensual.ts` antes de esta migración. Esta migración solo hizo esa unidad explícita en la etiqueta del formulario ("Tarifa convenida por persona y día ($)") y en un comentario SQL de la columna. Ningún contrato existente se reinterpreta ni se recalcula.

## Qué se agregó

- `contrato_empresa.incluye_desayuno/incluye_almuerzo/incluye_cena` (boolean, default `true`) y `condicion_tributaria` (`neto` | `con_iva` | `null`, default `null`). El alojamiento no tiene columna propia: el cargo base (`headcount × tarifa × días`) ya es el cargo de alojamiento, así que no hay forma de "excluirlo" sin romper el cálculo. Los defaults preservan el supuesto implícito que ya tenía `tipo_consumo_config` para todo contrato: desayuno/almuerzo/cena se asumían incluidos; esta migración solo lo hace explícito y editable por contrato, nunca lo invierte retroactivamente.
- `contrato_empresa_ajuste`: bitácora append-only de ajustes de cantidad contratada (motivo, cantidad anterior/nueva, fecha efectiva, quién lo registró). No reemplaza el versionado de vigencias (HU-02, que sigue siendo quien cierra/abre filas de `contrato_empresa`) — es la trazabilidad explícita del *por qué*.
- Mismo tratamiento de confidencialidad que `tarifa_convenida` (RLS + `GRANT` de columna + vista `contrato_empresa_rest`): la Encargada nunca ve `incluye_*`/`condicion_tributaria`. `contrato_empresa_ajuste` sí se replica a ambos roles (no lleva montos, solo cantidades y motivo).

## Cálculo de la estimación

Centralizado en `app/src/features/reservaEmpresa/estimacionContrato.ts` (función pura, con tests). Fórmula: `headcount × tarifaConvenida` = costo diario; si hay `vigencia_hasta`, `díasFacturables × costoDiario` = total estimado (días de calendario puro, ambos extremos incluidos — mismo criterio que ya usaban `useMargenProyectado.ts`/`useCierreMensual.ts`, pero calculado con aritmética de calendario (`diferenciaDiasYMD` en `fechaNegocio.ts`) en vez de diferencia de milisegundos, para no arrastrar ningún desfase de huso horario). Si el contrato es **abierto** (sin `vigencia_hasta`), no hay total: solo costo diario y una proyección referencial a 30 días, etiquetada explícitamente como proyección.

Los "servicios incluidos" son **informativos**, no un insumo del cálculo: la tarifa es un monto global pactado con la empresa (ver `ev/precios.txt`, que no desglosa alojamiento/alimentación para el caso empresa), así que marcar o desmarcar un servicio no suma ni resta del total — documenta qué cubre esa tarifa para que no se vuelva a cobrar aparte al registrar el consumo real. La conciliación y el cierre mensual (`useCierreMensual.ts`) no cambiaron: siguen comparando cabezas/raciones, nunca montos, y el único cargo "extra" real sigue siendo la colación (igual que antes de esta migración).

## Ajuste de cantidad contratada

`app/src/features/reservaEmpresa/ajustarCantidadContrato.ts` reutiliza `crearContratoEmpresa` (HU-02): cierra la vigencia del contrato actual en la fecha efectiva y abre una fila nueva con la nueva cantidad, conservando tarifa, servicios y condición tributaria — un ajuste de cantidad no es un ajuste de precio. No permite una fecha efectiva igual o anterior al inicio del contrato actual (no se reescribe un período ya transcurrido) ni posterior a su fecha de término. Registra el motivo en `contrato_empresa_ajuste`. El diálogo (`AjustarCantidadContratoDialogo.tsx`, en Empresas → ficha del contrato) muestra cantidad anterior/nueva, la tarifa aplicable (no editable aquí) y la estimación antes/después con la diferencia en pesos.

## Dónde aparece

- `ContratoScreen.tsx`: tarifa clarificada, sección plegable "servicios incluidos y condición tributaria" (divulgación progresiva), tarjeta "Estimación del contrato" en tiempo real.
- `ModuloEmpresas.tsx` (ficha de contrato): misma tarjeta con los datos guardados + botón "Ajustar cantidad contratada". Solo se muestra si `tarifa_convenida` llegó al teléfono (null en el de la Encargada).
- `CuposEmpresaPanel.tsx` (Nómina y Camas): versión compacta de una línea, sin duplicar el formulario completo.
- Prefactura PDF (`generarPreFacturaPdf.ts`): agrega "Incluido en la tarifa" y la condición tributaria bajo la tarifa diaria pactada.

## Pruebas

pgTAP nuevo (`db/pgtap/25_condiciones_economicas_contrato.sql`, 11 comprobaciones) corrido contra Postgres real (Docker) junto a los 24 archivos pgTAP existentes — todos verdes, dos corridas limpias de migraciones desde cero. Vitest: 25 tests nuevos en `estimacionContrato.test.ts` (incluye los casos de calendario de la sección 13: cruce de mes, cruce de año, un solo día, contrato abierto, fecha de término inválida) y `ajustarCantidadContrato.test.ts`; suite completa 273/273 verde; `tsc --noEmit` y `npm run build` limpios.

No se corrieron Playwright/k6/Lighthouse para este cambio — son principalmente formulario + lectura de datos locales, cubiertos por Vitest; se deja como limitación documentada si se requiere evidencia E2E adicional.
