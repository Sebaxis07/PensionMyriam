import { useQuery } from "@powersync/react";
import { CuposEmpresaPanel } from "../../features/nomina/CuposEmpresaPanel";
import type { ContratoCupos } from "../../features/nomina/cuposEmpresa";
import { Dialogo } from "../../components/Dialogo";
import { useEffect, useState, useMemo } from "react";
import { useNomina, type TrabajadorRow } from "../../features/nomina/useNomina";
import {
  crearTrabajadores,
  camasLibresParaContrato,
  asignarTrabajador,
  desasignarTrabajador,
  eliminarTrabajador,
  type CamaLibreRow
} from "../../features/nomina/asignarTrabajador";
import {
  IconBed,
  IconCheckCircle,
  IconChevronLeft,
  IconClose,
  IconPlus,
  IconUser,
  IconUsers
} from "../../components/Icons";
import { fechaHoySantiago } from "../../lib/fechaNegocio";

interface NominaScreenProps {
  usuarioId: string;
  contratoEmpresaId: string;
  onVolver?: () => void;
  empresaNombre?: string;
}

type FiltroNomina = "todos" | "pendientes" | "asignados";

export function NominaScreen({
  usuarioId,
  contratoEmpresaId,
  empresaNombre,
  onVolver
}: NominaScreenProps) {
  const nomina = useNomina(contratoEmpresaId);
  const { data: contratosCupos } = useQuery<ContratoCupos>(
    "select id, headcount, vigencia_desde, vigencia_hasta from contrato_empresa where id = ?",
    [contratoEmpresaId]
  );
  const contrato = contratosCupos?.[0];

  // Estados de carga de trabajadores
  const [nombreIndividual, setNombreIndividual] = useState("");
  const [mostrarPegarVarios, setMostrarPegarVarios] = useState(false);
  const [nombresMultiples, setNombresMultiples] = useState("");
  const [guardandoNombres, setGuardandoNombres] = useState(false);

  // Estados de asignación de camas
  const [camasLibres, setCamasLibres] = useState<CamaLibreRow[]>([]);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<TrabajadorRow | null>(null);
  const [asignandoCama, setAsignandoCama] = useState(false);

  // Filtros y avisos
  const [filtro, setFiltro] = useState<FiltroNomina>("todos");
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const conCama = useMemo(() => nomina.filter((t) => !!t.cama_id), [nomina]);
  const sinCama = useMemo(() => nomina.filter((t) => !t.cama_id), [nomina]);

  // Consultar camas libres
  useEffect(() => {
    camasLibresParaContrato(contrato?.vigencia_desde ?? fechaHoySantiago(), contrato?.vigencia_hasta ?? null)
      .then(setCamasLibres)
      .catch(() => setCamasLibres([]));
  }, [nomina.length, conCama.length, contrato?.vigencia_desde, contrato?.vigencia_hasta, trabajadorSeleccionado]);

  // Agrupar camas libres por habitación
  const habitacionesDisponibles = useMemo(() => {
    const mapa = new Map<number, { habitacionId: string; camas: CamaLibreRow[] }>();
    camasLibres.forEach((c) => {
      const actual = mapa.get(c.numero) || { habitacionId: c.habitacion_id, camas: [] };
      actual.camas.push(c);
      mapa.set(c.numero, actual);
    });
    return Array.from(mapa.entries()).map(([numero, info]) => ({
      numero,
      habitacionId: info.habitacionId,
      camasLibresCount: info.camas.length,
      primeraCamaId: info.camas[0].cama_id
    }));
  }, [camasLibres]);

  // Filtro de lista
  const nominaFiltrada = useMemo(() => {
    if (filtro === "pendientes") return sinCama;
    if (filtro === "asignados") return conCama;
    return nomina;
  }, [nomina, sinCama, conCama, filtro]);

  // Agregar 1 solo trabajador
  async function handleAgregarIndividual(e: React.FormEvent) {
    e.preventDefault();
    if (!nombreIndividual.trim()) return;
    setGuardandoNombres(true);
    setError(null);
    setMensajeExito(null);
    try {
      await crearTrabajadores(contratoEmpresaId, [nombreIndividual.trim()]);
      setNombreIndividual("");
      setMensajeExito(`¡${nombreIndividual.trim()} agregado a la lista! Ahora asígnale su pieza.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar el trabajador.");
    } finally {
      setGuardandoNombres(false);
    }
  }

  // Agregar varios trabajadores pegando lista de WhatsApp
  async function handleAgregarVarios() {
    const lineas = nombresMultiples
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (!lineas.length) return;
    setGuardandoNombres(true);
    setError(null);
    setMensajeExito(null);
    try {
      await crearTrabajadores(contratoEmpresaId, lineas);
      setNombresMultiples("");
      setMostrarPegarVarios(false);
      setMensajeExito(`¡${lineas.length} trabajadores agregados correctamente!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron agregar los trabajadores.");
    } finally {
      setGuardandoNombres(false);
    }
  }

  // Asignar cama a un trabajador
  async function handleElegirCama(camaId: string, habitacionNumero: number) {
    if (!trabajadorSeleccionado) return;
    setAsignandoCama(true);
    setError(null);
    try {
      await asignarTrabajador(usuarioId, {
        contratoEmpresaId,
        trabajadorId: trabajadorSeleccionado.id,
        camaId,
        nombre: trabajadorSeleccionado.nombre
      });
      setMensajeExito(`¡Listo! ${trabajadorSeleccionado.nombre} quedó en la Pieza #${habitacionNumero}.`);
      setTrabajadorSeleccionado(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo asignar la cama.");
    } finally {
      setAsignandoCama(false);
    }
  }

  // Liberar cama de un trabajador
  async function handleDesasignar(trabajador: TrabajadorRow) {
    setError(null);
    try {
      await desasignarTrabajador(contratoEmpresaId, trabajador.id);
      setMensajeExito(`Pieza liberada para ${trabajador.nombre}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo liberar la cama.");
    }
  }

  // Eliminar trabajador de la nómina
  async function handleEliminar(trabajador: TrabajadorRow) {
    if (!confirm(`¿Eliminar a ${trabajador.nombre} de la nómina?`)) return;
    setError(null);
    try {
      await eliminarTrabajador(contratoEmpresaId, trabajador.id);
      setMensajeExito(`${trabajador.nombre} eliminado.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
    }
  }

  return (
    <div className="ui-operativa mx-auto flex w-full max-w-5xl flex-col gap-4">
      {onVolver && (
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-white border border-brand-border px-3 py-1.5 text-xs font-bold text-brand-ink hover:bg-brand-sand transition shadow-2xs"
        >
          <IconChevronLeft className="h-4 w-4" />
          <span>Volver al menú de empresa</span>
        </button>
      )}

      {/* 1. Cabecera Clara */}
      <div className="rounded-3xl border border-brand-border/80 bg-brand-card p-5 sm:p-6 shadow-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-sand-deep text-brand-terracotta border border-brand-border/70">
              <IconUsers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-black text-brand-ink leading-tight">
                Lista de Trabajadores
              </h2>
              <p className="text-xs sm:text-sm text-brand-muted">
                {contrato ? `${empresaNombre ?? "Este contrato"} · ${contrato.headcount} personas contratadas` : "Cargando contrato…"}
              </p>
            </div>
          </div>

          <span className="self-start sm:self-auto rounded-full bg-brand-sand/70 px-3 py-1 text-xs font-bold text-brand-ink border border-brand-border/70">
            {nomina.length} {nomina.length === 1 ? "persona registrada" : "personas registradas"}
          </span>
        </div>
      </div>

      {/* Panel de Cupos de Empresa */}
      <CuposEmpresaPanel contrato={contrato} usuarioId={usuarioId} nomina={nomina} />

      {/* Mensajes de Éxito / Error */}
      {mensajeExito && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs sm:text-sm font-semibold text-emerald-900 shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2.5 min-w-0">
            <IconCheckCircle className="h-5 w-5 text-emerald-700 shrink-0" />
            <span className="truncate">{mensajeExito}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeExito(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 font-bold shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-3.5 text-xs sm:text-sm font-semibold text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* 2. Agregar Trabajadores */}
      <div className="rounded-3xl border border-brand-border/80 bg-brand-card p-4 sm:p-5 shadow-card space-y-3.5">
        <h3 className="font-display text-base sm:text-lg font-bold text-brand-ink">
          Agregar trabajadores identificados
        </h3>

        {/* Formulario 1 por 1 */}
        <form onSubmit={handleAgregarIndividual} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            aria-label="Nombre y apellido del trabajador"
            placeholder="Escribe el nombre y apellido (ej: Manuel Rojas)"
            value={nombreIndividual}
            onChange={(e) => setNombreIndividual(e.target.value)}
            className="flex-1 rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20 shadow-2xs"
          />

          <button
            type="submit"
            disabled={guardandoNombres || !nombreIndividual.trim()}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-brand-terracotta-deep px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-brand hover:brightness-110 transition active:scale-95 disabled:opacity-50 shrink-0"
          >
            <IconPlus className="h-4 w-4" />
            <span>{guardandoNombres ? "Guardando…" : "Agregar a la lista"}</span>
          </button>
        </form>

        {/* Opción para lista múltiple */}
        <div className="pt-2 border-t border-brand-border/40">
          <button
            type="button"
            onClick={() => setMostrarPegarVarios(!mostrarPegarVarios)}
            className="text-xs font-bold text-brand-terracotta hover:underline"
          >
            {mostrarPegarVarios
              ? "▲ Ocultar opción de pegar varios nombres"
              : "▼ ¿Tienes varios nombres? Toca aquí para pegarlos juntos"}
          </button>

          {mostrarPegarVarios && (
            <div className="mt-2.5 space-y-2.5 rounded-2xl border border-brand-border/70 bg-brand-sand/30 p-3.5 animate-fadeIn">
              <p className="text-xs text-brand-muted">
                Pega la lista de nombres uno debajo del otro:
              </p>
              <textarea
                aria-label="Nombres de trabajadores, uno por línea"
                rows={4}
                value={nombresMultiples}
                onChange={(e) => setNombresMultiples(e.target.value)}
                placeholder={"Carlos Silva\nPedro Gómez\nAndrés Castro"}
                className="w-full rounded-xl border border-brand-border bg-white p-3 text-xs sm:text-sm text-brand-ink focus:border-brand-terracotta focus:outline-none shadow-2xs"
              />
              <button
                type="button"
                onClick={handleAgregarVarios}
                disabled={guardandoNombres || !nombresMultiples.trim()}
                className="rounded-xl bg-brand-ink px-4 py-2 text-xs font-bold text-white hover:bg-brand-terracotta-deep disabled:opacity-50 transition"
              >
                {guardandoNombres ? "Agregando…" : "Cargar lista completa"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Lista de Trabajadores con Asignación de Piezas */}
      <div className="rounded-3xl border border-brand-border/80 bg-brand-card p-4 sm:p-5 shadow-card space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-brand-border/50">
          <h3 className="font-display text-base sm:text-lg font-bold text-brand-ink">
            Personas en esta Empresa
          </h3>

          {/* Filtros */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFiltro("todos")}
              className={`rounded-xl px-3 py-1.5 font-bold transition ${
                filtro === "todos"
                  ? "bg-brand-sand text-brand-terracotta-deep shadow-2xs border border-brand-border/80"
                  : "text-brand-muted hover:bg-brand-sand/40"
              }`}
            >
              Todos ({nomina.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltro("pendientes")}
              className={`rounded-xl px-3 py-1.5 font-bold transition ${
                filtro === "pendientes"
                  ? "bg-amber-100 text-amber-900 shadow-2xs border border-amber-300/80"
                  : "text-brand-muted hover:bg-brand-sand/40"
              }`}
            >
              Sin Pieza ({sinCama.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltro("asignados")}
              className={`rounded-xl px-3 py-1.5 font-bold transition ${
                filtro === "asignados"
                  ? "bg-emerald-100 text-emerald-800 shadow-2xs border border-emerald-300/80"
                  : "text-brand-muted hover:bg-brand-sand/40"
              }`}
            >
              Con Pieza ({conCama.length})
            </button>
          </div>
        </div>

        {/* Lista de Tarjetas */}
        <div className="flex flex-col gap-2.5">
          {nominaFiltrada.map((t) => {
            const tienePieza = !!t.cama_id;

            return (
              <div
                key={t.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all ${
                  tienePieza
                    ? "border-brand-border/75 bg-white shadow-2xs"
                    : "border-amber-300/80 bg-amber-50/40"
                }`}
              >
                {/* Nombre y Estado */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${
                      tienePieza
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    <IconUser className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="font-display text-sm sm:text-base font-bold text-brand-ink leading-tight truncate">
                      {t.nombre}
                    </p>

                    <div className="mt-1 flex items-center gap-2">
                      {tienePieza ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300/70">
                          <IconBed className="h-3 w-3 text-emerald-600" />
                          <span>
                            Pieza #{t.habitacion_numero ?? "?"}
                            {t.cama_numero ? ` (Cama ${t.cama_numero})` : ""}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 border border-amber-300/70">
                          <span>⚠️ Sin pieza asignada</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-1 sm:pt-0">
                  {!tienePieza ? (
                    <button
                      type="button"
                      onClick={() => setTrabajadorSeleccionado(t)}
                      className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-brand-terracotta-deep hover:brightness-110 px-3.5 py-2 text-xs font-bold text-white shadow-brand active:scale-95 transition"
                    >
                      <IconBed className="h-4 w-4" />
                      <span>Asignar Pieza</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTrabajadorSeleccionado(t)}
                        className="rounded-xl border border-brand-border bg-brand-sand/50 hover:bg-brand-sand px-3 py-1.5 text-xs font-bold text-brand-ink transition shadow-2xs"
                      >
                        Cambiar pieza
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDesasignar(t)}
                        title="Liberar la pieza de este trabajador"
                        className="rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
                      >
                        Liberar
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleEliminar(t)}
                    title="Eliminar de la nómina"
                    aria-label={`Eliminar a ${t.nombre} de la nómina`}
                    className="rounded-xl p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}

          {!nominaFiltrada.length && (
            <div className="rounded-2xl border border-dashed border-brand-border p-8 text-center text-xs sm:text-sm text-brand-muted">
              {nomina.length === 0
                ? "Todavía no has agregado ningún trabajador a esta empresa. Escribe el nombre arriba para empezar."
                : "No hay trabajadores con el filtro seleccionado."}
            </div>
          )}
        </div>
      </div>

      {/* 4. Modal para Asignar Pieza */}
      {trabajadorSeleccionado && (
        <Dialogo titulo="Asignar cama" onCerrar={() => setTrabajadorSeleccionado(null)} className="ui-operativa fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/50 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-brand-border bg-brand-card p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-brand-border/60">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-terracotta-deep">
                  Asignar Habitación
                </span>
                <h3 className="font-display text-base sm:text-lg font-black text-brand-ink">
                  {trabajadorSeleccionado.nombre}
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">
                  Elige una pieza disponible con un solo toque:
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTrabajadorSeleccionado(null)}
                aria-label="Cerrar asignación de cama"
                className="rounded-lg p-1.5 text-brand-muted hover:bg-brand-sand transition"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            {/* Cuadrícula de Piezas Disponibles */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {habitacionesDisponibles.map((h) => (
                <button
                  key={h.numero}
                  type="button"
                  disabled={asignandoCama}
                  onClick={() => handleElegirCama(h.primeraCamaId, h.numero)}
                  className="w-full flex items-center justify-between rounded-xl border border-brand-border bg-white hover:border-brand-terracotta hover:bg-orange-50/40 p-3.5 transition-all text-left shadow-2xs active:scale-[0.985] disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-sand-deep text-brand-terracotta">
                      <IconBed className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-display text-sm sm:text-base font-extrabold text-brand-ink">
                        Pieza #{h.numero}
                      </p>
                      <p className="text-xs text-emerald-800 font-semibold">
                        {h.camasLibresCount} {h.camasLibresCount === 1 ? "cama disponible" : "camas disponibles"}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-lg bg-brand-sand px-3 py-1.5 text-xs font-bold text-brand-ink">
                    Elegir →
                  </span>
                </button>
              ))}

              {habitacionesDisponibles.length === 0 && (
                <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-xs text-red-800 font-medium space-y-1">
                  <p className="font-bold text-sm">No hay piezas libres en este momento</p>
                  <p className="text-red-700">
                    Revisa si hay camas ocupadas que se puedan liberar o pasajeros que ya hayan hecho check-out.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-brand-border/60 flex justify-end">
              <button
                type="button"
                onClick={() => setTrabajadorSeleccionado(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-brand-muted hover:text-brand-ink transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Dialogo>
      )}
    </div>
  );
}
