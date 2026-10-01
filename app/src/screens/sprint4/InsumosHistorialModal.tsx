import { useState } from "react";
import { useInsumos, useComprasRecientes } from "../../features/costos/useInsumos";
import { IconClose } from "../../components/Icons";

interface InsumosHistorialModalProps {
  onCerrar: () => void;
}

const CATEGORIA_LABELS: Record<string, { label: string; icon: string }> = {
  carnes: { label: "Carnes y Pollo", icon: "🥩" },
  verduras: { label: "Verduras y Frutas", icon: "🥦" },
  abarrotes: { label: "Abarrotes y Despensa", icon: "🍚" },
  gas_combustible: { label: "Gas y Combustible", icon: "⛽" },
  aseo: { label: "Aseo y Limpieza", icon: "🧹" },
  otro: { label: "Otros Insumos", icon: "📦" }
};

export function InsumosHistorialModal({ onCerrar }: InsumosHistorialModalProps) {
  const [tab, setTab] = useState<"compras" | "insumos">("compras");
  const compras = useComprasRecientes(50);
  const insumos = useInsumos();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-brand-border/80 bg-brand-card p-6 shadow-2xl my-6 max-h-[90vh] flex flex-col">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 border-b border-brand-border/60 pb-4 shrink-0">
          <div>
            <h3 className="font-display text-xl font-black text-brand-ink leading-tight">
              Historial de Mercadería y Costos
            </h3>
            <p className="text-xs text-brand-muted">
              Revisa las compras registradas y el costo promedio móvil de cada insumo.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl p-2 text-brand-muted hover:bg-brand-sand-light hover:text-brand-ink"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        {/* Pestañas: Compras vs Catálogo Insumos */}
        <div className="flex border-b border-brand-border/60 bg-brand-sand/30 p-1 rounded-2xl my-4 shrink-0">
          <button
            onClick={() => setTab("compras")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === "compras"
                ? "bg-white text-brand-terracotta shadow-xs"
                : "text-brand-muted hover:text-brand-ink"
            }`}
          >
            🛒 Compras Realizadas ({compras.length})
          </button>
          <button
            onClick={() => setTab("insumos")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === "insumos"
                ? "bg-white text-brand-terracotta shadow-xs"
                : "text-brand-muted hover:text-brand-ink"
            }`}
          >
            📋 Insumos y Costos PMP ({insumos.length})
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="overflow-y-auto space-y-3 flex-1 pr-1">
          {tab === "compras" && (
            <>
              {compras.length === 0 ? (
                <div className="p-8 text-center text-xs text-brand-muted rounded-2xl border border-dashed border-brand-border">
                  No hay compras registradas aún en el sistema.
                </div>
              ) : (
                compras.map((c) => {
                  const cat = CATEGORIA_LABELS[c.categoria] || { label: c.categoria, icon: "📦" };
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-brand-border/60 bg-white p-3.5 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cat.icon}</span>
                        <div>
                          <p className="font-display font-bold text-sm text-brand-ink">
                            {c.insumo_nombre || "Insumo"}
                          </p>
                          <p className="text-[11px] text-brand-muted">
                            {cat.label} · Fecha: {c.fecha}
                          </p>
                          {c.rendimiento_estimado && (
                            <p className="text-[10px] text-emerald-800 font-medium">
                              Rendimiento estimado: {c.rendimiento_estimado} raciones
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-display font-black text-base text-brand-ink">
                          ${Number(c.monto_total).toLocaleString("es-CL")}
                        </p>
                        <p className="text-[11px] text-brand-muted">
                          {c.cantidad} unidades/kg
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {tab === "insumos" && (
            <>
              {insumos.length === 0 ? (
                <div className="p-8 text-center text-xs text-brand-muted rounded-2xl border border-dashed border-brand-border">
                  No hay insumos registrados en el catálogo. Se crearán automáticamente con cada compra.
                </div>
              ) : (
                insumos.map((i) => {
                  const cat = CATEGORIA_LABELS[i.categoria] || { label: i.categoria, icon: "📦" };
                  return (
                    <div
                      key={i.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-brand-border/60 bg-white p-3.5 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cat.icon}</span>
                        <div>
                          <p className="font-display font-bold text-sm text-brand-ink">
                            {i.nombre}
                          </p>
                          <p className="text-[11px] text-brand-muted">
                            {cat.label} · Stock total: {Number(i.cantidad_total).toFixed(1)} {i.unidad_medida}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-brand-muted block">
                          Costo Promedio (PMP)
                        </span>
                        <p className="font-display font-black text-base text-brand-terracotta">
                          ${Math.round(Number(i.costo_promedio)).toLocaleString("es-CL")}
                        </p>
                        <span className="text-[10px] text-brand-muted">
                          por {i.unidad_medida}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* Pie */}
        <div className="pt-4 border-t border-brand-border/60 mt-3 text-right shrink-0">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-2xl bg-brand-ink hover:bg-black px-5 py-2.5 text-xs font-bold text-white transition"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
}
