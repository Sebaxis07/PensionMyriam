import { powersync } from "../../lib/powersync";
import { nuevoUuidIdempotente } from "../../lib/idempotencia";
import { CategoriaCompra } from "./types";

export interface RegistrarCompraParams {
  insumoId?: string | null;
  nombreInsumo: string;
  categoria: CategoriaCompra;
  unidadMedida: string;
  montoTotal: number;
  cantidad: number;
  rendimientoEstimado?: number | null;
  fecha?: string;
  registradoPor: string;
}

/**
 * HU-22 y HU-23: Registra una compra de insumos offline-first con cálculo PMP
 * (Promedio Móvil Ponderado) inmediato en SQLite y sincronización a Postgres.
 */
export async function registrarCompraInsumo(params: RegistrarCompraParams): Promise<{ compraId: string; insumoId: string }> {
  const {
    insumoId: insumoIdParam,
    nombreInsumo,
    categoria,
    unidadMedida,
    montoTotal,
    cantidad,
    rendimientoEstimado = null,
    fecha = new Date().toISOString().slice(0, 10),
    registradoPor
  } = params;

  if (montoTotal < 0) {
    throw new Error("El monto total pagado no puede ser negativo.");
  }
  if (cantidad <= 0) {
    throw new Error("La cantidad comprada debe ser mayor a 0.");
  }
  if (!nombreInsumo.trim()) {
    throw new Error("El nombre del producto o insumo es obligatorio.");
  }

  const compraId = crypto.randomUUID();
  const idempotencia = nuevoUuidIdempotente();
  let insumoIdReal = insumoIdParam;

  await powersync.writeTransaction(async (tx) => {
    // 1. Determinar o crear el insumo
    if (insumoIdReal) {
      const insumoExistente = await tx.getOptional<{
        id: string;
        cantidad_total: number;
        costo_promedio: number;
      }>("select id, cantidad_total, costo_promedio from insumo where id = ?", [insumoIdReal]);

      if (insumoExistente) {
        const cantPrevia = Number(insumoExistente.cantidad_total || 0);
        const costoPrevio = Number(insumoExistente.costo_promedio || 0);
        const nuevaCant = cantPrevia + cantidad;
        const nuevoCostoPmp = nuevaCant > 0 ? (cantPrevia * costoPrevio + montoTotal) / nuevaCant : 0;

        await tx.execute(
          "update insumo set cantidad_total = ?, costo_promedio = ? where id = ?",
          [nuevaCant, nuevoCostoPmp, insumoIdReal]
        );
      }
    } else {
      // Buscar si ya existe por nombre exacto
      const porNombre = await tx.getOptional<{ id: string; cantidad_total: number; costo_promedio: number }>(
        "select id, cantidad_total, costo_promedio from insumo where lower(nombre) = lower(?)",
        [nombreInsumo.trim()]
      );

      if (porNombre) {
        insumoIdReal = porNombre.id;
        const cantPrevia = Number(porNombre.cantidad_total || 0);
        const costoPrevio = Number(porNombre.costo_promedio || 0);
        const nuevaCant = cantPrevia + cantidad;
        const nuevoCostoPmp = nuevaCant > 0 ? (cantPrevia * costoPrevio + montoTotal) / nuevaCant : 0;

        await tx.execute(
          "update insumo set cantidad_total = ?, costo_promedio = ? where id = ?",
          [nuevaCant, nuevoCostoPmp, insumoIdReal]
        );
      } else {
        // Crear nuevo insumo en catálogo
        insumoIdReal = crypto.randomUUID();
        const costoInicial = montoTotal / cantidad;
        await tx.execute(
          "insert into insumo (id, nombre, categoria, unidad_medida, costo_promedio, cantidad_total) values (?, ?, ?, ?, ?, ?)",
          [insumoIdReal, nombreInsumo.trim(), categoria, unidadMedida.trim() || "unidades", costoInicial, cantidad]
        );
      }
    }

    // 2. Registrar la compra inmutable en el historial
    await tx.execute(
      `insert into compra_insumo (
        id, insumo_id, categoria, monto_total, cantidad, rendimiento_estimado, fecha, registrado_por, uuid_idempotente, created_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        compraId,
        insumoIdReal,
        categoria,
        montoTotal,
        cantidad,
        rendimientoEstimado,
        fecha,
        registradoPor,
        idempotencia,
        new Date().toISOString()
      ]
    );
  });

  return { compraId, insumoId: insumoIdReal! };
}
