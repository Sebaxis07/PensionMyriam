import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@powersync/react";
import {
  useConsumoHoy,
  useResumenConsumosDia,
  type TrabajadorConsumoRow
} from "../../features/consumo/useConsumoHoy";
import { consumoRapido } from "../../features/consumo/consumoRapido";
import { registrarConsumo, type TipoConsumo } from "../../features/consumo/registrarConsumo";
import { corregirConsumo } from "../../features/consumo/corregirConsumo";
import { useProductosExtra } from "../../features/consumo/useProductosExtra";
import { CatalogoExtrasModal } from "../../components/CatalogoExtrasModal";
import { BotonExplicacion } from "../../components/BotonExplicacion";
import {
  IconCheck,
  IconCheckCircle,
  IconSearch,
  IconUtensils,
  IconPlus,
  IconUser,
  IconClock,
  IconUsers
} from "../../components/Icons";

import {
  SERVICIOS_INFO,
  LISTA_SERVICIOS_ORDENADA,
  obtenerServicioSugeridoPorHora
} from "../../features/consumo/serviciosInfo";

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
  empresaNombre?: string;
  headcount?: number;
}

export function ConsumoScreen({
  usuarioId,
  contratoEmpresaId,
  usuarioRol,
  empresaNombre,
  headcount
}: ConsumoScreenProps) {
  // Servicio sugerido según la hora
  const servicioSugeridoActual = useMemo(() => obtenerServicioSugeridoPorHora(), []);
  const [tipoRacion, setTipoRacion] = useState<TipoConsumo>(servicioSugeridoActual);

  const filas = useConsumoHoy(contratoEmpresaId, tipoRacion);
  const resumenDia = useResumenConsumosDia(contratoEmpresaId);

  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [guardandoLote, setGuardandoLote] = useState(false);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [mensajesError, setMensajesError] = useState<string[]>([]);
  const [toastExito, setToastExito] = useState<string | null>(null);

  // Catálogo de productos extra para colación
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
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "pendientes" | "servidos">("pendientes");

  // Consultar consumos del trabajador seleccionado para facilitar corrección
  const { data: consumosTrabajador } = useQuery<ConsumoRecienteRow>(
    `select c.id, c.tipo_consumo, c.recargo, c.fecha_hora, pe.nombre as producto_nombre
     from consumo c
     left join producto_extra pe on pe.id = c.producto_extra_id
     where c.trabajador_id = ? and c.consumo_corregido_id is null
     order by c.fecha_hora desc limit 8`,
    [trabajadorSeleccionado?.id ?? ""]
  );

  const pendientes = useMemo(() => filas.filter((f) => !f.ya_registrado), [filas]);
  const servidos = useMemo(() => filas.filter((f) => !!f.ya_registrado), [filas]);

  // Porcentaje completado
  const dotacionTotal = headcount || filas.length || 1;
  const porcentajeServido = Math.min(100, Math.round((servidos.length / dotacionTotal) * 100));

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

  function alternarSeleccion(id: string) {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function alternarSeleccionarTodosPendientes() {
    if (seleccionados.length === pendientes.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(pendientes.map((p) => p.id));
    }
  }

  // 1-Click: Marcado directo de un trabajador individual
  async function handleMarcarIndividual(trabajador: TrabajadorConsumoRow) {
    if (tipoRacion === "colacion" && !productoExtraId) {
      alert("Por favor selecciona primero un producto del catálogo para la colación.");
      return;
    }

    setGuardandoId(trabajador.id);
    setMensajesError([]);
    try {
      const opciones =
        tipoRacion === "colacion"
          ? {
              productoExtraId,
              recargo: Number(recargoExtra) || 0
            }
          : undefined;

      await registrarConsumo(usuarioId, {
        trabajadorId: trabajador.id,
        tipoConsumo: tipoRacion,
        productoExtraId: opciones?.productoExtraId,
        recargo: opciones?.recargo
      });

      // Feedback rápido
      const info = SERVICIOS_INFO[tipoRacion];
      setToastExito(`✓ ${info.nombreCorto} registrado para ${trabajador.nombre}`);
      setTimeout(() => setToastExito(null), 3500);

      // Quitar de seleccionados si estaba
      setSeleccionados((prev) => prev.filter((id) => id !== trabajador.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al registrar la ración.");
    } finally {
      setGuardandoId(null);
    }
  }

  // Marcado múltiple en lote
  async function handleMarcarLote() {
    if (!seleccionados.length) return;

    if (tipoRacion === "colacion" && !productoExtraId) {
      alert("Por favor selecciona primero un producto del catálogo para la colación.");
      return;
    }

    setGuardandoLote(true);
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
      const exitosos = resultados.filter((r) => r.ok).length;

      if (fallidos.length) {
        setMensajesError(fallidos.map((f) => f.error!));
      }
      if (exitosos > 0) {
        const info = SERVICIOS_INFO[tipoRacion];
        setToastExito(`✓ Se registraron ${exitosos} ${info.nombreCorto.toLowerCase()}(s) en lote`);
        setTimeout(() => setToastExito(null), 4000);
      }
      setSeleccionados([]);
    } finally {
      setGuardandoLote(false);
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
      setToastExito(`✓ Colación registrada para ${trabajadorSeleccionado.nombre}`);
      setTimeout(() => setToastExito(null), 3500);
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
      setToastExito(`✓ Corrección guardada con éxito`);
      setTimeout(() => setToastExito(null), 3500);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar la corrección.");
    } finally {
      setGuardandoAccion(false);
    }
  }

  const esAdmin = usuarioRol === "administradora";
  const infoServicio = SERVICIOS_INFO[tipoRacion];

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Toast flotante de éxito */}
      {toastExito && (
        <div className="fixed top-16 right-4 z-50 flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-top-3">
          <IconCheckCircle className="h-5 w-5 shrink-0" />
          <span>{toastExito}</span>
        </div>
      )}

      {/* Cabecera explicativa del módulo */}
      <div className="rounded-3xl border border-brand-border/80 bg-brand-card p-4 sm:p-5 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-sand text-brand-terracotta">
                <IconUtensils className="h-4 w-4" />
              </div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-brand-ink">
                Control de Comedor y Raciones
              </h2>
              <BotonExplicacion
                titulo="Control de Comedor y Raciones"
                queEs="Es la planilla digital de asistencia al comedor. Aquí anotas cuándo un trabajador baja a desayunar, almorzar o cenar para que cada ración quede registrada en la cuenta de la empresa."
                comoSeUsa="1. Elige el servicio (ej. Almuerzo). 2. Cuando el trabajador baje a comer, toca 'Servir plato'. 3. Si baja un grupo, márcalos juntos y presiona 'Registrar en lote'."
                ejemplo="Si Juan Pérez baja a almorzar, buscas su nombre y tocas 'Servir plato'. Quedará marcado en verde y no se podrá duplicar."
              />
            </div>
            <p className="mt-1 text-xs text-brand-muted">
              Marca las raciones servidas en el mesón para asegurar el cobro y la conciliación mensual.
            </p>
          </div>

          {esAdmin && (
            <button
              onClick={() => setMostrarModalCatalogo(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border bg-white px-3 py-2 text-xs font-bold text-brand-ink hover:bg-brand-sand transition self-start sm:self-auto shadow-2xs"
            >
              <IconPlus className="h-3.5 w-3.5 text-brand-terracotta" />
              <span>Lista de Colaciones ({productosExtra.length})</span>
            </button>
          )}
        </div>

        {/* Selector de Pestañas de Servicios Informativas */}
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted mb-2">
            Elige el servicio que estás atendiendo:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {LISTA_SERVICIOS_ORDENADA.map((tipo) => {
              const info = SERVICIOS_INFO[tipo];
              const activo = tipoRacion === tipo;
              const esTurnoActual = servicioSugeridoActual === tipo;

              // Obtener conteo de raciones servidas para este tipo hoy
              const itemResumen = resumenDia.find((r) => r.tipo_consumo === tipo);
              const conteoServidos = itemResumen?.total ?? (activo ? servidos.length : 0);

              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => {
                    setTipoRacion(tipo);
                    setSeleccionados([]);
                    setMensajesError([]);
                  }}
                  className={`relative flex flex-col items-center justify-between rounded-2xl border p-2.5 sm:p-3 text-center transition-all cursor-pointer active:scale-95 ${
                    activo
                      ? "border-brand-terracotta bg-brand-terracotta text-white shadow-brand ring-2 ring-brand-terracotta/30"
                      : "border-brand-border/70 bg-white text-brand-ink hover:bg-brand-sand/30 hover:border-brand-border"
                  }`}
                >
                  {/* Badge de Horario Actual */}
                  {esTurnoActual && (
                    <span
                      className={`absolute -top-2 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-xs ${
                        activo
                          ? "bg-amber-300 text-amber-950"
                          : "bg-brand-terracotta text-white animate-pulse"
                      }`}
                    >
                      Turno actual
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xl sm:text-2xl">{info.icon}</span>
                    <span className="font-bold text-xs sm:text-sm">{info.nombreCorto}</span>
                  </div>

                  <span
                    className={`mt-1 text-[10px] font-medium leading-none ${
                      activo ? "text-white/80" : "text-brand-muted"
                    }`}
                  >
                    {info.horario}
                  </span>

                  {/* Micro-métrica en vivo */}
                  <div
                    className={`mt-2 w-full rounded-lg px-1.5 py-0.5 text-[10px] font-bold ${
                      activo
                        ? "bg-white/20 text-white"
                        : "bg-brand-sand/40 text-brand-ink"
                    }`}
                  >
                    {tipo === "colacion"
                      ? `${conteoServidos} extra(s)`
                      : tipo === "cama_noche"
                      ? `${conteoServidos} cama(s)`
                      : `${conteoServidos}/${dotacionTotal} servidos`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Advertencias o paneles específicos para Colación y Cama */}
        {tipoRacion === "cama_noche" && (
          <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
            <span className="text-base shrink-0">🛏️</span>
            <div>
              <p className="font-bold">Generación automática de pernocta</p>
              <p className="text-[11px] text-blue-950/80 mt-0.5">
                Las noches de cama se registran automáticamente por el sistema cada medianoche para todos los trabajadores con habitación asignada. Usa este panel solo para registrar manualmente a un trabajador que haya llegado de improvisto.
              </p>
            </div>
          </div>
        )}

        {tipoRacion === "colacion" && (
          <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50/80 p-3.5 text-xs text-amber-950 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base">🥪</span>
                <span className="font-bold text-xs">
                  Selecciona la colación o plato especial que vas a entregar:
                </span>
              </div>
              {esAdmin && (
                <button
                  type="button"
                  onClick={() => setMostrarModalCatalogo(true)}
                  className="text-xs font-semibold text-brand-terracotta hover:underline self-start sm:self-auto"
                >
                  + Administrar precios
                </button>
              )}
            </div>

            {productosExtra.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">
                    Producto del catálogo:
                  </label>
                  <select
                    value={productoExtraId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setProductoExtraId(id);
                      const prod = productosExtra.find((p) => p.id === id);
                      if (prod) setRecargoExtra(prod.precio_unitario);
                    }}
                    className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-xs font-bold text-brand-ink focus:border-brand-terracotta focus:outline-none"
                  >
                    {productosExtra.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — ${p.precio_unitario.toLocaleString("es-CL")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">
                    Valor a cobrar a la empresa:
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-brand-muted">$</span>
                    <input
                      type="number"
                      step="100"
                      value={recargoExtra}
                      onChange={(e) => setRecargoExtra(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-xs font-bold text-brand-ink focus:border-brand-terracotta focus:outline-none"
                    />
                    <span className="text-[11px] text-brand-muted">CLP</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-amber-300 bg-white p-3 text-center">
                <p className="text-xs font-semibold text-brand-ink">
                  Aún no tienes productos creados en la lista de colaciones.
                </p>
                {esAdmin ? (
                  <button
                    onClick={() => setMostrarModalCatalogo(true)}
                    className="mt-2 rounded-xl bg-brand-terracotta px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-brand-terracotta-deep"
                  >
                    Crear primer producto (ej. Colación de terreno)
                  </button>
                ) : (
                  <p className="text-[11px] text-brand-muted mt-1">
                    Solicita a la Administradora cargar los precios antes de registrar colaciones.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hero Card: Resumen Visual y Estado del Servicio Seleccionado */}
      <div className="rounded-3xl border border-brand-border/80 bg-brand-card p-4 sm:p-5 shadow-card space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-border/50 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{infoServicio.icon}</span>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-brand-ink leading-tight">
                Estado de {infoServicio.label} Hoy
              </h3>
              <p className="text-xs text-brand-muted">
                {empresaNombre ? `Para nómina de ${empresaNombre}` : "Resumen del turno actual"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs font-bold text-brand-ink">
              {porcentajeServido}% atendido
            </span>
          </div>
        </div>

        {/* Barra de progreso visual */}
        <div className="w-full bg-brand-sand/50 h-3 rounded-full overflow-hidden border border-brand-border/60">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              porcentajeServido === 100
                ? "bg-emerald-600"
                : porcentajeServido > 0
                ? "bg-brand-terracotta"
                : "bg-transparent"
            }`}
            style={{ width: `${porcentajeServido}%` }}
          />
        </div>

        {/* 3 Métricas Grandes en Tarjetas */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
          {/* Servidos */}
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-2.5 sm:p-3">
            <div className="flex items-center justify-center gap-1 text-emerald-800">
              <IconCheckCircle className="h-4 w-4" />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                Ya comieron
              </span>
            </div>
            <p className="font-display text-xl sm:text-2xl font-black text-emerald-950 mt-0.5">
              {servidos.length}
            </p>
            <span className="text-[10px] text-emerald-800/80">platos entregados</span>
          </div>

          {/* Pendientes */}
          <div
            className={`rounded-2xl border p-2.5 sm:p-3 transition-colors ${
              pendientes.length > 0
                ? "border-amber-300 bg-amber-50/70 text-amber-950"
                : "border-emerald-300 bg-emerald-50/70 text-emerald-950"
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <IconClock className="h-4 w-4 text-amber-700" />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-900">
                Faltan por comer
              </span>
            </div>
            <p className="font-display text-xl sm:text-2xl font-black mt-0.5">
              {pendientes.length}
            </p>
            <span className="text-[10px] text-amber-800/80">
              {pendientes.length > 0 ? "en espera" : "¡todos listos!"}
            </span>
          </div>

          {/* Dotación total */}
          <div className="rounded-2xl border border-brand-border/70 bg-brand-sand/30 p-2.5 sm:p-3">
            <div className="flex items-center justify-center gap-1 text-brand-muted">
              <IconUsers className="h-4 w-4" />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                Dotación total
              </span>
            </div>
            <p className="font-display text-xl sm:text-2xl font-black text-brand-ink mt-0.5">
              {dotacionTotal}
            </p>
            <span className="text-[10px] text-brand-muted">trabajadores</span>
          </div>
        </div>

        {/* Mensaje de estado amigable */}
        <div className="rounded-xl bg-brand-sand/40 p-2.5 text-xs text-brand-ink border border-brand-border/50 flex items-center gap-2">
          <span className="text-base">💡</span>
          {pendientes.length > 0 ? (
            <span>
              Quedan <strong>{pendientes.length} trabajadores</strong> por registrar en este turno. Toca el botón verde <strong>"{infoServicio.verbo}"</strong> al lado de cada nombre cuando bajen al mesón.
            </span>
          ) : (
            <span className="text-emerald-900 font-semibold">
              🎉 ¡Excelente! Toda la nómina ({servidos.length} trabajadores) ya tiene su {infoServicio.nombreCorto.toLowerCase()} registrado hoy.
            </span>
          )}
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros Rápidos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-brand-border/70 bg-brand-card p-3 shadow-sm">
        {/* Buscador de nombres */}
        <div className="relative flex-1">
          <IconSearch className="absolute left-3.5 top-2.5 h-4 w-4 text-brand-muted" />
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

        {/* Chips de filtro de estado */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setFiltroEstado("pendientes")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filtroEstado === "pendientes"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-brand-sand/50 text-brand-muted hover:text-brand-ink border border-transparent"
            }`}
          >
            Faltan por comer ({pendientes.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado("servidos")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filtroEstado === "servidos"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-brand-sand/50 text-brand-muted hover:text-brand-ink border border-transparent"
            }`}
          >
            Ya comieron ({servidos.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado("todos")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filtroEstado === "todos"
                ? "bg-brand-terracotta text-white shadow-xs"
                : "bg-brand-sand/50 text-brand-muted hover:text-brand-ink border border-transparent"
            }`}
          >
            Todos ({filas.length})
          </button>
        </div>
      </div>

      {/* Barra de Acción Masiva (Cuando hay selección de cuadrilla) */}
      <div className="sticky top-14 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-brand-border/80 bg-brand-sand/95 p-3 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={alternarSeleccionarTodosPendientes}
            disabled={!pendientes.length}
            className="text-xs font-bold text-brand-terracotta hover:underline disabled:opacity-40"
          >
            {seleccionados.length === pendientes.length && pendientes.length > 0
              ? "Desmarcar todos"
              : `Seleccionar toda la cuadrilla pendiente (${pendientes.length})`}
          </button>

          {seleccionados.length > 0 && (
            <span className="rounded-full bg-brand-terracotta/15 px-2.5 py-0.5 text-xs font-bold text-brand-terracotta">
              {seleccionados.length} seleccionados
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleMarcarLote}
          disabled={guardandoLote || !seleccionados.length || (tipoRacion === "colacion" && !productoExtraId)}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand-terracotta px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-brand transition-all hover:bg-brand-terracotta-deep active:scale-95 disabled:opacity-40"
        >
          <IconCheck className="h-4 w-4" />
          <span>
            {guardandoLote
              ? "Registrando lote…"
              : `Registrar ${seleccionados.length} ${infoServicio.nombreCorto.toLowerCase()}(s) en lote`}
          </span>
        </button>
      </div>

      {/* Errores si los hay */}
      {mensajesError.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 font-semibold space-y-1">
          {mensajesError.map((msg, i) => (
            <p key={i}>⚠️ {msg}</p>
          ))}
        </div>
      )}

      {/* Lista de Trabajadores con Tarjetas Claras e Intuitivas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {trabajadoresFiltrados.map((f) => {
          const yaRegistrado = !!f.ya_registrado;
          const seleccionado = seleccionados.includes(f.id);
          const estaGuardando = guardandoId === f.id;

          // Obtener iniciales para avatar
          const iniciales = f.nombre
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();

          // Formatear hora si está disponible
          const horaLegible = f.hora_consumo
            ? new Date(f.hora_consumo).toLocaleTimeString("es-CL", {
                hour: "2-digit",
                minute: "2-digit"
              })
            : null;

          return (
            <div
              key={f.id}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all shadow-xs ${
                yaRegistrado
                  ? "border-emerald-300/80 bg-emerald-50/60"
                  : seleccionado
                  ? "border-brand-terracotta bg-white ring-2 ring-brand-terracotta/40 shadow-sm"
                  : "border-brand-border/80 bg-brand-card hover:bg-white hover:border-brand-border"
              }`}
            >
              {/* Checkbox y Datos del Trabajador */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <input
                  type="checkbox"
                  disabled={yaRegistrado}
                  checked={seleccionado || yaRegistrado}
                  onChange={() => !yaRegistrado && alternarSeleccion(f.id)}
                  title={yaRegistrado ? "Ya registrado" : "Seleccionar para marcar en lote"}
                  className="h-5 w-5 rounded-md border-brand-border text-brand-terracotta focus:ring-brand-terracotta disabled:opacity-40 cursor-pointer"
                />

                {/* Avatar con Iniciales */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-bold text-xs ${
                    yaRegistrado
                      ? "bg-emerald-600 text-white"
                      : "bg-brand-sand text-brand-ink"
                  }`}
                >
                  {yaRegistrado ? "✓" : iniciales}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="truncate font-bold text-sm sm:text-base text-brand-ink">
                    {f.nombre}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {yaRegistrado ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <span>✓ Ya comió</span>
                        {horaLegible && (
                          <span className="text-emerald-800/80 font-normal">
                            ({horaLegible} hrs)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                        <span>⏳ Pendiente de servicio</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botón de Acción Principal (1 Toque) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {!yaRegistrado ? (
                  <button
                    type="button"
                    onClick={() => handleMarcarIndividual(f)}
                    disabled={estaGuardando || (tipoRacion === "colacion" && !productoExtraId)}
                    title={`Marcar ${infoServicio.nombreCorto} para ${f.nombre}`}
                    className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <span>{infoServicio.icon}</span>
                    <span>{estaGuardando ? "Marcando…" : "Servir"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setTrabajadorSeleccionado(f);
                      setConsumoACorregir(null);
                      setMotivoCorreccion("");
                    }}
                    title="Ver historial o corregir error"
                    className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition"
                  >
                    Detalle
                  </button>
                )}

                {/* Botón secundario para opciones / extras */}
                {!yaRegistrado && (
                  <button
                    type="button"
                    onClick={() => {
                      setTrabajadorSeleccionado(f);
                      setConsumoACorregir(null);
                      setMotivoCorreccion("");
                    }}
                    title="Opciones adicionales (colación extra, correcciones)"
                    className="rounded-xl border border-brand-border/60 bg-white p-2 text-brand-muted hover:bg-brand-sand hover:text-brand-ink transition"
                  >
                    ⋯
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {!trabajadoresFiltrados.length && (
          <div className="col-span-full rounded-3xl border border-dashed border-brand-border/70 bg-brand-card p-10 text-center text-xs text-brand-muted space-y-2">
            <div className="text-3xl">🔍</div>
            <p className="font-bold text-sm text-brand-ink">
              {busquedaTrabajador
                ? `No se encontró ningún trabajador con "${busquedaTrabajador}".`
                : filtroEstado === "pendientes"
                ? "¡No quedan trabajadores pendientes en este turno!"
                : "No hay registros bajo este filtro."}
            </p>
            {busquedaTrabajador && (
              <button
                type="button"
                onClick={() => setBusquedaTrabajador("")}
                className="rounded-xl bg-brand-sand px-3 py-1.5 font-bold text-brand-ink hover:bg-brand-sand/80"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de Detalle Individual, Colación Extra y Corrección Inmutable */}
      {trabajadorSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/50 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setTrabajadorSeleccionado(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-brand-border/80 bg-brand-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera modal */}
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-sand text-brand-ink font-bold">
                  <IconUser className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-brand-ink">
                    {trabajadorSeleccionado.nombre}
                  </h3>
                  <p className="text-xs text-brand-muted">Historial y opciones de consumo</p>
                </div>
              </div>
              <button
                onClick={() => setTrabajadorSeleccionado(null)}
                className="rounded-full p-1.5 text-brand-muted hover:bg-brand-sand hover:text-brand-ink"
              >
                ✕
              </button>
            </div>

            {/* Sub-formulario de Corrección Activa */}
            {consumoACorregir ? (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                    Corrección de Ración
                  </span>
                  <h4 className="font-display text-base font-bold text-brand-ink">
                    Corregir {SERVICIOS_INFO[consumoACorregir.tipo_consumo]?.label}
                  </h4>
                  <p className="text-[11px] text-brand-muted mt-0.5">
                    El registro original se mantiene por auditoría inmutable. La corrección anulará este cobro creando una transacción compensatoria.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-ink mb-1">
                    Motivo obligatorio de la corrección <span className="text-brand-terracotta">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Ej: Turno extraordinario en faena / Marcado por error en mesón"
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
                    {guardandoAccion ? "Guardando…" : "Confirmar anulación/corrección"}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Listado de Consumos Recientes del Trabajador */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted">
                Raciones registradas recientemente
              </h4>

              {consumosTrabajador && consumosTrabajador.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {consumosTrabajador.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl border border-brand-border/60 bg-white p-3 shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{SERVICIOS_INFO[c.tipo_consumo]?.icon}</span>
                        <div>
                          <p className="text-xs font-bold text-brand-ink">
                            {c.producto_nombre
                              ? `${c.producto_nombre} (Colación)`
                              : SERVICIOS_INFO[c.tipo_consumo]?.label}
                          </p>
                          <p className="text-[10px] text-brand-muted">
                            {new Date(c.fecha_hora).toLocaleTimeString("es-CL", {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}{" "}
                            hrs · {new Date(c.fecha_hora).toLocaleDateString("es-CL")}
                            {c.recargo > 0 && ` · Cobro: $${c.recargo.toLocaleString("es-CL")}`}
                          </p>
                        </div>
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

            {/* Sección para registrar Colación Individual Extra */}
            <div className="border-t border-brand-border/60 pt-3 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-ink">
                Entregar Colación de Terreno o Plato Especial
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
                    <span className="text-xs font-semibold text-brand-muted">Monto adicional:</span>
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
