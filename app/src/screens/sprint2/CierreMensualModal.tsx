import { AvisoInterfaz, describirErrorUi } from "../../components/MensajeInterfaz";
import { Dialogo } from "../../components/Dialogo";
import { useEffect, useState } from "react";
import { useCierreMensual } from "../../features/cierre/useCierreMensual";
import {
  registrarCierreFacturacion,
  buscarCierrePeriodo,
  type CierreFacturacionRow
} from "../../features/cierre/registrarCierreFacturacion";
import { useConfigPension } from "../../features/perfil/useConfigPension";
import { useUsuarioActual } from "../../lib/useUsuarioActual";
import { conciliarPeriodo } from "../../features/conciliacion/useConciliacion";
import { descargarPreFacturaPdf } from "../../features/reportes/generarPreFacturaPdf";
import { descargarPlanillaExcel } from "../../features/reportes/generarPlanillaExcel";
import { formatearMonedaCLP } from "../../lib/pdf/pdfMakeConfig";
import { powersync } from "../../lib/powersync";
import {
  fechaHoySantiago,
  inicioDiaSantiagoUTC,
  finDiaSantiagoUTC,
  sqlFechaHoraNormalizada
} from "../../lib/fechaNegocio";
import {
  IconCheck,
  IconClipboardCheck,
  IconClose,
  IconFileText
} from "../../components/Icons";

const NOMBRES_MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const ETIQUETAS_TIPO: Record<string, string> = {
  cama_noche: "Noche de cama",
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  cena: "Cena"
};

interface CierreMensualModalProps {
  contratoEmpresaId: string;
  razonSocialEmpresa: string;
  rutEmpresa?: string | null;
  onCerrar: () => void;
  onIrAConciliacion?: () => void;
}

