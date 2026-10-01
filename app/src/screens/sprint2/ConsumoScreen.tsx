import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@powersync/react";
import { useConsumoHoy, type TrabajadorConsumoRow } from "../../features/consumo/useConsumoHoy";
import { consumoRapido } from "../../features/consumo/consumoRapido";
import { registrarConsumo, type TipoConsumo } from "../../features/consumo/registrarConsumo";
import { corregirConsumo } from "../../features/consumo/corregirConsumo";
import { useProductosExtra } from "../../features/consumo/useProductosExtra";
import { CatalogoExtrasModal } from "../../components/CatalogoExtrasModal";
import {
  IconCheck,
  IconSearch,
  IconUtensils,
  IconPlus,
  IconUser
} from "../../components/Icons";

const TIPOS_SELECTOR: { tipo: TipoConsumo; label: string; icon: string }[] = [
  { tipo: "desayuno", label: "Desayuno", icon: "☕" },
  { tipo: "almuerzo", label: "Almuerzo", icon: "🍲" },
  { tipo: "cena", label: "Cena", icon: "🍽️" },
  { tipo: "colacion", label: "Colación", icon: "🥪" },
  { tipo: "cama_noche", label: "Noche de cama", icon: "🛏️" }
];

const NOMBRES_TIPO: Record<TipoConsumo, { label: string; icon: string }> = {
  cama_noche: { label: "Noche de cama", icon: "🛏️" },
  desayuno: { label: "Desayuno", icon: "☕" },
  almuerzo: { label: "Almuerzo", icon: "🍲" },
  cena: { label: "Cena", icon: "🍽️" },
  colacion: { label: "Colación / Extra", icon: "🥪" }
};

type ConsumoRecienteRow = {
  id: string;
  tipo_consumo: TipoConsumo;
  recargo: number;
  fecha_hora: string;
  producto_nombre?: string | null;
};

interface ConsumoScreenProps {
  usuarioId: string;
  contratoEmpresaId: string;
  usuarioRol?: string;
}

