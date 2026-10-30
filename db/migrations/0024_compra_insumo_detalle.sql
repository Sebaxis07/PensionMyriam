-- =====================================================================
-- Migración 0024: detalle de compra de insumos (proveedor, medio de
-- pago, comprobante, IVA) — ampliación de EP-04 a partir de evidencia
-- real de la operación (boleta de combustible aportada por la
-- Administradora: proveedor, N° de transacción, medio de pago con
-- tarjeta y desglose neto/IVA/total). No reemplaza el histórico
-- inmutable existente: solo agrega columnas opcionales a
-- `compra_insumo`, las filas ya cargadas quedan con estos campos en
-- null sin que eso altere su costo PMP ya calculado.
-- =====================================================================
begin;

create type public.medio_pago_compra as enum
  ('efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito', 'otro');

alter table public.compra_insumo
  add column proveedor             text,
  add column descripcion           text,
  add column medio_pago            public.medio_pago_compra,
  add column referencia_comprobante text,
  add column monto_neto            numeric(12, 2),
  add column monto_iva             numeric(12, 2),
  add column observaciones         text;

comment on column public.compra_insumo.monto_total is
  'Total pagado (monto_neto + monto_iva cuando ambos están informados; si no, se asume que monto_total ya es el total a pagar — el costeo PMP siempre usa monto_total, nunca monto_neto, porque es el monto real desembolsado).';
comment on column public.compra_insumo.monto_neto is
  'Desglose informativo (opcional) del comprobante, cuando lo trae. No participa en el cálculo de PMP.';
comment on column public.compra_insumo.monto_iva is
  'Desglose informativo (opcional) del comprobante, cuando lo trae. No participa en el cálculo de PMP.';

-- Si vienen ambos desgloses, deben sumar razonablemente el total (con
-- tolerancia de $1 por redondeo). No se exige NOT NULL: la mayoría de
-- comprobantes de insumos de verdulería/abarrotes no traen desglose de
-- IVA explícito y no hay que inventarlo.
--
-- OJO con combustible: la boleta real de ev/boleta.jpg trae Subtotal
-- neto $14.144 + IVA $2.687 pero un Total a pagar de $15.000 (no
-- $16.831), porque el diésel en Chile lleva además el Impuesto
-- Específico a los Combustibles (IEF/IEV, con un componente variable
-- que puede ser negativo) que no se modela acá como campo aparte. Para
-- comprobantes de combustible, monto_neto/monto_iva deben dejarse en
-- null en vez de forzar un desglose que no va a cuadrar con este
-- check — el total pagado (monto_total) sigue siendo correcto y es lo
-- único que usa el costeo PMP.
alter table public.compra_insumo
  add constraint compra_insumo_desglose_coherente check (
    monto_neto is null or monto_iva is null or
    abs((monto_neto + monto_iva) - monto_total) <= 1
  );

commit;
