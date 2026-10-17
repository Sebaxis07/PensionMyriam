import {
  IconActivity,
  IconBed,
  IconCheckCircle,
  IconChevronRight,
  IconClock,
  IconFileText,
  IconPlus,
  IconShoppingCart
} from "../../components/Icons";

export type TipoKpiAccion = "margen" | "conciliacion" | "facturacion" | "ocupacion";

export interface MetricasMargenInfo {
  margenPorcentaje: number;
  estadoSemaforo: "verde" | "amarillo" | "rojo";
  ingresosTotales: number;
  costosTotales: number;
  costoDiarioTrabajador: number;
  tarifaMinimaSugerida: number;
  contratosBajoMinimo?: Array<{ razonSocial: string; tarifa: number }>;
}

export interface MetricasConciliacionInfo {
  tasaConciliacion: number;
  totalRegistros: number;
  conciliados: number;
  pendientesJustificar: number;
  racionesServidas: number;
  racionesEsperadas: number;
  diasConDescuadre: string[];
}

export interface MetricasOcupacionInfo {
  totalHabitaciones: number;
  ocupadas: number;
  disponibles: number;
  enMantencion: number;
  ocupadasEmpresa: number;
  ocupadasTurista: number;
  porcentajeOcupacion: number;
}

export interface ModalPlanAccionKpiProps {
  abierto: boolean;
  tipoKpi: TipoKpiAccion | null;
  onCerrar: () => void;
  metricasMargen: MetricasMargenInfo;
  metricasConciliacion: MetricasConciliacionInfo;
  metricasOcupacion: MetricasOcupacionInfo;
  onIrACostos?: () => void;
  onIrAConciliacion?: () => void;
  onIrAEmpresas?: () => void;
  onIrACalendario?: () => void;
  onIrAConsumos?: () => void;
  onAbrirRegistrarCompra: () => void;
}

