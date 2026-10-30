-- =====================================================================
-- Migración 0004: la app necesita resolver su propio usuario.id (no
-- auth_uid) para completar realizado_por/responsable/creado_por al
-- escribir reserva/checkin/checkout/aseo. Sin esto, cada pantalla
-- tendría que adivinarlo o pedirlo al servidor en línea — rompiendo el
-- camino único de escritura offline (HU-27).
-- =====================================================================
begin;

alter publication powersync add table public.usuario;

commit;
