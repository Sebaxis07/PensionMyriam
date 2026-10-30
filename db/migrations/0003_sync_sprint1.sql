-- =====================================================================
-- Migración 0003: suma a la publicación de PowerSync las tablas que
-- necesita el Sprint 1 (cama, reserva, checkin, checkout, aseo) para
-- que el ciclo de vida de habitaciones funcione completo offline.
-- Los permisos de lectura de powersync_replication ya cubren estas
-- tablas desde 0002 (GRANT SELECT ON ALL TABLES + ALTER DEFAULT
-- PRIVILEGES, aplicado cuando 0001 ya las había creado).
-- =====================================================================
begin;

-- HU-01: "existe al menos una habitación disponible... bloquea la
-- habitación seleccionada para esas fechas". `reserva` no tenía el
-- equivalente al EXCLUDE que ya protege a contrato_empresa contra
-- vigencias solapadas — sin esto, dos reservas Confirmadas podían
-- coexistir sobre la misma cama en fechas que se cruzan.
alter table public.reserva
  add constraint reserva_no_solapa_cama
  exclude using gist (
    cama_id with =,
    daterange(fecha_inicio, coalesce(fecha_fin, 'infinity'::date), '[]') with &&
  ) where (estado = 'confirmada');

alter publication powersync add table
  public.cama,
  public.reserva,
  public.checkin,
  public.checkout,
  public.aseo;

commit;
