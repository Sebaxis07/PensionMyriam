import { useState, FormEvent } from "react";
import { CategoriaCompra } from "../../features/costos/types";
import { registrarCompraInsumo } from "../../features/costos/registrarCompraInsumo";
import { useInsumos } from "../../features/costos/useInsumos";
import { IconCheck, IconClose } from "../../components/Icons";

interface RegistrarCompraModalProps {
  usuarioId: string;
  onCerrar: () => void;
  onCompraGuardada?: () => void;
}

const CATEGORIAS_CONFIG: Array<{
  id: CategoriaCompra;
  label: string;
  icon: string;
  unidadDefault: string;
  ejemplos: string[];
}> = [
  {
    id: "carnes",
    label: "Carnes y Pollo",
    icon: "🥩",
    unidadDefault: "kg",
    ejemplos: ["Carne de Vacuno", "Pechuga de Pollo", "Chuletas de Cerdo", "Carne Molida", "Pescado"]
  },
  {
    id: "verduras",
    label: "Verduras y Frutas",
    icon: "🥦",
    unidadDefault: "kg",
    ejemplos: ["Papas", "Tomates", "Cebollas", "Lechuga", "Zanahorias", "Plátanos / Fruta"]
  },
  {
    id: "abarrotes",
    label: "Abarrotes y Despensa",
    icon: "🍚",
    unidadDefault: "kg",
    ejemplos: ["Arroz", "Fideos / Tallarines", "Aceite (Litros)", "Pan de molde", "Huevos (Bandeja)", "Té / Café"]
  },
  {
    id: "gas_combustible",
    label: "Gas y Combustible",
    icon: "⛽",
    unidadDefault: "cilindros",
    ejemplos: ["Cilindro Gas 45 kg", "Cilindro Gas 15 kg", "Combustible generador"]
  },
  {
    id: "aseo",
    label: "Aseo y Limpieza",
    icon: "🧹",
    unidadDefault: "unidades",
    ejemplos: ["Detergente industrial", "Cloro / Lavandina", "Papel higiénico", "Bolsas de basura", "Lavalozas"]
  },
  {
    id: "otro",
    label: "Otros Gastos",
    icon: "📦",
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
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));

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
        registradoPor: usuarioId
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl border border-brand-border/80 bg-brand-card p-6 shadow-2xl my-6">
        {/* Cabecera amigable */}
        <div className="flex items-start justify-between gap-3 border-b border-brand-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 text-2xl">
              🛒
            </div>
            <div>
              <h3 className="font-display text-xl font-black text-brand-ink leading-tight">
                Anotar Compra de Mercadería
              </h3>
              <p className="text-xs text-brand-muted">
                Registra los insumos comprados para actualizar los costos y la ganancia.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl p-2 text-brand-muted hover:bg-brand-sand-light hover:text-brand-ink"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* 1. Categoría de Compra con Botones Grandes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-muted mb-2">
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
                        ? "border-brand-terracotta bg-brand-sand-light font-black text-brand-terracotta shadow-xs ring-2 ring-brand-terracotta/20"
                        : "border-brand-border/70 bg-white text-brand-ink hover:bg-brand-sand-light/50"
                    }`}
                  >
                    <span className="text-2xl mb-1">{c.icon}</span>
                    <span className="text-xs">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Nombre del Insumo / Producto */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-muted mb-1.5">
              2. ¿Qué producto compraste?
            </label>
            <input
              type="text"
              list="insumos-sugeridos"
              value={nombreInsumo}
              onChange={(e) => setNombreInsumo(e.target.value)}
              placeholder="Ej. Pollo entero, Papas, Gas 45kg..."
              className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm font-semibold text-brand-ink focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta shadow-xs"
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
                  className="rounded-lg bg-brand-sand-light px-2.5 py-1 text-[11px] font-semibold text-brand-ink hover:bg-brand-sand border border-brand-border/50"
                >
                  + {ej}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Monto y Cantidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-muted mb-1.5">
                3. Total Pagado ($ CLP)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-brand-muted text-sm">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={montoTotal}
                  onChange={(e) => setMontoTotal(e.target.value ? Number(e.target.value) : "")}
                  placeholder="Ej. 45000"
                  className="w-full rounded-2xl border border-brand-border bg-white pl-8 pr-4 py-3 text-sm font-black text-brand-ink focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta shadow-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-muted mb-1.5">
                4. Cantidad Comprada
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value ? Number(e.target.value) : "")}
                  placeholder="Ej. 10"
                  className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm font-black text-brand-ink focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta shadow-xs"
                  required
                />
                <input
                  type="text"
                  value={unidadMedida}
                  onChange={(e) => setUnidadMedida(e.target.value)}
                  placeholder="kg, unid"
                  className="w-24 shrink-0 rounded-2xl border border-brand-border bg-brand-sand-light/60 px-3 py-3 text-xs font-bold text-brand-ink text-center"
                />
              </div>
            </div>
          </div>

          {/* Resumen del costo por unidad calculado en vivo */}
          {costoUnitarioCalculado !== null && (
            <div className="rounded-2xl bg-brand-sand-light/60 border border-brand-border/60 p-3 text-center text-xs">
              <span className="text-brand-muted">Costo calculado por {unidadMedida}: </span>
              <span className="font-display font-black text-brand-terracotta text-sm">
                ${costoUnitarioCalculado.toLocaleString("es-CL")}
              </span>
            </div>
          )}

          {/* 4. Rendimiento Estimado Guiado */}
          <div className="rounded-2xl border border-brand-border/60 bg-white p-3.5 space-y-1.5">
            <label className="block text-xs font-bold text-brand-ink">
              💡 ¿Para cuántos platos o días calcula que rinde? (Opcional)
            </label>
            <p className="text-[11px] text-brand-muted">
              Por ejemplo: si estos 10 kg de pollo rinden para 40 almuerzos, anota 40.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min="1"
                value={rendimiento}
                onChange={(e) => setRendimiento(e.target.value ? Number(e.target.value) : "")}
                placeholder="Ej. 40 raciones"
                className="w-full rounded-xl border border-brand-border bg-brand-sand-light/30 px-3 py-2 text-xs font-bold text-brand-ink"
              />
            </div>
          </div>

          {/* Fecha de la compra */}
          <div>
            <label className="block text-xs font-bold text-brand-muted mb-1">
              Fecha de la compra
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="rounded-xl border border-brand-border bg-white px-3 py-2 text-xs font-bold text-brand-ink shadow-xs"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-300 bg-red-50 p-3.5 text-xs font-bold text-red-700">
              ⚠️ {error}
            </div>
          )}

          {/* Botones de acción accesibles */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-brand-border/60">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-2xl border border-brand-border bg-white px-4 py-3 text-xs font-bold text-brand-ink hover:bg-brand-sand-light transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="min-h-[48px] flex-1 flex items-center justify-center gap-2 rounded-2xl bg-brand-terracotta hover:bg-brand-terracotta-deep px-5 py-3 text-xs font-bold text-white shadow-brand transition active:scale-95 disabled:opacity-50"
            >
              <IconCheck className="h-4 w-4" />
              <span>{guardando ? "Guardando compra…" : "Guardar Compra de Mercadería"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
