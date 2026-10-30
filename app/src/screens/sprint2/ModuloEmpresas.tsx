import { useState } from "react";
import { EmpresasScreen } from "./EmpresasScreen";
import { ContratoScreen } from "./ContratoScreen";
import { NominaScreen } from "./NominaScreen";
import { ConciliacionScreen } from "./ConciliacionScreen";
import { useQuery } from "@powersync/react";
import { IconChevronLeft, IconClipboardCheck, IconEdit, IconFileText, IconUsers } from "../../components/Icons";
import { CierreMensualModal } from "./CierreMensualModal";
import { fechaHoySantiago } from "../../lib/fechaNegocio";
import { calcularEstimacionContrato } from "../../features/reservaEmpresa/estimacionContrato";
import { EstimacionContratoCard } from "../../features/reservaEmpresa/EstimacionContratoCard";
import { AjustarCantidadContratoDialogo } from "../../features/reservaEmpresa/AjustarCantidadContratoDialogo";

type VistaEmpresa = "lista" | "nuevo_contrato" | "detalle_contrato";
type SubTabContrato = "nomina" | "conciliacion" | "cierre";

type ContratoRow = {
  id: string;
  empresa_id: string;
  vigencia_desde: string;
  vigencia_hasta: string | null;
  headcount: number;
  tarifa_convenida: number | null;
  incluye_desayuno: number | null;
  incluye_almuerzo: number | null;
  incluye_cena: number | null;
  condicion_tributaria: "neto" | "con_iva" | null;
};