export function ModalPlanAccionKpi({
  abierto,
  tipoKpi,
  onCerrar,
  metricasMargen,
  metricasConciliacion,
  metricasOcupacion,
  onIrACostos,
  onIrAConciliacion,
  onIrAEmpresas,
  onIrACalendario,
  onIrAConsumos,
  onAbrirRegistrarCompra
}: ModalPlanAccionKpiProps) {
  if (!abierto || !tipoKpi) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/60 p-4 backdrop-blur-xs animate-fadeIn"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-xl rounded-3xl border border-brand-border/80 bg-brand-card p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-scaleUp text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================= */}
        {/* KPI 1: MARGEN MENSUAL                                      */}
        {/* ========================================================= */}
        {tipoKpi === "margen" && (
          <>
            {/* Cabecera */}
            <div className="flex items-start justify-between gap-3 border-b border-brand-border/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                  <IconShoppingCart className="h-6 w-6 text-amber-900" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                      Plan de Acción · Finanzas
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                        metricasMargen.estadoSemaforo === "verde"
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                          : metricasMargen.estadoSemaforo === "amarillo"
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : "bg-red-100 text-red-900 border-red-300"
                      }`}
                    >
                      {metricasMargen.margenPorcentaje}% Margen
                    </span>
                  </div>
                  <h3 className="font-display text-lg sm:text-xl font-black text-brand-ink leading-tight mt-0.5">
                    Margen de Ganancia del Mes
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onCerrar}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand-border/60 bg-white text-brand-muted hover:text-brand-ink text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Diagnóstico en tiempo real */}
            <div
              className={`rounded-2xl border p-4 text-xs leading-relaxed space-y-2 ${
                metricasMargen.estadoSemaforo === "verde"
                  ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                  : metricasMargen.estadoSemaforo === "amarillo"
                  ? "bg-amber-50/80 border-amber-300 text-amber-950"
                  : "bg-red-50/80 border-red-300 text-red-950"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <span>
                  {metricasMargen.estadoSemaforo === "verde"
                    ? "✓ Tu ganancia está protegida y saludable"
                    : metricasMargen.estadoSemaforo === "amarillo"
                    ? "⚠️ Margen en observación: ganando justo"
                    : "🚨 Alerta: Margen crítico, gastos muy altos"}
                </span>
              </div>
              <p>
                Este mes has cobrado <strong>${metricasMargen.ingresosTotales.toLocaleString("es-CL")}</strong> y
                registrado compras por <strong>${metricasMargen.costosTotales.toLocaleString("es-CL")}</strong>.
                Te queda una ganancia limpia proyectada del <strong>{metricasMargen.margenPorcentaje}%</strong>.
              </p>
              <p className="text-[11px] opacity-90">
                Mantener a cada trabajador en la pensión te está costando <strong>${metricasMargen.costoDiarioTrabajador.toLocaleString("es-CL")} diarios</strong>.
                Para no perder plata, la tarifa sugerida mínima para nuevos contratos es <strong>${metricasMargen.tarifaMinimaSugerida.toLocaleString("es-CL")}/noche</strong>.
              </p>
            </div>

            {/* ¿Qué tienes que hacer hoy? */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-terracotta">
                ¿Qué tienes que hacer hoy? (Paso a paso)
              </h4>
              <div className="space-y-2 text-xs text-brand-ink">
                <div className="flex items-start gap-2.5 rounded-xl bg-brand-sand-light p-3 border border-brand-border/60">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-terracotta text-white font-bold text-[11px]">
                    1
                  </span>
                  <div>
                    <strong className="block text-brand-ink font-bold">Anota las compras de mercadería de hoy:</strong>
                    <p className="text-brand-muted text-[11px] mt-0.5">
                      Si compraste carne, verduras, gas o útiles de aseo, anótalos ahora para que el costo de la pensión sea 100% exacto.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl bg-brand-sand-light p-3 border border-brand-border/60">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-terracotta text-white font-bold text-[11px]">
                    2
                  </span>
                  <div>
                    <strong className="block text-brand-ink font-bold">Revisa los precios de tus proveedores:</strong>
                    <p className="text-brand-muted text-[11px] mt-0.5">
                      En el módulo de Costos puedes ver el historial de boletas para no pagar sobreprecios en insumos clave.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de acción directa ("y lo mande") */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  onCerrar();
                  onAbrirRegistrarCompra();
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-terracotta hover:bg-brand-terracotta-deep text-white px-4 py-3 text-xs font-bold shadow-brand transition active:scale-95 cursor-pointer"
              >
                <IconPlus className="h-4 w-4" />
                <span>+ Anotar Compra de Mercadería Ahora</span>
              </button>

              {onIrACostos && (
                <button
                  type="button"
                  onClick={() => {
                    onCerrar();
                    onIrACostos();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-border bg-white hover:bg-brand-sand px-4 py-3 text-xs font-bold text-brand-ink transition active:scale-95 cursor-pointer"
                >
                  <span>Ir a Costos y Boletas</span>
                  <IconChevronRight className="h-4 w-4 text-brand-muted" />
                </button>
              )}
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* KPI 2: CONCILIACIÓN DE EMPRESAS                            */}
        {/* ========================================================= */}
        {tipoKpi === "conciliacion" && (
          <>
            {/* Cabecera */}
            <div className="flex items-start justify-between gap-3 border-b border-brand-border/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
                  <IconActivity className="h-6 w-6 text-emerald-800" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                      Plan de Acción · Contratos B2B
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                        metricasConciliacion.pendientesJustificar > 0
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : "bg-emerald-100 text-emerald-900 border-emerald-300"
                      }`}
                    >
                      {metricasConciliacion.tasaConciliacion}% Cuadrado
                    </span>
                  </div>
                  <h3 className="font-display text-lg sm:text-xl font-black text-brand-ink leading-tight mt-0.5">
                    Conciliación con Empresas Contratistas
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onCerrar}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand-border/60 bg-white text-brand-muted hover:text-brand-ink text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Diagnóstico en tiempo real */}
            <div
              className={`rounded-2xl border p-4 text-xs leading-relaxed space-y-2 ${
                metricasConciliacion.pendientesJustificar > 0
                  ? "bg-amber-50/80 border-amber-300 text-amber-950"
                  : "bg-emerald-50/80 border-emerald-300 text-emerald-950"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <span>
                  {metricasConciliacion.pendientesJustificar > 0
                    ? `⚠️ Hay ${metricasConciliacion.pendientesJustificar} raciones con descuadre por justificar`
                    : "✓ Cierre contable al día: 0 descuadres pendientes"}
                </span>
              </div>
              <p>
                {metricasConciliacion.pendientesJustificar > 0 ? (
                  <>
                    La empresa contrató un número de raciones fijas, pero hubo trabajadores que comieron fuera de turno,
                    doble turno o no bajaron al comedor. Si no justificas estas <strong>{metricasConciliacion.pendientesJustificar} raciones</strong>,
                    la empresa podría rechazar la factura a fin de mes o quedarían platos sin cobrar.
                  </>
                ) : (
                  <>
                    Todas las raciones servidas ({metricasConciliacion.racionesServidas}) coinciden exactamente con lo pactado
                    en los contratos vigentes. Tu cuenta está perfectamente cuadrada para facturar.
                  </>
                )}
              </p>
            </div>

            {/* ¿Qué tienes que hacer hoy? */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-terracotta">
                ¿Qué tienes que hacer hoy? (Paso a paso)
              </h4>
              <div className="space-y-2 text-xs text-brand-ink">
                <div className="flex items-start gap-2.5 rounded-xl bg-brand-sand-light p-3 border border-brand-border/60">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-terracotta text-white font-bold text-[11px]">
                    1
                  </span>
                  <div>
                    <strong className="block text-brand-ink font-bold">Abre la Conciliación de Empresas:</strong>
                    <p className="text-brand-muted text-[11px] mt-0.5">
                      Ingresa al módulo de empresas para ver la lista de turnos con diferencias entre lo pactado y lo comido.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl bg-brand-sand-light p-3 border border-brand-border/60">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-terracotta text-white font-bold text-[11px]">
                    2
                  </span>
                  <div>
                    <strong className="block text-brand-ink font-bold">Selecciona el motivo operacional:</strong>
                    <p className="text-brand-muted text-[11px] mt-0.5">
                      Marca el motivo (ej. "Cambio de turno en faena" o "Ausencia justificada"). Recuerda que por Ley 21.719 no se registran datos médicos.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl bg-brand-sand-light p-3 border border-brand-border/60">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-terracotta text-white font-bold text-[11px]">
                    3
                  </span>
                  <div>
                    <strong className="block text-brand-ink font-bold">Cierra el día:</strong>
                    <p className="text-brand-muted text-[11px] mt-0.5">
                      Una vez justificado, la tasa sube al 100% y la prefactura queda sellada para cobro seguro.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de acción directa ("y lo mande") */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              {onIrAConciliacion && (
                <button
                  type="button"
                  onClick={() => {
                    onCerrar();
                    onIrAConciliacion();
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-terracotta hover:bg-brand-terracotta-deep text-white px-4 py-3 text-xs font-bold shadow-brand transition active:scale-95 cursor-pointer"
                >
                  <IconCheckCircle className="h-4 w-4" />
                  <span>Ir a Conciliar Raciones de Empresas ➔</span>
                </button>
              )}

              {onIrAConsumos && (
                <button
                  type="button"
                  onClick={() => {
                    onCerrar();
                    onIrAConsumos();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-border bg-white hover:bg-brand-sand px-4 py-3 text-xs font-bold text-brand-ink transition active:scale-95 cursor-pointer"
                >
                  <span>Ver Comedor de Hoy</span>
                  <IconChevronRight className="h-4 w-4 text-brand-muted" />
                </button>
              )}
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* KPI 3: CONTROL DE FACTURACIÓN                              */}
        {/* ========================================================= */}
        {tipoKpi === "facturacion" && (
          <>
            {/* Cabecera */}
            <div className="flex items-start justify-between gap-3 border-b border-brand-border/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-900 border border-blue-300 shadow-xs">
                  <IconClock className="h-6 w-6 text-blue-900" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                      Plan de Acción · Cobranza y Cierre
                    </span>
                    <span className="rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                      0 Días Atraso
                    </span>
                  </div>
                  <h3 className="font-display text-lg sm:text-xl font-black text-brand-ink leading-tight mt-0.5">
                    Control de Facturación y Prefactura
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onCerrar}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand-border/60 bg-white text-brand-muted hover:text-brand-ink text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Diagnóstico en tiempo real */}
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4 text-xs leading-relaxed space-y-2 text-emerald-950">
              <div className="flex items-center gap-2 font-bold text-sm">
                <span>✓ Prefactura 100% calculada en tiempo real</span>
              </div>
              <p>
                Tu facturación está completamente al día (<strong>0 días de atraso</strong>). El sistema ha sumado
                automáticamente cada noche de cama y cada servicio de comedor registrado hasta hoy.
              </p>
              <p className="text-[11px] opacity-90">
                Ahorras un <strong>93% de tiempo</strong> frente a revisar el cuaderno de firmas a mano a fin de mes.
              </p>
            </div>

            {/* ¿Qué tienes que hacer hoy? */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-terracotta">
                ¿Qué tienes que hacer hoy? (Paso a paso)
              </h4>
              <div className="space-y-2 text-xs text-brand-ink">
                <div className="flex items-start gap-2.5 rounded-xl bg-brand-sand-light p-3 border border-brand-border/60">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-terracotta text-white font-bold text-[11px]">
                    1
                  </span>
                  <div>
                    <strong className="block text-brand-ink font-bold">Verifica el cierre de mes o quincena:</strong>
                    <p className="text-brand-muted text-[11px] mt-0.5">
                      Asegúrate de que los consumos del día estén marcados y no queden raciones sin justificar.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl bg-brand-sand-light p-3 border border-brand-border/60">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-terracotta text-white font-bold text-[11px]">
                    2
                  </span>
                  <div>
                    <strong className="block text-brand-ink font-bold">Descarga la Planilla Excel oficial:</strong>
                    <p className="text-brand-muted text-[11px] mt-0.5">
                      En el módulo de Empresas puedes descargar la nómina valorizada lista con el formato exacto que exige la minera.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl bg-brand-sand-light p-3 border border-brand-border/60">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-terracotta text-white font-bold text-[11px]">
                    3
                  </span>
                  <div>
                    <strong className="block text-brand-ink font-bold">Mándala a tu contadora:</strong>
                    <p className="text-brand-muted text-[11px] mt-0.5">
                      Con la planilla lista, tu contadora solo tiene que emitir la factura formal en el portal del SII.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de acción directa ("y lo mande") */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              {onIrAEmpresas && (
                <button
                  type="button"
                  onClick={() => {
                    onCerrar();
                    onIrAEmpresas();
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-terracotta hover:bg-brand-terracotta-deep text-white px-4 py-3 text-xs font-bold shadow-brand transition active:scale-95 cursor-pointer"
                >
                  <IconFileText className="h-4 w-4" />
                  <span>Ir a Empresas y Descargar Planilla Excel ➔</span>
                </button>
              )}
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* KPI 4: CAPACIDAD Y OCUPACIÓN REAL                          */}
        {/* ========================================================= */}
        {tipoKpi === "ocupacion" && (
          <>
            {/* Cabecera */}
            <div className="flex items-start justify-between gap-3 border-b border-brand-border/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-brand-terracotta border border-brand-border shadow-xs">
                  <IconBed className="h-6 w-6 text-brand-terracotta" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                      Plan de Acción · Hospedaje
                    </span>
                    <span className="rounded-full bg-brand-sand-light text-brand-ink border border-brand-border/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                      {metricasOcupacion.porcentajeOcupacion}% Ocupado
                    </span>
                  </div>
                  <h3 className="font-display text-lg sm:text-xl font-black text-brand-ink leading-tight mt-0.5">
                    Ocupación y Piezas Libres
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onCerrar}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand-border/60 bg-white text-brand-muted hover:text-brand-ink text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Diagnóstico en tiempo real */}
            <div className="rounded-2xl border border-brand-border/70 bg-brand-sand/40 p-4 text-xs leading-relaxed space-y-2 text-brand-ink">
              <div className="flex items-center gap-2 font-bold text-sm text-brand-terracotta">
                <span>
                  {metricasOcupacion.disponibles > 0
                    ? `ℹ️ Tienes ${metricasOcupacion.disponibles} pieza(s) disponible(s) para vender hoy`
                    : "🎉 ¡Pensión 100% llena hoy!"}
                </span>
              </div>
              <p>
                De las <strong>{metricasOcupacion.totalHabitaciones} habitaciones</strong> de la pensión, hoy tienes{" "}
                <strong>{metricasOcupacion.ocupadas} ocupadas</strong> (<strong>{metricasOcupacion.ocupadasEmpresa}</strong> por contratistas y{" "}
                <strong>{metricasOcupacion.ocupadasTurista}</strong> por turistas).
              </p>
              {metricasOcupacion.enMantencion > 0 && (
                <p className="text-amber-800 font-semibold text-[11px]">
                  Hay {metricasOcupacion.enMantencion} pieza(s) en mantención que requieren revisión técnica.
                </p>
              )}
            </div>

            {/* ¿Qué tienes que hacer hoy? */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-terracotta">
                ¿Qué tienes que hacer hoy? (Paso a paso)
              </h4>
              <div className="space-y-2 text-xs text-brand-ink">
                {metricasOcupacion.disponibles > 0 ? (
                  <div className="flex items-start gap-2.5 rounded-xl bg-brand-sand-light p-3 border border-brand-border/60">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-terracotta text-white font-bold text-[11px]">
                      1
                    </span>
                    <div>
                      <strong className="block text-brand-ink font-bold">Ofrece las piezas disponibles:</strong>
                      <p className="text-brand-muted text-[11px] mt-0.5">
                        Si llega un turista o vehículo de paso por Caleta Paposo, tienes {metricasOcupacion.disponibles} pieza(s) listas para recibirlo.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 rounded-xl bg-brand-sand-light p-3 border border-brand-border/60">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-terracotta text-white font-bold text-[11px]">
                      1
                    </span>
                    <div>
                      <strong className="block text-brand-ink font-bold">Pensión completa:</strong>
                      <p className="text-brand-muted text-[11px] mt-0.5">
                        Revisa en el Rack Semanal las fechas de salida para saber exactamente cuándo se liberará una pieza.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2.5 rounded-xl bg-brand-sand-light p-3 border border-brand-border/60">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-terracotta text-white font-bold text-[11px]">
                    2
                  </span>
                  <div>
                    <strong className="block text-brand-ink font-bold">Revisa el estado de Aseo:</strong>
                    <p className="text-brand-muted text-[11px] mt-0.5">
                      Verifica que las habitaciones vacías hayan sido aseadas y tengan toallas y sábanas limpias listas para el próximo huésped.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de acción directa ("y lo mande") */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              {onIrACalendario && (
                <button
                  type="button"
                  onClick={() => {
                    onCerrar();
                    onIrACalendario();
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-terracotta hover:bg-brand-terracotta-deep text-white px-4 py-3 text-xs font-bold shadow-brand transition active:scale-95 cursor-pointer"
                >
                  <IconBed className="h-4 w-4" />
                  <span>Ver Rack y Calendario de Habitaciones ➔</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
