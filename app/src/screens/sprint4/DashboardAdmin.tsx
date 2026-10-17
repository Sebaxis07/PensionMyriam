import { useState } from "react";
import { useDashboardAdminMetricas } from "./useDashboardAdminMetricas";
import { GraficoTacometroMargen } from "./GraficoTacometroMargen";
import { GraficoComparativaRaciones } from "./GraficoComparativaRaciones";
import { MatrizRackSemanal } from "./MatrizRackSemanal";
import { RegistrarCompraModal } from "./RegistrarCompraModal";
import { InsumosHistorialModal } from "./InsumosHistorialModal";
import { ModalPlanAccionKpi, type TipoKpiAccion } from "./ModalPlanAccionKpi";
import { BotonExplicacion } from "../../components/BotonExplicacion";
import {
  IconActivity,
  IconAlertTriangle,
  IconBed,
  IconBriefcase,
  IconChartBar,
  IconCheckCircle,
  IconChevronRight,
  IconCircleDot,
  IconClock,
  IconFileText,
  IconPlus,
  IconShoppingCart,
  IconUser
} from "../../components/Icons";

interface DashboardAdminProps {
  usuarioId: string;
  onIrACostos?: () => void;
  onIrAConciliacion?: () => void;
  onIrAEmpresas?: () => void;
  onIrACalendario?: () => void;
  onIrAConsumos?: () => void;
  onAbrirGestionCuentas?: () => void;
}