export function ConsumoScreen({
  usuarioId,
  contratoEmpresaId,
  usuarioRol
}: ConsumoScreenProps) {
  const [tipoRacion, setTipoRacion] = useState<TipoConsumo>("almuerzo");
  const filas = useConsumoHoy(contratoEmpresaId, tipoRacion);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [mensajesError, setMensajesError] = useState<string[]>([]);

  // Catálogo de productos extra
  const productosExtra = useProductosExtra();
  const [productoExtraId, setProductoExtraId] = useState<string>("");
  const [recargoExtra, setRecargoExtra] = useState<number>(0);
  const [mostrarModalCatalogo, setMostrarModalCatalogo] = useState(false);

  // Sincronizar producto extra inicial
  useEffect(() => {
    if (!productoExtraId && productosExtra.length > 0) {
      setProductoExtraId(productosExtra[0].id);
      setRecargoExtra(productosExtra[0].precio_unitario);
    }
  }, [productosExtra, productoExtraId]);

  // Modal de opciones individuales / corrección
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<TrabajadorConsumoRow | null>(null);
  const [guardandoAccion, setGuardandoAccion] = useState(false);
  const [consumoACorregir, setConsumoACorregir] = useState<ConsumoRecienteRow | null>(null);
  const [motivoCorreccion, setMotivoCorreccion] = useState("");

  // Búsqueda y filtros
  const [busquedaTrabajador, setBusquedaTrabajador] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "pendientes" | "servidos">("todos");

  // Consultar consumos del trabajador seleccionado para facilitar corrección
  const { data: consumosTrabajador } = useQuery<ConsumoRecienteRow>(
    `select c.id, c.tipo_consumo, c.recargo, c.fecha_hora, pe.nombre as producto_nombre
     from consumo c
     left join producto_extra pe on pe.id = c.producto_extra_id
     where c.trabajador_id = ? and c.consumo_corregido_id is null
     order by c.fecha_hora desc limit 8`,
    [trabajadorSeleccionado?.id ?? ""]
  );

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

    if (tipoRacion === "colacion" && !productoExtraId) {
      alert("Por favor selecciona primero un producto del catálogo para la colación.");
      return;
    }

    setGuardando(true);
    setMensajesError([]);
    try {
      const opciones =
        tipoRacion === "colacion"
          ? {
              productoExtraId,
              recargo: Number(recargoExtra) || 0
            }
          : undefined;

      const resultados = await consumoRapido(usuarioId, seleccionados, tipoRacion, opciones);
      const fallidos = resultados.filter((r) => !r.ok && r.error);
      if (fallidos.length) {
        setMensajesError(fallidos.map((f) => f.error!));
      }
      setSeleccionados([]);
    } finally {
      setGuardando(false);
    }
  }

  async function handleGuardarColacionIndividual() {
    if (!trabajadorSeleccionado || !productoExtraId) return;
    setGuardandoAccion(true);
    try {
      await registrarConsumo(usuarioId, {
        trabajadorId: trabajadorSeleccionado.id,
        tipoConsumo: "colacion",
        productoExtraId,
        recargo: Number(recargoExtra) || 0
      });
      setTrabajadorSeleccionado(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al registrar la colación.");
    } finally {
      setGuardandoAccion(false);
    }
  }

  async function handleGuardarCorreccion() {
    if (!trabajadorSeleccionado || !motivoCorreccion.trim() || !consumoACorregir) return;
    setGuardandoAccion(true);
    try {
      await corregirConsumo(usuarioId, {
        consumoOriginalId: consumoACorregir.id,
        trabajadorId: trabajadorSeleccionado.id,
        tipoConsumo: consumoACorregir.tipo_consumo,
        justificacion: motivoCorreccion.trim()
      });
      setTrabajadorSeleccionado(null);
      setConsumoACorregir(null);
      setMotivoCorreccion("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar la corrección.");
    } finally {
      setGuardandoAccion(false);
    }
  }

  const esAdmin = usuarioRol === "administradora";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      {/* Selector de Tipo de Consumo */}
      <div className="rounded-3xl border border-brand-border/70 bg-brand-card p-4 md:p-5 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <IconUtensils className="h-5 w-5 text-brand-terracotta" />
            <h2 className="font-display text-xl font-bold text-brand-ink">
              Registro Rápido de Consumos
            </h2>
          </div>

          {esAdmin && (
            <button
              onClick={() => setMostrarModalCatalogo(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border bg-brand-sand/40 px-3 py-1.5 text-xs font-bold text-brand-ink hover:bg-brand-sand transition"
            >
              <IconPlus className="h-3.5 w-3.5 text-brand-terracotta" />
              <span>Catálogo de Extras ({productosExtra.length})</span>
            </button>
          )}
        </div>

        {/* Botones de selección de tipo */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {TIPOS_SELECTOR.map((t) => {
            const activo = tipoRacion === t.tipo;
            return (
              <button
                key={t.tipo}
                onClick={() => {
                  setTipoRacion(t.tipo);
                  setSeleccionados([]);
                  setMensajesError([]);
                }}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs md:text-sm font-bold transition-all active:scale-95 ${
                  activo
                    ? "border-brand-terracotta bg-brand-terracotta text-white shadow-brand"
                    : "border-brand-border bg-white text-brand-ink hover:bg-brand-sand/30"
                }`}
              >
                <span>{t.icon}</span>
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Panel condicional según tipo seleccionado */}
        {tipoRacion === "cama_noche" && (
          <div className="mt-3 rounded-2xl border border-brand-border/60 bg-brand-sand/30 p-3 text-xs text-brand-muted">
            ℹ️ Las noches de cama se generan automáticamente cada noche para los trabajadores con cama asignada.
            Puedes registrar manualmente aquí en casos excepcionales de arribos no agendados.
          </div>
        )}

        {tipoRacion === "colacion" && (
          <div className="mt-3 rounded-2xl border border-brand-terracotta/30 bg-brand-sand/40 p-3.5 animate-in fade-in duration-150 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-brand-ink">
                Producto o plato especial a marcar:
              </span>
              {esAdmin && (
                <button
                  type="button"
                  onClick={() => setMostrarModalCatalogo(true)}
                  className="text-xs font-semibold text-brand-terracotta hover:underline self-start sm:self-auto"
                >
                  + Administrar lista de precios
                </button>
              )}
            </div>

            {productosExtra.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={productoExtraId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setProductoExtraId(id);
                    const prod = productosExtra.find((p) => p.id === id);
                    if (prod) setRecargoExtra(prod.precio_unitario);
                  }}
                  className="rounded-xl border border-brand-border bg-white px-3 py-2 text-xs font-bold text-brand-ink focus:border-brand-terracotta focus:outline-none"
                >
                  {productosExtra.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — ${p.precio_unitario.toLocaleString("es-CL")}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-brand-muted">Precio:</span>
                  <input
                    type="number"
                    step="100"
                    value={recargoExtra}
                    onChange={(e) => setRecargoExtra(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-xs font-bold text-brand-ink focus:border-brand-terracotta focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-brand-border bg-white p-3 text-center">
                <p className="text-xs font-semibold text-brand-ink">
                  No hay productos registrados en el catálogo de colaciones.
                </p>
                {esAdmin ? (
                  <button
                    onClick={() => setMostrarModalCatalogo(true)}
                    className="mt-2 rounded-xl bg-brand-terracotta px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-brand-terracotta-deep"
                  >
                    Crear primer producto
                  </button>
                ) : (
                  <p className="text-[11px] text-brand-muted mt-1">
                    La Administradora debe cargar los precios en el catálogo antes de registrar colaciones.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
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
          disabled={guardando || !seleccionados.length || (tipoRacion === "colacion" && !productoExtraId)}
          className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-brand-terracotta px-5 py-2 text-xs md:text-sm font-bold text-white shadow-brand transition-all hover:bg-brand-terracotta-deep active:scale-95 disabled:opacity-50"
        >
          <IconCheck className="h-4 w-4" />
          <span>
            {guardando
              ? "Registrando…"
              : `Marcar ${NOMBRES_TIPO[tipoRacion].label} (${seleccionados.length})`}
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
                    {yaRegistrado ? "✓ Ya registrado hoy" : "Pendiente de marcar"}
                  </p>
                </div>
              </label>

              {/* Botón para opciones individuales / extras */}
              <button
                type="button"
                onClick={() => {
                  setTrabajadorSeleccionado(f);
                  setConsumoACorregir(null);
                  setMotivoCorreccion("");
                }}
                title="Opciones individuales y corrección"
                className="shrink-0 rounded-xl border border-brand-border/60 bg-brand-sand/40 px-2.5 py-1.5 text-xs font-bold text-brand-muted hover:bg-brand-sand hover:text-brand-ink transition"
              >
                Opciones
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

      {/* Modal de Detalle Individual, Colación Extra y Corrección Inmutable */}
      {trabajadorSeleccionado && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-brand-ink/50 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setTrabajadorSeleccionado(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-brand-border/80 bg-brand-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera modal */}
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-sand text-brand-ink">
                  <IconUser className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-brand-ink">
                    {trabajadorSeleccionado.nombre}
                  </h3>
                  <p className="text-xs text-brand-muted">Detalle individual de consumos</p>
                </div>
              </div>
              <button
                onClick={() => setTrabajadorSeleccionado(null)}
                className="rounded-full p-1 text-brand-muted hover:bg-brand-sand hover:text-brand-ink"
              >
                ✕
              </button>
            </div>

            {/* Sub-formulario de Corrección Activa */}
            {consumoACorregir ? (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                    Corrección de Registro
                  </span>
                  <h4 className="font-display text-base font-bold text-brand-ink">
                    Corregir {NOMBRES_TIPO[consumoACorregir.tipo_consumo]?.label}
                  </h4>
                  <p className="text-[11px] text-brand-muted mt-0.5">
                    El registro original queda auditado. La corrección crea una nueva transacción compensatoria.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-ink mb-1">
                    Motivo obligatorio de la corrección <span className="text-brand-terracotta">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Ej: Turno extraordinario en faena / Marcado por error"
                    value={motivoCorreccion}
                    onChange={(e) => setMotivoCorreccion(e.target.value)}
                    className="w-full rounded-xl border border-brand-border bg-white p-2.5 text-xs text-brand-ink focus:border-brand-terracotta focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setConsumoACorregir(null);
                      setMotivoCorreccion("");
                    }}
                    className="rounded-xl border border-brand-border bg-white px-3.5 py-2 text-xs font-bold text-brand-muted hover:text-brand-ink"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleGuardarCorreccion}
                    disabled={!motivoCorreccion.trim() || guardandoAccion}
                    className="rounded-xl bg-brand-terracotta px-4 py-2 text-xs font-bold text-white shadow-brand hover:bg-brand-terracotta-deep disabled:opacity-50"
                  >
                    {guardandoAccion ? "Guardando…" : "Confirmar corrección"}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Listado de Consumos Recientes del Trabajador */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted">
                Consumos registrados recientemente
              </h4>

              {consumosTrabajador && consumosTrabajador.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {consumosTrabajador.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl border border-brand-border/60 bg-white p-2.5 shadow-sm"
                    >
                      <div>
                        <p className="text-xs font-bold text-brand-ink">
                          {c.producto_nombre ? `${c.producto_nombre} (Colación)` : NOMBRES_TIPO[c.tipo_consumo]?.label}
                        </p>
                        <p className="text-[10px] text-brand-muted">
                          {new Date(c.fecha_hora).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                          {c.recargo > 0 && ` · Cobro: $${c.recargo.toLocaleString("es-CL")}`}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setConsumoACorregir(c);
                          setMotivoCorreccion("");
                        }}
                        className="rounded-lg border border-brand-border bg-brand-sand/30 px-2.5 py-1 text-[11px] font-bold text-brand-muted hover:border-brand-terracotta hover:text-brand-terracotta transition"
                      >
                        Corregir
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-brand-border/40 bg-brand-sand/20 p-3 text-center text-xs text-brand-muted">
                  No hay consumos registrados para este trabajador hoy.
                </p>
              )}
            </div>

            {/* Sección para registrar Colación Individual */}
            <div className="border-t border-brand-border/60 pt-3 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-ink">
                Registrar Colación o Plato Especial
              </h4>

              {productosExtra.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={productoExtraId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setProductoExtraId(id);
                      const prod = productosExtra.find((p) => p.id === id);
                      if (prod) setRecargoExtra(prod.precio_unitario);
                    }}
                    className="w-full rounded-xl border border-brand-border bg-white p-2.5 text-xs font-bold text-brand-ink focus:border-brand-terracotta focus:outline-none"
                  >
                    {productosExtra.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — ${p.precio_unitario.toLocaleString("es-CL")}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-brand-muted">Monto:</span>
                    <input
                      type="number"
                      step="100"
                      value={recargoExtra}
                      onChange={(e) => setRecargoExtra(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-xs font-bold text-brand-ink focus:border-brand-terracotta focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleGuardarColacionIndividual}
                    disabled={guardandoAccion || !productoExtraId}
                    className="w-full rounded-xl bg-brand-terracotta py-2.5 text-xs font-bold text-white shadow-brand hover:bg-brand-terracotta-deep transition disabled:opacity-50"
                  >
                    {guardandoAccion ? "Guardando…" : "Registrar colación para este trabajador"}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-brand-muted">
                  No hay productos cargados en el catálogo de colaciones.
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setTrabajadorSeleccionado(null)}
                className="rounded-xl border border-brand-border bg-brand-sand/40 px-4 py-2 text-xs font-bold text-brand-ink hover:bg-brand-sand"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Catálogo de Extras */}
      <CatalogoExtrasModal
        abierto={mostrarModalCatalogo}
        onCerrar={() => setMostrarModalCatalogo(false)}
        onProductoCreado={(nuevoId) => {
          setProductoExtraId(nuevoId);
        }}
      />
    </div>
  );
}
