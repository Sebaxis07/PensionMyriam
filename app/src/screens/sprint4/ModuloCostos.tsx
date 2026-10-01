import { useState, useMemo } from "react";
import { useInsumos, useComprasRecientes } from "../../features/costos/useInsumos";
import { RegistrarCompraModal } from "./RegistrarCompraModal";
import {
  IconChartBar,
  IconClipboardCheck,
  IconDollarSign,
  IconFilter,
  IconPlus,
  IconSearch,
  IconShoppingCart
} from "../../components/Icons";

interface ModuloCostosProps {
  usuarioId: string;
}

type SubTabCostos = "compras" | "pmp" | "gastos";

const CATEGORIAS_INFO: Record<string, { label: string; icon: string; bg: string; text: string }> = {
  carnes: { label: "Carnes y Pollo", icon: "🥩", bg: "bg-red-50 border-red-200", text: "text-red-800" },
  verduras: { label: "Verduras y Frutas", icon: "🥦", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-800" },
  abarrotes: { label: "Abarrotes y Despensa", icon: "🍚", bg: "bg-amber-50 border-amber-200", text: "text-amber-800" },
  gas_combustible: { label: "Gas y Combustible", icon: "⛽", bg: "bg-orange-50 border-orange-200", text: "text-orange-800" },
  aseo: { label: "Aseo y Limpieza", icon: "🧹", bg: "bg-sky-50 border-sky-200", text: "text-sky-800" },
  otro: { label: "Otros Insumos", icon: "📦", bg: "bg-stone-50 border-stone-200", text: "text-stone-800" }
};

export function ModuloCostos({ usuarioId }: ModuloCostosProps) {
  const [subTab, setSubTab] = useState<SubTabCostos>("compras");
  const [mostrarModalCompra, setMostrarModalCompra] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [busqueda, setBusqueda] = useState<string>("");

  const compras = useComprasRecientes(100);
  const insumos = useInsumos();

  // Cálculos consolidados para el mes actual
  const resumenMes = useMemo(() => {
    const mesActualStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const comprasMes = compras.filter((c) => c.fecha.startsWith(mesActualStr));

    const totalGastadoMes = comprasMes.reduce((acc, c) => acc + c.monto_total, 0);

    const gastosPorCat: Record<string, number> = {
      carnes: 0,
      verduras: 0,
      abarrotes: 0,
      gas_combustible: 0,
      aseo: 0,
      otro: 0
    };

    comprasMes.forEach((c) => {
      const cat = c.categoria || "otro";
      gastosPorCat[cat] = (gastosPorCat[cat] || 0) + c.monto_total;
    });

    return {
      totalGastadoMes,
      totalComprasMes: comprasMes.length,
      gastosPorCat
    };
  }, [compras]);

  // Filtrado de compras
  const comprasFiltradas = useMemo(() => {
    return compras.filter((c) => {
      if (filtroCategoria !== "todas" && c.categoria !== filtroCategoria) {
        return false;
      }
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const coincideNombre = (c.insumo_nombre || "").toLowerCase().includes(q);
        const coincideCat = (CATEGORIAS_INFO[c.categoria]?.label || "").toLowerCase().includes(q);
        return coincideNombre || coincideCat;
      }
      return true;
    });
  }, [compras, filtroCategoria, busqueda]);

  // Filtrado de catálogo PMP
  const insumosFiltrados = useMemo(() => {
    return insumos.filter((ins) => {
      if (filtroCategoria !== "todas" && ins.categoria !== filtroCategoria) {
        return false;
      }
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        return (
          ins.nombre.toLowerCase().includes(q) ||
          (CATEGORIAS_INFO[ins.categoria]?.label || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [insumos, filtroCategoria, busqueda]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 animate-fadeIn">
      {/* 1. Cabecera del Módulo con Acción Destacada */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
            <IconShoppingCart className="h-6 w-6 text-amber-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-black text-brand-ink leading-tight">
                Control de Compras y Costos PMP
              </h2>
              <span className="rounded-full bg-brand-terracotta/10 px-2.5 py-0.5 text-xs font-bold text-brand-terracotta border border-brand-terracotta/20">
                Módulo Oficial
              </span>
            </div>
            <p className="text-xs text-brand-muted mt-0.5">
              Anota las compras de mercadería, gas y aseo para calcular el costo real promedio por kilo y ración.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMostrarModalCompra(true)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-brand-terracotta hover:bg-brand-terracotta-deep px-5 py-3 text-sm font-black text-white shadow-brand transition active:scale-95 shrink-0"
        >
          <IconPlus className="h-4 w-4" />
          <span>+ Anotar Compra</span>
        </button>
      </div>

      {/* 2. Tarjetas de Resumen Rápido del Mes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="rounded-3xl border border-brand-border/70 bg-brand-card p-4 md:p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
              Gasto Este Mes
            </span>
            <IconDollarSign className="h-5 w-5 text-brand-terracotta" />
          </div>
          <p className="font-display text-2xl md:text-3xl font-black text-brand-ink mt-2">
            ${resumenMes.totalGastadoMes.toLocaleString("es-CL")}
          </p>
          <p className="text-[11px] text-brand-muted mt-1">
            {resumenMes.totalComprasMes} compras anotadas en el mes
          </p>
        </div>

        <div className="rounded-3xl border border-brand-border/70 bg-brand-card p-4 md:p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
              Catálogo Insumos
            </span>
            <IconClipboardCheck className="h-5 w-5 text-brand-terracotta" />
          </div>
          <p className="font-display text-2xl md:text-3xl font-black text-brand-ink mt-2">
            {insumos.length} productos
          </p>
          <p className="text-[11px] text-brand-muted mt-1">
            Con cálculo automático de PMP
          </p>
        </div>

        <div className="rounded-3xl border border-brand-border/70 bg-brand-card p-4 md:p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
              Última Compra
            </span>
            <IconShoppingCart className="h-5 w-5 text-brand-terracotta" />
          </div>
          <p className="font-display text-base md:text-lg font-bold text-brand-ink mt-2 truncate">
            {compras[0] ? compras[0].insumo_nombre : "Sin compras aún"}
          </p>
          <p className="text-[11px] text-brand-muted mt-1">
            {compras[0] ? `Fecha: ${compras[0].fecha}` : "Registra tu primera compra"}
          </p>
        </div>
      </div>

      {/* 3. Selector de Pestañas Principales del Módulo */}
      <div className="flex flex-wrap items-center gap-2 border-b border-brand-border/70 pb-3">
        <button
          type="button"
          onClick={() => setSubTab("compras")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs md:text-sm font-bold transition-all ${
            subTab === "compras"
              ? "bg-brand-terracotta text-white shadow-brand"
              : "bg-brand-card text-brand-muted hover:text-brand-ink border border-brand-border/70"
          }`}
        >
          <IconShoppingCart className="h-4 w-4" />
          <span>Historial de Compras ({compras.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("pmp")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs md:text-sm font-bold transition-all ${
            subTab === "pmp"
              ? "bg-brand-terracotta text-white shadow-brand"
              : "bg-brand-card text-brand-muted hover:text-brand-ink border border-brand-border/70"
          }`}
        >
          <IconClipboardCheck className="h-4 w-4" />
          <span>Catálogo y Precios PMP ({insumos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("gastos")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs md:text-sm font-bold transition-all ${
            subTab === "gastos"
              ? "bg-brand-terracotta text-white shadow-brand"
              : "bg-brand-card text-brand-muted hover:text-brand-ink border border-brand-border/70"
          }`}
        >
          <IconChartBar className="h-4 w-4" />
          <span>Distribución del Gasto</span>
        </button>
      </div>

      {/* 4. Barra de Filtros y Búsqueda (aplica a Compras y Catálogo) */}
      {(subTab === "compras" || subTab === "pmp") && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Buscador */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted">
              <IconSearch className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={
                subTab === "compras"
                  ? "Buscar por producto o categoría..."
                  : "Buscar insumo en el catálogo..."
              }
              className="w-full rounded-2xl border border-brand-border/80 bg-white pl-10 pr-4 py-2.5 text-xs font-semibold text-brand-ink placeholder:text-brand-muted/70 focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta shadow-xs"
            />
          </div>

          {/* Filtro por Categoría con botones rápidos */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-brand-muted mr-1 hidden md:flex items-center gap-1">
              <IconFilter className="h-3.5 w-3.5" />
              Filtrar:
            </span>
            <button
              type="button"
              onClick={() => setFiltroCategoria("todas")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                filtroCategoria === "todas"
                  ? "bg-brand-ink text-white"
                  : "bg-brand-sand-light text-brand-muted hover:bg-brand-sand"
              }`}
            >
              Todas
            </button>
            {Object.entries(CATEGORIAS_INFO).map(([key, info]) => {
              const activo = filtroCategoria === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFiltroCategoria(key)}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition flex items-center gap-1 ${
                    activo
                      ? "bg-brand-ink text-white"
                      : "bg-brand-sand-light text-brand-muted hover:bg-brand-sand"
                  }`}
                >
                  <span>{info.icon}</span>
                  <span className="hidden sm:inline">{info.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Contenido de la Sub-Pestaña: Historial de Compras */}
      {subTab === "compras" && (
        <div className="space-y-3">
          {comprasFiltradas.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-brand-border/90 bg-brand-card p-12 text-center shadow-card">
              <div className="text-4xl mb-3">🛒</div>
              <h3 className="font-display text-lg font-bold text-brand-ink">
                No se encontraron compras
              </h3>
              <p className="text-xs text-brand-muted mt-1 max-w-sm mx-auto">
                {compras.length === 0
                  ? "Aún no has anotado ninguna compra de mercadería. Presiona el botón de arriba para registrar la primera."
                  : "No hay compras que coincidan con la búsqueda o el filtro seleccionado."}
              </p>
              {compras.length === 0 && (
                <button
                  type="button"
                  onClick={() => setMostrarModalCompra(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-brand-terracotta px-5 py-2.5 text-xs font-bold text-white shadow-brand hover:bg-brand-terracotta-deep transition"
                >
                  <IconPlus className="h-4 w-4" />
                  <span>Anotar Mi Primera Compra</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {comprasFiltradas.map((c) => {
                const cat = CATEGORIAS_INFO[c.categoria] || {
                  label: c.categoria,
                  icon: "📦",
                  bg: "bg-gray-50 border-gray-200",
                  text: "text-gray-800"
                };
                const costoUnitario = c.cantidad > 0 ? Math.round(c.monto_total / c.cantidad) : null;
                const costoPorRacion =
                  c.rendimiento_estimado && c.rendimiento_estimado > 0
                    ? Math.round(c.monto_total / c.rendimiento_estimado)
                    : null;

                return (
                  <div
                    key={c.id}
                    className="flex flex-col justify-between rounded-3xl border border-brand-border/80 bg-brand-card p-4 md:p-5 shadow-card hover:border-brand-terracotta/40 transition"
                  >
                    <div>
                      {/* Cabecera de tarjeta: Icono + Nombre + Fecha */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-sand-light border border-brand-border text-2xl shadow-xs">
                            {cat.icon}
                          </div>
                          <div>
                            <h4 className="font-display text-base font-bold text-brand-ink leading-tight">
                              {c.insumo_nombre || "Insumo sin nombre"}
                            </h4>
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold border mt-1 ${cat.bg} ${cat.text}`}
                            >
                              {cat.label}
                            </span>
                          </div>
                        </div>

                        {/* Total pagado grande */}
                        <div className="text-right shrink-0">
                          <p className="font-display text-lg font-black text-brand-ink">
                            ${c.monto_total.toLocaleString("es-CL")}
                          </p>
                          <p className="text-[10px] text-brand-muted">Total pagado</p>
                        </div>
                      </div>

                      {/* Detalles de volumen y costo unitario */}
                      <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-3 border-t border-brand-border/50 text-xs">
                        <div className="rounded-xl bg-brand-sand-light px-2.5 py-1 font-semibold text-brand-ink border border-brand-border/50">
                          📦 {c.cantidad} unidades/kg
                        </div>
                        {costoUnitario !== null && (
                          <div className="rounded-xl bg-brand-sand-light px-2.5 py-1 font-semibold text-brand-ink border border-brand-border/50">
                            💲 ${costoUnitario.toLocaleString("es-CL")} / unidad
                          </div>
                        )}
                        {costoPorRacion !== null && (
                          <div className="rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 font-bold">
                            🍽️ {c.rendimiento_estimado} raciones (${costoPorRacion.toLocaleString("es-CL")}/ración)
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-brand-muted">
                      <span>Fecha de compra: <strong>{c.fecha}</strong></span>
                      <span className="font-mono text-[9px] text-brand-muted/70">ID: {c.id.slice(0, 8)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Contenido de la Sub-Pestaña: Catálogo de Insumos y Costos PMP */}
      {subTab === "pmp" && (
        <div className="space-y-4">
          {/* Explicación en lenguaje directo de baja alfabetización digital */}
          <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-4 md:p-5 shadow-card flex items-start gap-3.5">
            <span className="text-2xl shrink-0">💡</span>
            <div className="text-xs text-amber-950 space-y-1">
              <p className="font-bold text-sm">¿Cómo funciona el Precio Medio Ponderado (PMP)?</p>
              <p className="text-amber-900 leading-relaxed">
                Cuando compras mercadería a diferentes precios según el mercado, el sistema calcula automáticamente el costo exacto promedio ponderado por kilo o unidad. Así siempre sabes con exactitud cuánto te cuesta preparar cada colación y evitas cobrar tarifas por debajo de tu gasto real.
              </p>
            </div>
          </div>

          {insumosFiltrados.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-brand-border/90 bg-brand-card p-12 text-center shadow-card">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="font-display text-lg font-bold text-brand-ink">
                No hay insumos en el catálogo
              </h3>
              <p className="text-xs text-brand-muted mt-1 max-w-sm mx-auto">
                Los insumos se agregan y actualizan automáticamente cada vez que anotas una compra de mercadería.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {insumosFiltrados.map((ins) => {
                const cat = CATEGORIAS_INFO[ins.categoria] || {
                  label: ins.categoria,
                  icon: "📦",
                  bg: "bg-gray-50 border-gray-200",
                  text: "text-gray-800"
                };

                return (
                  <div
                    key={ins.id}
                    className="flex flex-col justify-between rounded-3xl border border-brand-border/80 bg-brand-card p-4 shadow-card hover:border-brand-terracotta/40 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{cat.icon}</span>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-display font-bold text-sm text-brand-ink truncate">
                            {ins.nombre}
                          </h4>
                          <p className="text-[10px] text-brand-muted truncate">{cat.label}</p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl bg-brand-sand-light p-3 border border-brand-border/60">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                          Costo Promedio (PMP)
                        </p>
                        <p className="font-display text-xl font-black text-brand-ink mt-0.5">
                          ${Math.round(ins.costo_promedio).toLocaleString("es-CL")}
                          <span className="text-xs font-normal text-brand-muted ml-1">
                            / {ins.unidad_medida}
                          </span>
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-brand-muted px-1">
                        <span>Total acumulado:</span>
                        <span className="font-bold text-brand-ink">
                          {ins.cantidad_total} {ins.unidad_medida}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. Contenido de la Sub-Pestaña: Distribución del Gasto Mensual */}
      {subTab === "gastos" && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card">
            <h3 className="font-display text-lg font-black text-brand-ink mb-1">
              Desglose de Gastos del Mes en Curso
            </h3>
            <p className="text-xs text-brand-muted mb-6">
              Observa claramente en qué se está invirtiendo el presupuesto de compras de la pensión.
            </p>

            <div className="space-y-4">
              {Object.entries(CATEGORIAS_INFO).map(([key, info]) => {
                const monto = resumenMes.gastosPorCat[key] || 0;
                const porcentaje =
                  resumenMes.totalGastadoMes > 0
                    ? Math.round((monto / resumenMes.totalGastadoMes) * 100)
                    : 0;

                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-brand-ink">
                        <span>{info.icon}</span>
                        <span>{info.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-black text-brand-ink">
                          ${monto.toLocaleString("es-CL")}
                        </span>
                        <span className="rounded-full bg-brand-sand-light px-2 py-0.5 text-[10px] font-bold text-brand-muted border border-brand-border/60">
                          {porcentaje}%
                        </span>
                      </div>
                    </div>

                    {/* Barra visual de porcentaje */}
                    <div className="w-full h-3 bg-brand-sand-light rounded-full overflow-hidden border border-brand-border/60">
                      <div
                        className="h-full bg-brand-terracotta rounded-full transition-all duration-500"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 pt-4 border-t border-brand-border/70 flex items-center justify-between">
              <span className="font-display font-bold text-sm text-brand-ink">
                Total Acumulado del Mes:
              </span>
              <span className="font-display text-2xl font-black text-brand-terracotta">
                ${resumenMes.totalGastadoMes.toLocaleString("es-CL")} CLP
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Registro de Compra */}
      {mostrarModalCompra && (
        <RegistrarCompraModal
          usuarioId={usuarioId}
          onCerrar={() => setMostrarModalCompra(false)}
        />
      )}
    </div>
  );
}
