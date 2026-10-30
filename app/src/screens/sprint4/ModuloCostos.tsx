import { AvisoInterfaz } from "../../components/MensajeInterfaz";
import { useState, useMemo } from "react";
import { useInsumos, useComprasRecientes } from "../../features/costos/useInsumos";
import { RegistrarCompraModal } from "./RegistrarCompraModal";
import {
  IconApple,
  IconChartBar,
  IconClipboardCheck,
  IconDollarSign,
  IconDrumstick,
  IconFilter,
  IconFlame,
  IconPackage,
  IconPlus,
  IconSearch,
  IconShoppingCart,
  IconSparkles,
  IconTag,
  IconUtensils
} from "../../components/Icons";
import { mesHoySantiago } from "../../lib/fechaNegocio";

interface ModuloCostosProps {
  usuarioId: string;
}

type SubTabCostos = "compras" | "pmp" | "gastos";

const CATEGORIAS_INFO: Record<
  string,
  { label: string; renderIcon: (className?: string) => JSX.Element; bg: string; text: string }
> = {
  carnes: {
    label: "Carnes y Pollo",
    renderIcon: (cls) => <IconDrumstick className={cls} />,
    bg: "bg-red-50 border-red-200",
    text: "text-red-800"
  },
  verduras: {
    label: "Verduras y Frutas",
    renderIcon: (cls) => <IconApple className={cls} />,
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-800"
  },
  abarrotes: {
    label: "Abarrotes y Despensa",
    renderIcon: (cls) => <IconPackage className={cls} />,
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-800"
  },
  gas_combustible: {
    label: "Gas y Combustible",
    renderIcon: (cls) => <IconFlame className={cls} />,
    bg: "bg-orange-50 border-orange-200",
    text: "text-orange-800"
  },
  aseo: {
    label: "Aseo y Limpieza",
    renderIcon: (cls) => <IconSparkles className={cls} />,
    bg: "bg-sky-50 border-sky-200",
    text: "text-sky-800"
  },
  otro: {
    label: "Otros Insumos",
    renderIcon: (cls) => <IconTag className={cls} />,
    bg: "bg-stone-50 border-stone-200",
    text: "text-stone-800"
  }
};

