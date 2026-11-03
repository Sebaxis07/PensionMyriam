import { useEffect, useRef, useState } from "react";
import { Dialogo } from "../../components/Dialogo";
import { describirErrorUi } from "../../components/MensajeInterfaz";
import { useConexionInterfaz } from "../../components/useConexionInterfaz";
import { IconAlertTriangle, IconCheckCircle, IconPlus } from "../../components/Icons";
import {
  useGestionHabitaciones,
  tipoDeCapacidad,
  capacidadDeTipo,
  type HabitacionAdminRow,
  type TipoHabitacion
} from "./useGestionHabitaciones";

const PALABRA_CONFIRMACION = "ELIMINAR";

interface FormularioHabitacion {
  numero: string;
  tipo: TipoHabitacion;
}

const FORMULARIO_VACIO: FormularioHabitacion = { numero: "", tipo: "doble" };

export function HabitacionesTab() {
  const online = useConexionInterfaz();
  const { habitaciones, isLoading, crearHabitacion, editarHabitacion, cambiarActiva, eliminarHabitacion } =
    useGestionHabitaciones();

  const aviso = useRef<HTMLDivElement>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormularioHabitacion>(FORMULARIO_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  const [habitacionAEliminar, setHabitacionAEliminar] = useState<HabitacionAdminRow | null>(null);
  const [palabraEscrita, setPalabraEscrita] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  useEffect(() => {
    if (mensaje) aviso.current?.scrollIntoView({ block: "nearest" });
  }, [mensaje]);

  function abrirCrear() {
    setEditandoId(null);
    setForm(FORMULARIO_VACIO);
    setMensaje(null);
    setMostrarFormulario(true);
  }

  function abrirEditar(h: HabitacionAdminRow) {
    setEditandoId(h.id);
    setForm({ numero: String(h.numero), tipo: tipoDeCapacidad(h.capacidad) });
    setMensaje(null);
    setMostrarFormulario(true);
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    setGuardando(true);
    try {
      const input = {
        numero: Number(form.numero),
        capacidad: capacidadDeTipo(form.tipo)
      };
      if (editandoId) {
        await editarHabitacion(editandoId, input);
        setMensaje({ tipo: "exito", texto: `Pieza ${input.numero} actualizada.` });
      } else {
        await crearHabitacion(input);
        setMensaje({ tipo: "exito", texto: `Pieza ${input.numero} creada.` });
      }
      setMostrarFormulario(false);
      setForm(FORMULARIO_VACIO);
      setEditandoId(null);
    } catch (err) {
      setMensaje({
        tipo: "error",
        texto: describirErrorUi(err instanceof Error ? err.message : "No se pudo guardar la pieza.")
      });
    } finally {
      setGuardando(false);
    }
  }

  async function handleCambiarActiva(h: HabitacionAdminRow) {
    setMensaje(null);
    try {
      await cambiarActiva(h.id, !h.activa);
      setMensaje({
        tipo: "exito",
        texto: h.activa
          ? `Pieza ${h.numero} desactivada. Dejó de aparecer en el mapa y en las reservas nuevas.`
          : `Pieza ${h.numero} reactivada.`
      });
    } catch (err) {
      setMensaje({
        tipo: "error",
        texto: describirErrorUi(err instanceof Error ? err.message : "No se pudo cambiar el estado de la pieza.")
      });
    }
  }

  function abrirEliminar(h: HabitacionAdminRow) {
    setHabitacionAEliminar(h);
    setPalabraEscrita("");
    setErrorEliminar(null);
  }

  async function handleConfirmarEliminar() {
    if (!habitacionAEliminar) return;
    setEliminando(true);
    setErrorEliminar(null);
    try {
      await eliminarHabitacion(habitacionAEliminar.id);
      setMensaje({ tipo: "exito", texto: `Pieza ${habitacionAEliminar.numero} eliminada definitivamente.` });
      setHabitacionAEliminar(null);
    } catch (err) {
      setErrorEliminar(describirErrorUi(err instanceof Error ? err.message : "No se pudo eliminar la pieza."));
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="ui-operativa space-y-5">
      {!online && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Sin conexión: puedes crear, editar, desactivar y reactivar piezas — los cambios se guardan en este
          teléfono y se envían solos cuando vuelva la señal. <strong>Eliminar de verdad requiere conexión.</strong>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-brand-ink">Habitaciones</h3>
          <p className="text-sm text-brand-ink/80 mt-0.5">
            Administra las piezas de la pensión: crear, editar, desactivar o eliminar.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirCrear}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-terracotta-deep text-white px-3.5 py-2 text-sm font-bold shadow-brand transition active:scale-95 self-start sm:self-center"
        >
          <IconPlus className="h-4 w-4" />
          <span>Nueva habitación</span>
        </button>
      </div>

      {mensaje && (
        <div
          ref={aviso}
          role={mensaje.tipo === "error" ? "alert" : "status"}
          className={`flex items-start gap-2 rounded-2xl border p-3.5 text-sm font-bold animate-in fade-in ${
            mensaje.tipo === "exito"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-red-300 bg-red-50 text-red-900"
          }`}
        >
          {mensaje.tipo === "exito" ? (
            <IconCheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <IconAlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          )}
          <span className="leading-relaxed">{mensaje.texto}</span>
        </div>
      )}

      {mostrarFormulario && (
        <form
          onSubmit={handleGuardar}
          className="rounded-3xl border border-brand-border/80 bg-brand-sand/30 p-5 space-y-4 shadow-sm animate-in fade-in duration-150"
        >
          <h4 className="font-display text-base font-bold text-brand-ink">
            {editandoId ? "Editar pieza" : "Nueva pieza"}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="pieza-numero" className="block text-sm font-bold text-brand-ink mb-1">
                Número de pieza <span className="text-brand-terracotta">*</span>
              </label>
              <input
                id="pieza-numero"
                type="number"
                min={1}
                step={1}
                required
                disabled={guardando}
                value={form.numero}
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
                className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink focus:border-brand-terracotta focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-bold text-brand-ink">Tipo de pieza</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={guardando}
                aria-pressed={form.tipo === "individual"}
                onClick={() => setForm({ ...form, tipo: "individual" })}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  form.tipo === "individual"
                    ? "border-brand-terracotta bg-white ring-2 ring-brand-terracotta/30 shadow-xs"
                    : "border-brand-border bg-white/70 hover:bg-white"
                }`}
              >
                <strong className="text-sm font-bold text-brand-ink">Individual</strong>
                <p className="text-sm text-brand-ink/80 mt-1">Capacidad: 1 persona</p>
              </button>
              <button
                type="button"
                disabled={guardando}
                aria-pressed={form.tipo === "doble"}
                onClick={() => setForm({ ...form, tipo: "doble" })}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  form.tipo === "doble"
                    ? "border-brand-terracotta bg-white ring-2 ring-brand-terracotta/30 shadow-xs"
                    : "border-brand-border bg-white/70 hover:bg-white"
                }`}
              >
                <strong className="text-sm font-bold text-brand-ink">Doble</strong>
                <p className="text-sm text-brand-ink/80 mt-1">Capacidad: 2 personas</p>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-brand-border/60">
            <button
              type="button"
              disabled={guardando}
              onClick={() => {
                setMostrarFormulario(false);
                setEditandoId(null);
              }}
              className="rounded-xl border border-brand-border bg-white px-4 py-2.5 text-sm font-bold text-brand-ink/80"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !form.numero}
              className="rounded-xl bg-brand-terracotta-deep px-5 py-2.5 text-sm font-bold text-white shadow-brand transition active:scale-95 disabled:opacity-50"
            >
              {guardando ? "Guardando…" : editandoId ? "Guardar cambios" : "Crear pieza"}
            </button>
          </div>
        </form>
      )}

      {isLoading && <p role="status">Cargando habitaciones…</p>}

      <div className="space-y-2.5">
        {habitaciones.map((h) => (
          <div
            key={h.id}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border bg-white shadow-xs ${
              h.activa ? "border-brand-border/80" : "border-stone-300 bg-stone-50/60 opacity-75"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-sand/60 border border-brand-border/60 font-display font-black text-sm text-brand-ink">
                P{h.numero}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-bold text-brand-ink">
                    {tipoDeCapacidad(h.capacidad) === "individual" ? "Individual" : "Doble"} · {h.capacidad}{" "}
                    {h.capacidad === 1 ? "persona" : "personas"}
                  </p>
                  {!h.activa && (
                    <span className="rounded-full bg-stone-200 text-stone-700 px-2 py-0.2 text-[10px] font-bold uppercase">
                      Inactiva
                    </span>
                  )}
                </div>
                <p className="text-sm text-brand-ink/80 mt-0.5">
                  Estado: <span className="font-semibold">{h.estado}</span> · {h.reservas_futuras}{" "}
                  {h.reservas_futuras === 1 ? "reserva futura/en curso" : "reservas futuras/en curso"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => abrirEditar(h)}
                className="rounded-lg border border-brand-border/80 bg-white px-2.5 py-1.5 text-sm font-bold text-brand-ink hover:bg-brand-sand transition"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => handleCambiarActiva(h)}
                className={`rounded-lg border px-2.5 py-1.5 text-sm font-bold transition ${
                  h.activa
                    ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                {h.activa ? "Desactivar" : "Reactivar"}
              </button>
              <button
                type="button"
                onClick={() => abrirEliminar(h)}
                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-sm font-bold text-rose-700 hover:bg-rose-100 transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}

        {!isLoading && !habitaciones.length && (
          <p className="py-6 text-center text-sm text-brand-ink/80">No hay habitaciones registradas.</p>
        )}
      </div>

      {habitacionAEliminar && (
        <Dialogo
          titulo="Eliminar habitación"
          onCerrar={() => {
            if (!eliminando) setHabitacionAEliminar(null);
          }}
          className="ui-operativa fixed inset-0 z-[70] flex items-center justify-center bg-brand-ink/70 p-3"
        >
          <div className="w-full max-w-lg space-y-4 rounded-3xl border border-rose-300 bg-brand-card p-5 shadow-2xl" aria-busy={eliminando}>
            <h3 className="font-display text-xl font-bold text-rose-900">Eliminar habitación</h3>
            <p className="text-base">
              Pieza seleccionada: <strong>P{habitacionAEliminar.numero}</strong> (
              {tipoDeCapacidad(habitacionAEliminar.capacidad) === "individual" ? "Individual" : "Doble"})
            </p>
            <p className="text-sm">
              Esta acción es <strong>irreversible</strong> y borra la fila de la base de datos. Solo es posible si la
              pieza nunca tuvo reservas ni registros de aseo; si los tiene, el servidor rechazará la operación y
              deberás desactivarla en su lugar.
            </p>
            <div>
              <label htmlFor="confirmar-eliminar" className="mb-2 block text-sm font-bold">
                Escribe <strong>{PALABRA_CONFIRMACION}</strong> para confirmar
              </label>
              <input
                id="confirmar-eliminar"
                autoFocus
                disabled={eliminando}
                value={palabraEscrita}
                onChange={(e) => setPalabraEscrita(e.target.value)}
                className="w-full rounded-xl border border-brand-border bg-white p-3 font-mono"
              />
            </div>
            {!online && (
              <p className="text-sm font-bold text-amber-800">Necesitas conexión a Internet para eliminar.</p>
            )}
            {errorEliminar && (
              <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">
                {errorEliminar}
              </div>
            )}
            {eliminando && <p role="status">Esperando confirmación del servidor…</p>}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={eliminando}
                onClick={() => setHabitacionAEliminar(null)}
                className="rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEliminar}
                disabled={eliminando || !online || palabraEscrita !== PALABRA_CONFIRMACION}
                className="rounded-xl bg-rose-800 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {eliminando ? "Eliminando…" : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        </Dialogo>
      )}
    </div>
  );
}
