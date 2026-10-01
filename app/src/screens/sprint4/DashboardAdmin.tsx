import { useState } from "react";
import { useMargenProyectado } from "../../features/costos/useMargenProyectado";
import { RegistrarCompraModal } from "./RegistrarCompraModal";
import { InsumosHistorialModal } from "./InsumosHistorialModal";
import { useComprasRecientes } from "../../features/costos/useInsumos";
import {
  IconBriefcase,
  IconChartBar,
  IconClipboardCheck,
  IconChevronRight,
  IconPlus,
  IconShoppingCart
} from "../../components/Icons";

interface DashboardAdminProps {
  usuarioId: string;
  onIrACostos?: () => void;
  onIrAConciliacion?: () => void;
  onIrAEmpresas?: () => void;
}

export function DashboardAdmin({
  usuarioId,
  onIrACostos,
  onIrAConciliacion,
  onIrAEmpresas
}: DashboardAdminProps) {
  const metricas = useMargenProyectado();
  const comprasRecientes = useComprasRecientes(5);

  const [mostrarModalCompra, setMostrarModalCompra] = useState(false);
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);

  // Colores y badges según el semáforo
  const semaforoConfig = {
    verde: {
      bg: "bg-emerald-50 border-emerald-300",
      textBadge: "bg-emerald-100 text-emerald-900 border-emerald-300",
      titulo: "Ganancia Saludable",
      icono: "🟢",
      textColor: "text-emerald-800"
    },
    amarillo: {
      bg: "bg-amber-50 border-amber-300",
      textBadge: "bg-amber-100 text-amber-900 border-amber-300",
      titulo: "Ganancia en Observación",
      icono: "🟡",
      textColor: "text-amber-800"
    },
    rojo: {
      bg: "bg-red-50 border-red-300",
      textBadge: "bg-red-100 text-red-900 border-red-300",
      titulo: "Ganancia en Alerta Baja",
      icono: "🔴",
      textColor: "text-red-800"
    }
  }[metricas.estadoSemaforo];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {/* 1. Cabecera Ejecutiva */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-sand-light text-brand-terracotta border border-brand-border shadow-xs">
            <IconChartBar className="h-6 w-6 text-brand-terracotta" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-black text-brand-ink leading-tight">
              Control de Ganancias y Costos
            </h2>
            <p className="text-xs text-brand-muted">
              Panel exclusivo de administración para la Señora Miriam.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMostrarModalCompra(true)}
            className="flex items-center gap-2 rounded-2xl bg-brand-terracotta hover:bg-brand-terracotta-deep px-5 py-3 text-xs font-bold text-white shadow-brand transition active:scale-95"
          >
            <IconPlus className="h-4 w-4" />
            <span>+ Anotar Compra de Mercadería</span>
          </button>
        </div>
      </div>

      {/* 2. Gran Semáforo de Margen Mensual (HU-24) */}
      <div className={`rounded-3xl border p-6 md:p-8 shadow-card transition-all ${semaforoConfig.bg}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Porcentaje y estado del semáforo */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{semaforoConfig.icono}</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black border ${semaforoConfig.textBadge}`}
              >
                {semaforoConfig.titulo}
              </span>
              <span className="text-xs font-semibold text-brand-muted">
                (Mes en curso)
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className={`font-display text-5xl md:text-6xl font-black tracking-tight ${semaforoConfig.textColor}`}>
                {metricas.margenPorcentaje}%
              </span>
              <span className="font-display text-xl font-bold text-brand-ink">
                de ganancia proyectada
              </span>
            </div>

            <p className="text-xs font-medium text-brand-muted max-w-md">
              La pensión proyecta recibir ${metricas.ingresosTotales.toLocaleString("es-CL")} en total, con un gasto estimado de ${metricas.costosTotales.toLocaleString("es-CL")} en alimentos, gas y aseo.
            </p>
          </div>

          {/* Cuadro de Ganancia Limpia en Dinero */}
          <div className="rounded-2xl bg-white/90 border border-brand-border/60 p-4 text-center min-w-[200px] shadow-xs">
            <span className="text-[10px] uppercase font-black tracking-wider text-brand-muted block">
              Ganancia Estimada del Mes
            </span>
            <span className="font-display text-2xl md:text-3xl font-black text-brand-ink mt-1 block">
              ${metricas.margenNetoMonto.toLocaleString("es-CL")}
            </span>
            <span className="text-[11px] text-emerald-800 font-bold block mt-0.5">
              después de pagar insumos
            </span>
          </div>
        </div>

        {/* 3. Consejo o Recomendación Inteligente (HU-26) */}
        <div className="mt-5 rounded-2xl bg-white border border-brand-border/70 p-4 flex items-start gap-3 shadow-xs">
          <span className="text-2xl shrink-0">💡</span>
          <div>
            <h4 className="font-display text-sm font-bold text-brand-ink">
              Consejo para la pensión:
            </h4>
            <p className="text-xs text-brand-ink mt-1 leading-relaxed">
              {metricas.recomendacion}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Tarjetas de Costo Diario por Trabajador y Tarifa Mínima (HU-25) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Tarjeta 1: Costo por trabajador */}
        <div className="flex flex-col justify-between rounded-3xl border border-brand-border/80 bg-brand-card p-5 shadow-card">
          <span className="text-2xl mb-2">🛏️</span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-muted">
              Costo por Trabajador
            </p>
            <p className="font-display text-2xl font-black text-brand-ink mt-0.5">
              ${metricas.costoDiarioTrabajador.toLocaleString("es-CL")}
            </p>
            <p className="text-[11px] text-brand-muted mt-1">
              por día (cama + 3 comidas)
            </p>
          </div>
        </div>

        {/* Tarjeta 2: Tarifa mínima recomendada */}
        <div className="flex flex-col justify-between rounded-3xl border border-brand-border/80 bg-brand-card p-5 shadow-card">
          <span className="text-2xl mb-2">🎯</span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-muted">
              Tarifa Mínima Sugerida
            </p>
            <p className="font-display text-2xl font-black text-brand-terracotta mt-0.5">
              ${metricas.tarifaMinimaSugerida.toLocaleString("es-CL")}
            </p>
            <p className="text-[11px] text-emerald-800 font-semibold mt-1">
              asegura un 30% de ganancia
            </p>
          </div>
        </div>

        {/* Tarjeta 3: Total Ingresos Proyectados */}
        <div className="flex flex-col justify-between rounded-3xl border border-brand-border/80 bg-brand-card p-5 shadow-card">
          <span className="text-2xl mb-2">💵</span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-muted">
              Ingresos del Período
            </p>
            <p className="font-display text-2xl font-black text-emerald-800 mt-0.5">
              ${metricas.ingresosTotales.toLocaleString("es-CL")}
            </p>
            <p className="text-[11px] text-brand-muted mt-1">
              contratos y turistas
            </p>
          </div>
        </div>

        {/* Tarjeta 4: Total Costos Insumos */}
        <div className="flex flex-col justify-between rounded-3xl border border-brand-border/80 bg-brand-card p-5 shadow-card">
          <span className="text-2xl mb-2">🛒</span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-muted">
              Costos en Mercadería
            </p>
            <p className="font-display text-2xl font-black text-brand-ink mt-0.5">
              ${metricas.costosTotales.toLocaleString("es-CL")}
            </p>
            <p className="text-[11px] text-brand-muted mt-1">
              {metricas.totalComprasPeriodo} compras anotadas
            </p>
          </div>
        </div>
      </div>

      {/* 5. Compras Recientes y Botón de Historial */}
      <div className="rounded-3xl border border-brand-border/80 bg-brand-card p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-brand-border/60 pb-3">
          <div>
            <h3 className="font-display text-base font-bold text-brand-ink">
              Últimas Compras de Insumos y Mercadería
            </h3>
            <p className="text-xs text-brand-muted">
              Calculan automáticamente el costo de cada plato servido en la pensión.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onIrACostos) {
                onIrACostos();
              } else {
                setMostrarModalHistorial(true);
              }
            }}
            className="rounded-xl border border-brand-border bg-white px-3 py-1.5 text-xs font-bold text-brand-terracotta hover:bg-brand-sand transition"
          >
            Ver todas las compras →
          </button>
        </div>

        {comprasRecientes.length === 0 ? (
          <div className="p-8 text-center text-xs text-brand-muted rounded-2xl border border-dashed border-brand-border">
            Aún no has anotado compras de mercadería este mes.
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setMostrarModalCompra(true)}
                className="rounded-xl bg-brand-terracotta px-4 py-2 text-xs font-bold text-white shadow-brand hover:bg-brand-terracotta-deep"
              >
                + Anotar primera compra
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {comprasRecientes.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-brand-border/60 bg-white p-3.5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-brand-ink">
                      {c.insumo_nombre || "Mercadería"}
                    </span>
                    <span className="text-[10px] text-brand-muted">
                      {c.fecha}
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-muted mt-1 capitalize">
                    {c.categoria.replace("_", " ")} · {c.cantidad} unidades/kg
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-brand-border/40 text-right">
                  <span className="font-display font-black text-sm text-brand-terracotta">
                    ${Number(c.monto_total).toLocaleString("es-CL")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Enlaces de Gestión Rápida */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {onIrACostos && (
          <button
            type="button"
            onClick={onIrACostos}
            className="flex items-center justify-between p-4 rounded-2xl border border-brand-border/80 bg-white hover:bg-brand-sand-light transition shadow-card text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 shadow-xs">
                <IconShoppingCart className="h-5 w-5 text-amber-900" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-brand-ink">
                  Módulo de Compras y Costos
                </p>
                <p className="text-[11px] text-brand-muted">
                  Historial de mercadería y catálogo PMP
                </p>
              </div>
            </div>
            <IconChevronRight className="h-4 w-4 text-brand-muted" />
          </button>
        )}

        {onIrAEmpresas && (
          <button
            type="button"
            onClick={onIrAEmpresas}
            className="flex items-center justify-between p-4 rounded-2xl border border-brand-border/80 bg-white hover:bg-brand-sand-light transition shadow-card text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-sand text-brand-terracotta shadow-xs">
                <IconBriefcase className="h-5 w-5 text-brand-terracotta" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-brand-ink">
                  Empresas y Contratos Vigentes
                </p>
                <p className="text-[11px] text-brand-muted">
                  Revisa las tarifas pactadas y nóminas de faena
                </p>
              </div>
            </div>
            <IconChevronRight className="h-4 w-4 text-brand-muted" />
          </button>
        )}

        {onIrAConciliacion && (
          <button
            type="button"
            onClick={onIrAConciliacion}
            className="flex items-center justify-between p-4 rounded-2xl border border-brand-border/80 bg-white hover:bg-brand-sand-light transition shadow-card text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 shadow-xs">
                <IconClipboardCheck className="h-5 w-5 text-emerald-800" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-brand-ink">
                  Conciliación Diaria y Cierre
                </p>
                <p className="text-[11px] text-brand-muted">
                  Compara raciones servidas y genera pre-factura
                </p>
              </div>
            </div>
            <IconChevronRight className="h-4 w-4 text-brand-muted" />
          </button>
        )}
      </div>

      {/* Modales */}
      {mostrarModalCompra && (
        <RegistrarCompraModal
          usuarioId={usuarioId}
          onCerrar={() => setMostrarModalCompra(false)}
        />
      )}

      {mostrarModalHistorial && (
        <InsumosHistorialModal
          onCerrar={() => setMostrarModalHistorial(false)}
        />
      )}
    </div>
  );
}
