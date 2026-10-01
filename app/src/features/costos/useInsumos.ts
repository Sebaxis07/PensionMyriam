import { useQuery } from "@powersync/react";
import { InsumoRow, CompraInsumoRow } from "./types";

export function useInsumos(): InsumoRow[] {
  const { data } = useQuery<InsumoRow>(
    "select id, nombre, categoria, unidad_medida, costo_promedio, cantidad_total from insumo order by categoria asc, nombre asc"
  );
  return data ?? [];
}

export function useComprasRecientes(limite: number = 20): CompraInsumoRow[] {
  const { data } = useQuery<CompraInsumoRow>(
    `select ci.id, ci.insumo_id, i.nombre as insumo_nombre, ci.categoria,
            ci.monto_total, ci.cantidad, ci.rendimiento_estimado, ci.fecha,
            ci.registrado_por, ci.uuid_idempotente, ci.created_at
     from compra_insumo ci
     left join insumo i on i.id = ci.insumo_id
     order by ci.fecha desc, ci.created_at desc
     limit ?`,
    [limite]
  );
  return data ?? [];
}
