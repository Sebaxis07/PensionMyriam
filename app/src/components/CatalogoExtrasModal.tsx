import { useState, type FormEvent } from "react";
import { useProductosExtra, type ProductoExtraRow } from "../features/consumo/useProductosExtra";
import { crearProductoExtra } from "../features/consumo/crearProductoExtra";
import { IconPlus, IconUtensils } from "./Icons";

interface CatalogoExtrasModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onProductoCreado?: (productoId: string) => void;
}

export function CatalogoExtrasModal({
  abierto,
  onCerrar,
  onProductoCreado
}: CatalogoExtrasModalProps) {
  const productos = useProductosExtra();
  const [nombre, setNombre] = useState("");
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!abierto) return null;

  async function handleCrear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const precio = Number(precioUnitario);
    if (!nombre.trim()) {
      setError("Ingresa el nombre del producto o colación.");
      return;
    }
    if (isNaN(precio) || precio < 0) {
      setError("El precio unitario debe ser un valor mayor o igual a 0.");
      return;
    }

    setGuardando(true);
    try {
      const id = await crearProductoExtra({
        nombre: nombre.trim(),
        precioUnitario: precio
      });
      setNombre("");
      setPrecioUnitario("");
      if (onProductoCreado) {
        onProductoCreado(id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar el producto.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl border border-brand-border/80 bg-brand-card p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Cabecera del modal */}
        <div className="flex items-start justify-between border-b border-brand-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-terracotta/15 text-brand-terracotta">
              <IconUtensils className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-brand-ink">
                Catálogo de Colaciones y Extras
              </h3>
              <p className="text-xs text-brand-muted">
                Precios unitarios para colaciones de terreno y platos especiales
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="rounded-full p-1.5 text-brand-muted hover:bg-brand-sand/50 hover:text-brand-ink transition"
          >
            ✕
          </button>
        </div>

        {/* Lista de productos actuales */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted">
            Lista de precios vigente ({productos.length})
          </h4>

          {productos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-brand-border/80 bg-brand-sand/20 p-5 text-center">
              <p className="text-xs font-semibold text-brand-ink">
                No hay productos ni colaciones cargadas
              </p>
              <p className="text-[11px] text-brand-muted mt-0.5">
                Agrega abajo el primer producto para habilitar el registro de colaciones.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
              {productos.map((prod: ProductoExtraRow) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between rounded-xl border border-brand-border/60 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🥪</span>
                    <span className="text-xs font-bold text-brand-ink">{prod.nombre}</span>
                  </div>
                  <span className="font-display text-xs font-black text-brand-terracotta-deep">
                    ${prod.precio_unitario.toLocaleString("es-CL")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formulario para agregar un nuevo producto */}
        <form onSubmit={handleCrear} className="rounded-2xl border border-brand-border/80 bg-brand-sand/30 p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-brand-ink">
            Agregar nuevo producto
          </h4>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-50 p-2.5 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-brand-muted mb-1">
                Nombre del plato o colación
              </label>
              <input
                type="text"
                placeholder="Ej: Colación de terreno"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-xs text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-brand-muted mb-1">
                Precio unitario ($ CLP)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                placeholder="Ej: 3500"
                value={precioUnitario}
                onChange={(e) => setPrecioUnitario(e.target.value)}
                className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-xs text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand-terracotta px-4 py-2 text-xs font-bold text-white shadow-brand hover:bg-brand-terracotta-deep active:scale-95 transition disabled:opacity-50"
          >
            <IconPlus className="h-4 w-4" />
            <span>{guardando ? "Guardando…" : "Guardar en catálogo"}</span>
          </button>
        </form>

        {/* Botón de cierre */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl border border-brand-border bg-brand-sand/40 px-5 py-2 text-xs font-bold text-brand-ink hover:bg-brand-sand transition"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
