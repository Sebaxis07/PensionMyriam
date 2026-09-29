import { z } from "zod";
import { powersync } from "../../lib/powersync";

// HU-15: la Administradora carga acá su lista de precios de extras
// (colación de terreno, plato especial, etc.) — no hace falta otra
// migración cada vez que agrega uno nuevo.
export const ProductoExtraSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresa el nombre del producto"),
  precioUnitario: z.number().nonnegative("El precio no puede ser negativo")
});
export type ProductoExtraInput = z.infer<typeof ProductoExtraSchema>;

export async function crearProductoExtra(input: ProductoExtraInput): Promise<string> {
  const datos = ProductoExtraSchema.parse(input);
  const id = crypto.randomUUID();
  await powersync.execute(
    "insert into producto_extra (id, nombre, precio_unitario, created_at) values (?, ?, ?, ?)",
    [id, datos.nombre, datos.precioUnitario, new Date().toISOString()]
  );
  return id;
}
