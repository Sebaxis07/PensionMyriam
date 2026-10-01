import { useState, type FormEvent } from "react";
import { useEmpresas, type EmpresaRow } from "../../features/empresas/useEmpresas";
import { crearEmpresa } from "../../features/empresas/crearEmpresa";
import { IconBriefcase, IconCheck, IconPlus, IconUser } from "../../components/Icons";

interface EmpresasScreenProps {
  onSeleccionarEmpresa?: (empresaId: string) => void;
  onNuevoContrato?: (empresaId: string) => void;
}

export function EmpresasScreen({ onSeleccionarEmpresa, onNuevoContrato }: EmpresasScreenProps) {
  const empresas = useEmpresas();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [razonSocial, setRazonSocial] = useState("");
  const [rut, setRut] = useState("");
  const [contacto, setContacto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function handleGuardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await crearEmpresa({
        razonSocial,
        rut: rut.trim() || undefined,
        contacto: contacto.trim() || undefined
      });
      setRazonSocial("");
      setRut("");
      setContacto("");
      setMostrarForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la empresa.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      {/* Barra de título y acción de alta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border-brand-border/70 bg-brand-card p-5 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <IconBriefcase className="h-6 w-6 text-brand-terracotta" />
            <h2 className="font-display text-2xl font-bold text-brand-ink">
              Empresas Contratistas
            </h2>
          </div>
          <p className="mt-1 text-xs text-brand-muted">
            Gestión de clientes corporativos y contratos de hospedaje B2B
          </p>
        </div>

        <button
          onClick={() => {
            setMostrarForm(!mostrarForm);
            setError(null);
          }}
          className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-brand-terracotta px-4 py-2.5 text-sm font-bold text-white shadow-brand transition-all hover:bg-brand-terracotta-deep active:scale-95"
        >
          <IconPlus className="h-4 w-4" />
          <span>{mostrarForm ? "Cerrar formulario" : "Nueva empresa"}</span>
        </button>
      </div>

      {/* Formulario de Alta de Empresa (HU-11) */}
      {mostrarForm && (
        <form
          onSubmit={handleGuardar}
          className="animate-in fade-in slide-in-from-top-3 duration-200 rounded-3xl border border-brand-border/80 bg-brand-card p-5 md:p-6 shadow-card space-y-4"
        >
          <div className="border-b border-brand-border/60 pb-3">
            <h3 className="font-display text-lg font-bold text-brand-ink">
              Registrar Nueva Empresa Contratista
            </h3>
            <p className="text-xs text-brand-muted">
              La tarifa convenida se definirá en el contrato correspondiente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-brand-muted">
                Razón Social <span className="text-brand-terracotta">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej: Minera Escondida S.A."
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-brand-muted">
                RUT (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: 76.123.456-7"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-brand-muted">
                Contacto / Teléfono (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Carlos Silva (+569...)"
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-brand-muted hover:text-brand-ink"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand-terracotta px-5 py-2.5 text-sm font-bold text-white shadow-brand hover:bg-brand-terracotta-deep active:scale-95 disabled:opacity-50"
            >
              <IconCheck className="h-4 w-4" />
              <span>{guardando ? "Guardando…" : "Guardar empresa"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Lista de Empresas Registradas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {empresas.map((emp) => (
          <EmpresaCard
            key={emp.id}
            empresa={emp}
            onSeleccionar={() => onSeleccionarEmpresa?.(emp.id)}
            onNuevoContrato={() => onNuevoContrato?.(emp.id)}
          />
        ))}

        {!empresas.length && (
          <div className="col-span-full rounded-3xl border border-brand-border/70 bg-brand-card p-10 text-center shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-sand/60 text-brand-muted">
              <IconBriefcase className="h-7 w-7" />
            </div>
            <h3 className="mt-3 font-display text-lg font-bold text-brand-ink">
              Todavía no hay empresas registradas
            </h3>
            <p className="mt-1 text-xs text-brand-muted">
              Presiona "Nueva empresa" para dar de alta la primera empresa contratista.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function EmpresaCard({
  empresa,
  onSeleccionar,
  onNuevoContrato
}: {
  empresa: EmpresaRow;
  onSeleccionar: () => void;
  onNuevoContrato: () => void;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-brand-border/80 bg-brand-card p-4 shadow-card hover:shadow-card-hover transition-all">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-display text-lg font-bold text-brand-ink leading-tight">
            {empresa.razon_social}
          </h4>
          {empresa.rut && (
            <span className="shrink-0 rounded-md border border-brand-border bg-brand-sand/40 px-2 py-0.5 text-[11px] font-semibold text-brand-ink">
              {empresa.rut}
            </span>
          )}
        </div>

        {empresa.contacto && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-brand-muted">
            <IconUser className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{empresa.contacto}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-brand-border/50 pt-3">
        <button
          onClick={onNuevoContrato}
          className="flex-1 rounded-xl bg-brand-sand/60 hover:bg-brand-sand px-3 py-2 text-xs font-bold text-brand-ink transition-colors text-center"
        >
          + Nuevo Contrato
        </button>
        <button
          onClick={onSeleccionar}
          className="flex-1 rounded-xl bg-brand-terracotta hover:bg-brand-terracotta-deep px-3 py-2 text-xs font-bold text-white transition-colors text-center shadow-sm"
        >
          Ver Nómina / Consumos
        </button>
      </div>
    </div>
  );
}
