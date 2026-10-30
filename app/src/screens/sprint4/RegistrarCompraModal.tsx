import { describirErrorUi } from "../../components/MensajeInterfaz";
import { Dialogo } from "../../components/Dialogo";
import { useState, FormEvent } from "react";
import { CategoriaCompra, MedioPagoCompra } from "../../features/costos/types";
import { registrarCompraInsumo } from "../../features/costos/registrarCompraInsumo";
import { useInsumos } from "../../features/costos/useInsumos";
import {
  IconApple,
  IconCheck,
  IconClose,
  IconDrumstick,
  IconFlame,
  IconPackage,
  IconShoppingCart,
  IconSparkles,
  IconTag
} from "../../components/Icons";
import { fechaHoySantiago } from "../../lib/fechaNegocio";

interface RegistrarCompraModalProps {
  usuarioId: string;
  onCerrar: () => void;
  onCompraGuardada?: () => void;
}

const CATEGORIAS_CONFIG: Array<{
  id: CategoriaCompra;
  label: string;
  renderIcon: (className?: string) => JSX.Element;
  unidadDefault: string;
  ejemplos: string[];
}> = [
  {
    id: "carnes",
    label: "Carnes y Pollo",
    renderIcon: (className) => <IconDrumstick className={className} />,
    unidadDefault: "kg",
    ejemplos: ["Carne de Vacuno", "Pechuga de Pollo", "Chuletas de Cerdo", "Carne Molida", "Pescado"]
  },
  {
    id: "verduras",
    label: "Verduras y Frutas",
    renderIcon: (className) => <IconApple className={className} />,
    unidadDefault: "kg",
    ejemplos: ["Papas", "Tomates", "Cebollas", "Lechuga", "Zanahorias", "Plátanos / Fruta"]
  },
  {
    id: "abarrotes",
    label: "Abarrotes y Despensa",
    renderIcon: (className) => <IconPackage className={className} />,
    unidadDefault: "kg",
    ejemplos: ["Arroz", "Fideos / Tallarines", "Aceite (Litros)", "Pan de molde", "Huevos (Bandeja)", "Té / Café"]
  },
  {
    id: "gas_combustible",
    label: "Gas y Combustible",
    renderIcon: (className) => <IconFlame className={className} />,
    unidadDefault: "cilindros",
    ejemplos: ["Cilindro Gas 45 kg", "Cilindro Gas 15 kg", "Combustible generador"]
  },
  {
    id: "aseo",
    label: "Aseo y Limpieza",
    renderIcon: (className) => <IconSparkles className={className} />,
    unidadDefault: "unidades",
    ejemplos: ["Detergente industrial", "Cloro / Lavandina", "Papel higiénico", "Bolsas de basura", "Lavalozas"]
  },
  {
    id: "otro",
    label: "Otros Gastos",
    renderIcon: (className) => <IconTag className={className} />,
    unidadDefault: "unidades",
    ejemplos: ["Envases desechables", "Servilletas", "Mantención menor"]
  }
];

