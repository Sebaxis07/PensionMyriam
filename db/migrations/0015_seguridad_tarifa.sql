-- Corrección de seguridad (auditoría post-Sprint 4): tarifa_convenida
-- de contrato_empresa era legible por CUALQUIER rol autenticado vía
-- PostgREST/consultas directas, pese a que CLAUDE.md exige que "la
-- Encargada no ve costos ni márgenes" — la política
-- contrato_empresa_select (0001_init.sql) solo exigía
-- "app.rol() is not null", sin distinguir administradora/encargada.
--
-- Esto NO cubre la vía de PowerSync (ver infra/powersync/config.yaml,
-- corregido por separado): PowerSync replica con su propio rol
-- (BYPASSRLS), así que esta vista y este GRANT solo cierran la vía de
-- PostgREST/API directa — ambas vías necesitaban su propio arreglo.
begin;

-- Se revoca el SELECT de tabla completa y se vuelve a otorgar SOLO
-- para las columnas no sensibles (GRANT por columna, soportado nativo
-- por Postgres). tarifa_convenida queda sin ningún grant de columna en
-- la tabla base — solo se puede leer a través de la vista de abajo.
--
-- Probado contra Postgres real (db/pgtap/11_seguridad_tarifa.sql): un
-- REVOKE total rompía el UPDATE de la propia Administradora, porque
-- la cláusula WHERE id = ? y la política RLS
-- "contrato_empresa_update" necesitan poder LEER la fila para
-- evaluarse — UPDATE no es solo un privilegio de escritura cuando hay
-- un WHERE o un USING de por medio. Mantener el grant de columna en
-- "id" (y las demás no sensibles) es lo que permite que eso siga
-- funcionando sin reabrir tarifa_convenida.
revoke select on public.contrato_empresa from authenticated;
grant select (id, empresa_id, vigencia_desde, vigencia_hasta, headcount, creado_por, created_at)
  on public.contrato_empresa to authenticated;

-- Vista sin security_invoker: se ejecuta con los privilegios de quien
-- la crea (este script, vía supabase_admin), así que SÍ puede leer la
-- tabla base pese al revoke de arriba. Lo que decide si
-- tarifa_convenida se oculta no es un privilegio de fila (RLS), sino
-- la función app.es_administradora() — que lee el JWT real de CADA
-- request de PostgREST (current_setting('request.jwt.claims')), no
-- las credenciales de la vista. Por eso esto sí funciona para
-- PostgREST (a diferencia de PowerSync, que nunca pasa por acá).
create view public.contrato_empresa_rest as
select
  id,
  empresa_id,
  vigencia_desde,
  vigencia_hasta,
  headcount,
  case when app.es_administradora() then tarifa_convenida else null end as tarifa_convenida,
  creado_por,
  created_at
from public.contrato_empresa;

grant select on public.contrato_empresa_rest to authenticated;

commit;
