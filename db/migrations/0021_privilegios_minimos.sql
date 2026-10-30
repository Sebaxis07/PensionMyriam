-- =====================================================================
-- Migración 0021: privilegios mínimos reales para `anon` y
-- `authenticated` (auditoría de seguridad del Sprint 5).
--
-- QUÉ SE ENCONTRÓ
--
-- Una prueba E2E que verificaba que el catálogo de extras fuera
-- append-only consultó los privilegios reales y devolvió esto para el
-- rol `authenticated` (el rol con el que PostgREST ejecuta TODA
-- petición de la app) sobre CADA tabla de `public`:
--
--   DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
--
-- Es decir: privilegios totales, incluidas `consumo` (el libro contable
-- inmutable, RNF-03) y la bitácora de acceso a datos personales. Los
-- causa la propia imagen de Supabase, que trae un
-- `alter default privileges ... grant all on tables to anon,
-- authenticated, service_role`: los `grant select, insert` explícitos de
-- 0001_init.sql nunca restringieron nada, solo repitieron algo que ya
-- estaba concedido de más. El comentario de 0001_init.sql ("el rol
-- `authenticated` … por defecto no tiene ningún privilegio sobre
-- `public`") era incorrecto para esta imagen.
--
-- POR QUÉ IMPORTA, SI RLS SIGUE ACTIVA
--
-- Para UPDATE y DELETE, RLS contiene el daño casi siempre: sin policy
-- que los permita, la operación no calza ninguna fila. Pero hay dos
-- agujeros reales:
--
--  1. TRUNCATE NO PASA POR RLS. Ninguna policy lo filtra y tampoco
--     dispara los triggers de fila que protegen el ledger
--     (`consumo_sin_update` / `consumo_sin_delete` son FOR EACH ROW).
--     Con el privilegio concedido, `truncate public.consumo` vacía el
--     libro contable inmutable, y `truncate
--     public.bitacora_acceso_datos_personales` borra la evidencia de
--     auditoría que exige HU-33.
--  2. Donde la policy es permisiva para ambos roles (`justificacion_rw`,
--     `aseo_rw`, `checkin_rw`, `checkout_rw`, `reserva_rw`,
--     `habitacion_rw`, `cama_rw` son `FOR ALL`), el DELETE concedido sí
--     alcanza filas: la Encargada podía BORRAR justificaciones de
--     descuadre —el respaldo del supervisor que autorizó— o check-ins
--     ya registrados, cuando la intención de las migraciones era
--     `grant select, insert`.
--
-- No había camino de explotación desde la app (PostgREST no expone un
-- verbo TRUNCATE y no hay SQL de paso), pero el privilegio concedido es
-- la diferencia entre "no se puede" y "no se nos ocurrió cómo". Este es
-- el tipo de hallazgo que §13 pide buscar: autorización real, no
-- botones ocultos.
--
-- QUÉ HACE ESTA MIGRACIÓN
--
-- Revoca todo y vuelve a conceder solo lo que la app necesita para
-- funcionar: sin DELETE y sin TRUNCATE en ninguna tabla, sin ningún
-- privilegio para `anon`, y sin escritura sobre `usuario` ni sobre la
-- bitácora. No cambia ninguna policy de RLS: RLS sigue decidiendo QUÉ
-- FILAS; esto arregla la otra mitad, la de si se puede tocar la tabla.
--
-- El UPDATE sí se conserva en las tablas que la app escribe, por una
-- razón técnica que está documentada en detalle más abajo: el conector
-- sube cada inserción como un upsert, y Postgres exige UPDATE para esa
-- forma de sentencia. Quitarlo deja al sistema sin sincronización, no
-- más seguro.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 1. Punto de partida limpio
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

-- Y que las tablas FUTURAS no vuelvan a nacer con privilegios totales:
-- sin esto, la próxima migración que cree una tabla reintroduce el
-- problema en silencio. Se fija para los roles que crean objetos acá.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role supabase_admin in schema public
  revoke all on tables from anon, authenticated;

-- `anon` es una petición SIN sesión. No tiene nada que hacer en el
-- esquema de la pensión: no se le devuelve ningún privilegio de tabla.
-- (Las policies ya lo bloqueaban por `app.rol() is not null`, pero el
-- privilegio sobraba igual.)

-- ---------------------------------------------------------------------
-- 2. Matriz intencional, tabla por tabla
--
-- DELETE y TRUNCATE no se devuelven a NINGUNA tabla: son los dos
-- privilegios con un agujero real (TRUNCATE ignora RLS por completo;
-- DELETE sí alcanzaba filas en las tablas con policy `FOR ALL`).
--
-- UPDATE sí se devuelve a toda tabla en la que la app escriba, aunque
-- sea append-only. No es un descuido: el conector de PowerSync sube
-- cada inserción como un `upsert` de PostgREST
-- (`INSERT … ON CONFLICT (id) DO UPDATE`, ver app/src/lib/connector.ts),
-- y Postgres exige el privilegio de UPDATE para esa forma de sentencia
-- incluso cuando no hay conflicto que resolver. Se descubrió quitándolo:
-- la batería E2E completa dejó de poder subir consumos, check-ins,
-- compras y productos extra — 7 especificaciones de los Sprints 1 a 4 en
-- rojo. Revocarlo no hace el sistema más seguro, lo deja sin
-- sincronización.
--
-- La inmutabilidad de lo append-only NO depende de este privilegio y
-- sigue en pie por dos barreras que sí se verifican:
--   * RLS: esas tablas no tienen policy de UPDATE, así que un UPDATE no
--     calza ninguna fila (db/pgtap/01_consumo_inmutable.sql).
--   * Triggers de fila: `consumo_sin_update` / `consumo_sin_delete`,
--     `cierre_facturacion_sin_update`, `bitacora_sin_update`.
-- Lo que esta migración agrega es la tercera barrera que faltaba por
-- completo: que no exista ninguna forma de escritura capaz de saltarse
-- las dos anteriores.
-- ---------------------------------------------------------------------

-- Operación diaria.
grant select, insert, update on public.habitacion to authenticated;
grant select, insert, update on public.cama       to authenticated;
grant select, insert, update on public.reserva    to authenticated;
grant select, insert, update on public.checkin    to authenticated;
grant select, insert, update on public.checkout   to authenticated;
grant select, insert, update on public.aseo       to authenticated;

-- Ledger inmutable (RNF-03). El UPDATE es para el upsert del conector;
-- el trigger `consumo_sin_update` lo rechaza igual si alguien intenta
-- editar una fila existente.
grant select, insert, update on public.consumo to authenticated;
grant select on public.v_consumo_vigente to authenticated;

-- Empresas y nómina.
grant select, insert, update on public.empresa    to authenticated;
grant select, insert, update on public.trabajador to authenticated;

-- contrato_empresa: se conserva lo de 0015_seguridad_tarifa.sql —
-- `tarifa_convenida` queda SIN privilegio de lectura por columna, de
-- modo que ni un select explícito de esa columna pasa. El `revoke all`
-- de arriba se llevó también esos grants de columna: hay que reponerlos.
grant select (id, empresa_id, vigencia_desde, vigencia_hasta, headcount, creado_por, created_at)
  on public.contrato_empresa to authenticated;
grant insert, update on public.contrato_empresa to authenticated;
grant select on public.contrato_empresa_rest to authenticated;

-- Conciliación y su respaldo.
grant select, insert, update on public.conciliacion_diaria to authenticated;
grant select, insert, update on public.justificacion_descuadre to authenticated;

-- Catálogos.
grant select on public.tipo_consumo_config to authenticated;
grant select, insert, update on public.producto_extra to authenticated;

-- Costos (decisión E): filtrados a la Administradora por RLS.
grant select, insert, update on public.insumo to authenticated;
grant select, insert, update on public.compra_insumo to authenticated;

-- Cuentas: la app SOLO LEE `usuario`. El alta va por el RPC
-- `crear_cuenta_usuario` (SECURITY DEFINER). Sin insert ni update,
-- nadie puede ascenderse a 'administradora' con un PATCH a la API —
-- esta tabla no la escribe el conector, así que no necesita el UPDATE
-- del upsert.
grant select on public.usuario to authenticated;

-- Sprint 5.
grant select, update on public.config_negocio to authenticated;              -- UPDATE filtrado a Administradora por RLS
grant select, insert, update on public.cierre_facturacion to authenticated;  -- UPDATE solo para el upsert; el trigger lo rechaza
-- Bitácora: solo lectura, y solo para la Administradora por RLS. Las
-- escrituras entran por funciones SECURITY DEFINER
-- (0019_supresion_arco.sql), nunca desde el cliente.
grant select on public.bitacora_acceso_datos_personales to authenticated;

-- `schema_migrations` es control interno del runner de migraciones: la
-- app no tiene por qué verla (queda sin privilegios tras el revoke).

commit;
