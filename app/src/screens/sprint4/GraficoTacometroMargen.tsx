interface GraficoTacometroMargenProps {
  margenPorcentaje: number;
  estadoSemaforo: "verde" | "amarillo" | "rojo";
  ingresosTotales: number;
  costosTotales: number;
}

export function GraficoTacometroMargen({
  margenPorcentaje,
  estadoSemaforo,
  ingresosTotales,
  costosTotales
}: GraficoTacometroMargenProps) {
  // Limitar el valor entre 0 y 100 para el velocímetro
  const valorClamped = Math.max(0, Math.min(100, margenPorcentaje));

  // En un arco de 180 grados (de 180° a 0°):
  // 0% -> 180°, 100% -> 0°
  // Ángulo en radianes: anguloDeg = 180 - (valorClamped / 100) * 180
  const anguloDeg = 180 - (valorClamped / 100) * 180;
  const anguloRad = (anguloDeg * Math.PI) / 180;

  // Radio y centro del tacómetro
  const cx = 100;
  const cy = 90;
  const radio = 70;

  // Posición de la punta de la aguja
  const agujaX = cx + radio * 0.75 * Math.cos(anguloRad);
  const agujaY = cy - radio * 0.75 * Math.sin(anguloRad);

  const configSemaforo = {
    verde: {
      colorTexto: "text-emerald-700",
      colorBadge: "bg-emerald-100 text-emerald-900 border-emerald-300",
      etiqueta: "Rentabilidad Saludable",
      mensaje: "Tus ingresos cubren con holgura los costos quincenales calculados por PMP."
    },
    amarillo: {
      colorTexto: "text-amber-700",
      colorBadge: "bg-amber-100 text-amber-900 border-amber-300",
      etiqueta: "Margen en Observación",
      mensaje: "El costo de insumos subió. Considera revisar tus compras de carnes o gas."
    },
    rojo: {
      colorTexto: "text-red-700",
      colorBadge: "bg-red-100 text-red-900 border-red-300",
      etiqueta: "Alerta Crítica de Margen",
      mensaje: "Ganancia por debajo del 20%. Ajusta tus compras o renegocia la tarifa convenida."
    }
  }[estadoSemaforo];

  return (
    <div className="flex flex-col items-center justify-between rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card">
      <div className="w-full text-center">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
            Semáforo de Ganancia
          </span>
          <span className="text-[11px] font-bold text-brand-muted bg-brand-sand-light px-2.5 py-0.5 rounded-full border border-brand-border/60">
            Medidor Mensual
          </span>
        </div>
        <h3 className="font-display text-base md:text-lg font-black text-brand-ink mt-1">
          Velocímetro de Ganancia del Mes
        </h3>
        <p className="text-xs text-brand-muted">
          Medidor visual de rentabilidad estilo tacómetro
        </p>
      </div>

      {/* Tacómetro SVG */}
      <div className="relative my-2 w-full max-w-[240px] flex items-center justify-center">
        <svg viewBox="0 0 200 115" className="w-full overflow-visible">
          <defs>
            <linearGradient id="gradTacometro" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {/* Arco de Fondo Base */}
          <path
            d="M 25 90 A 75 75 0 0 1 175 90"
            fill="none"
            stroke="#f1e9de"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Zona Roja: 0% - 20% (180° a 144°) */}
          <path
            d="M 25 90 A 75 75 0 0 1 39.3 45.9"
            fill="none"
            stroke="#ef4444"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Zona Amarilla: 20% - 35% (144° a 117°) */}
          <path
            d="M 39.3 45.9 A 75 75 0 0 1 65.9 23.2"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="16"
          />

          {/* Zona Verde: 35% - 100% (117° a 0°) */}
          <path
            d="M 65.9 23.2 A 75 75 0 0 1 175 90"
            fill="none"
            stroke="#10b981"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Aguja del Tacómetro */}
          <line
            x1={cx}
            y1={cy}
            x2={agujaX}
            y2={agujaY}
            stroke="#261e19"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Centro del eje de la aguja */}
          <circle cx={cx} cy={cy} r="6" fill="#261e19" />
          <circle cx={cx} cy={cy} r="2.5" fill="#fcfbf9" />
        </svg>

        {/* Valor al Centro */}
        <div className="absolute bottom-1 left-0 right-0 text-center">
          <span className={`font-display text-3xl font-black ${configSemaforo.colorTexto}`}>
            {margenPorcentaje}%
          </span>
          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">
            Margen Proyectado
          </p>
        </div>
      </div>

      {/* Badge de Estado y Explicación para baja alfabetización digital */}
      <div className="w-full space-y-2.5 text-center mt-1">
        <span
          className={`inline-block rounded-full px-3.5 py-1 text-xs font-black border ${configSemaforo.colorBadge}`}
        >
          {configSemaforo.etiqueta}
        </span>

        <p className="text-xs text-brand-ink/90 leading-relaxed max-w-sm mx-auto">
          {configSemaforo.mensaje}
        </p>

        {/* Resumen numérico rápido */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-brand-border/60 text-xs">
          <div className="rounded-xl bg-brand-sand-light p-2 border border-brand-border/50">
            <span className="text-[10px] text-brand-muted block font-semibold">Total Ingresos</span>
            <span className="font-display font-bold text-brand-ink text-sm">
              ${ingresosTotales.toLocaleString("es-CL")}
            </span>
          </div>
          <div className="rounded-xl bg-brand-sand-light p-2 border border-brand-border/50">
            <span className="text-[10px] text-brand-muted block font-semibold">Compras Insumos</span>
            <span className="font-display font-bold text-brand-terracotta text-sm">
              ${costosTotales.toLocaleString("es-CL")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