export function ModuloCostos({ usuarioId }: ModuloCostosProps) {
  const [subTab, setSubTab] = useState<SubTabCostos>("compras");
  const [avisoCompra, setAvisoCompra] = useState(false);
  const [mostrarModalCompra, setMostrarModalCompra] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [busqueda, setBusqueda] = useState<string>("");

  const compras = useComprasRecientes(100);
  const insumos = useInsumos();

  // Cálculos consolidados para el mes actual
  const resumenMes = useMemo(() => {
    const mesActualStr = mesHoySantiago(); // "YYYY-MM", día de negocio en Santiago
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
    <div className="ui-operativa mx-auto flex w-full max-w-5xl flex-col gap-6 animate-fadeIn">
      {avisoCompra && <AvisoInterfaz tono="exito">Compra registrada en este celular. Revisa el indicador para saber si quedan cambios por enviar.</AvisoInterfaz>}
      {/* 1. Cabecera del Módulo con Acción Destacada */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 shadow-sm">
            <IconShoppingCart className="h-6 w-6 text-amber-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-black text-brand-ink leading-tight">
                Control de Compras y Costos
              </h2>
              <span className="rounded-full bg-brand-terracotta-deep/10 px-2.5 py-0.5 text-sm font-bold text-brand-terracotta-deep border border-brand-terracotta/20">
                Mercadería
              </span>
            </div>
            <p className="text-sm text-brand-ink/80 mt-0.5">
              Anota las compras de mercadería, gas y aseo para calcular el costo real promedio por kilo y ración.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMostrarModalCompra(true)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-brand-terracotta-deep hover:bg-brand-terracotta-deep px-5 py-3 text-sm font-black text-white shadow-brand transition active:scale-95 shrink-0"
        >
          <IconPlus className="h-4 w-4" />
          <span>+ Anotar Compra</span>
        </button>
      </div>

      {/* 2. Tarjetas de Resumen Rápido del Mes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="rounded-3xl border border-brand-border/70 bg-brand-card p-4 md:p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-brand-ink/80">
              Gasto Este Mes
            </span>
            <IconDollarSign className="h-5 w-5 text-brand-terracotta-deep" />
          </div>
          <p className="font-display text-2xl md:text-3xl font-black text-brand-ink mt-2">
            ${resumenMes.totalGastadoMes.toLocaleString("es-CL")}
          </p>
          <p className="text-xs text-brand-ink/80 mt-1">
            {resumenMes.totalComprasMes} compras anotadas en el mes
          </p>
        </div>

        <div className="rounded-3xl border border-brand-border/70 bg-brand-card p-4 md:p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-brand-ink/80">
              Catálogo Insumos
            </span>
            <IconClipboardCheck className="h-5 w-5 text-brand-terracotta-deep" />
          </div>
          <p className="font-display text-2xl md:text-3xl font-black text-brand-ink mt-2">
            {insumos.length} productos
          </p>
          <p className="text-xs text-brand-ink/80 mt-1">
            Con costo promedio calculado
          </p>
        </div>

        <div className="rounded-3xl border border-brand-border/70 bg-brand-card p-4 md:p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-brand-ink/80">
              Última Compra
            </span>
            <IconShoppingCart className="h-5 w-5 text-brand-terracotta-deep" />
          </div>
          <p className="font-display text-base md:text-lg font-bold text-brand-ink mt-2 truncate">
            {compras[0] ? compras[0].insumo_nombre : "Sin compras aún"}
          </p>
          <p className="text-xs text-brand-ink/80 mt-1">
            {compras[0] ? `Fecha: ${compras[0].fecha}` : "Registra tu primera compra"}
          </p>
        </div>
      </div>

      {/* 3. Selector de Pestañas Principales del Módulo */}
      <div className="flex flex-wrap items-center gap-2 border-b border-brand-border/70 pb-3">
        <button
          type="button"
          onClick={() => setSubTab("compras")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm md:text-sm font-bold transition-all ${
            subTab === "compras"
              ? "bg-brand-terracotta-deep text-white shadow-brand"
              : "bg-brand-card text-brand-ink/80 hover:text-brand-ink border border-brand-border/70"
          }`}
        >
          <IconShoppingCart className="h-4 w-4" />
          <span>Historial de Compras ({compras.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("pmp")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm md:text-sm font-bold transition-all ${
            subTab === "pmp"
              ? "bg-brand-terracotta-deep text-white shadow-brand"
              : "bg-brand-card text-brand-ink/80 hover:text-brand-ink border border-brand-border/70"
          }`}
        >
          <IconClipboardCheck className="h-4 w-4" />
          <span>Catálogo y Precios Promedio ({insumos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("gastos")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm md:text-sm font-bold transition-all ${
            subTab === "gastos"
              ? "bg-brand-terracotta-deep text-white shadow-brand"
              : "bg-brand-card text-brand-ink/80 hover:text-brand-ink border border-brand-border/70"
          }`}
        >
          <IconChartBar className="h-4 w-4" />
          <span>Distribución del Gasto</span>
        </button>
      </div>

      {/* 4. Barra de Filtros y Búsqueda */}
      {(subTab === "compras" || subTab === "pmp") && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Buscador */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-ink/80">
              <IconSearch className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar compras o insumos"
              placeholder={
                subTab === "compras"
                  ? "Buscar por producto o categoría..."
                  : "Buscar insumo en el catálogo..."
              }
              className="w-full rounded-2xl border border-brand-border/80 bg-white pl-10 pr-4 py-2.5 text-sm font-semibold text-brand-ink placeholder:text-brand-ink/60 focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta shadow-sm"
            />
          </div>

          {/* Filtro por Categoría con botones rápidos */}
          <div className="flex flex-wrap items-center gap-1.5 pb-1 sm:pb-0">
            <span className="text-xs font-bold text-brand-ink/80 mr-1 hidden md:flex items-center gap-1">
              <IconFilter className="h-3.5 w-3.5" />
              Filtrar:
            </span>
            <button
              type="button"
              onClick={() => setFiltroCategoria("todas")}
              className={`rounded-xl px-3 py-1.5 text-sm font-bold transition ${
                filtroCategoria === "todas"
                  ? "bg-brand-ink text-white"
                  : "bg-brand-sand-deep text-brand-ink/80 hover:bg-brand-sand"
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
                  className={`rounded-xl px-2.5 py-1.5 text-sm font-bold transition flex items-center gap-1.5 ${
                    activo
                      ? "bg-brand-ink text-white"
                      : "bg-brand-sand-deep text-brand-ink/80 hover:bg-brand-sand"
                  }`}
                >
                  {info.renderIcon("h-3.5 w-3.5")}
                  <span>{info.label.split(" ")[0]}</span>
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
              <IconShoppingCart className="h-10 w-10 text-brand-ink/60 mx-auto mb-3" />
              <h3 className="font-display text-lg font-bold text-brand-ink">
                No se encontraron compras
              </h3>
              <p className="text-sm text-brand-ink/80 mt-1 max-w-sm mx-auto">
                {compras.length === 0
                  ? "Aún no has anotado ninguna compra de mercadería. Presiona el botón de arriba para registrar la primera."
                  : "No hay compras que coincidan con la búsqueda o el filtro seleccionado."}
              </p>
              {compras.length === 0 && (
                <button
                  type="button"
                  onClick={() => setMostrarModalCompra(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-brand-terracotta-deep px-5 py-2.5 text-sm font-bold text-white shadow-brand hover:bg-brand-terracotta-deep transition"
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
                  renderIcon: (cls?: string) => <IconTag className={cls} />,
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
                      {/* Cabecera de tarjeta: Icono SVG + Nombre + Fecha */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-sand-deep border border-brand-border shadow-sm text-brand-ink">
                            {cat.renderIcon("h-5 w-5 text-brand-terracotta-deep")}
                          </div>
                          <div>
                            <h4 className="font-display text-base font-bold text-brand-ink leading-tight">
                              {c.insumo_nombre || "Insumo sin nombre"}
                            </h4>
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold border mt-1 ${cat.bg} ${cat.text}`}
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
                          <p className="text-xs text-brand-ink/80">Total pagado</p>
                        </div>
                      </div>

                      {/* Detalles de volumen y costo unitario */}
                      <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-3 border-t border-brand-border/50 text-sm">
                        <div className="rounded-xl bg-brand-sand-deep px-2.5 py-1 font-semibold text-brand-ink border border-brand-border/50 flex items-center gap-1">
                          <IconPackage className="h-3.5 w-3.5 text-brand-ink/80" />
                          <span>{c.cantidad} unidades/kg</span>
                        </div>
                        {costoUnitario !== null && (
                          <div className="rounded-xl bg-brand-sand-deep px-2.5 py-1 font-semibold text-brand-ink border border-brand-border/50 flex items-center gap-1">
                            <IconDollarSign className="h-3.5 w-3.5 text-brand-ink/80" />
                            <span>${costoUnitario.toLocaleString("es-CL")} / unidad</span>
                          </div>
                        )}
                        {costoPorRacion !== null && (
                          <div className="rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 font-bold flex items-center gap-1">
                            <IconUtensils className="h-3.5 w-3.5 text-emerald-700" />
                            <span>{c.rendimiento_estimado} raciones (${costoPorRacion.toLocaleString("es-CL")}/ración)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 flex items-center justify-between text-xs text-brand-ink/80">
                      <span>Fecha de compra: <strong>{c.fecha}</strong></span>
                      <span>Compra registrada</span>
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
          <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-4 md:p-5 shadow-card flex items-start gap-3.5">
            <IconSparkles className="h-5 w-5 text-amber-800 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-950 space-y-1">
              <p className="font-bold text-sm">¿Cómo funciona el Costo Promedio Ponderado?</p>
              <p className="text-amber-900 leading-relaxed">
                Cuando compras mercadería a diferentes precios según el mercado, el sistema calcula automáticamente el costo exacto promedio ponderado por kilo o unidad. Este promedio sirve como referencia para estimar el costo de los servicios; depende de las compras y rendimientos que registres.
              </p>
            </div>
          </div>

          {insumosFiltrados.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-brand-border/90 bg-brand-card p-12 text-center shadow-card">
              <IconClipboardCheck className="h-10 w-10 text-brand-ink/60 mx-auto mb-3" />
              <h3 className="font-display text-lg font-bold text-brand-ink">
                No hay insumos en el catálogo
              </h3>
              <p className="text-sm text-brand-ink/80 mt-1 max-w-sm mx-auto">
                Los insumos se agregan y actualizan automáticamente cada vez que anotas una compra de mercadería.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {insumosFiltrados.map((ins) => {
                const cat = CATEGORIAS_INFO[ins.categoria] || {
                  label: ins.categoria,
                  renderIcon: (cls?: string) => <IconTag className={cls} />,
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
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-sand-deep border border-brand-border/60 text-brand-ink">
                          {cat.renderIcon("h-4 w-4 text-brand-terracotta-deep")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-display font-bold text-sm text-brand-ink truncate">
                            {ins.nombre}
                          </h4>
                          <p className="text-xs text-brand-ink/80 truncate">{cat.label}</p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl bg-brand-sand-deep p-3 border border-brand-border/60">
                        <p className="text-xs font-bold uppercase tracking-wider text-brand-ink/80">
                          Costo promedio de compra
                        </p>
                        <p className="font-display text-xl font-black text-brand-ink mt-0.5">
                          ${Math.round(ins.costo_promedio).toLocaleString("es-CL")}
                          <span className="text-sm font-normal text-brand-ink/80 ml-1">
                            / {ins.unidad_medida}
                          </span>
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-sm text-brand-ink/80 px-1">
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
            <p className="text-sm text-brand-ink/80 mb-6">
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
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 font-bold text-brand-ink">
                        {info.renderIcon("h-4 w-4 text-brand-terracotta-deep")}
                        <span>{info.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-black text-brand-ink">
                          ${monto.toLocaleString("es-CL")}
                        </span>
                        <span className="rounded-full bg-brand-sand-deep px-2 py-0.5 text-xs font-bold text-brand-ink/80 border border-brand-border/60">
                          {porcentaje}%
                        </span>
                      </div>
                    </div>

                    {/* Barra visual de porcentaje */}
                    <div className="w-full h-3 bg-brand-sand-deep rounded-full overflow-hidden border border-brand-border/60">
                      <div
                        className="h-full bg-brand-terracotta-deep rounded-full transition-all duration-500"
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
              <span className="font-display text-2xl font-black text-brand-terracotta-deep">
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
          onCompraGuardada={() => setAvisoCompra(true)}
        />
      )}
    </div>
  );
}
