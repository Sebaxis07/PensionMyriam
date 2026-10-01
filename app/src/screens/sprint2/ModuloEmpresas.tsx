import { useState } from "react";
import { EmpresasScreen } from "./EmpresasScreen";
import { ContratoScreen } from "./ContratoScreen";
import { NominaScreen } from "./NominaScreen";
import { ConciliacionScreen } from "./ConciliacionScreen";
import { useQuery } from "@powersync/react";
import { IconClipboardCheck, IconFileText, IconUsers } from "../../components/Icons";
import { CierreMensualModal } from "./CierreMensualModal";

type VistaEmpresa = "lista" | "nuevo_contrato" | "detalle_contrato";
type SubTabContrato = "nomina" | "conciliacion" | "cierre";

type ContratoRow = {
  id: string;
  empresa_id: string;
  vigencia_desde: string;
  vigencia_hasta: string | null;
  headcount: number;
  tarifa_convenida: number;
};

export function ModuloEmpresas({ usuarioId }: { usuarioId: string }) {
  const [vista, setVista] = useState<VistaEmpresa>("lista");
  const [empresaIdSeleccionada, setEmpresaIdSeleccionada] = useState<string | null>(null);
  const [contratoIdSeleccionado, setContratoIdSeleccionado] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTabContrato>("nomina");

  // Consultar contratos de la empresa seleccionada si aplica
  const { data: contratos, isLoading } = useQuery<ContratoRow>(
    "select id, empresa_id, vigencia_desde, vigencia_hasta, headcount, tarifa_convenida from contrato_empresa where empresa_id = ? order by vigencia_desde desc",
    [empresaIdSeleccionada ?? ""]
  );

  const { data: empresasInfo } = useQuery<{ id: string; razon_social: string }>(
    "select id, razon_social from empresa where id = ?",
    [empresaIdSeleccionada ?? ""]
  );

  function handleSeleccionarEmpresa(empresaId: string) {
    setEmpresaIdSeleccionada(empresaId);
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
        <div className="mx-auto flex w-full max-w-4xl justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-terracotta border-t-transparent" />
        </div>
      );
    }

    // Si no se ha elegido un contrato específico, tomar el más reciente
    const contratoActivo = contratoIdSeleccionado
      ? (contratos?.find((c) => c.id === contratoIdSeleccionado) ?? contratos?.[0])
      : contratos?.[0];

    const razonSocialEmpresa = empresasInfo?.[0]?.razon_social;

    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        {/* Navegación y selector de contratos de la empresa */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border-brand-border/70 bg-brand-card p-4 shadow-card">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setVista("lista");
                setEmpresaIdSeleccionada(null);
                setContratoIdSeleccionado(null);
              }}
              className="text-xs font-bold uppercase tracking-wider text-brand-terracotta hover:underline"
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
              <span className="text-xs font-bold text-brand-muted">Contrato:</span>
              <select
                value={contratoActivo?.id ?? ""}
                onChange={(e) => setContratoIdSeleccionado(e.target.value)}
                className="rounded-xl border border-brand-border bg-white px-3 py-1.5 text-xs font-bold text-brand-ink"
              >
                {contratos.map((c) => (
                  <option key={c.id} value={c.id}>
                    Desde {c.vigencia_desde} ({c.headcount} personas)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {contratoActivo ? (
          <div className="space-y-4">
            {/* Sub-pestañas: Nómina vs. Conciliación */}
            <div className="flex border-b border-brand-border/70 bg-brand-sand/30 p-1 rounded-2xl">
              <button
                onClick={() => setSubTab("nomina")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  subTab === "nomina"
                    ? "bg-brand-card text-brand-terracotta shadow-sm"
                    : "text-brand-muted hover:text-brand-ink"
                }`}
              >
                <IconUsers className="h-4 w-4" />
                <span>Nómina y Camas</span>
              </button>
              <button
                onClick={() => setSubTab("conciliacion")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  subTab === "conciliacion"
                    ? "bg-brand-card text-brand-terracotta shadow-sm"
                    : "text-brand-muted hover:text-brand-ink"
                }`}
              >
                <IconClipboardCheck className="h-4 w-4" />
                <span>Conciliación Diaria</span>
              </button>
              <button
                onClick={() => setSubTab("cierre")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  subTab === "cierre"
                    ? "bg-brand-card text-brand-terracotta shadow-sm"
                    : "text-brand-muted hover:text-brand-ink"
                }`}
              >
                <IconFileText className="h-4 w-4" />
                <span>Cierre y Facturación</span>
              </button>
            </div>

            {subTab === "nomina" && (
              <NominaScreen
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
            <p className="mt-1 text-xs text-brand-muted mb-4">
              Crea un contrato para habilitar la nómina y el control de consumos.
            </p>
            <button
              onClick={() => setVista("nuevo_contrato")}
              className="rounded-xl bg-brand-terracotta px-5 py-2.5 text-xs font-bold text-white shadow-brand hover:bg-brand-terracotta-deep"
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
