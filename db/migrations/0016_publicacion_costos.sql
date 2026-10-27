-- Defecto independiente encontrado al verificar la corrección de
-- seguridad del Sprint 4 (ver 0015_seguridad_tarifa.sql e
-- infra/powersync/config.yaml): insumo/compra_insumo (Sprint 4,
-- HU-22/23) nunca se agregaron a la publicación lógica "powersync"
-- (ver 0002/0003/0004/0007/0010_*.sql, que sí lo hacen para cada tabla
-- nueva de su sprint). Sin esto, PowerSync nunca pudo replicarlas a
-- NINGÚN dispositivo, para ningún rol — confirmado en los logs reales
-- del servicio ("Skipping public.insumo - not part of powersync
-- publication"). El módulo de Costos solo "funcionaba" en el mismo
-- dispositivo que escribía la compra (dato local optimista); nunca se
-- sincronizó de verdad entre dispositivos ni sobrevivió a una
-- reinstalación.
begin;

alter publication powersync add table public.insumo, public.compra_insumo;

commit;
