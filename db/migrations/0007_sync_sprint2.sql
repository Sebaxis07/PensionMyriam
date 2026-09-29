-- =====================================================================
-- Migración 0007 (Sprint 2 / EP-03): suma a la publicación de PowerSync
-- las tablas que necesita el ciclo de empresas/nómina/consumo. Los
-- permisos de lectura de powersync_replication ya cubren estas tablas
-- desde 0002 (GRANT SELECT ON ALL TABLES + ALTER DEFAULT PRIVILEGES).
-- =====================================================================
begin;

alter publication powersync add table
  public.empresa,
  public.contrato_empresa,
  public.trabajador,
  public.consumo,
  public.conciliacion_diaria,
  public.justificacion_descuadre;

commit;
