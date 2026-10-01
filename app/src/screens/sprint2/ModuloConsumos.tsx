import { useState, useMemo } from "react";
import { useQuery } from "@powersync/react";
import { ConsumoScreen } from "./ConsumoScreen";
import { IconBriefcase, IconSearch, IconUtensils } from "../../components/Icons";

type ContratoActivoRow = {
  id: string;
  empresa_id: string;
  razon_social: string;
  headcount: number;
  vigencia_desde: string;
};

export function ModuloConsumos({
  usuarioId,
  usuarioRol
}: {
  usuarioId: string;
  usuarioRol?: string;
}) {
  const [contratoIdSeleccionado, setContratoIdSeleccionado] = useState<string>("");
  const [busquedaEmpresa, setBusquedaEmpresa] = useState<string>("");
  const [mostrarSelector, setMostrarSelector] = useState<boolean>(false);

  const { data: contratos } = useQuery<ContratoActivoRow>(
    `select c.id, c.empresa_id, e.razon_social, c.headcount, c.vigencia_desde
     from contrato_empresa c
     join empresa e on e.id = c.empresa_id
     order by e.razon_social`
  );

  const contratosFiltrados = useMemo(() => {
    if (!contratos) return [];
    if (!busquedaEmpresa.trim()) return contratos;
    const q = busquedaEmpresa.toLowerCase().trim();
    return contratos.filter((c) => c.razon_social.toLowerCase().includes(q));
  }, [contratos, busquedaEmpresa]);

  const contratoActivo = useMemo(() => {
    if (!contratos?.length) return null;
    return contratos.find((c) => c.id === contratoIdSeleccionado) ?? contratos[0];
  }, [contratos, contratoIdSeleccionado]);

  if (!contratos?.length) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-brand-border/70 bg-brand-card p-10 text-center shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-sand/60 text-brand-muted">
          <IconUtensils className="h-7 w-7" />
        </div>
        <h3 className="mt-4 font-display text-xl font-bold text-brand-ink">
          Sin contratos de empresas activos
        </h3>
        <p className="mt-1 text-xs text-brand-muted">
          Para registrar consumos de raciones debe existir al menos un contrato de empresa vigente con su nómina.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      {/* Barra de Empresa Seleccionada y Buscador */}
      <div className="rounded-3xl border border-brand-border/80 bg-brand-card p-4 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-terracotta/15 text-brand-terracotta">
              <IconBriefcase className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                Empresa activa
              </span>
              <h2 className="font-display text-lg font-bold text-brand-ink leading-tight">
                {contratoActivo?.razon_social}
              </h2>
              <p className="text-[11px] text-brand-muted">
                Dotación contratada: <strong>{contratoActivo?.headcount} trabajadores</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => setMostrarSelector(!mostrarSelector)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-border bg-brand-sand/40 px-3.5 py-2 text-xs font-bold text-brand-ink hover:bg-brand-sand transition-colors"
          >
            <IconSearch className="h-3.5 w-3.5 text-brand-muted" />
            <span>{mostrarSelector ? "Ocultar lista" : "Cambiar / Buscar empresa"}</span>
          </button>
        </div>

        {/* Panel desplegable con buscador de empresas */}
        {mostrarSelector && (
          <div className="mt-4 border-t border-brand-border/60 pt-3 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3">
            <div className="relative">
              <IconSearch className="absolute left-3.5 top-3 h-4 w-4 text-brand-muted" />
              <input
                type="text"
                autoFocus
                placeholder="Buscar empresa por nombre..."
                value={busquedaEmpresa}
                onChange={(e) => setBusquedaEmpresa(e.target.value)}
                className="w-full rounded-xl border border-brand-border bg-white pl-10 pr-3.5 py-2.5 text-xs text-brand-ink placeholder:text-stone-400 focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
              />
              {busquedaEmpresa && (
                <button
                  onClick={() => setBusquedaEmpresa("")}
                  className="absolute right-3 top-2.5 text-xs font-bold text-brand-muted hover:text-brand-ink"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Lista de empresas encontradas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              {contratosFiltrados.map((c) => {
                const esActivo = c.id === contratoActivo?.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setContratoIdSeleccionado(c.id);
                      setMostrarSelector(false);
                      setBusquedaEmpresa("");
                    }}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                      esActivo
                        ? "border-brand-terracotta bg-brand-sand/50 ring-1 ring-brand-terracotta"
                        : "border-brand-border bg-white hover:bg-brand-sand/30"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate text-xs font-bold text-brand-ink">
                        {c.razon_social}
                      </p>
                      <p className="text-[10px] text-brand-muted">
                        {c.headcount} trabajadores · desde {c.vigencia_desde}
                      </p>
                    </div>
                    {esActivo && (
                      <span className="shrink-0 rounded-full bg-brand-terracotta px-2 py-0.5 text-[9px] font-black text-white">
                        Activa
                      </span>
                    )}
                  </button>
                );
              })}

              {!contratosFiltrados.length && (
                <p className="col-span-full py-4 text-center text-xs text-brand-muted">
                  No se encontraron empresas con "{busquedaEmpresa}".
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pantalla de Consumo para el contrato activo */}
      {contratoActivo && (
        <ConsumoScreen
          usuarioId={usuarioId}
          contratoEmpresaId={contratoActivo.id}
          usuarioRol={usuarioRol}
        />
      )}
    </div>
  );
}