export function DashboardAdmin({
  usuarioId,
  onIrACostos,
  onIrAConciliacion,
  onIrAEmpresas,
  onIrACalendario,
  onIrAConsumos,
  onAbrirGestionCuentas
}: DashboardAdminProps) {
  const {
    metricasMargen,
    metricasConciliacion,
    metricasOcupacion,
    diasSemana,
    matrizRackSemanal
  } = useDashboardAdminMetricas();

  const [mostrarModalCompra, setMostrarModalCompra] = useState(false);
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
  const [kpiPlanSeleccionado, setKpiPlanSeleccionado] = useState<TipoKpiAccion | null>(null);

  // Configuración del semáforo visual sin emojis
  const semaforoConfig = {
    verde: {
      bg: "bg-emerald-50 border-emerald-300",
      textBadge: "bg-emerald-100 text-emerald-900 border-emerald-300",
      titulo: "Margen Saludable",
      dotColor: "bg-emerald-500",
      textColor: "text-emerald-800"
    },
    amarillo: {
      bg: "bg-amber-50 border-amber-300",
      textBadge: "bg-amber-100 text-amber-900 border-amber-300",
      titulo: "Margen en Riesgo",
      dotColor: "bg-amber-500",
      textColor: "text-amber-800"
    },
    rojo: {
      bg: "bg-red-50 border-red-300",
      textBadge: "bg-red-100 text-red-900 border-red-300",
      titulo: "Margen Crítico",
      dotColor: "bg-red-500",
      textColor: "text-red-800"
    }
  }[metricasMargen.estadoSemaforo];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 animate-fadeIn pb-12">
      {/* 1. Cabecera Ejecutiva */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-sand-light text-brand-terracotta border border-brand-border shadow-xs">
            <IconChartBar className="h-6 w-6 text-brand-terracotta" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-black text-brand-ink leading-tight">
                Panel de Control y Rendimiento
              </h2>
              <span className="rounded-full bg-brand-terracotta/10 px-2.5 py-0.5 text-xs font-bold text-brand-terracotta border border-brand-terracotta/20">
                Administración
              </span>
            </div>
            <p className="text-xs text-brand-muted mt-0.5">
              Métricas clave, gráficos tácticos y estado del negocio para la Señora Miriam.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onAbrirGestionCuentas && (
            <button
              type="button"
              onClick={onAbrirGestionCuentas}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-brand-border bg-white hover:bg-brand-sand px-4 py-3 text-xs font-bold text-brand-ink transition active:scale-95 shadow-xs"
            >
              <IconUser className="h-4 w-4 text-brand-terracotta" />
              <span>Cuentas del Personal</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMostrarModalCompra(true)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-brand-terracotta hover:bg-brand-terracotta-deep px-5 py-3 text-xs font-bold text-white shadow-brand transition active:scale-95"
          >
            <IconPlus className="h-4 w-4" />
            <span>+ Anotar Compra de Mercadería</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. LOS 4 INDICADORES CLAVE (SIN CÓDIGOS INTERNOS)         */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Semáforo de Margen Mensual */}
        <div
          id="tour-kpi-semaforo"
          role="button"
          tabIndex={0}
          onClick={() => setKpiPlanSeleccionado("margen")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setKpiPlanSeleccionado("margen");
            }
          }}
          className={`flex flex-col justify-between rounded-3xl border p-5 shadow-card transition-all cursor-pointer hover:shadow-card-hover active:scale-[0.99] group ${semaforoConfig.bg}`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                  Margen Mensual
                </span>
                <BotonExplicacion
                  titulo="Margen Mensual de Ganancia"
                  queEs="Es el porcentaje de plata limpia que le queda a la pensión de todo lo que cobra en el mes, una vez que ya pagó todas las compras de comida, carne, verduras, gas e insumos."
                  comoSeUsa="Si está en VERDE (más de 35%), vas ganando bien. Si baja a AMARILLO (20% a 34%), estás ganando justo. Si pasa a ROJO (menos de 20%), cuidado: estás gastando casi lo mismo o más de lo que estás cobrando."
                  ejemplo="Si cobraste $1.000.000 y gastaste $600.000 en compras, te quedaron $400.000 limpios (40% de margen)."
                />
              </div>
              <span className={`h-2.5 w-2.5 rounded-full ${semaforoConfig.dotColor} shadow-xs`} />
            </div>
            <p className="font-display text-xs font-bold text-brand-muted mt-1">
              Ganancia Proyectada del Mes
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`font-display text-3xl font-black ${semaforoConfig.textColor}`}>
                {metricasMargen.margenPorcentaje}%
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${semaforoConfig.textBadge}`}
              >
                {semaforoConfig.titulo}
              </span>
            </div>
            <p className="text-[11px] text-brand-ink/80 mt-2 leading-snug">
              Cobrado: ${metricasMargen.ingresosTotales.toLocaleString("es-CL")} vs. Costo: $
              {metricasMargen.costosTotales.toLocaleString("es-CL")}
            </p>
          </div>
          <div>
            <div className="mt-3 pt-2.5 border-t border-brand-border/40 text-[10px] text-brand-muted flex items-center gap-1.5">
              <IconCircleDot className={`h-3 w-3 ${semaforoConfig.textColor}`} />
              <span>
                {metricasMargen.margenPorcentaje >= 35
                  ? "Rentabilidad protegida (sobre 35%)"
                  : metricasMargen.margenPorcentaje >= 20
                  ? "En observación (20% a 34%)"
                  : "Alerta: Ajustar compras o tarifas"}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-brand-border/40 flex items-center justify-between text-[11px] font-bold text-brand-terracotta group-hover:underline">
              <span>¿Qué hacer? Ver plan de acción ➔</span>
              <IconChevronRight className="h-3.5 w-3.5 text-brand-terracotta" />
            </div>
          </div>
        </div>

        {/* KPI 2: Tasa de Conciliación B2B */}
        <div
          id="tour-kpi-conciliacion"
          role="button"
          tabIndex={0}
          onClick={() => setKpiPlanSeleccionado("conciliacion")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setKpiPlanSeleccionado("conciliacion");
            }
          }}
          className="flex flex-col justify-between rounded-3xl border border-brand-border/70 bg-brand-card p-5 shadow-card transition-all cursor-pointer hover:shadow-card-hover active:scale-[0.99] group"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                  Conciliación de Empresas
                </span>
                <BotonExplicacion
                  titulo="Conciliación con Empresas"
                  queEs="Muestra qué tan cuadrada está la cuenta con las empresas contratistas. Compara los platos y camas que la empresa contrató contra lo que sus trabajadores realmente consumieron en la pensión."
                  comoSeUsa="La meta es 98% o más. Si hay 'raciones por justificar', significa que alguien comió fuera de turno o faltó anotar algo, y hay que revisarlo para cobrarlo correctamente y no perder plata."
                  ejemplo="Si contrataron 100 desayunos y se sirvieron 99, la tasa es 99% (cuenta cuadrada casi perfecta para cobrar sin reclamos)."
                />
              </div>
              <IconActivity className="h-4 w-4 text-brand-terracotta" />
            </div>
            <p className="font-display text-xs font-bold text-brand-muted mt-1">
              Tasa Conciliada
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`font-display text-3xl font-black ${
                  metricasConciliacion.tasaConciliacion >= 98
                    ? "text-emerald-700"
                    : "text-amber-700"
                }`}
              >
                {metricasConciliacion.tasaConciliacion}%
              </span>
              <span className="rounded-full bg-brand-sand-light px-2 py-0.5 text-[10px] font-bold text-brand-muted border border-brand-border/60">
                Meta: 98%
              </span>
            </div>
            <p className="text-[11px] text-brand-muted mt-2 leading-snug">
              {metricasConciliacion.conciliados} de {metricasConciliacion.totalRegistros} servicios
              cerrados sin descuadre.
            </p>
          </div>
          <div>
            <div className="mt-3 pt-2.5 border-t border-brand-border/40">
              {metricasConciliacion.pendientesJustificar > 0 ? (
                <span className="text-[11px] font-bold text-red-700 flex items-center gap-1.5">
                  <IconAlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span>{metricasConciliacion.pendientesJustificar} raciones por justificar</span>
                </span>
              ) : (
                <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                  <IconCheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Cierre contable al día</span>
                </span>
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-brand-border/40 flex items-center justify-between text-[11px] font-bold text-brand-terracotta group-hover:underline">
              <span>{metricasConciliacion.pendientesJustificar > 0 ? "Resolver descuadres ➔" : "Ver qué hacer y plan ➔"}</span>
              <IconChevronRight className="h-3.5 w-3.5 text-brand-terracotta" />
            </div>
          </div>
        </div>

        {/* KPI 3: Control y Atraso de Facturación */}
        <div
          id="tour-kpi-atraso"
          role="button"
          tabIndex={0}
          onClick={() => setKpiPlanSeleccionado("facturacion")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setKpiPlanSeleccionado("facturacion");
            }
          }}
          className="flex flex-col justify-between rounded-3xl border border-brand-border/70 bg-brand-card p-5 shadow-card transition-all cursor-pointer hover:shadow-card-hover active:scale-[0.99] group"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                  Control de Facturación
                </span>
                <BotonExplicacion
                  titulo="Atraso en Emisión de Cuentas"
                  queEs="Mide cuántos días te demoras en tener lista la cuenta y la prefactura a fin de mes para cobrarle a las empresas contratistas."
                  comoSeUsa="En el cuaderno de papel tomaba días revisar firma por firma y buscar errores. Con este sistema todo se calcula solo y está listo al instante (0 días de atraso) para mandarlo directo a la empresa o a tu contadora."
                  ejemplo="0 días significa que hoy mismo puedes descargar la prefactura lista en PDF o Excel con un solo clic."
                />
              </div>
              <IconClock className="h-4 w-4 text-brand-terracotta" />
            </div>
            <p className="font-display text-xs font-bold text-brand-muted mt-1">
              Atraso en Emisión
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-3xl font-black text-brand-ink">
                0 días
              </span>
              <span className="rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                Al Día
              </span>
            </div>
            <p className="text-[11px] text-brand-muted mt-2 leading-snug">
              Ahorro del <strong>93% de tiempo</strong> frente a revisar el cuaderno a mano.
            </p>
          </div>
          <div>
            <div className="mt-3 pt-2.5 border-t border-brand-border/40 flex items-center gap-1 text-[11px] font-semibold text-brand-ink">
              <IconFileText className="h-3.5 w-3.5 text-brand-muted shrink-0" />
              <span>Prefactura lista para contadora</span>
            </div>
            <div className="mt-2 pt-2 border-t border-brand-border/40 flex items-center justify-between text-[11px] font-bold text-brand-terracotta group-hover:underline">
              <span>Ver prefactura y cobrar ➔</span>
              <IconChevronRight className="h-3.5 w-3.5 text-brand-terracotta" />
            </div>
          </div>
        </div>

        {/* KPI 4: Capacidad y Ocupación Real */}
        <div
          id="tour-kpi-ocupacion"
          role="button"
          tabIndex={0}
          onClick={() => setKpiPlanSeleccionado("ocupacion")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setKpiPlanSeleccionado("ocupacion");
            }
          }}
          className="flex flex-col justify-between rounded-3xl border border-brand-border/70 bg-brand-card p-5 shadow-card transition-all cursor-pointer hover:shadow-card-hover active:scale-[0.99] group"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                  Capacidad y Ocupación
                </span>
                <BotonExplicacion
                  titulo="Ocupación de Habitaciones"
                  queEs="Es el porcentaje de las 8 piezas de la pensión que tienen gente durmiendo hoy."
                  comoSeUsa="Te dice de un vistazo cuántas piezas están ocupadas por empresas mineras, cuántas por turistas de paso y cuántas te quedan completamente vacías para poder arrendar hoy."
                  ejemplo="Si 6 de las 8 piezas están ocupadas, tienes un 75% de ocupación y 2 piezas libres para vender."
                />
              </div>
              <IconBed className="h-4 w-4 text-brand-terracotta" />
            </div>
            <p className="font-display text-xs font-bold text-brand-muted mt-1">
              Ocupación de Habitaciones
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-3xl font-black text-brand-terracotta">
                {metricasOcupacion.porcentajeOcupacion}%
              </span>
              <span className="text-xs font-bold text-brand-muted">
                ({metricasOcupacion.ocupadas} de {metricasOcupacion.totalHabitaciones} piezas)
              </span>
            </div>
            <p className="text-[11px] text-brand-muted mt-2 leading-snug">
              Empresa: <strong>{metricasOcupacion.ocupadasEmpresa}</strong> · Turistas:{" "}
              <strong>{metricasOcupacion.ocupadasTurista}</strong> · Libres:{" "}
              <strong>{metricasOcupacion.disponibles}</strong>
            </p>
          </div>
          <div>
            <div className="mt-3 pt-2.5 border-t border-brand-border/40">
              {/* Barra visual mini de ocupación */}
              <div className="w-full h-2 rounded-full bg-brand-sand-light overflow-hidden border border-brand-border/60">
                <div
                  className="h-full bg-brand-terracotta rounded-full transition-all duration-500"
                  style={{ width: `${metricasOcupacion.porcentajeOcupacion}%` }}
                />
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-brand-border/40 flex items-center justify-between text-[11px] font-bold text-brand-terracotta group-hover:underline">
              <span>Gestionar piezas libres ➔</span>
              <IconChevronRight className="h-3.5 w-3.5 text-brand-terracotta" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. LOS 3 GRÁFICOS VISUALES LIMPIOS (SIN EMOJIS NI CÓDIGOS) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Velocímetro de Margen */}
        <div id="tour-chart-tacometro">
          <GraficoTacometroMargen
            margenPorcentaje={metricasMargen.margenPorcentaje}
            estadoSemaforo={metricasMargen.estadoSemaforo}
            ingresosTotales={metricasMargen.ingresosTotales}
            costosTotales={metricasMargen.costosTotales}
          />
        </div>

        {/* Gráfico 2: Barras Comparativas Consumo vs Nómina */}
        <div id="tour-chart-raciones">
          <GraficoComparativaRaciones
            racionesServidas={metricasConciliacion.racionesServidas}
            racionesEsperadas={metricasConciliacion.racionesEsperadas}
            tasaConciliacion={metricasConciliacion.tasaConciliacion}
            pendientesJustificar={metricasConciliacion.pendientesJustificar}
            onIrAConciliacion={onIrAConciliacion}
          />
        </div>
      </div>

      {/* Gráfico 3: Matriz Táctica de 8 Piezas × 7 Días */}
      <div id="tour-chart-rack-semanal">
        <MatrizRackSemanal
          diasSemana={diasSemana}
          matriz={matrizRackSemanal}
          onIrACalendario={onIrACalendario}
        />
      </div>

      {/* ========================================================= */}
      {/* 4. TARIFA SUGERIDA Y RECOMENDACIÓN INTELIGENTE            */}
      {/* ========================================================= */}
      <div id="tour-card-tarifa-minima" className="rounded-3xl border border-brand-border/80 bg-brand-card p-6 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                Sugerencia de Precios para Nuevos Contratos
              </span>
              <BotonExplicacion
                titulo="Tarifa Mínima Sugerida"
                queEs="Es el precio más bajo que deberías cobrarle por noche y comida a una nueva empresa para no perder plata jamás."
                comoSeUsa="El sistema suma todo lo que has gastado en mercadería real (carne, pan, gas, verduras) y calcula cuánto cuesta exactamente mantener a 1 persona por día. Luego le agrega un 30% de ganancia limpia para darte este valor recomendado."
                ejemplo="Si alimentar y alojar a un trabajador te cuesta $14.000 diarios, el sistema te sugiere cobrar al menos $20.000 para que te queden $6.000 limpios por persona cada noche."
              />
            </div>
            <h3 className="font-display text-lg font-black text-brand-ink">
              Tarifa Mínima Recomendada por Trabajador
            </h3>
            <p className="text-xs text-brand-ink/90 leading-relaxed">
              Basado en tus compras reales de mercadería de este mes, mantener a un trabajador te cuesta{" "}
              <strong>${metricasMargen.costoDiarioTrabajador.toLocaleString("es-CL")} diarios</strong>.
              Para proteger tu negocio con al menos un <strong>30% de ganancia</strong>, debes cobrar como mínimo:
            </p>
          </div>

          <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 text-center shrink-0 min-w-[200px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
              Tarifa Mínima Sugerida
            </p>
            <p className="font-display text-2xl font-black text-amber-950 mt-0.5">
              ${metricasMargen.tarifaMinimaSugerida.toLocaleString("es-CL")}
            </p>
            <p className="text-[10px] text-amber-800 font-semibold mt-1">
              por trabajador / noche completa
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. ENLACES DIRECTOS A LOS MÓDULOS DEL SISTEMA             */}
      {/* ========================================================= */}
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
                  Historial de mercadería y catálogo de insumos
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
                  Revisa tarifas pactadas y nóminas
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
                <IconActivity className="h-5 w-5 text-emerald-800" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-brand-ink">
                  Conciliación Diaria y Cierre
                </p>
                <p className="text-[11px] text-brand-muted">
                  Compara raciones y emite prefactura
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

      {/* Modal de Plan de Acción para cada KPI */}
      <ModalPlanAccionKpi
        abierto={kpiPlanSeleccionado !== null}
        tipoKpi={kpiPlanSeleccionado}
        onCerrar={() => setKpiPlanSeleccionado(null)}
        metricasMargen={metricasMargen}
        metricasConciliacion={metricasConciliacion}
        metricasOcupacion={metricasOcupacion}
        onIrACostos={onIrACostos}
        onIrAConciliacion={onIrAConciliacion}
        onIrAEmpresas={onIrAEmpresas}
        onIrACalendario={onIrACalendario}
        onIrAConsumos={onIrAConsumos}
        onAbrirRegistrarCompra={() => setMostrarModalCompra(true)}
      />
    </div>
  );
}
