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

interface NominaScreenProps {
  usuarioId: string;
  contratoEmpresaId: string;
  onVolver?: () => void;
}

type FiltroNomina = "todos" | "pendientes" | "asignados";

export function NominaScreen({
  usuarioId,
  contratoEmpresaId,
  onVolver
}: NominaScreenProps) {
  const nomina = useNomina(contratoEmpresaId);

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
    camasLibresParaContrato(new Date().toISOString().slice(0, 10), null)
      .then(setCamasLibres)
      .catch(() => setCamasLibres([]));
  }, [nomina.length, conCama.length]);

  // Agrupar camas libres por habitación para que sea muy fácil de entender
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

  // Agregar 1 solo trabajador (el modo más fácil y común)
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
      setMensajeExito(`Se agregaron ${lineas.length} trabajadores a la lista con éxito.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al agregar los trabajadores.");
    } finally {
      setGuardandoNombres(false);
    }
  }

  // Asignar una pieza con un solo toque
  async function handleElegirCama(camaId: string, habitacionNumero: number) {
    if (!trabajadorSeleccionado) return;
    setAsignandoCama(true);
    setError(null);
    try {
      await asignarTrabajador(usuarioId, {
        trabajadorId: trabajadorSeleccionado.id,
        camaId,
        contratoEmpresaId,
        fechaInicio: new Date().toISOString().slice(0, 10)
      });
      setMensajeExito(`¡Listo! ${trabajadorSeleccionado.nombre} quedó en la Pieza #${habitacionNumero}.`);
      setTrabajadorSeleccionado(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo asignar la pieza.");
    } finally {
      setAsignandoCama(false);
    }
  }

  // Quitar la pieza asignada
  async function handleDesasignar(trabajador: TrabajadorRow) {
    if (!confirm(`¿Quieres liberar la cama de ${trabajador.nombre}? Quedará pendiente de pieza.`)) {
      return;
    }
    setError(null);
    try {
      await desasignarTrabajador(trabajador.id);
      setMensajeExito(`Se liberó la cama de ${trabajador.nombre}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo liberar la cama.");
    }
  }

  // Eliminar a la persona de la nómina
  async function handleEliminar(trabajador: TrabajadorRow) {
    if (!confirm(`¿Estás segura de eliminar a ${trabajador.nombre} de la nómina?`)) {
      return;
    }
    setError(null);
    try {
      await eliminarTrabajador(trabajador.id);
      setMensajeExito(`Se eliminó a ${trabajador.nombre} de la lista.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el trabajador.");
    }
  }

  const porcentajeListos = nomina.length > 0 ? Math.round((conCama.length / nomina.length) * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      {onVolver && (
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-brand-sand px-3 py-2 text-xs font-bold text-brand-ink hover:bg-brand-sand-dark transition"
        >
          <IconChevronLeft className="h-4 w-4" />
          <span>Volver al menú de empresa</span>
        </button>
      )}

      {/* 1. Cabecera Clara y Amigable */}
      <div className="rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-sand-light text-brand-terracotta border border-brand-border">
              <IconUsers className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-black text-brand-ink leading-tight">
                Lista de Trabajadores
              </h2>
              <p className="text-xs text-brand-muted">
                Personas que se quedan en la pensión por este contrato.
              </p>
            </div>
          </div>

          <span className="self-start sm:self-auto rounded-full bg-brand-sand/80 px-3.5 py-1 text-xs font-bold text-brand-ink border border-brand-border/70">
            {nomina.length} {nomina.length === 1 ? "persona registrada" : "personas registradas"}
          </span>
        </div>

        {/* Barra de Progreso Visual de Piezas Asignadas */}
        <div className="rounded-2xl border border-brand-border/60 bg-white p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-brand-ink">
              {conCama.length} de {nomina.length} trabajadores tienen su pieza lista
            </span>
            <span className="text-brand-terracotta font-black text-sm">
              {porcentajeListos}%
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-brand-sand-light border border-brand-border/60 overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
              style={{ width: `${porcentajeListos}%` }}
            />
          </div>

          {/* 3 Tarjetas de Resumen */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="font-display text-xl font-black text-emerald-800">{conCama.length}</p>
              <p className="text-[10px] font-bold text-emerald-900 uppercase">Con Pieza Asignada</p>
            </div>

            <div className={`p-2 rounded-xl border ${sinCama.length > 0 ? "bg-amber-50 border-amber-300" : "bg-brand-sand-light/50 border-brand-border/40"}`}>
              <p className={`font-display text-xl font-black ${sinCama.length > 0 ? "text-amber-800" : "text-brand-muted"}`}>
                {sinCama.length}
              </p>
              <p className="text-[10px] font-bold text-amber-950 uppercase">Faltan por Pieza</p>
            </div>

            <div className="p-2 rounded-xl bg-brand-sand-light border border-brand-border/60">
              <p className="font-display text-xl font-black text-brand-terracotta">{camasLibres.length}</p>
              <p className="text-[10px] font-bold text-brand-muted uppercase">Camas Libres Hoy</p>
            </div>
          </div>
        </div>

        {sinCama.length > 0 && camasLibres.length === 0 && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-3.5 text-xs font-semibold text-red-800">
            ⚠️ No quedan camas libres en la pensión en este momento para los {sinCama.length} trabajadores que faltan por pieza.
          </div>
        )}
      </div>

      {/* Mensajes de Éxito / Error */}
      {mensajeExito && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-900 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <IconCheckCircle className="h-5 w-5 text-emerald-700 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeExito(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* 2. Agregar Trabajadores: Método Fácil Paso a Paso */}
      <div className="rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card space-y-4">
        <h3 className="font-display text-lg font-bold text-brand-ink">
          Agregar una Persona a la Nómina
        </h3>

        {/* Formulario 1 por 1 (fácil y directo) */}
        <form onSubmit={handleAgregarIndividual} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Escribe el nombre y apellido (ej: Manuel Rojas)"
            value={nombreIndividual}
            onChange={(e) => setNombreIndividual(e.target.value)}
            className="flex-1 rounded-2xl border border-brand-border bg-white px-4 py-3 text-base text-brand-ink placeholder:text-stone-400 focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
          />

          <button
            type="submit"
            disabled={guardandoNombres || !nombreIndividual.trim()}
            className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-terracotta px-6 py-3 text-sm font-bold text-white shadow-brand hover:bg-brand-terracotta-deep transition active:scale-95 disabled:opacity-50 shrink-0"
          >
            <IconPlus className="h-5 w-5" />
            <span>{guardandoNombres ? "Guardando…" : "Agregar a la lista"}</span>
          </button>
        </form>

        {/* Opción secundaria: Pegar lista de WhatsApp */}
        <div className="pt-2 border-t border-brand-border/40">
          <button
            type="button"
            onClick={() => setMostrarPegarVarios(!mostrarPegarVarios)}
            className="text-xs font-bold text-brand-terracotta hover:underline"
          >
            {mostrarPegarVarios
              ? "▲ Ocultar opción de pegar varios nombres"
              : "▼ ¿Te enviaron una lista por WhatsApp? Toca acá para pegar varios nombres juntos"}
          </button>

          {mostrarPegarVarios && (
            <div className="mt-3 space-y-3 rounded-2xl border border-brand-border/70 bg-brand-sand-light/50 p-4 animate-fadeIn">
              <p className="text-xs text-brand-muted">
                Pega la lista de nombres uno debajo del otro:
              </p>
              <textarea
                rows={4}
                value={nombresMultiples}
                onChange={(e) => setNombresMultiples(e.target.value)}
                placeholder={"Carlos Silva\nPedro Gómez\nAndrés Castro"}
                className="w-full rounded-xl border border-brand-border bg-white p-3 text-sm text-brand-ink focus:border-brand-terracotta focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAgregarVarios}
                disabled={guardandoNombres || !nombresMultiples.trim()}
                className="rounded-xl bg-brand-ink px-4 py-2.5 text-xs font-bold text-white hover:bg-black disabled:opacity-50"
              >
                {guardandoNombres ? "Agregando…" : "Cargar lista completa"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Lista de Trabajadores con Asignación de Piezas */}
      <div className="rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand-border/60">
          <h3 className="font-display text-lg font-bold text-brand-ink">
            Personas en esta Empresa
          </h3>

          {/* Filtros visuales grandes */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFiltro("todos")}
              className={`rounded-xl px-3 py-2 font-bold transition ${
                filtro === "todos"
                  ? "bg-brand-sand/80 text-brand-terracotta shadow-xs"
                  : "text-brand-muted hover:bg-brand-sand/30"
              }`}
            >
              Todos ({nomina.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltro("pendientes")}
              className={`rounded-xl px-3 py-2 font-bold transition ${
                filtro === "pendientes"
                  ? "bg-amber-100 text-amber-900 shadow-xs"
                  : "text-brand-muted hover:bg-brand-sand/30"
              }`}
            >
              Faltan por Pieza ({sinCama.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltro("asignados")}
              className={`rounded-xl px-3 py-2 font-bold transition ${
                filtro === "asignados"
                  ? "bg-emerald-100 text-emerald-800 shadow-xs"
                  : "text-brand-muted hover:bg-brand-sand/30"
              }`}
            >
              Con Pieza Lista ({conCama.length})
            </button>
          </div>
        </div>

        {/* Lista de Tarjetas de Huéspedes */}
        <div className="flex flex-col gap-3">
          {nominaFiltrada.map((t) => {
            const tienePieza = !!t.cama_id;

            return (
              <div
                key={t.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 transition-all ${
                  tienePieza
                    ? "border-brand-border/80 bg-white"
                    : "border-amber-300 bg-amber-50/50"
                }`}
              >
                {/* Nombre y Estado */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold ${
                      tienePieza
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    <IconUser className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="font-display text-base font-bold text-brand-ink leading-tight truncate">
                      {t.nombre}
                    </p>

                    <div className="mt-1 flex items-center gap-2">
                      {tienePieza ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-black text-emerald-800 border border-emerald-300">
                          <IconBed className="h-3.5 w-3.5 text-emerald-700" />
                          <span>
                            Pieza #{t.habitacion_numero ?? "?"}
                            {t.cama_numero ? ` (Cama ${t.cama_numero})` : ""}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-900 border border-amber-300">
                          <span>⚠️ Sin pieza asignada</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botones de Acción (Grandes y claros) */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0">
                  {!tienePieza ? (
                    <button
                      type="button"
                      onClick={() => setTrabajadorSeleccionado(t)}
                      className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-brand-terracotta hover:bg-brand-terracotta-deep px-4 py-2.5 text-xs font-bold text-white shadow-sm active:scale-95 transition"
                    >
                      <IconBed className="h-4 w-4" />
                      <span>Asignar Pieza</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTrabajadorSeleccionado(t)}
                        className="rounded-xl border border-brand-border bg-brand-sand-light hover:bg-brand-sand px-3 py-2 text-xs font-bold text-brand-ink transition"
                      >
                        Cambiar pieza
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDesasignar(t)}
                        title="Liberar la pieza de este trabajador"
                        className="rounded-xl border border-stone-300 px-2.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
                      >
                        Liberar
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleEliminar(t)}
                    title="Eliminar de la nómina"
                    className="rounded-xl p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}

          {!nominaFiltrada.length && (
            <div className="rounded-2xl border border-dashed border-brand-border p-8 text-center text-xs text-brand-muted">
              {nomina.length === 0
                ? "Todavía no has agregado ningún trabajador a esta empresa. Escribe el nombre arriba para empezar."
                : "No hay trabajadores con el filtro seleccionado."}
            </div>
          )}
        </div>
      </div>

      {/* 4. Modal para Asignar Pieza (Fácil y Visual: Solo toca la pieza deseada) */}
      {trabajadorSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-brand-border bg-brand-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-brand-border/60">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-terracotta">
                  Asignar Habitación
                </span>
                <h3 className="font-display text-lg font-black text-brand-ink">
                  {trabajadorSeleccionado.nombre}
                </h3>
                <p className="text-xs text-brand-muted">
                  Elige una de las piezas disponibles con un solo toque:
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTrabajadorSeleccionado(null)}
                className="rounded-full p-1.5 text-brand-muted hover:bg-brand-sand"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            {/* Cuadrícula de Piezas Disponibles */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {habitacionesDisponibles.map((h) => (
                <button
                  key={h.numero}
                  type="button"
                  disabled={asignandoCama}
                  onClick={() => handleElegirCama(h.primeraCamaId, h.numero)}
                  className="w-full flex items-center justify-between rounded-2xl border border-brand-border bg-white hover:border-brand-terracotta hover:bg-orange-50/50 p-4 transition-all text-left shadow-xs active:scale-[0.98] disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-sand-light text-brand-terracotta">
                      <IconBed className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-display text-base font-extrabold text-brand-ink">
                        Pieza #{h.numero}
                      </p>
                      <p className="text-xs text-emerald-800 font-semibold">
                        {h.camasLibresCount} {h.camasLibresCount === 1 ? "cama disponible" : "camas disponibles"}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-xl bg-brand-sand px-3 py-1.5 text-xs font-bold text-brand-ink">
                    Elegir →
                  </span>
                </button>
              ))}

              {habitacionesDisponibles.length === 0 && (
                <div className="rounded-2xl border border-red-300 bg-red-50 p-5 text-center text-xs text-red-800 font-medium space-y-1">
                  <p className="font-bold text-sm">No hay piezas libres en este momento</p>
                  <p className="text-[11px] text-red-700">
                    Revisa si hay camas ocupadas que se puedan liberar o pasajeros que ya hayan hecho check-out.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-brand-border/60 flex justify-end">
              <button
                type="button"
                onClick={() => setTrabajadorSeleccionado(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-brand-muted hover:text-brand-ink"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
