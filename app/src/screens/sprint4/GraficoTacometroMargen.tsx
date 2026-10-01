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
  // Limitar el valor visual entre 0 y 100
  const valorClamped = Math.max(0, Math.min(100, margenPorcentaje));

  // Geometría del tacómetro
  const cx = 110;
  const cy = 96;
  const radio = 70;

  // Conversión polar a cartesiana (y decrece hacia arriba)
  const polarACartesiana = (r: number, anguloDeg: number) => {
    const rad = (anguloDeg * Math.PI) / 180;
    return {
      x: Number((cx + r * Math.cos(rad)).toFixed(2)),
      y: Number((cy - r * Math.sin(rad)).toFixed(2))
    };
  };

  // Generador de comando de arco SVG para semicírculo superior (en sentido horario)
  const crearArco = (r: number, anguloInicio: number, anguloFin: number) => {
    const inicio = polarACartesiana(r, anguloInicio);
    const fin = polarACartesiana(r, anguloFin);
    return `M ${inicio.x} ${inicio.y} A ${r} ${r} 0 0 1 ${fin.x} ${fin.y}`;
  };

  // Segmentos del velocímetro con pequeñas holguras estéticas:
  // Zona Roja: 0% a 20% (176° a 146°)
  const arcoRojo = crearArco(radio, 176, 146);
  // Zona Amarilla: 20% a 35% (142° a 119°)
  const arcoAmarillo = crearArco(radio, 142, 119);
  // Zona Verde: 35% a 100% (115° a 4°)
  const arcoVerde = crearArco(radio, 115, 4);

  // Cálculo del ángulo de la aguja: 0% = 180°, 100% = 0°
  const anguloAgujaDeg = 180 - (valorClamped / 100) * 180;
  const anguloAgujaRad = (anguloAgujaDeg * Math.PI) / 180;

  // Punta de la aguja
  const largoAguja = 56;
  const puntaX = Number((cx + largoAguja * Math.cos(anguloAgujaRad)).toFixed(2));
  const puntaY = Number((cy - largoAguja * Math.sin(anguloAgujaRad)).toFixed(2));

  // Base de la aguja (ancho 4.5px a cada lado)
  const anguloPerp = anguloAgujaRad + Math.PI / 2;
  const base1X = Number((cx + 4.5 * Math.cos(anguloPerp)).toFixed(2));
  const base1Y = Number((cy - 4.5 * Math.sin(anguloPerp)).toFixed(2));
  const base2X = Number((cx - 4.5 * Math.cos(anguloPerp)).toFixed(2));
  const base2Y = Number((cy + 4.5 * Math.sin(anguloPerp)).toFixed(2));

  // Cola trasera de contrapeso
  const colaX = Number((cx - 10 * Math.cos(anguloAgujaRad)).toFixed(2));
  const colaY = Number((cy + 10 * Math.sin(anguloAgujaRad)).toFixed(2));

  const puntosAguja = `${puntaX},${puntaY} ${base1X},${base1Y} ${colaX},${colaY} ${base2X},${base2Y}`;

  const configSemaforo = {
    verde: {
      colorStroke: "#10b981", // Emerald 500
      colorTexto: "text-emerald-700",
      colorBadge: "bg-emerald-100 text-emerald-900 border-emerald-300",
      etiqueta: "Rentabilidad Saludable",
      mensaje: "Tus ingresos cubren con holgura los costos quincenales de compras calculados por PMP."
    },
    amarillo: {
      colorStroke: "#f59e0b", // Amber 500
      colorTexto: "text-amber-700",
      colorBadge: "bg-amber-100 text-amber-900 border-amber-300",
      etiqueta: "Margen en Observación",
      mensaje: "El costo de insumos subió. Considera revisar tus compras de carnes o gas."
    },
    rojo: {
      colorStroke: "#ef4444", // Red 500
      colorTexto: "text-red-700",
      colorBadge: "bg-red-100 text-red-900 border-red-300",
      etiqueta: "Alerta Crítica de Margen",
      mensaje: "Ganancia por debajo del 20%. Ajusta tus compras o renegocia la tarifa convenida."
    }
  }[estadoSemaforo];

  return (
    <div className="flex flex-col items-center justify-between rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card">
      {/* Cabecera limpia */}
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

      {/* Tacómetro Instrumentado SVG con aguja limpia y espacio totalmente libre */}
      <div className="relative my-2 w-full max-w-[280px] flex flex-col items-center justify-center">
        <svg viewBox="0 0 220 118" className="w-full overflow-visible">
          {/* Pista base suave */}
          <path
            d="M 38 96 A 72 72 0 0 1 182 96"
            fill="none"
            stroke="#f1e9de"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Segmento 1: Crítico / Rojo (0% a 20%) */}
          <path
            d={arcoRojo}
            fill="none"
            stroke="#ef4444"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Segmento 2: Precaución / Amarillo (20% a 35%) */}
          <path
            d={arcoAmarillo}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Segmento 3: Saludable / Verde (35% a 100%) */}
          <path
            d={arcoVerde}
            fill="none"
            stroke="#10b981"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Ticks y Marcas de escala en los extremos */}
          <text x="26" y="108" textAnchor="middle" className="text-[10px] font-bold fill-brand-muted">
            0%
          </text>
          <text x="194" y="108" textAnchor="middle" className="text-[10px] font-bold fill-brand-muted">
            100%
          </text>

          {/* Aguja indicadora cónica estilizada tipo instrumento */}
          <g className="transition-all duration-700 ease-out">
            {/* Polígono estilizado de la aguja */}
            <polygon
              points={puntosAguja}
              fill="#1e293b"
              className="drop-shadow-sm"
            />
            {/* Casquillo central (pivote) */}
            <circle cx={cx} cy={cy} r="8" fill="#1e293b" />
            <circle cx={cx} cy={cy} r="3.5" fill="#f8fafc" />
          </g>
        </svg>

        {/* Marcador de meta 35% como etiqueta flotante sutil */}
        <div className="absolute top-1 left-12 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shadow-xs pointer-events-none">
          Meta 35%
        </div>
      </div>

      {/* Lectura Digital Destacada: Ubicada abajo del tacómetro con total holgura */}
      <div className="text-center my-1">
        <div className="flex items-baseline justify-center gap-1.5">
          <span
            className={`font-display text-4xl md:text-5xl font-black tracking-tight ${configSemaforo.colorTexto} leading-none`}
          >
            {margenPorcentaje}%
          </span>
          <span className="text-xs font-black uppercase tracking-wider text-brand-muted">
            Margen
          </span>
        </div>
        <p className="text-xs text-brand-muted font-medium mt-1">
          Margen proyectado del mes en curso
        </p>
      </div>

      {/* Insignia / Estado dinámico con explicación */}
      <div className="mt-2 w-full text-center">
        <span
          className={`inline-block px-3.5 py-1 text-xs font-black rounded-full border ${configSemaforo.colorBadge}`}
        >
          {configSemaforo.etiqueta}
        </span>
        <p className="text-xs text-brand-ink/90 mt-2 px-2 leading-relaxed">
          {configSemaforo.mensaje}
        </p>
      </div>

      {/* Datos clave de apoyo financiero */}
      <div className="mt-4 grid grid-cols-2 gap-2 w-full pt-3 border-t border-brand-border/60 text-xs">
        <div className="text-center p-2.5 rounded-xl bg-brand-sand-light border border-brand-border/50">
          <span className="text-[10px] font-semibold text-brand-muted block uppercase">
            Total Ingresos
          </span>
          <span className="font-display text-sm font-bold text-brand-ink block mt-0.5">
            ${ingresosTotales.toLocaleString("es-CL")}
          </span>
        </div>
        <div className="text-center p-2.5 rounded-xl bg-brand-sand-light border border-brand-border/50">
          <span className="text-[10px] font-semibold text-brand-muted block uppercase">
            Compras Insumos
          </span>
          <span className="font-display text-sm font-bold text-brand-terracotta block mt-0.5">
            ${costosTotales.toLocaleString("es-CL")}
          </span>
        </div>
      </div>
    </div>
  );
}
