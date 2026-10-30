# Revisión visual de Sprints 1 y 2

Este entorno monta los componentes reales con datos ficticios y reemplaza **solo en esta configuración de Vite** PowerSync, sus consultas y Supabase. No inicia sesión, no contacta APIs y no escribe en la base real. No forma parte de la entrada ni del build de producción.

Desde `app/`: `npx vite --config vite.revision-ui.config.ts --port 5182`.
Abrir `http://127.0.0.1:5182/pruebas-ui/?vista=habitaciones`.

Vistas: `habitaciones`, `reserva`, `contrato`, `empresas`, `nomina`, `aseo`, `calendario`, `ingreso`, `salida`, `mantencion`, `aseo_pieza`, `sync`.
Estados: `?vista=sync&estado=sin-red`, `sin-red-pendientes`, `pendientes`, `enviando`; `vacio`, `error`, `guardando`, `cargando` permiten revisar la presentación de esas situaciones con los componentes que las exponen.

Para comparar con el commit base, definir `UI_ANTES=1` antes de iniciar el mismo comando en otro puerto. El plugin carga el código original de las pantallas auditadas desde Git; no revierte archivos.

Estos ensayos verifican presentación e interacción local. No sustituyen los E2E de backend, persistencia offline ni sincronización real. No usar este servidor como entorno productivo.
