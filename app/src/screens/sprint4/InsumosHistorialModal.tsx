import { useState } from "react";
import { useInsumos, useComprasRecientes } from "../../features/costos/useInsumos";
import {
  IconApple,
  IconClipboardCheck,
  IconClose,
  IconDrumstick,
  IconFlame,
  IconPackage,
  IconShoppingCart,
  IconSparkles,
  IconTag
} from "../../components/Icons";

interface InsumosHistorialModalProps {
  onCerrar: () => void;
}

const CATEGORIA_LABELS: Record<
  string,
  { label: string; renderIcon: (className?: string) => JSX.Element }
> = {
  carnes: { label: "Carnes y Pollo", renderIcon: (cls) => <IconDrumstick className={cls} /> },
  verduras: { label: "Verduras y Frutas", renderIcon: (cls) => <IconApple className={cls} /> },
  abarrotes: { label: "Abarrotes y Despensa", renderIcon: (cls) => <IconPackage className={cls} /> },
  gas_combustible: { label: "Gas y Combustible", renderIcon: (cls) => <IconFlame className={cls} /> },
  aseo: { label: "Aseo y Limpieza", renderIcon: (cls) => <IconSparkles className={cls} /> },
  otro: { label: "Otros Insumos", renderIcon: (cls) => <IconTag className={cls} /> }
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
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === "compras"
                ? "bg-white text-brand-terracotta shadow-xs"
                : "text-brand-muted hover:text-brand-ink"
            }`}
          >
            <IconShoppingCart className="h-4 w-4" />
            <span>Compras Realizadas ({compras.length})</span>
          </button>
          <button
            onClick={() => setTab("insumos")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === "insumos"
                ? "bg-white text-brand-terracotta shadow-xs"
                : "text-brand-muted hover:text-brand-ink"
            }`}
          >
            <IconClipboardCheck className="h-4 w-4" />
            <span>Insumos y Costos PMP ({insumos.length})</span>
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
                  const cat = CATEGORIA_LABELS[c.categoria] || {
                    label: c.categoria,
                    renderIcon: (cls?: string) => <IconTag className={cls} />
                  };
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-brand-border/60 bg-white p-3.5 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-sand-light border border-brand-border/60">
                          {cat.renderIcon("h-5 w-5 text-brand-terracotta")}
                        </div>
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
                        <p className="font-display text-base font-black text-brand-ink">
                          ${c.monto_total.toLocaleString("es-CL")}
                        </p>
                        <p className="text-[10px] text-brand-muted">
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
                  No hay insumos registrados en el catálogo.
                </div>
              ) : (
                insumos.map((i) => {
                  const cat = CATEGORIA_LABELS[i.categoria] || {
                    label: i.categoria,
                    renderIcon: (cls?: string) => <IconTag className={cls} />
                  };
                  return (
                    <div
                      key={i.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-brand-border/60 bg-white p-3.5 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-sand-light border border-brand-border/60">
                          {cat.renderIcon("h-5 w-5 text-brand-terracotta")}
                        </div>
                        <div>
                          <p className="font-display font-bold text-sm text-brand-ink">
                            {i.nombre}
                          </p>
                          <p className="text-[11px] text-brand-muted">
                            {cat.label} · Stock/Comprado: {i.cantidad_total} {i.unidad_medida}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-brand-muted">
                          Costo PMP
                        </p>
                        <p className="font-display text-base font-black text-brand-ink">
                          ${Math.round(i.costo_promedio).toLocaleString("es-CL")}
                          <span className="text-xs font-normal text-brand-muted ml-0.5">
                            /{i.unidad_medida}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