export function ModuloEmpresas({ usuarioId }: { usuarioId: string }) {
  const [vista, setVista] = useState<VistaEmpresa>("lista");
  const [empresaIdSeleccionada, setEmpresaIdSeleccionada] = useState<string | null>(null);
  const [contratoIdSeleccionado, setContratoIdSeleccionado] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTabContrato>("nomina");
  const [ajustando, setAjustando] = useState(false);

  // Consultar contratos de la empresa seleccionada si aplica
  const { data: contratos, isLoading } = useQuery<ContratoRow>(
    `select id, empresa_id, vigencia_desde, vigencia_hasta, headcount, tarifa_convenida,
            incluye_desayuno, incluye_almuerzo, incluye_cena, condicion_tributaria
       from contrato_empresa where empresa_id = ? order by vigencia_desde desc`,
    [empresaIdSeleccionada ?? ""]
  );

  const { data: empresasInfo } = useQuery<{ id: string; razon_social: string }>(
    "select id, razon_social from empresa where id = ?",
    [empresaIdSeleccionada ?? ""]
  );

  function handleSeleccionarEmpresa(empresaId: string, contratoId?: string) {
    setEmpresaIdSeleccionada(empresaId);
    setContratoIdSeleccionado(contratoId ?? null);
    setVista("detalle_contrato");
  }

  function handleNuevoContrato(empresaId: string) {
    setEmpresaIdSeleccionada(empresaId);
    setVista("nuevo_contrato");
  }

  function handleContratoCreado(contratoId: string, empresaId?: string) {
    if (empresaId) setEmpresaIdSeleccionada(empresaId);
    setContratoIdSeleccionado(contratoId);
    setVista("detalle_contrato");
    setSubTab("nomina");
  }

  if (vista === "nuevo_contrato") {
    return (
      <ContratoScreen
        usuarioId={usuarioId}
        empresaIdInicial={empresaIdSeleccionada ?? ""}
        onContratoCreado={handleContratoCreado}
        onVolver={() => setVista("lista")}
      />
    );
  }

  if (vista === "detalle_contrato" && empresaIdSeleccionada) {
    if (isLoading) {
      return (
        <div className="ui-operativa mx-auto flex w-full max-w-5xl justify-center py-12">
          <div className="h-8 w-8 motion-safe:animate-spin rounded-full border-4 border-brand-terracotta border-t-transparent" />
        </div>
      );
    }

    const hoyIso = fechaHoySantiago();
    const contratoActivo = contratoIdSeleccionado
      ? (contratos?.find((c) => c.id === contratoIdSeleccionado) ?? contratos?.[0])
      : (contratos?.find((c) => c.vigencia_desde <= hoyIso && (!c.vigencia_hasta || c.vigencia_hasta >= hoyIso)) ?? contratos?.[0]);

    const razonSocialEmpresa = empresasInfo?.[0]?.razon_social;

    return (
      <div className="ui-operativa mx-auto flex w-full max-w-5xl flex-col gap-4">
        {/* Navegación y selector de contratos de la empresa */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border-brand-border/80 bg-brand-card p-4 sm:p-5 shadow-card">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setVista("lista");
                setEmpresaIdSeleccionada(null);
                setContratoIdSeleccionado(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border bg-white hover:bg-brand-sand px-3 py-1.5 text-xs font-bold text-brand-ink transition active:scale-95 shadow-2xs"
            >
              <IconChevronLeft className="h-4 w-4" />
              <span>Volver a Empresas</span>
            </button>
            {razonSocialEmpresa && (
              <span className="font-display font-black text-brand-ink text-base md:text-lg sm:border-l sm:border-brand-border/70 sm:pl-3">
                {razonSocialEmpresa}
              </span>
            )}
          </div>

          {contratos && contratos.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
                Contrato:
              </span>
              <select
                aria-label="Contrato de la empresa"
                value={contratoActivo?.id ?? ""}
                onChange={(e) => setContratoIdSeleccionado(e.target.value)}
                className="rounded-xl border border-brand-border bg-white px-3 py-2 text-xs md:text-sm font-bold text-brand-ink focus:border-brand-terracotta focus:outline-none shadow-2xs max-w-[280px] sm:max-w-none truncate"
              >
                {contratos.map((c) => {
                  const esVigente = c.vigencia_desde <= hoyIso && (!c.vigencia_hasta || c.vigencia_hasta >= hoyIso);
                  const estadoTag = esVigente ? "🟢 Vigente" : (c.vigencia_hasta && c.vigencia_hasta < hoyIso ? "⚪ Finalizado" : "🟡 Futuro");
                  return (
                    <option key={c.id} value={c.id}>
                      {estadoTag} · {c.vigencia_desde}{c.vigencia_hasta ? ` al ${c.vigencia_hasta}` : ""} ({c.headcount} pers.)
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {contratoActivo ? (
          <div className="space-y-4">
            {/* Resumen económico del contrato */}
            {contratoActivo.tarifa_convenida != null && (
              <div className="space-y-3">
                <EstimacionContratoCard
                  headcount={contratoActivo.headcount}
                  tarifaConvenida={contratoActivo.tarifa_convenida}
                  vigenciaDesde={contratoActivo.vigencia_desde}
                  vigenciaHasta={contratoActivo.vigencia_hasta}
                  servicios={{
                    desayuno: Boolean(contratoActivo.incluye_desayuno),
                    almuerzo: Boolean(contratoActivo.incluye_almuerzo),
                    cena: Boolean(contratoActivo.incluye_cena)
                  }}
                  condicionTributaria={contratoActivo.condicion_tributaria}
                  estimacion={calcularEstimacionContrato({
                    headcount: contratoActivo.headcount,
                    tarifaConvenida: contratoActivo.tarifa_convenida,
                    vigenciaDesde: contratoActivo.vigencia_desde,
                    vigenciaHasta: contratoActivo.vigencia_hasta
                  })}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAjustando(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-2.5 text-xs font-bold text-brand-ink hover:bg-brand-sand/40 hover:border-brand-terracotta/40 transition active:scale-95 shadow-2xs"
                  >
                    <span>✏️ Ajustar cantidad contratada</span>
                  </button>
                </div>
              </div>
            )}

            {ajustando && contratoActivo.tarifa_convenida != null && (
              <AjustarCantidadContratoDialogo
                usuarioId={usuarioId}
                contrato={{
                  id: contratoActivo.id,
                  headcount: contratoActivo.headcount,
                  tarifa_convenida: contratoActivo.tarifa_convenida,
                  vigencia_desde: contratoActivo.vigencia_desde,
                  vigencia_hasta: contratoActivo.vigencia_hasta
                }}
                onCerrar={() => setAjustando(false)}
                onAjustado={(contratoNuevoId) => {
                  setAjustando(false);
                  setContratoIdSeleccionado(contratoNuevoId);
                }}
              />
            )}

            {/* Sub-pestañas estilizadas y responsivas */}
            <div className="grid grid-cols-3 gap-1 sm:gap-2 rounded-2xl border border-brand-border/70 bg-brand-sand/40 p-1.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setSubTab("nomina")}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  subTab === "nomina"
                    ? "bg-white text-brand-terracotta-deep shadow-sm"
                    : "text-brand-muted hover:text-brand-ink hover:bg-white/40"
                }`}
              >
                <IconUsers className="h-4 w-4 shrink-0" />
                <span className="truncate">Nómina y Camas</span>
              </button>
              <button
                type="button"
                onClick={() => setSubTab("conciliacion")}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  subTab === "conciliacion"
                    ? "bg-white text-brand-terracotta-deep shadow-sm"
                    : "text-brand-muted hover:text-brand-ink hover:bg-white/40"
                }`}
              >
                <IconClipboardCheck className="h-4 w-4 shrink-0" />
                <span className="truncate">Revisar diferencias</span>
              </button>
              <button
                type="button"
                onClick={() => setSubTab("cierre")}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  subTab === "cierre"
                    ? "bg-white text-brand-terracotta-deep shadow-sm"
                    : "text-brand-muted hover:text-brand-ink hover:bg-white/40"
                }`}
              >
                <IconFileText className="h-4 w-4 shrink-0" />
                <span className="truncate">Cierre y reportes</span>
              </button>
            </div>

            {subTab === "nomina" && (
              <NominaScreen
                empresaNombre={razonSocialEmpresa ?? undefined}
                usuarioId={usuarioId}
                contratoEmpresaId={contratoActivo.id}
                onVolver={() => setVista("lista")}
              />
            )}

            {subTab === "conciliacion" && (
              <ConciliacionScreen
                usuarioId={usuarioId}
                contratoEmpresaId={contratoActivo.id}
                onAbrirCierre={() => setSubTab("cierre")}
              />
            )}

            {subTab === "cierre" && (
              <CierreMensualModal
                contratoEmpresaId={contratoActivo.id}
                razonSocialEmpresa={razonSocialEmpresa || "Empresa Contratista"}
                onCerrar={() => setSubTab("conciliacion")}
                onIrAConciliacion={() => setSubTab("conciliacion")}
              />
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-brand-border bg-brand-card p-8 text-center text-sm text-brand-muted">
            Esta empresa no tiene contratos registrados aún.{" "}
            <button
              onClick={() => handleNuevoContrato(empresaIdSeleccionada)}
              className="font-bold text-brand-terracotta-deep underline"
            >
              Crear el primer contrato
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <EmpresasScreen
      usuarioId={usuarioId}
      onSeleccionarEmpresa={handleSeleccionarEmpresa}
      onNuevoContrato={handleNuevoContrato}
    />
  );
}
