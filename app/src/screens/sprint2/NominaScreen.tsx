import { useEffect, useState } from "react";
import { useNomina } from "../../features/nomina/useNomina";
import {
  crearTrabajadores,
  camasLibresParaContrato,
  asignarTrabajador,
  type CamaLibreRow
} from "../../features/nomina/asignarTrabajador";
import {
  IconBed,
  IconCheck,
  IconChevronLeft,
  IconPlus,
  IconUser
} from "../../components/Icons";

interface NominaScreenProps {
  usuarioId: string;
  contratoEmpresaId: string;
  onVolver?: () => void;
}

export function NominaScreen({
  usuarioId,
  contratoEmpresaId,
  onVolver
}: NominaScreenProps) {
  const nomina = useNomina(contratoEmpresaId);
  const [nombresTexto, setNombresTexto] = useState("");
  const [camasLibres, setCamasLibres] = useState<CamaLibreRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargandoNombres, setCargandoNombres] = useState(false);
  const [asignandoId, setAsignandoId] = useState<string | null>(null);
  const [camaSeleccionada, setCamaSeleccionada] = useState<Record<string, string>>({});

  const sinCama = nomina.filter((t) => !t.cama_id);
  const conCama = nomina.filter((t) => !!t.cama_id);

  // Recalcular camas disponibles cada vez que cambia la nómina
  useEffect(() => {
    camasLibresParaContrato(new Date().toISOString().slice(0, 10), null)
      .then(setCamasLibres)
      .catch(() => setCamasLibres([]));
  }, [nomina.length, conCama.length]);

  async function handleCargarNombres() {
    const lineas = nombresTexto.split("\n").map((n) => n.trim()).filter(Boolean);
    if (!lineas.length) return;
    setCargandoNombres(true);
    setError(null);
    try {
      await crearTrabajadores(contratoEmpresaId, lineas);
      setNombresTexto("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar trabajadores.");
    } finally {
      setCargandoNombres(false);
    }
  }

  async function handleAsignar(trabajadorId: string) {
    const camaId = camaSeleccionada[trabajadorId] || camasLibres[0]?.cama_id;
    if (!camaId) return;

    setAsignandoId(trabajadorId);
    setError(null);
    try {
      await asignarTrabajador(usuarioId, {
        trabajadorId,
        camaId,
        contratoEmpresaId,
        fechaInicio: new Date().toISOString().slice(0, 10)
      });
      // Limpiar selección temporal
      setCamaSeleccionada((prev) => {
        const copia = { ...prev };
        delete copia[trabajadorId];
        return copia;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo asignar la cama.");
    } finally {
      setAsignandoId(null);
    }
  }

  const faltan = sinCama.length - camasLibres.length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      {onVolver && (
        <button
          onClick={onVolver}
          className="inline-flex w-fit items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-muted hover:text-brand-ink"
        >
          <IconChevronLeft className="h-4 w-4" />
          <span>Volver a contratos</span>
        </button>
      )}

      {/* Cabecera y Resumen de Métricas */}
      <div className="rounded-3xl border border-brand-border/70 bg-brand-card p-5 md:p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-terracotta">
              Nómina del Contrato
            </p>
            <h2 className="font-display text-2xl font-bold text-brand-ink">
              Trabajadores y Asignación de Camas
            </h2>
          </div>
          <span className="w-fit rounded-full bg-brand-sand/60 px-3 py-1 text-xs font-extrabold text-brand-ink">
            {nomina.length} trabajadores registrados
          </span>
        </div>

        {/* Tiles de estado de asignación */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-brand-border/60 bg-brand-sand/20 p-3 text-center">
            <span className="text-[10px] font-extrabold uppercase text-brand-muted">Con Cama</span>
            <p className="font-display text-2xl font-bold text-emerald-700">{conCama.length}</p>
          </div>
          <div className="rounded-2xl border border-brand-border/60 bg-brand-sand/20 p-3 text-center">
            <span className="text-[10px] font-extrabold uppercase text-brand-muted">Sin Cama</span>
            <p className="font-display text-2xl font-bold text-amber-700">{sinCama.length}</p>
          </div>
          <div className="rounded-2xl border border-brand-border/60 bg-brand-sand/20 p-3 text-center">
            <span className="text-[10px] font-extrabold uppercase text-brand-muted">Camas Libres</span>
            <p className="font-display text-2xl font-bold text-brand-terracotta">{camasLibres.length}</p>
          </div>
        </div>

        {/* Alerta de camas faltantes según contrato */}
        {faltan > 0 && (
          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-50 p-3.5 text-xs font-semibold text-amber-900">
            ⚠️ Faltan {faltan} cama{faltan === 1 ? "" : "s"} disponible{faltan === 1 ? "" : "s"} para completar la asignación de toda la nómina.
          </div>
        )}

        {camasLibres.length === 0 && sinCama.length > 0 && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs font-semibold text-red-800">
            No hay piezas disponibles para asignar en este momento.
          </div>
        )}
      </div>

      {/* Carga Rápida de Nombres (Pegar o escribir lista) */}
      <div className="rounded-3xl border border-brand-border/70 bg-brand-card p-5 md:p-6 shadow-card">
        <h3 className="font-display text-lg font-bold text-brand-ink">
          Cargar Nombres a la Nómina
        </h3>
        <p className="mt-0.5 text-xs text-brand-muted">
          Pega o escribe los nombres de los trabajadores (uno por línea):
        </p>

        <textarea
          rows={3}
          value={nombresTexto}
          onChange={(e) => setNombresTexto(e.target.value)}
          placeholder={"Juan Pérez\nManuel Rojas\nPedro Castro"}
          className="mt-3 w-full rounded-xl border border-brand-border bg-white p-3 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
        />

        <div className="mt-3 flex justify-end">
          <button
            onClick={handleCargarNombres}
            disabled={cargandoNombres || !nombresTexto.trim()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand-terracotta px-5 py-2.5 text-sm font-bold text-white shadow-brand hover:bg-brand-terracotta-deep active:scale-95 disabled:opacity-50"
          >
            <IconPlus className="h-4 w-4" />
            <span>{cargandoNombres ? "Agregando…" : "Agregar a la nómina"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Lista de Trabajadores de la Nómina */}
      <div className="rounded-3xl border border-brand-border/70 bg-brand-card p-5 md:p-6 shadow-card space-y-4">
        <h3 className="font-display text-lg font-bold text-brand-ink">
          Asignación Individual de Habitaciones
        </h3>

        <div className="flex flex-col gap-2.5">
          {nomina.map((t) => {
            const tieneCama = !!t.cama_id;
            return (
              <div
                key={t.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-brand-border/80 bg-white p-3.5 shadow-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-sand/50 text-brand-ink font-bold text-xs">
                    <IconUser className="h-4 w-4 text-brand-muted" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-brand-ink truncate">{t.nombre}</p>
                    <p className="text-[11px] text-brand-muted">
                      {tieneCama ? "Cama reservada durante el contrato" : "Pendiente de habitación"}
                    </p>
                  </div>
                </div>

                {tieneCama ? (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-emerald-600/30 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                    <IconCheck className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Cama asignada</span>
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={camaSeleccionada[t.id] ?? camasLibres[0]?.cama_id ?? ""}
                      onChange={(e) =>
                        setCamaSeleccionada({ ...camaSeleccionada, [t.id]: e.target.value })
                      }
                      disabled={camasLibres.length === 0}
                      className="rounded-xl border border-brand-border bg-brand-card px-3 py-2 text-xs font-semibold text-brand-ink focus:border-brand-terracotta focus:outline-none"
                    >
                      {camasLibres.map((c) => (
                        <option key={c.cama_id} value={c.cama_id}>
                          Pieza #{c.numero} ({c.capacidad} pers.)
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleAsignar(t.id)}
                      disabled={camasLibres.length === 0 || asignandoId === t.id}
                      className="inline-flex min-h-[38px] shrink-0 items-center gap-1 rounded-xl bg-brand-terracotta px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-brand-terracotta-deep active:scale-95 disabled:opacity-40"
                    >
                      <IconBed className="h-3.5 w-3.5" />
                      <span>{asignandoId === t.id ? "Asignando…" : "Asignar"}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {!nomina.length && (
            <p className="py-6 text-center text-xs text-brand-muted">
              Aún no hay trabajadores en esta nómina. Agrega los nombres en el cuadro de arriba.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
