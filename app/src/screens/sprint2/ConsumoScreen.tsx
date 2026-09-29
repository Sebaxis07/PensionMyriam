import { useState, useMemo, useEffect } from "react";
import { useConsumoHoy, type TrabajadorConsumoRow } from "../../features/consumo/useConsumoHoy";
import { consumoRapido } from "../../features/consumo/consumoRapido";
import { registrarConsumo, type TipoConsumo } from "../../features/consumo/registrarConsumo";
import { corregirConsumo } from "../../features/consumo/corregirConsumo";
import { useProductosExtra } from "../../features/consumo/useProductosExtra";
import {
  IconCheck,
  IconSearch,
  IconUtensils
} from "../../components/Icons";

// Corrección de alcance (Sprint 2): "colacion_extra" y "plato_especial"
// ya no son tipos de enum separados — son productos del catálogo
// producto_extra (nombre + precio propios), bajo el único tipo
// "colacion". La lista de raciones principales de la barra rápida
// ahora es de 4 (se excluye "colacion": ese registro individual, con
// selector de producto, vive en el modal de abajo — y "cama_noche" es
// automática vía pg_cron, normalmente no se marca a mano acá).
const RACIONES_PRINCIPALES: TipoConsumo[] = ["desayuno", "almuerzo", "cena"];

const NOMBRES_RACION: Record<TipoConsumo, { label: string; icon: string }> = {
  cama_noche: { label: "Cama-noche", icon: "🛏️" },
  desayuno: { label: "Desayuno", icon: "☕" },
  almuerzo: { label: "Almuerzo", icon: "🍲" },
  cena: { label: "Cena", icon: "🍽️" },
  colacion: { label: "Colación / Plato especial", icon: "🥪" }
};