export function RegistrarCompraModal({
  usuarioId,
  onCerrar,
  onCompraGuardada
}: RegistrarCompraModalProps) {
  const insumosExistentes = useInsumos();

  const [categoria, setCategoria] = useState<CategoriaCompra>("carnes");
  const [nombreInsumo, setNombreInsumo] = useState("");
  const [montoTotal, setMontoTotal] = useState<number | "">("");
  const [cantidad, setCantidad] = useState<number | "">("");
  const [unidadMedida, setUnidadMedida] = useState("kg");
  const [rendimiento, setRendimiento] = useState<number | "">("");
  const [fecha, setFecha] = useState(fechaHoySantiago());

  const [mostrarComprobante, setMostrarComprobante] = useState(false);
  const [proveedor, setProveedor] = useState("");
  const [medioPago, setMedioPago] = useState<MedioPagoCompra | "">("");
  const [referenciaComprobante, setReferenciaComprobante] = useState("");
  const [montoIva, setMontoIva] = useState<number | "">("");
  const [observaciones, setObservaciones] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catActual = CATEGORIAS_CONFIG.find((c) => c.id === categoria) || CATEGORIAS_CONFIG[0];

  function handleSeleccionarCategoria(nuevaCat: CategoriaCompra) {
    setCategoria(nuevaCat);
    const conf = CATEGORIAS_CONFIG.find((c) => c.id === nuevaCat);
    if (conf) setUnidadMedida(conf.unidadDefault);
  }

  function handleSeleccionarEjemplo(nombre: string) {
    setNombreInsumo(nombre);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const montoNum = Number(montoTotal);
    const cantNum = Number(cantidad);

    if (!nombreInsumo.trim()) {
      setError("Por favor indica qué producto o mercadería compraste.");
      return;
    }
    if (!montoTotal || montoNum <= 0) {
      setError("Indica el monto total pagado en pesos.");
      return;
    }
    if (!cantidad || cantNum <= 0) {
      setError("Indica la cantidad comprada.");
      return;
    }

    const ivaNum = montoIva === "" ? null : Number(montoIva);
    if (ivaNum != null && (ivaNum < 0 || ivaNum >= montoNum)) {
      setError("El IVA del comprobante debe ser menor que el total pagado.");
      return;
    }

    setGuardando(true);
    try {
      await registrarCompraInsumo({
        nombreInsumo: nombreInsumo.trim(),
        categoria,
        unidadMedida: unidadMedida.trim() || "unidades",
        montoTotal: montoNum,
        cantidad: cantNum,
        rendimientoEstimado: rendimiento ? Number(rendimiento) : null,
        fecha,
        registradoPor: usuarioId,
        proveedor: proveedor.trim() || null,
        medioPago: medioPago || null,
        referenciaComprobante: referenciaComprobante.trim() || null,
        montoIva: ivaNum,
        montoNeto: ivaNum != null ? montoNum - ivaNum : null,
        observaciones: observaciones.trim() || null
      });

      onCompraGuardada?.();
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la compra.");
    } finally {
      setGuardando(false);
    }
  }

  // Costo por unidad estimado en tiempo real
  const costoUnitarioCalculado =
    montoTotal && cantidad && Number(cantidad) > 0
      ? Math.round(Number(montoTotal) / Number(cantidad))
      : null;

  return (
    <Dialogo titulo="Registrar compra" onCerrar={onCerrar} className="ui-operativa fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/50 p-4 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl border border-brand-border/80 bg-brand-card p-6 shadow-2xl my-6">
        {/* Cabecera amigable */}
        <div className="flex items-start justify-between gap-3 border-b border-brand-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 shadow-sm">
              <IconShoppingCart className="h-6 w-6 text-amber-900" />
            </div>
            <div>
              <h3 className="font-display text-xl font-black text-brand-ink leading-tight">
                Registrar compra
              </h3>
              <p className="text-sm text-brand-ink/80">
                Anota el producto, la cantidad y el total pagado.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar diálogo" className="rounded-xl p-2 text-brand-ink/80 hover:bg-brand-sand-deep hover:text-brand-ink"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* 1. Categoría de Compra con Botones Grandes */}
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-brand-ink/80 mb-2">
              1. Tipo de Mercadería
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIAS_CONFIG.map((c) => {
                const seleccionada = categoria === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSeleccionarCategoria(c.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                      seleccionada
                        ? "border-brand-terracotta bg-brand-sand-deep font-black text-brand-terracotta-deep shadow-sm ring-2 ring-brand-terracotta/20"
                        : "border-brand-border/70 bg-white text-brand-ink hover:bg-brand-sand-deep/50"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-center">
                      {c.renderIcon(`h-6 w-6 ${seleccionada ? "text-brand-terracotta-deep" : "text-brand-ink"}`)}
                    </div>
                    <span className="text-sm">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Nombre del Insumo / Producto */}
          <div>
            <label htmlFor="registrarcompramodal-nombreinsumo-1" className="block text-sm font-bold uppercase tracking-wider text-brand-ink/80 mb-1.5">
              2. ¿Qué producto compraste?
            </label>
            <input id="registrarcompramodal-nombreinsumo-1"
              type="text"
              list="insumos-sugeridos"
              value={nombreInsumo}
              onChange={(e) => setNombreInsumo(e.target.value)}
              placeholder="Ej. Pollo entero, Papas, Gas 45kg..."
              className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm font-semibold text-brand-ink focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta shadow-sm"
              required
            />
            <datalist id="insumos-sugeridos">
              {insumosExistentes.map((ins) => (
                <option key={ins.id} value={ins.nombre} />
              ))}
            </datalist>

            {/* Atajos de productos comunes de esta categoría */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {catActual.ejemplos.map((ej) => (
                <button
                  key={ej}
                  type="button"
                  onClick={() => handleSeleccionarEjemplo(ej)}
                  className="rounded-lg bg-brand-sand-deep px-2.5 py-1 text-xs font-semibold text-brand-ink hover:bg-brand-sand border border-brand-border/50"
                >
                  + {ej}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Monto y Cantidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="registrarcompramodal-montototal-1" className="block text-sm font-bold uppercase tracking-wider text-brand-ink/80 mb-1.5">
                3. Total Pagado ($ CLP)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-brand-ink/80 text-sm">
                  $
                </span>
                <input id="registrarcompramodal-montototal-1"
                  type="number"
                  min="0"
                  step="100"
                  value={montoTotal}
                  onChange={(e) => setMontoTotal(e.target.value ? Number(e.target.value) : "")}
                  placeholder="Ej. 45000"
                  className="w-full rounded-2xl border border-brand-border bg-white pl-8 pr-4 py-3 text-sm font-black text-brand-ink focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta shadow-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="registrarcompramodal-cantidad-1" className="block text-sm font-bold uppercase tracking-wider text-brand-ink/80 mb-1.5">
                4. Cantidad Comprada
              </label>
              <div className="flex gap-2">
                <input id="registrarcompramodal-cantidad-1"
                  type="number"
                  min="0.1"
                  step="any"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value ? Number(e.target.value) : "")}
                  placeholder="Ej. 10"
                  className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm font-black text-brand-ink focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta shadow-sm"
                  required
                />
                <input aria-label="Unidad de medida"
                  type="text"
                  value={unidadMedida}
                  onChange={(e) => setUnidadMedida(e.target.value)}
                  placeholder="kg, unid"
                  className="w-24 shrink-0 rounded-2xl border border-brand-border bg-brand-sand-deep/60 px-3 py-3 text-sm font-bold text-brand-ink text-center"
                />
              </div>
            </div>
          </div>

          {/* Resumen del costo por unidad calculado en vivo */}
          {costoUnitarioCalculado !== null && (
            <div className="rounded-2xl bg-brand-sand-deep/60 border border-brand-border/60 p-3 text-center text-sm">
              <span className="text-brand-ink/80">Costo calculado por {unidadMedida}: </span>
              <span className="font-display font-black text-brand-terracotta-deep text-sm">
                ${costoUnitarioCalculado.toLocaleString("es-CL")}
              </span>
            </div>
          )}

          {/* 4. Rendimiento Estimado Guiado */}
          <div className="rounded-2xl border border-brand-border/60 bg-white p-3.5 space-y-1.5">
            <label htmlFor="registrarcompramodal-rendimiento-1" className="block text-sm font-bold text-brand-ink">
              💡 ¿Para cuántos platos o días calcula que rinde? (Opcional)
            </label>
            <p className="text-xs text-brand-ink/80">
              Por ejemplo: si estos 10 kg de pollo rinden para 40 almuerzos, anota 40.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input id="registrarcompramodal-rendimiento-1"
                type="number"
                min="1"
                value={rendimiento}
                onChange={(e) => setRendimiento(e.target.value ? Number(e.target.value) : "")}
                placeholder="Ej. 40 raciones"
                className="w-full rounded-xl border border-brand-border bg-brand-sand-deep/30 px-3 py-2 text-sm font-bold text-brand-ink"
              />
            </div>
          </div>

          {/* Fecha de la compra */}
          <div>
            <label htmlFor="registrarcompramodal-fecha-1" className="block text-sm font-bold text-brand-ink/80 mb-1">
              Fecha de la compra
            </label>
            <input id="registrarcompramodal-fecha-1"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-bold text-brand-ink shadow-sm"
            />
          </div>

          {/* Datos del comprobante: opcional, plegado por defecto para no
              alargar el formulario en el caso común. */}
          <div className="rounded-2xl border border-brand-border/60 bg-white p-3.5">
            <button
              type="button"
              onClick={() => setMostrarComprobante((v) => !v)}
              className="flex w-full items-center justify-between text-sm font-bold text-brand-ink"
            >
              <span>Datos del comprobante (opcional)</span>
              <span className="text-brand-ink/60">{mostrarComprobante ? "Ocultar" : "Agregar"}</span>
            </button>
            {mostrarComprobante && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="registrarcompramodal-proveedor-1" className="block text-xs font-bold text-brand-ink/80 mb-1">
                      Proveedor
                    </label>
                    <input id="registrarcompramodal-proveedor-1"
                      type="text"
                      value={proveedor}
                      onChange={(e) => setProveedor(e.target.value)}
                      placeholder="Ej. Copec, Feria, Distribuidora..."
                      className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-semibold text-brand-ink"
                    />
                  </div>
                  <div>
                    <label htmlFor="registrarcompramodal-mediopago-1" className="block text-xs font-bold text-brand-ink/80 mb-1">
                      Medio de pago
                    </label>
                    <select id="registrarcompramodal-mediopago-1"
                      value={medioPago}
                      onChange={(e) => setMedioPago(e.target.value as MedioPagoCompra | "")}
                      className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-semibold text-brand-ink"
                    >
                      <option value="">Sin especificar</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="tarjeta_debito">Tarjeta débito</option>
                      <option value="tarjeta_credito">Tarjeta crédito</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="registrarcompramodal-referencia-1" className="block text-xs font-bold text-brand-ink/80 mb-1">
                      N° de boleta o factura
                    </label>
                    <input id="registrarcompramodal-referencia-1"
                      type="text"
                      value={referenciaComprobante}
                      onChange={(e) => setReferenciaComprobante(e.target.value)}
                      placeholder="Ej. 223505"
                      className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-semibold text-brand-ink"
                    />
                  </div>
                  <div>
                    <label htmlFor="registrarcompramodal-iva-1" className="block text-xs font-bold text-brand-ink/80 mb-1">
                      IVA del comprobante ($, si lo indica)
                    </label>
                    <input id="registrarcompramodal-iva-1"
                      type="number"
                      min="0"
                      step="1"
                      value={montoIva}
                      onChange={(e) => setMontoIva(e.target.value ? Number(e.target.value) : "")}
                      placeholder="Ej. 2687"
                      className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-semibold text-brand-ink"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="registrarcompramodal-observaciones-1" className="block text-xs font-bold text-brand-ink/80 mb-1">
                    Observaciones
                  </label>
                  <input id="registrarcompramodal-observaciones-1"
                    type="text"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Opcional"
                    className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-semibold text-brand-ink"
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-3.5 text-sm font-bold text-red-700">
              ⚠️ {describirErrorUi(error)}
            </div>
          )}

          {/* Botones de acción accesibles */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-brand-border/60">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm font-bold text-brand-ink hover:bg-brand-sand-deep transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="min-h-[48px] flex-1 flex items-center justify-center gap-2 rounded-2xl bg-brand-terracotta-deep hover:bg-brand-terracotta-deep px-5 py-3 text-sm font-bold text-white shadow-brand transition active:scale-95 disabled:opacity-50"
            >
              <IconCheck className="h-4 w-4" />
              <span>{guardando ? "Guardando compra…" : "Guardar Compra de Mercadería"}</span>
            </button>
          </div>
        </form>
      </div>
    </Dialogo>
  );
}
