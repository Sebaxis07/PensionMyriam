import { useQuery } from "@powersync/react";

export type ProductoExtraRow = { id: string; nombre: string; precio_unitario: number };

/** HU-15: lista de precios de colación de terreno / plato especial. */
export function useProductosExtra() {
  const { data } = useQuery<ProductoExtraRow>(
    "select id, nombre, precio_unitario from producto_extra order by nombre"
  );
  return data ?? [];
}
