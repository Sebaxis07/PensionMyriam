import { useState } from "react";
import { EmpresasScreen } from "./EmpresasScreen";
import { ContratoScreen } from "./ContratoScreen";
import { NominaScreen } from "./NominaScreen";
import { ConciliacionScreen } from "./ConciliacionScreen";
import { useQuery } from "@powersync/react";
import { IconClipboardCheck, IconFileText, IconUsers } from "../../components/Icons";
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
  // Las siguientes 4 columnas llegan en null al dispositivo de la
  // Encargada (bucket contrato_empresa_encargada no las incluye,
  // migración 0026) — la tarjeta de estimación solo se muestra cuando
  // tarifa_convenida no es null.
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
        <div className="ui-operativa mx-auto flex w-full max-w-4xl justify-center py-12">
          <div className="h-8 w-8 motion-safe:animate-spin rounded-full border-4 border-brand-terracotta border-t-transparent" />
        </div>
      );
    }

    const hoyIso = fechaHoySantiago();
    // Si no se ha elegido un contrato específico, preferir el vigente a hoy; de lo contrario el más reciente
    const contratoActivo = contratoIdSeleccionado
      ? (contratos?.find((c) => c.id === contratoIdSeleccionado) ?? contratos?.[0])
      : (contratos?.find((c) => c.vigencia_desde <= hoyIso && (!c.vigencia_hasta || c.vigencia_hasta >= hoyIso)) ?? contratos?.[0]);

    const razonSocialEmpresa = empresasInfo?.[0]?.razon_social;

    return (
      <div className="ui-operativa mx-auto flex w-full max-w-4xl flex-col gap-4">
        {/* Navegación y selector de contratos de la empresa */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border-brand-border/70 bg-brand-card p-4 shadow-card">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setVista("lista");
                setEmpresaIdSeleccionada(null);
                setContratoIdSeleccionado(null);
              }}
              className="text-sm font-bold uppercase tracking-wider text-brand-terracotta-deep hover:underline"
            >
              ← Volver a todas las empresas
            </button>
            {razonSocialEmpresa && (
              <span className="font-display font-bold text-brand-ink text-sm border-l border-brand-border/60 pl-3">
                {razonSocialEmpresa}
              </span>
            )}
          </div>

          {contratos && contratos.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-brand-ink/80">Contrato:</span>
              <select aria-label="Contrato de la empresa"
                value={contratoActivo?.id ?? ""}
                onChange={(e) => setContratoIdSeleccionado(e.target.value)}
                className="rounded-xl border border-brand-border bg-white px-3 py-1.5 text-sm font-bold text-brand-ink"
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
            {/* Resumen económico del contrato (sección 6 del alcance). Solo
                se muestra cuando tarifa_convenida llegó a este teléfono
                (null en el de la Encargada). */}
            {contratoActivo.tarifa_convenida != null && (
              <div className="space-y-2">
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
                <button
                  onClick={() => setAjustando(true)}
                  className="min-h-11 rounded-xl border border-brand-border bg-white px-4 py-2 text-sm font-bold text-brand-terracotta-deep hover:bg-brand-sand/40"
                >
                  Ajustar cantidad contratada
                </button>
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

            {/* Sub-pestañas: Nómina vs. Conciliación */}
            <div className="flex flex-wrap gap-2 border-b border-brand-border/70 bg-brand-sand/30 p-1 rounded-2xl">
              <button
                onClick={() => setSubTab("nomina")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  subTab === "nomina"
                    ? "bg-brand-card text-brand-terracotta-deep shadow-sm"
                    : "text-brand-ink/80 hover:text-brand-ink"
                }`}
              >
                <IconUsers className="h-4 w-4" />
                <span>Nómina y Camas</span>
              </button>
              <button
                onClick={() => setSubTab("conciliacion")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  subTab === "conciliacion"
                    ? "bg-brand-card text-brand-terracotta-deep shadow-sm"
                    : "text-brand-ink/80 hover:text-brand-ink"
                }`}
              >
                <IconClipboardCheck className="h-4 w-4" />
                <span>Revisar diferencias</span>
              </button>
              <button
                onClick={() => setSubTab("cierre")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  subTab === "cierre"
                    ? "bg-brand-card text-brand-terracotta-deep shadow-sm"
                    : "text-brand-ink/80 hover:text-brand-ink"
                }`}
              >
                <IconFileText className="h-4 w-4" />
                <span>Cierre y reportes</span>
              </button>
            </div>

            {subTab === "nomina" && (
              <NominaScreen empresaNombre={razonSocialEmpresa ?? undefined}
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
          <div className="rounded-3xl border border-brand-border/70 bg-brand-card p-10 text-center shadow-card">
            <h3 className="font-display text-lg font-bold text-brand-ink">
              Esta empresa no tiene contratos vigentes
            </h3>
            <p className="mt-1 text-sm text-brand-ink/80 mb-4">
              Crea un contrato para habilitar la nómina y el control de consumos.
            </p>
            <button
              onClick={() => setVista("nuevo_contrato")}
              className="rounded-xl bg-brand-terracotta-deep px-5 py-2.5 text-sm font-bold text-white shadow-brand hover:bg-brand-terracotta-deep"
            >
              + Crear primer contrato
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <EmpresasScreen
      onSeleccionarEmpresa={handleSeleccionarEmpresa}
      onNuevoContrato={handleNuevoContrato}
    />
  );
}