export function CierreMensualModal({
  contratoEmpresaId,
  razonSocialEmpresa,
  rutEmpresa,
  onCerrar,
  onIrAConciliacion
}: CierreMensualModalProps) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [descargandoExcel, setDescargandoExcel] = useState(false);
  const [procesandoPeriodo, setProcesandoPeriodo] = useState(false);

  const [avisoReporte, setAvisoReporte] = useState<string | null>(null);
  const [errorReporte, setErrorReporte] = useState<string | null>(null);

  async function presentarDescarga(accion: () => Promise<void>, mensaje: string) {
    setAvisoReporte(null); setErrorReporte(null);
    try { await accion(); setAvisoReporte(mensaje); }
    catch (error) { setErrorReporte(describirErrorUi(error instanceof Error ? error.message : "No se pudo preparar el archivo. Intenta nuevamente.")); }
  }

  const cierre = useCierreMensual(contratoEmpresaId, anio, mes);
  const periodoTexto = `${NOMBRES_MESES[mes - 1]} ${anio}`;

  // HU-33: registrar el cierre de facturación del período. Es el hecho
  // que arranca el plazo de retención de datos personales — sin él, la
  // purga automática no puede distinguir un período facturado de uno
  // que nadie facturó nunca (ver features/cierre/registrarCierreFacturacion.ts).
  const usuarioActual = useUsuarioActual();
  const { config } = useConfigPension();
  const [cierreRegistrado, setCierreRegistrado] = useState<CierreFacturacionRow | null>(null);
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const [registrandoCierre, setRegistrandoCierre] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setCierreRegistrado(null);
    setConfirmarCierre(false);
    setErrorCierre(null);
    buscarCierrePeriodo(contratoEmpresaId, anio, mes)
      .then((fila) => {
        if (vigente) setCierreRegistrado(fila);
      })
      .catch(() => {
        // Sin réplica todavía: el botón queda ofreciendo cerrar y la
        // escritura es idempotente, así que no pasa nada si se repite.
      });
    return () => {
      vigente = false;
    };
  }, [contratoEmpresaId, anio, mes]);

  async function handleRegistrarCierre() {
    if (!usuarioActual) return;
    setRegistrandoCierre(true);
    setErrorCierre(null);
    try {
      const fila = await registrarCierreFacturacion({
        contratoEmpresaId,
        anio,
        mes,
        totalFacturado: cierre.granTotal,
        cerradoPor: usuarioActual.id
      });
      setCierreRegistrado(fila);
      setConfirmarCierre(false);
    } catch (err: any) {
      setErrorCierre(err?.message || "No se pudo registrar el cierre del período.");
    } finally {
      setRegistrandoCierre(false);
    }
  }

  async function handleConciliarPendientes() {
    setProcesandoPeriodo(true);
    try {
      const mesPadded = String(mes).padStart(2, "0");
      const primerDia = `${anio}-${mesPadded}-01`;
      const hoyStr = fechaHoySantiago();
      const ultimoDia = `${anio}-${mesPadded}-${new Date(anio, mes, 0).getDate()}`;
      const fin = hoyStr < ultimoDia ? hoyStr : ultimoDia;
      await conciliarPeriodo(contratoEmpresaId, primerDia, fin);
    } catch (e) {
      console.error(e);
      setErrorReporte("No se pudieron revisar los días del mes. Revisa la conexión e intenta nuevamente.");
    } finally {
      setProcesandoPeriodo(false);
    }
  }

  async function handleDescargarPdf() {
    try {
      setDescargandoPdf(true);
      descargarPreFacturaPdf({
        razonSocialEmpresa,
        rutEmpresa,
        periodoMes: periodoTexto,
        folioContrato: contratoEmpresaId,
        cierre
      });
    } finally {
      setDescargandoPdf(false);
    }
  }

  async function handleDescargarExcel() {
    try {
      setDescargandoExcel(true);
      const mesPadded = String(mes).padStart(2, "0");
      const primerDia = `${anio}-${mesPadded}-01`;
      const ultimoDia = `${anio}-${mesPadded}-${new Date(anio, mes, 0).getDate()}`;

      // Consultar consumos del mes para la hoja 1
      const consumosRaw = await powersync.getAll<{
        fecha_hora: string;
        trabajador_nombre: string;
        tipo_consumo: string;
        producto_extra_nombre: string | null;
        recargo: number;
      }>(
        `select c.fecha_hora, t.nombre as trabajador_nombre, c.tipo_consumo,
                p.nombre as producto_extra_nombre, c.recargo
         from consumo c
         join trabajador t on t.id = c.trabajador_id
         left join producto_extra p on p.id = c.producto_extra_id
         where t.contrato_empresa_id = ?
           and ${sqlFechaHoraNormalizada("c.fecha_hora")} >= ${sqlFechaHoraNormalizada("?")}
           and ${sqlFechaHoraNormalizada("c.fecha_hora")} < ${sqlFechaHoraNormalizada("?")}
           and c.consumo_corregido_id is null
         order by c.fecha_hora asc`,
        [contratoEmpresaId, inicioDiaSantiagoUTC(primerDia).toISOString(), finDiaSantiagoUTC(ultimoDia).toISOString()]
      );

      // Descuadres del mes para la hoja 2
      const descuadresRaw = await powersync.getAll<{
        fecha: string;
        tipo: string;
        cantidad_esperada: number;
        cantidad_servida: number;
        motivo: string;
        supervisor_nombre: string;
      }>(
        `select cd.fecha, cd.tipo, cd.cantidad_esperada, cd.cantidad_servida,
                j.motivo, j.supervisor_nombre
         from justificacion_descuadre j
         join conciliacion_diaria cd on cd.id = j.conciliacion_diaria_id
         where cd.contrato_empresa_id = ?
           and cd.fecha >= ? and cd.fecha <= ?
         order by cd.fecha, cd.tipo`,
        [contratoEmpresaId, primerDia, ultimoDia]
      );

      await descargarPlanillaExcel({
        razonSocialEmpresa,
        periodoMes: periodoTexto,
        consumos: consumosRaw.map((c) => ({
          fechaHora: c.fecha_hora,
          trabajadorNombre: c.trabajador_nombre,
          tipoConsumo: c.tipo_consumo,
          productoExtra: c.producto_extra_nombre || "",
          recargo: Number(c.recargo || 0)
        })),
        descuadres: descuadresRaw.map((d) => ({
          fecha: d.fecha,
          tipo: d.tipo,
          esperado: d.cantidad_esperada,
          servido: d.cantidad_servida,
          diferencia: Math.abs(d.cantidad_esperada - d.cantidad_servida),
          motivo: d.motivo,
          supervisor: d.supervisor_nombre
        }))
      });
    } finally {
      setDescargandoExcel(false);
    }
  }

  return (
    <Dialogo titulo="Resumen mensual y reportes" onCerrar={() => { if (!registrandoCierre) onCerrar(); }} className="ui-operativa fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-brand-border bg-brand-card shadow-2xl overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-brand-border/70 p-5 bg-brand-sand/30">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-terracotta-deep">
              Cierre Mensual y Pre-facturación
            </p>
            <h3 className="font-display text-xl font-bold text-brand-ink">
              {razonSocialEmpresa}
            </h3>
          </div>
          <button
            disabled={registrandoCierre} onClick={onCerrar}
            aria-label="Cerrar diálogo" className="rounded-full p-2 text-brand-ink/80 hover:bg-brand-sand hover:text-brand-ink"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido desplazable */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
          {/* Selectores de Período */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-border/70 bg-white p-3.5 shadow-sm">
            <span className="text-sm font-bold uppercase tracking-wider text-brand-ink/80">
              Período a cerrar:
            </span>
            <select aria-label="Mes del resumen"
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="rounded-xl border border-brand-border bg-brand-sand/20 px-3 py-1.5 text-sm font-bold text-brand-ink"
            >
              {NOMBRES_MESES.map((nombre, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {nombre}
                </option>
              ))}
            </select>
            <select aria-label="Año del resumen"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="rounded-xl border border-brand-border bg-brand-sand/20 px-3 py-1.5 text-sm font-bold text-brand-ink"
            >
              {[2025, 2026, 2027].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {errorReporte && <AvisoInterfaz tono="error">{errorReporte}</AvisoInterfaz>}
          {avisoReporte && <AvisoInterfaz tono="exito">{avisoReporte}</AvisoInterfaz>}
          <p className="rounded-xl border border-brand-border bg-brand-sand-deep/40 p-3 text-sm text-brand-ink">Revisa empresa y periodo. El resumen indica si puedes preparar los reportes; no confirma un cierre definitivo guardado.</p>
          {cierre.isLoading ? (
            <div role="status" aria-label="Cargando resumen del periodo" className="flex flex-col items-center justify-center gap-3 py-12">
              <p>Cargando resumen del periodo…</p>
              <div className="h-8 w-8 motion-safe:animate-spin rounded-full border-4 border-brand-terracotta border-t-transparent" />
            </div>
          ) : !cierre.estaCerrable ? (
            /* Bloqueo: Existen días pendientes */
            <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <span>⚠️</span>
                <span>Requiere revisión: hay días pendientes</span>
              </div>
              <p className="text-sm text-amber-800 leading-relaxed">
                Antes de preparar los reportes, revisa los servicios pendientes y justifica las diferencias. La tarifa del contrato se mantiene completa.
              </p>

              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-amber-200 bg-white p-3 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-950">
                  Días con diferencias pendientes ({cierre.diasPendientes.length}):
                </p>
                {cierre.diasPendientes.map((d) => (
                  <div key={d.fecha} className="flex flex-col sm:flex-row gap-1 sm:items-center justify-between text-sm py-1 border-b border-amber-100 last:border-0">
                    <span className="font-bold text-brand-ink">{d.fecha}</span>
                    <span className="text-amber-700">
                      Falta: {d.tiposPendientes.map((t) => ETIQUETAS_TIPO[t] || t).join(", ")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleConciliarPendientes}
                  disabled={procesandoPeriodo}
                  className="rounded-xl bg-brand-terracotta-deep hover:bg-brand-terracotta-deep px-4 py-2 text-sm font-bold text-white transition-colors disabled:opacity-50"
                >
                  {procesandoPeriodo ? "Conciliando días…" : "Conciliar días del mes automáticamente"}
                </button>

                {onIrAConciliacion && (
                  <button
                    type="button"
                    onClick={() => {
                      onCerrar();
                      onIrAConciliacion();
                    }}
                    className="rounded-xl border border-amber-400 bg-white hover:bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900 transition-colors"
                  >
                    Justificar Diferencias →
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Mes completo y listo para cerrar */
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <IconCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-emerald-950 text-sm">
                    Listo para preparar los reportes
                  </h4>
                  <p className="text-sm text-emerald-800">
                    Todos los {cierre.totalDiasContrato} días del período están conciliados y justificados conforme a la dotación pactada.
                  </p>
                </div>
              </div>

              {/* Resumen Económico */}
              <div className="rounded-2xl border border-brand-border bg-white p-4 space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-brand-terracotta-deep">
                  Resumen de Facturación ({periodoTexto})
                </h4>

                <div className="grid grid-cols-2 gap-2 text-sm border-b border-brand-border/60 pb-3">
                  <span className="text-brand-ink/80">Dotación pactada:</span>
                  <span className="font-bold text-brand-ink text-right">{cierre.headcountContratado} trabajadores</span>

                  <span className="text-brand-ink/80">Días contratados:</span>
                  <span className="font-bold text-brand-ink text-right">{cierre.totalDiasContrato} días</span>

                  <span className="text-brand-ink/80">Tarifa diaria por persona:</span>
                  <span className="font-bold text-brand-ink text-right">{formatearMonedaCLP(cierre.tarifaPactadaDiaria)}</span>

                  <span className="text-brand-ink/80">Subtotal Contrato Completo:</span>
                  <span className="font-bold text-brand-ink text-right">{formatearMonedaCLP(cierre.totalContratoCompleto)}</span>
                </div>

                {cierre.colacionesDetalle.length > 0 && (
                  <div className="text-sm border-b border-brand-border/60 pb-3 space-y-1">
                    <span className="font-bold text-brand-terracotta-deep block">Colaciones Extras (Consumo Real):</span>
                    {cierre.colacionesDetalle.map((col) => (
                      <div key={col.nombre} className="flex justify-between text-brand-ink/80">
                        <span>{col.cantidad}x {col.nombre}</span>
                        <span className="font-semibold text-brand-ink">{formatearMonedaCLP(col.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="font-display text-sm font-bold text-brand-ink">Total a Facturar:</span>
                  <span className="font-display text-xl font-bold text-brand-terracotta-deep">
                    {formatearMonedaCLP(cierre.granTotal)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-brand-ink/80">
                <p><strong className="text-brand-ink">Prefactura PDF:</strong> resumen del periodo, consumos y justificaciones para revisar con la empresa.</p>
                <p><strong className="text-brand-ink">Planilla Excel:</strong> dos hojas con el libro de consumos y las diferencias justificadas.</p>
              </div>
              {/* Botones de Descarga */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => presentarDescarga(handleDescargarPdf, "Se solicitó la prefactura PDF. Revisa las descargas del navegador; esto no confirma el cierre definitivo del periodo.")}
                  disabled={descargandoPdf}
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-terracotta-deep hover:bg-brand-terracotta-deep px-4 py-3 text-sm font-bold text-white shadow-brand transition-all disabled:opacity-50"
                >
                  <IconFileText className="h-4 w-4" />
                  <span>{descargandoPdf ? "Generando PDF…" : "Descargar Pre-factura (PDF)"}</span>
                </button>

                <button
                  onClick={() => presentarDescarga(handleDescargarExcel, "Se preparó la planilla de dos hojas. Revisa las descargas del navegador.")}
                  disabled={descargandoExcel}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all disabled:opacity-50"
                >
                  <IconClipboardCheck className="h-4 w-4" />
                  <span>{descargandoExcel ? "Generando Excel…" : "Descargar Planilla Contadora (Excel)"}</span>
                </button>
              </div>

              {usuarioActual?.rol === "administradora" && <section className="space-y-3 rounded-2xl border border-brand-border bg-brand-card p-4" aria-busy={registrandoCierre}>
                <h4 className="font-display text-lg font-bold">Cierre de facturación</h4>
                {cierreRegistrado ? <AvisoInterfaz tono="exito">
                  <p className="font-bold">Cierre registrado en este teléfono</p>
                  <p>Período: {periodoTexto}. Fecha de registro: {new Date(cierreRegistrado.cerrado_at).toLocaleDateString("es-CL")}.</p>
                  <p>Revisa el indicador de sincronización para conocer el estado del envío al servidor.</p>
                </AvisoInterfaz> : <>
                  <p className="text-sm">El período está listo para cerrar. Revisa el resumen antes de confirmar.</p>
                  <button onClick={() => setConfirmarCierre(true)} disabled={registrandoCierre} className="w-full rounded-xl bg-brand-terracotta-deep px-4 py-3 text-sm font-bold text-white">Cerrar facturación de {periodoTexto}</button>
                </>}
                <p className="text-sm">Cerrar facturación no elimina los datos inmediatamente. Las raciones, las fechas y los montos quedan intactos.</p>
                <p className="text-sm">El plazo configurado es de {config.diasGraciaAnonimizacion} días. El plazo y su aplicación al término del contrato están pendientes de validación con la Administradora.</p>
                {errorCierre && <AvisoInterfaz tono="error">{describirErrorUi(errorCierre)}</AvisoInterfaz>}
                {confirmarCierre && <Dialogo titulo="Confirmar cierre de facturación" onCerrar={() => { if (!registrandoCierre) setConfirmarCierre(false); }} className="ui-operativa fixed inset-0 z-[70] flex items-center justify-center bg-brand-ink/70 p-3">
                  <div className="w-full max-w-lg space-y-4 rounded-3xl border border-brand-border bg-brand-card p-5 shadow-2xl">
                    <h3 className="font-display text-xl font-bold">Confirmar cierre de {periodoTexto}</h3>
                    <p>{razonSocialEmpresa}</p><p className="text-lg font-bold">Total: {formatearMonedaCLP(cierre.granTotal)}</p>
                    <p className="text-sm">El cierre se guardará en este teléfono y se enviará al servidor al sincronizar. No elimina los datos de inmediato.</p>
                    {errorCierre && <AvisoInterfaz tono="error">{describirErrorUi(errorCierre)}</AvisoInterfaz>}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button disabled={registrandoCierre} onClick={() => setConfirmarCierre(false)} className="rounded-xl border border-brand-border bg-white px-4 py-3 font-bold">Volver a revisar</button>
                      <button disabled={registrandoCierre} onClick={handleRegistrarCierre} className="rounded-xl bg-brand-terracotta-deep px-4 py-3 font-bold text-white">{registrandoCierre ? "Guardando cierre…" : "Confirmar cierre"}</button>
                    </div>
                  </div>
                </Dialogo>}
              </section>}
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="border-t border-brand-border/70 p-4 bg-brand-sand/20 flex justify-end">
          <button
            disabled={registrandoCierre} onClick={onCerrar}
            className="rounded-xl px-4 py-2 text-sm font-bold text-brand-ink/80 hover:text-brand-ink"
          >
            Cerrar ventana
          </button>
        </div>
      </div>
    </Dialogo>
  );
}
