# Publicación del diseño de Sprints 1 y 2

Esta nota actualiza el estado de publicación del informe histórico `auditoria-ui-sprints-1-2.md`, sin cambiar el diseño ni borrar su procedencia.

## Base y preservación

PR técnico #47 fusionado por el usuario en `sprint-2`: `53d59b2e61b87f612ac9f4ca3fc177e1d6781689`. Su árbol coincide con la cabeza técnica `651c6a12341f6dae8dd1e4665fc6e2110b306558`; no hubo cambios adicionales de negocio al actualizar la base.

Se publica `design/publicacion-sprints-1-2-ui-ux` contra `sprint-2`. Se utilizó una rama nueva para conservar intactos la rama original `design/sprints-1-2-ui-ux` y su trabajo sin confirmar. El commit preservado `0cbbea165c8d96ae2dbcfbfeea8d1a98e881f735` contiene el diseño anterior. Se integró la ascendencia actual de `sprint-2` mediante un commit local de integración, sin reescribir historia ni fusionar un PR en GitHub.

Los archivos visuales del worktree original coinciden con esta copia. La diferencia observada en `e2e/offline-write-syncs.spec.ts` de ese worktree vuelve a seleccionar almuerzo, mientras la base técnica contiene la corrección de Claude a desayuno para evitar colisiones con HU-14. No se transportó esa diferencia de origen no atribuido ni se editó el worktree original. Los cambios de esa prueba incluidos en el PR son únicamente las etiquetas de ingreso/salida correspondientes al diseño; `rack-seleccion-fecha.spec.ts` adapta el selector al botón accesible dentro de la celda.

El diff respecto de `sprint-2` contiene presentación, pruebas y documentación. No agrega funcionalidades técnicas de Sprint 4: ya pertenecen a la base. No modifica `src/features`, `src/lib`, SQL, RLS, autenticación, conectores, permisos, generadores ni configuración de PowerSync.

## Verificación de publicación

- `npx tsc --noEmit`: aprobado.
- `npx vitest run`: **163/163**, 30 archivos.
- `npm run build`: aprobado, con advertencia de tamaño del paquete principal existente.
- `npx playwright test --config playwright.visual.config.ts`: **79/79**.
- Anchos: 320, 390, 768, 1024 y 1280 px.
- `git diff --check`: aprobado.
- Se utilizó una clave ficticia solo para cargar la prueba del conector, sin credenciales reales.

Playwright utiliza adaptadores de demostración aislados y datos ficticios. Las pruebas existentes de persistencia local SQLite/PowerSync se ejecutaron dentro de Vitest; no se presentan como sincronización de extremo a extremo. Docker no estaba disponible y no se ejecutaron pruebas contra PostgreSQL, PowerSync ni Supabase reales. No hay workflows de GitHub Actions configurados en el repositorio al comprobar la publicación.

## Evidencia

Selección pequeña, generada al verificar esta publicación:

| Ancho | Antes | Después |
|---|---|---|
| 390 px | [Habitaciones](evidencia-diseno-1-2/habitaciones-antes-390.png) | [Habitaciones](evidencia-diseno-1-2/habitaciones-despues-390.png) |
| 1280 px | [Habitaciones](evidencia-diseno-1-2/habitaciones-antes-1280.png) | [Habitaciones](evidencia-diseno-1-2/habitaciones-despues-1280.png) |

Las capturas comparan el diseño previo (`8bd04a5`) con el diseño publicado, usando los mismos registros ficticios. El resto de la evidencia temporal permanece fuera del repositorio. La guía sigue siendo `Guiaestilos/PENSION_SEÑORA_MYRIAM_KIT_DIGITAL/03_PROTOTIPO_WEB-/PROTOTIPO_PAGINA_WEB/styles.css`, con tokens existentes, Georgia y DM Sans.

## Integración

Este es el primer PR visual. El diseño de Sprints 3 y 4 se publica en otro PR, apilado sobre esta rama y como Draft mientras esta siga abierta. Orden: #47 (ya fusionado) → diseño 1/2 → diseño 3/4. No fusionar automáticamente ni cerrar issues mediante esta publicación.
