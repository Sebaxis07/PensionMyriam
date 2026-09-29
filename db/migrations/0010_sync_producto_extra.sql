-- =====================================================================
-- Migración 0010: suma producto_extra y tipo_consumo_config a la
-- publicación de PowerSync (ambas de solo lectura para toda la app —
-- ver infra/powersync/config.yaml).
-- =====================================================================
begin;

alter publication powersync add table
  public.producto_extra,
  public.tipo_consumo_config;

commit;