export function ConsumoScreen({ usuarioId, contratoEmpresaId }: { usuarioId: string; contratoEmpresaId: string }) {
  const [tipoRacion, setTipoRacion] = useState<TipoConsumo>("almuerzo");
  const filas = useConsumoHoy(contratoEmpresaId, tipoRacion);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [mensajesError, setMensajesError] = useState<string[]>([]);

  // Estado para modal de extras o corrección individual
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<TrabajadorConsumoRow | null>(null);
  const productosExtra = useProductosExtra();
  const [productoExtraId, setProductoExtraId] = useState<string>("");
  const [recargoExtra, setRecargoExtra] = useState<number>(0);

  useEffect(() => {
    if (!productoExtraId && productosExtra.length) {
      setProductoExtraId(productosExtra[0].id);
      setRecargoExtra(productosExtra[0].precio_unitario);
    }
  }, [productosExtra, productoExtraId]);
  const [guardandoExtra, setGuardandoExtra] = useState(false);
  const [modoCorregir, setModoCorregir] = useState(false);
  const [motivoCorreccion, setMotivoCorreccion] = useState("");
  const [consumoOriginalId, setConsumoOriginalId] = useState("");
  const [busquedaTrabajador, setBusquedaTrabajador] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "pendientes" | "servidos">("todos");

  const pendientes = filas.filter((f) => !f.ya_registrado);
  const servidos = filas.filter((f) => !!f.ya_registrado);

  const trabajadoresFiltrados = useMemo(() => {
    return filas.filter((f) => {
      if (filtroEstado === "pendientes" && f.ya_registrado) return false;
      if (filtroEstado === "servidos" && !f.ya_registrado) return false;
      if (busquedaTrabajador.trim()) {
        const q = busquedaTrabajador.toLowerCase().trim();
        return f.nombre.toLowerCase().includes(q);
      }
      return true;
    });
  }, [filas, filtroEstado, busquedaTrabajador]);

  function alternar(id: string) {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function seleccionarTodos() {
    if (seleccionados.length === pendientes.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(pendientes.map((p) => p.id));
    }
  }

  async function handleMarcarRapido() {
    if (!seleccionados.length) return;
    setGuardando(true);
    setMensajesError([]);
    try {
      const resultados = await consumoRapido(usuarioId, seleccionados, tipoRacion);
      const fallidos = resultados.filter((r) => !r.ok && r.error);
      if (fallidos.length) {
        setMensajesError(fallidos.map((f) => f.error!));
      }
      setSeleccionados([]);
    } finally {
      setGuardando(false);
    }
  }

  async function handleGuardarExtra() {
    if (!trabajadorSeleccionado || !productoExtraId) return;
    setGuardandoExtra(true);
    try {
      await registrarConsumo(usuarioId, {
        trabajadorId: trabajadorSeleccionado.id,
        tipoConsumo: "colacion",
        productoExtraId,
        recargo: Number(recargoExtra) || 0
      });
      setTrabajadorSeleccionado(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al registrar extra.");
    } finally {
      setGuardandoExtra(false);
    }
  }

  async function handleGuardarCorreccion() {
    if (!trabajadorSeleccionado || !motivoCorreccion.trim() || !consumoOriginalId) return;
    setGuardandoExtra(true);
    try {
      await corregirConsumo(usuarioId, {
        consumoOriginalId,
        trabajadorId: trabajadorSeleccionado.id,
        tipoConsumo: tipoRacion,
        justificacion: motivoCorreccion.trim()
      });
      setTrabajadorSeleccionado(null);
      setModoCorregir(false);
      setMotivoCorreccion("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar corrección.");
    } finally {
      setGuardandoExtra(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      {/* Selector de Ración Principal */}
      <div className="rounded-3xl border border-brand-border/70 bg-brand-card p-4 md:p-5 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <IconUtensils className="h-5 w-5 text-brand-terracotta" />
          <h2 className="font-display text-xl font-bold text-brand-ink">
            Consumo Rápido de Raciones (HU-14)
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {RACIONES_PRINCIPALES.map((racion) => {
            const activo = tipoRacion === racion;
            const info = NOMBRES_RACION[racion];
            return (
              <button
                key={racion}
                onClick={() => {
                  setTipoRacion(racion);
                  setSeleccionados([]);
                  setMensajesError([]);
                }}
                className={`flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-bold transition-all active:scale-95 ${
                  activo
                    ? "border-brand-terracotta bg-brand-terracotta text-white shadow-brand"
                    : "border-brand-border bg-white text-brand-ink hover:bg-brand-sand/30"
                }`}
              >
                <span>{info.icon}</span>
                <span>{info.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra de acción rápida para marcar */}
      <div className="sticky top-14 z-10 flex items-center justify-between gap-3 rounded-2xl border border-brand-border/80 bg-brand-sand/95 p-3.5 shadow-sm backdrop-blur-md">
        <button
          onClick={seleccionarTodos}
          disabled={!pendientes.length}
          className="text-xs font-bold text-brand-terracotta hover:underline disabled:opacity-40"
        >
          {seleccionados.length === pendientes.length && pendientes.length > 0
            ? "Desmarcar todos"
            : `Seleccionar todos (${pendientes.length})`}
        </button>

        <button
          onClick={handleMarcarRapido}
          disabled={guardando || !seleccionados.length}
          className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-brand-terracotta px-5 py-2 text-sm font-bold text-white shadow-brand transition-all hover:bg-brand-terracotta-deep active:scale-95 disabled:opacity-50"
        >
          <IconCheck className="h-4 w-4" />
          <span>
            {guardando
              ? "Registrando…"
              : `Marcar ${NOMBRES_RACION[tipoRacion].label} (${seleccionados.length})`}
          </span>
        </button>
      </div>

      {mensajesError.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 font-semibold space-y-1">
          {mensajesError.map((msg, i) => (
            <p key={i}>⚠️ {msg}</p>
          ))}
        </div>
      )}

      {/* Buscador de trabajadores y Filtros de Estado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-brand-border/70 bg-brand-card p-3 shadow-sm">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-brand-muted" />
          <input
            type="text"
            placeholder="Buscar trabajador por nombre…"
            value={busquedaTrabajador}
            onChange={(e) => setBusquedaTrabajador(e.target.value)}
            className="w-full rounded-xl border border-brand-border bg-white pl-9 pr-8 py-2 text-xs text-brand-ink placeholder:text-stone-400 focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
          />
          {busquedaTrabajador && (
            <button
              onClick={() => setBusquedaTrabajador("")}
              className="absolute right-2.5 top-2 text-xs font-bold text-brand-muted hover:text-brand-ink"
            >
              ✕
            </button>
          )}
        </div>

        {/* Chips de filtro */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setFiltroEstado("todos")}
            className={`rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition-all ${
              filtroEstado === "todos"
                ? "bg-brand-terracotta text-white shadow-sm"
                : "bg-brand-sand/50 text-brand-muted hover:text-brand-ink"
            }`}
          >
            Todos ({filas.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado("pendientes")}
            className={`rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition-all ${
              filtroEstado === "pendientes"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-brand-sand/50 text-brand-muted hover:text-brand-ink"
            }`}
          >
            Pendientes ({pendientes.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado("servidos")}
            className={`rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition-all ${
              filtroEstado === "servidos"
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-brand-sand/50 text-brand-muted hover:text-brand-ink"
            }`}
          >
            Servidos ({servidos.length})
          </button>
        </div>
      </div>

      {/* Lista de trabajadores con estado hoy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {trabajadoresFiltrados.map((f) => {
          const yaRegistrado = !!f.ya_registrado;
          const seleccionado = seleccionados.includes(f.id);

          return (
            <div
              key={f.id}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all ${
                yaRegistrado
                  ? "border-emerald-600/30 bg-emerald-50/50 opacity-90"
                  : seleccionado
                  ? "border-brand-terracotta bg-brand-card shadow-sm ring-1 ring-brand-terracotta"
                  : "border-brand-border/80 bg-brand-card hover:bg-white"
              }`}
            >
              <label className="flex flex-1 cursor-pointer items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  disabled={yaRegistrado}
                  checked={seleccionado || yaRegistrado}
                  onChange={() => !yaRegistrado && alternar(f.id)}
                  className="h-5 w-5 rounded-md border-brand-border text-brand-terracotta focus:ring-brand-terracotta disabled:opacity-50"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-brand-ink">
                    {f.nombre}
                  </p>
                  <p className="text-[11px] font-medium text-brand-muted">
                    {yaRegistrado ? "✓ Ya servido hoy" : "Pendiente de marcar"}
                  </p>
                </div>
              </label>

              {/* Botón para opciones individuales / extras */}
              <button
                type="button"
                onClick={() => {
                  setTrabajadorSeleccionado(f);
                  setModoCorregir(false);
                }}
                title="Opciones individuales y colación extra"
                className="shrink-0 rounded-lg p-2 text-xs font-semibold text-brand-muted hover:bg-brand-sand/50 hover:text-brand-ink"
              >
                ⋯
              </button>
            </div>
          );
        })}

        {!trabajadoresFiltrados.length && (
          <div className="col-span-full rounded-2xl border border-brand-border/70 bg-brand-card p-8 text-center text-xs text-brand-muted">
            {busquedaTrabajador
              ? `No se encontraron trabajadores con "${busquedaTrabajador}".`
              : "No hay trabajadores en este listado."}
          </div>
        )}
      </div>

      {/* Modal de Detalle Individual, Colación Extra (HU-15) y Corrección (HU-13) */}
      {trabajadorSeleccionado && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-brand-ink/45 p-4 backdrop-blur-sm"
          onClick={() => setTrabajadorSeleccionado(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-brand-border/60 bg-brand-card p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
              <div>
                <h3 className="font-display text-xl font-bold text-brand-ink">
                  {trabajadorSeleccionado.nombre}
                </h3>
                <p className="text-xs text-brand-muted">Opciones individuales de consumo</p>
              </div>
              <button
                onClick={() => setTrabajadorSeleccionado(null)}
                className="text-xs font-bold text-brand-muted hover:text-brand-ink"
              >
                ✕
              </button>
            </div>

            {!modoCorregir ? (
              <div className="space-y-4">
                {/* Registro de Colación Extra o Plato Especial */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-muted mb-2">
                    Registrar Ración Adicional (HU-15)
                  </p>
                  {/* Producto del catálogo (nombre + precio propios,
                      ver features/consumo/useProductosExtra) — la
                      Administradora administra la lista de precios,
                      esto solo la muestra. */}
                  <select
                    value={productoExtraId}
                    onChange={(e) => {
                      setProductoExtraId(e.target.value);
                      const p = productosExtra.find((x) => x.id === e.target.value);
                      if (p) setRecargoExtra(p.precio_unitario);
                    }}
                    className="w-full rounded-xl border border-brand-border bg-white p-2.5 text-sm font-bold text-brand-ink"
                  >
                    {!productosExtra.length && <option value="">Sin productos cargados</option>}
                    {productosExtra.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — ${p.precio_unitario}
                      </option>
                    ))}
                  </select>

                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-semibold text-brand-muted">
                      Monto a cobrar ($)
                    </label>
                    <input
                      type="number"
                      step="500"
                      value={recargoExtra}
                      onChange={(e) => setRecargoExtra(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-brand-border bg-white p-2.5 text-sm font-bold text-brand-ink"
                    />
                  </div>

                  <button
                    onClick={handleGuardarExtra}
                    disabled={guardandoExtra || !productoExtraId}
                    className="mt-3 w-full rounded-xl bg-brand-terracotta py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-terracotta-deep disabled:opacity-50"
                  >
                    {guardandoExtra ? "Guardando…" : "Guardar colación / plato especial"}
                  </button>
                </div>

                <div className="border-t border-brand-border/60 pt-3">
                  <button
                    onClick={() => setModoCorregir(true)}
                    className="w-full py-2 text-center text-xs font-bold text-brand-muted hover:text-brand-ink underline"
                  >
                    ¿Necesitas corregir un consumo previo?
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-muted">
                  Corrección Justificada (Libro Contable Inmutable)
                </p>
                <p className="text-xs text-brand-muted">
                  Los consumos no se pueden eliminar. La corrección crea una nueva transacción referenciando la original.
                </p>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-muted">
                    ID de Transacción Original
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Pega el ID del consumo"
                    value={consumoOriginalId}
                    onChange={(e) => setConsumoOriginalId(e.target.value)}
                    className="w-full rounded-xl border border-brand-border bg-white p-2.5 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-muted">
                    Motivo obligatorio de corrección
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Ej: Marcado por error en turno nocturno"
                    value={motivoCorreccion}
                    onChange={(e) => setMotivoCorreccion(e.target.value)}
                    className="w-full rounded-xl border border-brand-border bg-white p-2.5 text-xs"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setModoCorregir(false)}
                    className="flex-1 rounded-xl bg-brand-sand/60 py-2.5 text-xs font-semibold text-brand-ink"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleGuardarCorreccion}
                    disabled={!motivoCorreccion.trim() || !consumoOriginalId.trim() || guardandoExtra}
                    className="flex-1 rounded-xl bg-brand-terracotta py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-terracotta-deep disabled:opacity-50"
                  >
                    Guardar corrección
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
