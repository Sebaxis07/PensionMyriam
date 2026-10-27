import { useState, type FormEvent } from "react";
import { useEmpresas } from "../../features/empresas/useEmpresas";
import { crearContratoEmpresa, ContratoSolapadoError } from "../../features/reservaEmpresa/crearContratoEmpresa";
import { IconCalendar, IconCheck, IconChevronLeft, IconUser, IconUsers } from "../../components/Icons";
import { fechaHoySantiago } from "../../lib/fechaNegocio";

interface ContratoScreenProps {
  usuarioId: string;
  empresaIdInicial?: string;
  onContratoCreado?: (contratoId: string, empresaId: string) => void;
  onVolver?: () => void;
}

export function ContratoScreen({
  usuarioId,
  empresaIdInicial = "",
  onContratoCreado,
  onVolver
}: ContratoScreenProps) {
  const empresas = useEmpresas();
  const [empresaId, setEmpresaId] = useState(empresaIdInicial);
  const [vigenciaDesde, setVigenciaDesde] = useState(fechaHoySantiago());
  const [vigenciaHasta, setVigenciaHasta] = useState("");
  const [headcount, setHeadcount] = useState(10);
  const [tarifaConvenida, setTarifaConvenida] = useState(25000);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [contratoIdCreado, setContratoIdCreado] = useState<string | null>(null);

  async function handleGuardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const id = await crearContratoEmpresa(usuarioId, {
        empresaId,
        vigenciaDesde,
        vigenciaHasta: vigenciaHasta || undefined,
        headcount: Number(headcount),
        tarifaConvenida: Number(tarifaConvenida)
      });
      setContratoIdCreado(id);
      if (onContratoCreado) {
        onContratoCreado(id, empresaId);
      }
    } catch (err) {
      if (err instanceof ContratoSolapadoError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "No se pudo registrar el contrato.");
      }
    } finally {
      setGuardando(false);
    }
  }

  const empresaSeleccionada = empresas.find((e) => e.id === empresaId);

  return (
    <div className="ui-operativa mx-auto flex w-full max-w-xl flex-col gap-4">
      {onVolver && (
        <button
          onClick={onVolver}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-brand-ink/80 hover:text-brand-ink"
        >
          <IconChevronLeft className="h-4 w-4" />
          <span>Volver a empresas</span>
        </button>
      )}

      <div className="rounded-3xl border border-brand-border/80 bg-brand-card p-6 md:p-8 shadow-card">
        <div className="border-b border-brand-border/60 pb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-terracotta-deep">
            Hospedaje para empresas
          </p>
          <h2 className="font-display text-2xl font-bold text-brand-ink">
            Nuevo Contrato de Hospedaje
          </h2>
          <p className="mt-1 text-sm text-brand-ink/80">
            Indica las fechas, la cantidad de personas contratadas y la tarifa acordada de cama y alimentación.
          </p>
        </div>

        {contratoIdCreado ? (
          <div className="my-6 rounded-2xl border border-emerald-500/30 bg-emerald-50/80 p-5 text-center">
            <div className="ui-operativa mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
              <IconCheck className="h-6 w-6" />
            </div>
            <h3 className="mt-3 font-display text-lg font-bold text-emerald-950">
              ¡Contrato confirmado exitosamente!
            </h3>
            <p className="mt-1 text-sm text-emerald-800">
              Se pactaron {headcount} trabajadores para {empresaSeleccionada?.razon_social}.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              {onContratoCreado && (
                <button
                  onClick={() => onContratoCreado(contratoIdCreado, empresaId)}
                  className="rounded-xl bg-brand-terracotta-deep px-5 py-2.5 text-sm font-bold text-white shadow-brand hover:bg-brand-terracotta-deep"
                >
                  Continuar a la Nómina →
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
          <ol aria-label="Pasos del registro de empresa" className="my-5 flex flex-wrap gap-2 text-sm">
            <li aria-current="step" className="rounded-full bg-brand-sand-deep px-3 py-2 font-bold text-brand-terracotta-deep">1. Contrato</li>
            <li className="rounded-full border border-brand-border px-3 py-2">2. Nómina</li>
            <li className="rounded-full border border-brand-border px-3 py-2">3. Asignar cama</li>
          </ol>
          <form onSubmit={handleGuardar} className="mt-5 flex flex-col gap-4">
            {/* Selector de Empresa */}
            <div>
              <label htmlFor="contrato-empresa" className="mb-1.5 block text-sm font-bold uppercase tracking-wider text-brand-ink/80">
                Empresa Contratista <span className="text-brand-terracotta-deep">*</span>
              </label>
              <select id="contrato-empresa"
                required
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-3 text-base font-semibold text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
              >
                <option value="">Selecciona una empresa…</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.razon_social} {e.rut ? `(${e.rut})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Fechas de vigencia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="contrato-desde" className="mb-1.5 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-brand-ink/80">
                  <IconCalendar className="h-3.5 w-3.5 text-brand-terracotta-deep" />
                  <span>Vigencia Desde</span>
                </label>
                <input id="contrato-desde"
                  type="date"
                  required
                  value={vigenciaDesde}
                  onChange={(e) => setVigenciaDesde(e.target.value)}
                  className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
                />
              </div>

              <div>
                <label htmlFor="contrato-hasta" className="mb-1.5 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-brand-ink/80">
                  <IconCalendar className="h-3.5 w-3.5 text-brand-ink/80" />
                  <span>Vigencia Hasta (opcional)</span>
                </label>
                <input id="contrato-hasta"
                  type="date"
                  value={vigenciaHasta}
                  onChange={(e) => setVigenciaHasta(e.target.value)}
                  className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
                />
                <span className="mt-1 block text-xs text-brand-ink/80">
                  Dejar vacío para contrato abierto
                </span>
              </div>
            </div>

            {/* Dotación y Tarifa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="contrato-personas" className="mb-1.5 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-brand-ink/80">
                  <IconUsers className="h-3.5 w-3.5 text-brand-terracotta-deep" />
                  <span>Trabajadores contratados</span>
                </label>
                <input id="contrato-personas"
                  type="number"
                  min="1"
                  required
                  value={headcount}
                  onChange={(e) => setHeadcount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-base font-bold text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
                />
                <span className="mt-1 block text-xs text-brand-ink/80">
                  Se factura por todas las personas contratadas, aunque asistan menos.
                </span>
              </div>

              <div>
                <label htmlFor="contrato-tarifa" className="mb-1.5 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-brand-ink/80">
                  <IconUser className="h-3.5 w-3.5 text-brand-terracotta-deep" />
                  <span>Tarifa convenida ($ / persona)</span>
                </label>
                <input id="contrato-tarifa"
                  type="number"
                  min="0"
                  step="500"
                  required
                  value={tarifaConvenida}
                  onChange={(e) => setTarifaConvenida(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-base font-bold text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
                />
                <span className="mt-1 block text-xs font-semibold text-brand-terracotta-deep">
                  Confidencial · Solo Administradora
                </span>
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={guardando || !empresaId}
              className="mt-2 flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-brand-terracotta-deep px-4 py-3.5 text-base font-bold text-white shadow-brand transition-all hover:bg-brand-terracotta-deep active:scale-95 disabled:opacity-50"
            >
              <IconCheck className="h-5 w-5" />
              <span>{guardando ? "Registrando contrato…" : "Confirmar contrato de empresa"}</span>
            </button>
          </form>
          </>
        )}
      </div>
    </div>
  );
}
