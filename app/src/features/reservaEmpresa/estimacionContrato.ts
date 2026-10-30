import { diferenciaDiasYMD } from "../../lib/fechaNegocio";

/**
 * Estimación económica de un contrato de empresa.
 *
 * Regla central (ver auditoría previa a esta migración):
 * `tarifa_convenida` YA se interpreta en todo el código existente
 * (useMargenProyectado.ts, useCierreMensual.ts) como un monto POR
 * PERSONA Y POR DÍA — esta función no inventa una unidad nueva, solo
 * centraliza ese cálculo en un solo lugar para que el formulario de
 * contrato y la ficha de detalle usen exactamente la misma fórmula.
 *
 * Esta estimación es una REFERENCIA contractual, no el monto final de
 * facturación: la prefacturación real también depende de ajustes de
 * cantidad contratada por período (contrato_empresa_ajuste) y de
 * extras facturables — ver useCierreMensual.ts.
 */
export interface ServiciosIncluidosContrato {
  desayuno: boolean;
  almuerzo: boolean;
  cena: boolean;
}

export type CondicionTributariaContrato = "neto" | "con_iva" | null;

export interface EntradaEstimacionContrato {
  headcount: number;
  tarifaConvenida: number;
  vigenciaDesde: string;
  /** null/undefined = contrato abierto (sin fecha de término todavía). */
  vigenciaHasta?: string | null;
}

export interface EstimacionContrato {
  /** true si el contrato no tiene fecha de término todavía. */
  esAbierto: boolean;
  /**
   * Días de calendario facturados (ambos extremos incluidos: el día de
   * término cuenta como un día más, igual que ya asumen
   * useMargenProyectado.ts/useCierreMensual.ts). null si el contrato es
   * abierto — un contrato abierto no tiene "total" definitivo, solo un
   * costo diario (ver sección D del alcance: "no presentes un contrato
   * abierto como si tuviera un total definitivo").
   */
  diasFacturables: number | null;
  /** headcount × tarifaConvenida — el cargo de un solo día. */
  costoDiario: number;
  /** costoDiario × diasFacturables. null si el contrato es abierto. */
  totalEstimado: number | null;
  /**
   * Proyección referencial a 30 días, SOLO para contratos abiertos (y
   * explícitamente etiquetada como proyección en la UI, nunca como
   * total). null para contratos con fecha de término, donde ya existe
   * un totalEstimado real.
   */
  proyeccionMensual: number | null;
}

export class RangoVigenciaInvalidoError extends Error {
  constructor() {
    super("La fecha de término no puede ser anterior a la fecha de inicio del contrato.");
  }
}

const DIAS_PROYECCION_MENSUAL = 30;

export function calcularEstimacionContrato(entrada: EntradaEstimacionContrato): EstimacionContrato {
  const vigenciaHasta = entrada.vigenciaHasta || null;
  if (vigenciaHasta && vigenciaHasta < entrada.vigenciaDesde) {
    throw new RangoVigenciaInvalidoError();
  }

  const costoDiario = entrada.headcount * entrada.tarifaConvenida;
  const esAbierto = !vigenciaHasta;

  if (esAbierto) {
    return {
      esAbierto: true,
      diasFacturables: null,
      costoDiario,
      totalEstimado: null,
      proyeccionMensual: costoDiario * DIAS_PROYECCION_MENSUAL
    };
  }

  const diasFacturables = diferenciaDiasYMD(entrada.vigenciaDesde, vigenciaHasta) + 1;
  return {
    esAbierto: false,
    diasFacturables,
    costoDiario,
    totalEstimado: costoDiario * diasFacturables,
    proyeccionMensual: null
  };
}

/** Lista compacta de los servicios de alimentación marcados como incluidos, para mostrar como chips en la UI. */
export function serviciosIncluidosComoLista(servicios: ServiciosIncluidosContrato): string[] {
  const lista: string[] = ["Alojamiento"];
  if (servicios.desayuno) lista.push("Desayuno");
  if (servicios.almuerzo) lista.push("Almuerzo");
  if (servicios.cena) lista.push("Cena");
  return lista;
}

export function etiquetaCondicionTributaria(condicion: CondicionTributariaContrato): string {
  if (condicion === "neto") return "Tarifa neta (IVA se cobra aparte)";
  if (condicion === "con_iva") return "Tarifa con IVA incluido";
  return "Condición tributaria no especificada";
}
