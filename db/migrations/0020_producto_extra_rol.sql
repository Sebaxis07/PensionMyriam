-- =====================================================================
-- Migración 0020: alinear quién da de alta un producto extra con HU-41.
--
-- HU-41 dice, textualmente: "Como Encargada o Administradora, quiero dar
-- de alta productos o servicios extra (bebidas, postres, lavandería) con
-- su precio". La policy de 0008_ledger_tipos.sql exigía
-- `app.es_administradora()` para el INSERT, de modo que si la Encargada
-- usaba el catálogo desde su celular la fila se guardaba en su réplica
-- local y el servidor la rechazaba después (quedaba como operación
-- rechazada de HU-42), sin que ella entendiera por qué.
--
-- POR QUÉ NO CONTRADICE LA DECISIÓN E DE CLAUDE.md
--
-- La restricción de negocio es "la Encargada no ve costos ni márgenes",
-- y por eso `insumo`/`compra_insumo` siguen siendo exclusivos de la
-- Administradora (policies de 0001_init.sql y bucket `costos_insumos`,
-- intactos). `producto_extra.precio_unitario` no es un costo: es el
-- precio de venta de una colación, que la Encargada ya lee hoy (policy
-- producto_extra_select) porque lo necesita para registrar el consumo
-- fuera de convenio de HU-15. Habilitarle el INSERT no le entrega
-- ninguna información que antes no tuviera.
--
-- Queda registrado como alineación de alcance con el criterio oficial
-- (docs/historia_v2/historias_usuario.csv), no como una decisión nueva.
-- =====================================================================
begin;

drop policy if exists producto_extra_write on public.producto_extra;

create policy producto_extra_insert on public.producto_extra for insert
  with check (app.rol() is not null);

-- Sigue sin existir policy ni GRANT de UPDATE/DELETE: el catálogo es
-- append-only. Corregir un precio equivocado es dar de alta otro
-- producto, igual que el ledger de consumo — un `consumo` ya registrado
-- apunta a un `producto_extra_id` y su precio histórico no puede
-- cambiar bajo sus pies.

commit;
