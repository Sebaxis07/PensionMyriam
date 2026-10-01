export type CategoriaCompra =
  | "carnes"
  | "verduras"
  | "abarrotes"
  | "gas_combustible"
  | "aseo"
  | "otro";

export interface InsumoRow {
  id: string;
  nombre: string;
  categoria: CategoriaCompra;
  unidad_medida: string;
  costo_promedio: number;
  cantidad_total: number;
}

export interface CompraInsumoRow {
  id: string;
  insumo_id: string;
  insumo_nombre?: string;
  categoria: CategoriaCompra;
  monto_total: number;
  cantidad: number;
  rendimiento_estimado?: number | null;
  fecha: string;
  registrado_por: string;
  uuid_idempotente: string;
  created_at: string;
}

export type EstadoSemaforoMargen = "verde" | "amarillo" | "rojo";

export interface MetricasMargen {
  ingresosTotales: number;
  costosTotales: number;
  margenNetoMonto: number;
  margenPorcentaje: number;
  estadoSemaforo: EstadoSemaforoMargen;
  costoDiarioTrabajador: number;
  tarifaMinimaSugerida: number;
  totalComprasPeriodo: number;
  recomendacion: string;
}
