import { useMemo, useState, type FormEvent } from "react";
import { useEmpresas } from "../../features/empresas/useEmpresas";
import { crearEmpresa } from "../../features/empresas/crearEmpresa";
import {
  IconBriefcase,
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconClose,
  IconPlus,
  IconSearch,
  IconUser,
  IconUsers
} from "../../components/Icons";
import { formatearMonedaCLP } from "../../lib/pdf/pdfMakeConfig";

interface EmpresasScreenProps {
  onSeleccionarEmpresa?: (empresaId: string) => void;
  onNuevoContrato?: (empresaId: string) => void;
}

type FiltroContrato = "todas" | "activas" | "sin_contrato";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatearFechaCorta(fechaIso: string | null | undefined): string {
  if (!fechaIso) return "Indefinida";
  try {
    const [y, m, d] = fechaIso.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return fechaIso;
  }
}

function obtenerIniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/);
  if (palabras.length >= 2) {
    return (palabras[0][0] + palabras[1][0]).toUpperCase();
  }
  return nombre.slice(0, 2).toUpperCase() || "EM";
}

export function EmpresasScreen({ onSeleccionarEmpresa, onNuevoContrato }: EmpresasScreenProps) {
  const empresas = useEmpresas();
  const [mostrarModalAlta, setMostrarModalAlta] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroContrato>("todas");

  // Campos de nueva empresa
  const [razonSocial, setRazonSocial] = useState("");
  const [rut, setRut] = useState("");
  const [contacto, setContacto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const hoy = hoyISO();

  // Métricas agregadas
  const stats = useMemo(() => {
    let contratosActivos = 0;
    let dotacionTotal = 0;

    empresas.forEach((e) => {
      const tieneVigente =
        e.vigencia_desde &&
        e.vigencia_desde <= hoy &&
        (!e.vigencia_hasta || e.vigencia_hasta >= hoy);
      if (tieneVigente) {
        contratosActivos++;
        dotacionTotal += Number(e.headcount || 0);
      }
    });

    return {
      totalEmpresas: empresas.length,
      contratosActivos,
      dotacionTotal
    };
  }, [empresas, hoy]);

  // Filtrado y búsqueda
  const empresasFiltradas = useMemo(() => {
    return empresas.filter((e) => {
      const coincideBusqueda =
        e.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
        (e.rut && e.rut.toLowerCase().includes(busqueda.toLowerCase())) ||
        (e.contacto && e.contacto.toLowerCase().includes(busqueda.toLowerCase()));

      if (!coincideBusqueda) return false;

      const tieneVigente =
        e.vigencia_desde &&
        e.vigencia_desde <= hoy &&
        (!e.vigencia_hasta || e.vigencia_hasta >= hoy);

      if (filtro === "activas") return tieneVigente;
      if (filtro === "sin_contrato") return !tieneVigente;
      return true;
    });
  }, [empresas, busqueda, filtro, hoy]);

  async function handleGuardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await crearEmpresa({
        razonSocial: razonSocial.trim(),
        rut: rut.trim() || undefined,
        contacto: contacto.trim() || undefined
      });
      setRazonSocial("");
      setRut("");
      setContacto("");
      setMostrarModalAlta(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la empresa.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {/* 1. Tarjetas de Métricas Ejecutivas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="flex items-center gap-3.5 rounded-2xl border border-brand-border/80 bg-brand-card p-4 shadow-card">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-sand-light text-brand-terracotta">
            <IconBriefcase className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-muted">
              Empresas Registradas
            </p>
            <p className="font-display text-2xl font-black text-brand-ink">
              {stats.totalEmpresas}
            </p>
            <p className="text-[11px] text-brand-muted">Clientes corporativos</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-brand-border/80 bg-brand-card p-4 shadow-card">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <IconCalendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-muted">
              Contratos Vigentes
            </p>
            <p className="font-display text-2xl font-black text-emerald-800">
              {stats.contratosActivos}
            </p>
            <p className="text-[11px] text-emerald-700 font-medium">Operando actualmente</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-brand-border/80 bg-brand-card p-4 shadow-card">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <IconUsers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-muted">
              Dotación Contratada
            </p>
            <p className="font-display text-2xl font-black text-brand-ink">
              {stats.dotacionTotal} <span className="text-xs font-bold text-brand-muted">cupos</span>
            </p>
            <p className="text-[11px] text-brand-muted">Trabajadores pactados</p>
          </div>
        </div>
      </div>

      {/* 2. Barra de Control: Búsqueda, Filtros y Botón de Alta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-brand-border/80 bg-brand-card p-4 shadow-card">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Campo de Búsqueda */}
          <div className="relative flex-1 max-w-md">
            <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted" />
            <input
              type="text"
              placeholder="Buscar por empresa, RUT o supervisor…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-xl border border-brand-border bg-white pl-9 pr-3.5 py-2 text-xs font-semibold text-brand-ink placeholder:text-stone-400 focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-muted hover:text-brand-ink"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros de Estado */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFiltro("todas")}
              className={`rounded-lg px-2.5 py-1.5 font-bold transition ${
                filtro === "todas"
                  ? "bg-brand-sand/80 text-brand-terracotta shadow-xs"
                  : "text-brand-muted hover:bg-brand-sand/30"
              }`}
            >
              Todas ({empresas.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltro("activas")}
              className={`rounded-lg px-2.5 py-1.5 font-bold transition ${
                filtro === "activas"
                  ? "bg-emerald-100 text-emerald-800 shadow-xs"
                  : "text-brand-muted hover:bg-brand-sand/30"
              }`}
            >
              Vigentes ({stats.contratosActivos})
            </button>
            <button
              type="button"
              onClick={() => setFiltro("sin_contrato")}
              className={`rounded-lg px-2.5 py-1.5 font-bold transition ${
                filtro === "sin_contrato"
                  ? "bg-stone-200 text-stone-800 shadow-xs"
                  : "text-brand-muted hover:bg-brand-sand/30"
              }`}
            >
              Sin Contrato ({stats.totalEmpresas - stats.contratosActivos})
            </button>
          </div>
        </div>

        {/* Botón Nueva Empresa */}
        <button
          type="button"
          onClick={() => {
            setError(null);
            setMostrarModalAlta(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-terracotta px-4 py-2.5 text-xs font-bold text-white shadow-brand hover:bg-brand-terracotta-deep transition active:scale-95 shrink-0"
        >
          <IconPlus className="h-4 w-4" />
          <span>Nueva Empresa</span>
        </button>
      </div>

      {/* 3. Cuadrícula de Tarjetas de Empresas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {empresasFiltradas.map((emp) => {
          const tieneVigente =
            emp.vigencia_desde &&
            emp.vigencia_desde <= hoy &&
            (!emp.vigencia_hasta || emp.vigencia_hasta >= hoy);

          const tieneContrato = Boolean(emp.contrato_id);
          const iniciales = obtenerIniciales(emp.razon_social);

          return (
            <div
              key={emp.id}
              className="group flex flex-col justify-between rounded-3xl border border-brand-border/80 bg-brand-card p-5 shadow-card hover:border-brand-terracotta/40 hover:shadow-card-hover transition-all"
            >
              <div>
                {/* Cabecera de la Tarjeta */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-sand-light border border-brand-border text-brand-terracotta font-display font-black text-sm shadow-xs">
                      {iniciales}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-base md:text-lg font-bold text-brand-ink leading-tight truncate">
                        {emp.razon_social}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {emp.rut ? (
                          <span className="rounded-md border border-brand-border bg-white px-2 py-0.5 text-[10px] font-mono font-semibold text-brand-ink">
                            RUT: {emp.rut}
                          </span>
                        ) : (
                          <span className="text-[10px] text-brand-muted italic">Sin RUT</span>
                        )}
                        {emp.contacto && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-brand-muted truncate">
                            <IconUser className="h-3 w-3 shrink-0 text-brand-terracotta" />
                            <span className="truncate">{emp.contacto}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Insignia de Estado */}
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      tieneVigente
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : tieneContrato
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-stone-200 text-stone-700 border border-stone-300"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        tieneVigente
                          ? "bg-emerald-600 animate-pulse"
                          : tieneContrato
                          ? "bg-amber-600"
                          : "bg-stone-500"
                      }`}
                    />
                    <span>
                      {tieneVigente
                        ? "Vigente"
                        : tieneContrato
                        ? "No vigente"
                        : "Sin contrato"}
                    </span>
                  </span>
                </div>

                {/* Resumen del Contrato / Dotación */}
                {tieneContrato ? (
                  <div className="mt-4 rounded-2xl border border-brand-border/60 bg-white p-3.5 space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-1.5 rounded-xl bg-brand-sand-light/60">
                        <span className="text-[10px] uppercase font-bold text-brand-muted block">
                          Dotación
                        </span>
                        <span className="font-display text-base font-black text-brand-ink">
                          {emp.headcount ?? "-"}
                        </span>
                        <span className="text-[9px] text-brand-muted block">trabajadores</span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-brand-sand-light/60">
                        <span className="text-[10px] uppercase font-bold text-brand-muted block">
                          Tarifa Pactada
                        </span>
                        <span className="font-display text-base font-black text-brand-terracotta">
                          {emp.tarifa_convenida ? formatearMonedaCLP(emp.tarifa_convenida) : "-"}
                        </span>
                        <span className="text-[9px] text-brand-muted block">por día / cupo</span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-brand-sand-light/60">
                        <span className="text-[10px] uppercase font-bold text-brand-muted block">
                          Nómina Activa
                        </span>
                        <span className="font-display text-base font-black text-emerald-800">
                          {emp.total_trabajadores ?? 0}
                        </span>
                        <span className="text-[9px] text-brand-muted block">
                          {emp.camas_asignadas ?? 0} con cama
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-brand-muted pt-1 border-t border-brand-border/40 px-1">
                      <span>Vigencia:</span>
                      <span className="font-semibold text-brand-ink">
                        {formatearFechaCorta(emp.vigencia_desde)} → {formatearFechaCorta(emp.vigencia_hasta)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-brand-border bg-brand-sand-light/40 p-3.5 text-center text-xs text-brand-muted">
                    No tiene contratos vigentes. Pulsa "+ Nuevo Contrato" para asignar dotación y tarifa.
                  </div>
                )}
              </div>

              {/* Botones de Acción de la Empresa */}
              <div className="mt-5 flex items-center gap-2 pt-3 border-t border-brand-border/60">
                <button
                  type="button"
                  onClick={() => onNuevoContrato?.(emp.id)}
                  className="rounded-xl border border-brand-border bg-brand-sand-light hover:bg-brand-sand px-3 py-2 text-xs font-bold text-brand-ink transition text-center shrink-0"
                >
                  + Contrato
                </button>

                <button
                  type="button"
                  onClick={() => onSeleccionarEmpresa?.(emp.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-brand-terracotta hover:bg-brand-terracotta-deep px-4 py-2 text-xs font-bold text-white transition shadow-sm active:scale-95"
                >
                  <span>Ver Nómina y Consumos</span>
                  <IconChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {!empresasFiltradas.length && (
          <div className="col-span-full rounded-3xl border border-brand-border/70 bg-brand-card p-12 text-center shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-sand-light text-brand-muted">
              <IconBriefcase className="h-7 w-7" />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-brand-ink">
              No se encontraron empresas contratistas
            </h3>
            <p className="mt-1 text-xs text-brand-muted max-w-sm mx-auto">
              {busqueda
                ? "No hay resultados para el término de búsqueda ingresado."
                : "Aún no hay empresas registradas con el filtro seleccionado."}
            </p>
          </div>
        )}
      </div>

      {/* 4. Modal para Alta de Empresa */}
      {mostrarModalAlta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-brand-border bg-brand-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-sand-light text-brand-terracotta">
                  <IconBriefcase className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-brand-ink">
                    Registrar Empresa Contratista
                  </h3>
                  <p className="text-[11px] text-brand-muted">Cliente corporativo para nóminas B2B</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalAlta(false)}
                className="rounded-full p-1.5 text-brand-muted hover:bg-brand-sand"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleGuardar} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-muted mb-1">
                  Razón Social <span className="text-brand-terracotta">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: Constructora Minera Norte SpA"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-muted mb-1">
                  RUT de la Empresa (opcional)
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
                <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-muted mb-1">
                  Contacto o Supervisor de Faena (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Don Roberto Gómez (+56 9 1234 5678)"
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border/50">
                <button
                  type="button"
                  onClick={() => setMostrarModalAlta(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-brand-muted hover:text-brand-ink"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando || !razonSocial.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-terracotta px-4 py-2 text-xs font-bold text-white shadow-brand hover:bg-brand-terracotta-deep transition disabled:opacity-50"
                >
                  <IconCheck className="h-4 w-4" />
                  <span>{guardando ? "Registrando…" : "Registrar Empresa"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
