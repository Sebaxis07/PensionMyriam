import { useState } from "react";
import {
  IconUser,
  IconClose,
  IconDoorExit,
  IconCheck,
  IconCheckCircle,
  IconCompass,
  IconDollarSign,
  IconWifi,
  IconAlertTriangle,
  IconUnlock,
  IconRefresh,
  IconSearch,
  IconFileText,
  IconClipboardCheck,
  IconUsers
} from "../../components/Icons";
import { useConfigPension } from "./useConfigPension";
import { GestionCuentasTab } from "../usuarios/GestionCuentasTab";
import { supabase } from "../../lib/supabase";
import { powersync } from "../../lib/powersync";

export type TabActivoPerfil = "perfil" | "cuentas" | "pension" | "privacidad" | "preferencias" | "sistema";

interface PerfilConfigModalProps {
  onCerrar: () => void;
  usuario: { id: string; nombre: string; rol: string };
  onLogout: () => void;
  onReiniciarTour: () => void;
  onAbrirSyncModal?: () => void;
  tabInicial?: TabActivoPerfil;
}

interface TitularResultado {
  id: string;
  nombre: string;
  rut: string | null;
  tipo: "trabajador" | "turista";
  anonimizado_at: string | null;
}

export function PerfilConfigModal({
  onCerrar,
  usuario,
  onLogout,
  onReiniciarTour,
  onAbrirSyncModal,
  tabInicial = "perfil"
}: PerfilConfigModalProps) {
  const [tab, setTab] = useState<TabActivoPerfil>(tabInicial);
  const { config, actualizarConfig, restaurarDefectos } = useConfigPension();

  // Estados locales para edición de pensión
  const [formPension, setFormPension] = useState(config);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  // Estados locales para cambio de clave
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [mensajePassword, setMensajePassword] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  // Estado para confirmación de cierre de sesión
  const [confirmarSalida, setConfirmarSalida] = useState(false);

  // Estados locales para Ley 21.719 (Derechos ARCO)
  const [busquedaTitular, setBusquedaTitular] = useState("");
  const [resultadosTitulares, setResultadosTitulares] = useState<TitularResultado[]>([]);
  const [buscandoTitular, setBuscandoTitular] = useState(false);
  const [mensajePrivacidad, setMensajePrivacidad] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [titularAAnonimizar, setTitularAAnonimizar] = useState<TitularResultado | null>(null);

  const esAdmin = usuario.rol === "administradora";
  const estaOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  const handleGuardarPension = (e: React.FormEvent) => {
    e.preventDefault();
    actualizarConfig(formPension);
    setGuardadoExitoso(true);
    setTimeout(() => setGuardadoExitoso(false), 3000);
  };

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajePassword(null);

    if (!estaOnline) {
      setMensajePassword({
        tipo: "error",
        texto: "Para cambiar la contraseña necesitas conexión a Internet. Inténtalo cuando regrese la señal."
      });
      return;
    }

    if (nuevaPassword.length < 6) {
      setMensajePassword({
        tipo: "error",
        texto: "La nueva contraseña debe tener al menos 6 caracteres."
      });
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setMensajePassword({
        tipo: "error",
        texto: "Las contraseñas no coinciden. Por favor revísalas."
      });
      return;
    }

    setGuardandoPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: nuevaPassword });
      if (error) {
        setMensajePassword({
          tipo: "error",
          texto: error.message || "Error al actualizar la contraseña."
        });
      } else {
        setMensajePassword({
          tipo: "exito",
          texto: "¡Contraseña actualizada exitosamente para tus próximos inicios de sesión!"
        });
        setNuevaPassword("");
        setConfirmarPassword("");
      }
    } catch {
      setMensajePassword({
        tipo: "error",
        texto: "Error de red al actualizar contraseña. Inténtalo de nuevo."
      });
    } finally {
      setGuardandoPassword(false);
    }
  };

  // Buscar titulares en la base local (PowerSync SQLite)
  const handleBuscarTitulares = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!busquedaTitular.trim()) return;

    setBuscandoTitular(true);
    setMensajePrivacidad(null);
    try {
      const termino = `%${busquedaTitular.trim()}%`;
      // Buscar en nómina de trabajadores
      const resTrabajadores = await powersync.getAll<TitularResultado>(
        `select id, nombre, rut, 'trabajador' as tipo, anonimizado_at 
         from trabajador 
         where nombre like ? or rut like ? 
         limit 10`,
        [termino, termino]
      );

      // Buscar en reservas de turistas
      const resTuristas = await powersync.getAll<TitularResultado>(
        `select id, huesped_nombre as nombre, null as rut, 'turista' as tipo, null as anonimizado_at 
         from reserva 
         where tipo_cliente = 'turista' and huesped_nombre like ? 
         limit 10`,
        [termino]
      );

      setResultadosTitulares([...resTrabajadores, ...resTuristas]);
      if (resTrabajadores.length === 0 && resTuristas.length === 0) {
        setMensajePrivacidad({
          tipo: "error",
          texto: `No se encontraron personas registradas con el término "${busquedaTitular}".`
        });
      }
    } catch (err: any) {
      setMensajePrivacidad({
        tipo: "error",
        texto: "Error al consultar la base de datos local: " + (err.message || String(err))
      });
    } finally {
      setBuscandoTitular(false);
    }
  };

  // Descargar ficha del titular en formato JSON (Derecho de Acceso y Portabilidad)
  const handleExportarFichaTitular = async (t: TitularResultado) => {
    try {
      let consumos: any[] = [];
      let reservas: any[] = [];

      if (t.tipo === "trabajador") {
        consumos = await powersync.getAll(
          "select tipo_consumo, fecha_hora, recargo from consumo where trabajador_id = ?",
          [t.id]
        );
      } else {
        reservas = await powersync.getAll(
          "select fecha_inicio, fecha_fin, estado from reserva where id = ?",
          [t.id]
        );
      }

      const ficha = {
        plataforma: "Pensión Señora Miriam (Paposo)",
        normativa: "Ley N° 21.719 sobre Protección de Datos Personales",
        derecho_ejercido: "Acceso y Portabilidad de Datos (Art. 14)",
        fecha_exportacion: new Date().toISOString(),
        solicitado_por: usuario.nombre,
        titular: {
          id: t.id,
          tipo: t.tipo,
          nombre: t.nombre,
          rut: t.rut,
          anonimizado_at: t.anonimizado_at
        },
        registros_asociados: {
          total_consumos: consumos.length,
          consumos,
          total_reservas: reservas.length,
          reservas
        }
      };

      const blob = new Blob([JSON.stringify(ficha, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ficha_datos_${t.nombre.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setMensajePrivacidad({
        tipo: "exito",
        texto: `Ficha de datos exportada para ${t.nombre}. Se entregó respaldo conforme al derecho de portabilidad.`
      });
    } catch (err: any) {
      setMensajePrivacidad({
        tipo: "error",
        texto: "No se pudo generar la ficha: " + (err.message || String(err))
      });
    }
  };

  // Anonimizar titular manualmente (Derecho de Supresión / Cancelación)
  const handleConfirmarAnonimizacion = async () => {
    if (!titularAAnonimizar) return;
    const t = titularAAnonimizar;

    try {
      const ahora = new Date().toISOString();
      if (t.tipo === "trabajador") {
        await powersync.execute(
          "update trabajador set nombre = 'TRABAJADOR ANONIMIZADO (SOLICITUD TITULAR)', rut = null, anonimizado_at = ? where id = ?",
          [ahora, t.id]
        );
      } else {
        await powersync.execute(
          "update reserva set huesped_nombre = 'TURISTA ANONIMIZADO (SOLICITUD TITULAR)' where id = ?",
          [t.id]
        );
      }

      setTitularAAnonimizar(null);
      setMensajePrivacidad({
        tipo: "exito",
        texto: `Se anonimizó exitosamente a "${t.nombre}". Los movimientos del libro contable (Ledger) permanecen 100% íntegros y cuadrados sin datos personales identificables.`
      });

      // Refrescar resultados
      handleBuscarTitulares();
    } catch (err: any) {
      setMensajePrivacidad({
        tipo: "error",
        texto: "Error al anonimizar titular: " + (err.message || String(err))
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl border border-brand-border bg-brand-card shadow-2xl overflow-hidden">
        {/* Encabezado del Modal */}
        <div className="flex items-center justify-between border-b border-brand-border/60 px-5 py-4 bg-brand-sand-light/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-xs ${
                esAdmin ? "bg-brand-terracotta" : "bg-emerald-700"
              }`}
            >
              <IconUser className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-black text-brand-ink leading-tight">
                Mi Perfil y Configuración
              </h2>
              <p className="text-[11px] font-semibold text-brand-muted">
                {usuario.nombre} · {esAdmin ? "Administradora General" : "Encargada de Turno"}
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="rounded-full p-2 text-brand-muted hover:bg-brand-sand hover:text-brand-ink transition-colors"
            title="Cerrar ventana"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        {/* Barra de Pestañas Navegables */}
        <div className="flex border-b border-brand-border/60 bg-white/70 px-4 pt-2 gap-1 overflow-x-auto shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setTab("perfil")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              tab === "perfil"
                ? "border-brand-terracotta text-brand-terracotta bg-brand-sand-light/50 font-extrabold"
                : "border-transparent text-brand-muted hover:text-brand-ink"
            }`}
          >
            <IconUser className="h-3.5 w-3.5" />
            <span>Mi Perfil</span>
          </button>

          {esAdmin && (
            <button
              type="button"
              onClick={() => setTab("cuentas")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                tab === "cuentas"
                  ? "border-brand-terracotta text-brand-terracotta bg-brand-sand-light/50 font-extrabold"
                  : "border-transparent text-brand-muted hover:text-brand-ink"
              }`}
            >
              <IconUsers className="h-3.5 w-3.5 text-brand-terracotta" />
              <span>Cuentas Personal</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setTab("pension")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              tab === "pension"
                ? "border-brand-terracotta text-brand-terracotta bg-brand-sand-light/50 font-extrabold"
                : "border-transparent text-brand-muted hover:text-brand-ink"
            }`}
          >
            <IconDollarSign className="h-3.5 w-3.5" />
            <span>Pensión y Banco</span>
          </button>

          {esAdmin && (
            <button
              type="button"
              onClick={() => setTab("privacidad")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                tab === "privacidad"
                  ? "border-brand-terracotta text-brand-terracotta bg-brand-sand-light/50 font-extrabold"
                  : "border-transparent text-brand-muted hover:text-brand-ink"
              }`}
            >
              <IconClipboardCheck className="h-3.5 w-3.5 text-brand-terracotta" />
              <span>Ley 21.719 (Datos)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setTab("preferencias")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              tab === "preferencias"
                ? "border-brand-terracotta text-brand-terracotta bg-brand-sand-light/50 font-extrabold"
                : "border-transparent text-brand-muted hover:text-brand-ink"
            }`}
          >
            <IconCompass className="h-3.5 w-3.5" />
            <span>Tutorial</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("sistema")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              tab === "sistema"
                ? "border-brand-terracotta text-brand-terracotta bg-brand-sand-light/50 font-extrabold"
                : "border-transparent text-brand-muted hover:text-brand-ink"
            }`}
          >
            <IconWifi className="h-3.5 w-3.5" />
            <span>Diagnóstico</span>
          </button>
        </div>

        {/* Contenido scrolleable de cada pestaña */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* ========================================================= */}
          {/* PESTAÑA 1: MI PERFIL                                       */}
          {/* ========================================================= */}
          {tab === "perfil" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-brand-border/70 bg-brand-sand-light/40 p-4 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-terracotta">
                  Datos de Sesión Activa
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-brand-muted block">Nombre Completo</label>
                    <p className="text-sm font-extrabold text-brand-ink mt-0.5">{usuario.nombre}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-brand-muted block">Rol Asignado</label>
                    <span
                      className={`inline-block mt-0.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        esAdmin ? "bg-brand-terracotta/15 text-brand-terracotta" : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {esAdmin ? "Administradora" : "Encargada"}
                    </span>
                  </div>
                  <div className="sm:col-span-2 border-t border-brand-border/50 pt-2 text-[11px] text-brand-muted leading-relaxed">
                    📍 Turno activo en Caleta Paposo. Todas las operaciones de reservas, aseo y compras quedarán firmadas con tu usuario.
                  </div>
                </div>
              </div>

              {/* Sección Seguridad / Cambio de Clave */}
              <div className="rounded-2xl border border-brand-border/70 bg-white p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <IconUnlock className="h-4 w-4 text-brand-terracotta" />
                  <h3 className="font-display text-sm font-bold text-brand-ink">
                    Cambiar Contraseña
                  </h3>
                </div>
                <p className="text-xs text-brand-muted leading-relaxed">
                  Si deseas cambiar tu clave de acceso al sistema, puedes hacerlo aquí cuando tengas conexión a Internet:
                </p>

                {mensajePassword && (
                  <div
                    className={`rounded-xl p-3 text-xs flex items-start gap-2 ${
                      mensajePassword.tipo === "exito"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {mensajePassword.tipo === "exito" ? (
                      <IconCheckCircle className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <IconAlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    )}
                    <span className="font-medium leading-relaxed">{mensajePassword.texto}</span>
                  </div>
                )}

                <form onSubmit={handleCambiarPassword} className="space-y-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-brand-ink block mb-1">
                      Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={nuevaPassword}
                      onChange={(e) => setNuevaPassword(e.target.value)}
                      className="w-full rounded-xl border border-brand-border bg-brand-sand-light/30 px-3 py-2 text-xs text-brand-ink focus:border-brand-terracotta focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-brand-ink block mb-1">
                      Confirmar Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      placeholder="Repite la contraseña"
                      value={confirmarPassword}
                      onChange={(e) => setConfirmarPassword(e.target.value)}
                      className="w-full rounded-xl border border-brand-border bg-brand-sand-light/30 px-3 py-2 text-xs text-brand-ink focus:border-brand-terracotta focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={guardandoPassword || !nuevaPassword}
                      className="rounded-xl bg-brand-terracotta px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-terracotta-deep transition active:scale-95 disabled:opacity-50"
                    >
                      {guardandoPassword ? "Guardando..." : "Actualizar Contraseña"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA: CUENTAS DEL PERSONAL (SOLO ADMINISTRADORA)       */}
          {/* ========================================================= */}
          {tab === "cuentas" && esAdmin && (
            <GestionCuentasTab usuarioActual={usuario} />
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 2: PENSIÓN Y BANCO                                 */}
          {/* ========================================================= */}
          {tab === "pension" && (
            <form onSubmit={handleGuardarPension} className="space-y-4">
              <div className="rounded-2xl border border-brand-border/70 bg-brand-sand-light/40 p-4 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-terracotta">
                  Datos Comerciales de la Pensión
                </span>
                <p className="text-xs text-brand-muted leading-relaxed">
                  Estos datos aparecen en los comprobantes de reserva y mensajes automáticos de WhatsApp que se le envían a los turistas:
                </p>
              </div>

              {guardadoExitoso && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-medium flex items-center gap-2 animate-in fade-in">
                  <IconCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>¡Datos guardados con éxito! Los próximos vouchers y WhatsApp usarán esta información.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-brand-ink block mb-1">
                    Nombre del Negocio
                  </label>
                  <input
                    type="text"
                    value={formPension.nombrePension}
                    onChange={(e) => setFormPension({ ...formPension, nombrePension: e.target.value })}
                    className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-xs text-brand-ink font-semibold focus:border-brand-terracotta focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-brand-ink block mb-1">
                    WhatsApp de Atención
                  </label>
                  <input
                    type="text"
                    value={formPension.whatsappContacto}
                    onChange={(e) => setFormPension({ ...formPension, whatsappContacto: e.target.value })}
                    className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-xs text-brand-ink focus:border-brand-terracotta focus:outline-none"
                    placeholder="+56 9 8765 4321"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-brand-ink block mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={formPension.correoConfirmacion}
                    onChange={(e) => setFormPension({ ...formPension, correoConfirmacion: e.target.value })}
                    className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-xs text-brand-ink focus:border-brand-terracotta focus:outline-none"
                    placeholder="pension.paposo@gmail.com"
                  />
                </div>
              </div>

              {/* Datos Bancarios para transferencias */}
              <div className="rounded-2xl border border-brand-border/70 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-brand-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <IconDollarSign className="h-4 w-4 text-brand-terracotta" />
                    <h3 className="font-display text-sm font-bold text-brand-ink">
                      Cuenta Bancaria para Transferencias
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Pago de Turistas
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-brand-ink block mb-1">
                      Banco
                    </label>
                    <input
                      type="text"
                      value={formPension.bancoNombre}
                      onChange={(e) => setFormPension({ ...formPension, bancoNombre: e.target.value })}
                      className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-xs text-brand-ink focus:border-brand-terracotta focus:outline-none"
                      placeholder="BancoEstado"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-brand-ink block mb-1">
                      Tipo de Cuenta
                    </label>
                    <input
                      type="text"
                      value={formPension.tipoCuenta}
                      onChange={(e) => setFormPension({ ...formPension, tipoCuenta: e.target.value })}
                      className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-xs text-brand-ink focus:border-brand-terracotta focus:outline-none"
                      placeholder="CuentaRUT / Cuenta Vista"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-brand-ink block mb-1">
                      Nombre del Titular
                    </label>
                    <input
                      type="text"
                      value={formPension.titularNombre}
                      onChange={(e) => setFormPension({ ...formPension, titularNombre: e.target.value })}
                      className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-xs text-brand-ink focus:border-brand-terracotta focus:outline-none"
                      placeholder="María (Pensión Señora Miriam)"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-brand-ink block mb-1">
                      RUT del Titular
                    </label>
                    <input
                      type="text"
                      value={formPension.rutTitular}
                      onChange={(e) => setFormPension({ ...formPension, rutTitular: e.target.value })}
                      className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-xs text-brand-ink focus:border-brand-terracotta focus:outline-none"
                      placeholder="12.345.678-9"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    restaurarDefectos();
                    setFormPension(config);
                  }}
                  className="text-xs font-bold text-brand-muted hover:text-brand-ink transition"
                >
                  Restaurar valores de Paposo
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-brand-terracotta px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand-terracotta-deep transition active:scale-95"
                >
                  Guardar Datos de la Pensión
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 3: PROTECCIÓN DE DATOS (LEY 21.719)               */}
          {/* ========================================================= */}
          {tab === "privacidad" && esAdmin && (
            <div className="space-y-4">
              {/* Banner de cumplimiento legal y plazo de 30 días */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconClipboardCheck className="h-5 w-5 text-emerald-700" />
                    <h3 className="font-display text-sm font-black text-emerald-950">
                      Cumplimiento Ley N° 21.719 (Protección de Datos)
                    </h3>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200/80 text-emerald-800 px-2.5 py-0.5 rounded-full">
                    Plazo: 30 Días
                  </span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  La plataforma opera bajo el principio de <strong>minimización de datos</strong>, <strong>purga automática con pg_cron (7 días post-facturación)</strong> y <strong>seudonimización del Ledger</strong>. La ley exige responder las solicitudes de titulares en un plazo máximo de 30 días corridos.
                </p>
              </div>

              {/* Alerta de feedback */}
              {mensajePrivacidad && (
                <div
                  className={`rounded-xl p-3 text-xs flex items-start gap-2 animate-in fade-in ${
                    mensajePrivacidad.tipo === "exito"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {mensajePrivacidad.tipo === "exito" ? (
                    <IconCheckCircle className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <IconAlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  )}
                  <span className="font-medium leading-relaxed">{mensajePrivacidad.texto}</span>
                </div>
              )}

              {/* Herramienta de Derechos de Titulares (ARCO) */}
              <div className="rounded-2xl border border-brand-border/70 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-brand-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <IconSearch className="h-4 w-4 text-brand-terracotta" />
                    <h4 className="font-display text-xs font-black text-brand-ink uppercase tracking-wider">
                      Atención de Derechos de Titulares (Acceso, Rectificación, Supresión)
                    </h4>
                  </div>
                </div>

                <p className="text-xs text-brand-muted leading-relaxed">
                  Busca un trabajador o huésped para emitir su ficha de portabilidad o procesar su solicitud de borrado conforme a la normativa:
                </p>

                <form onSubmit={handleBuscarTitulares} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nombre o RUT del titular..."
                    value={busquedaTitular}
                    onChange={(e) => setBusquedaTitular(e.target.value)}
                    className="flex-1 rounded-xl border border-brand-border bg-brand-sand-light/30 px-3 py-2 text-xs text-brand-ink focus:border-brand-terracotta focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={buscandoTitular || !busquedaTitular.trim()}
                    className="rounded-xl bg-brand-terracotta px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-terracotta-deep transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <IconSearch className="h-3.5 w-3.5" />
                    <span>{buscandoTitular ? "Buscando..." : "Buscar"}</span>
                  </button>
                </form>

                {/* Lista de Resultados Encontrados */}
                {resultadosTitulares.length > 0 && (
                  <div className="mt-3 space-y-2 pt-2 border-t border-brand-border/40">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                      Titulares Encontrados ({resultadosTitulares.length}):
                    </span>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {resultadosTitulares.map((titular) => {
                        const yaAnonimizado = titular.nombre.includes("ANONIMIZADO") || !!titular.anonimizado_at;

                        return (
                          <div
                            key={titular.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-brand-border/60 bg-brand-sand-light/40"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-extrabold text-brand-ink">
                                  {titular.nombre}
                                </span>
                                {yaAnonimizado && (
                                  <span className="rounded-full bg-stone-200 text-stone-700 px-2 py-0.2 text-[9px] font-bold">
                                    Anonimizado
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-brand-muted mt-0.5">
                                {titular.rut ? `RUT: ${titular.rut}` : "Sin RUT"} · Tipo: {titular.tipo === "trabajador" ? "Nómina Contratista" : "Huésped Turista"}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleExportarFichaTitular(titular)}
                                className="flex items-center gap-1 rounded-lg border border-brand-border/80 bg-white px-2.5 py-1.5 text-[11px] font-bold text-brand-ink hover:bg-brand-sand transition"
                                title="Exportar ficha de datos (Portabilidad Art. 14)"
                              >
                                <IconFileText className="h-3.5 w-3.5 text-brand-terracotta" />
                                <span>Exportar Ficha</span>
                              </button>

                              {!yaAnonimizado && (
                                <button
                                  type="button"
                                  onClick={() => setTitularAAnonimizar(titular)}
                                  className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition"
                                  title="Anonimizar datos personales (Derecho al Olvido)"
                                >
                                  <span>Anonimizar</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal de confirmación de anonimización */}
              {titularAAnonimizar && (
                <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-rose-900">
                    <IconAlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                    <h4 className="font-display text-xs font-black">
                      Confirmar Derecho de Supresión (Ley 21.719)
                    </h4>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    ¿Estás segura de anonimizar los datos de <strong>{titularAAnonimizar.nombre}</strong>?
                    <br />
                    El nombre se reemplazará por <em>"TRABAJADOR ANONIMIZADO"</em> y se eliminará el RUT.
                    <strong> Los consumos y raciones registradas se conservarán 100% intactas</strong> para respaldar la facturación y la trazabilidad fiscal del negocio.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setTitularAAnonimizar(null)}
                      className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-brand-ink hover:bg-rose-100/50 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmarAnonimizacion}
                      className="rounded-xl bg-rose-700 px-4 py-1.5 text-xs font-black text-white hover:bg-rose-800 transition shadow-xs"
                    >
                      Sí, Anonimizar Definitivamente
                    </button>
                  </div>
                </div>
              )}

              {/* Resumen de los 6 controles implementados */}
              <div className="rounded-2xl border border-brand-border/70 bg-brand-sand-light/30 p-4 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-terracotta block">
                  Controles Técnicos y Operativos en Paposo
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-brand-muted">
                  <div className="p-2 rounded-xl bg-white border border-brand-border/60">
                    <p className="font-bold text-brand-ink">1. Minimización</p>
                    <p className="mt-0.5">Sin datos sensibles ni médicos en justificaciones.</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-brand-border/60">
                    <p className="font-bold text-brand-ink">2. Transparencia</p>
                    <p className="mt-0.5">Cláusula legal Art. 14 en PDF y WhatsApp.</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-brand-border/60">
                    <p className="font-bold text-brand-ink">3. Purga Automática</p>
                    <p className="mt-0.5">pg_cron anonimiza nóminas a los 7 días post-cierre.</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-brand-border/60">
                    <p className="font-bold text-brand-ink">4. Seudonimización Ledger</p>
                    <p className="mt-0.5">Libro contable inmutable asociado a IDs seguros.</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-brand-border/60">
                    <p className="font-bold text-brand-ink">5. Seguridad RLS</p>
                    <p className="mt-0.5">Encargada solo ingresa; solo Admin gestiona datos.</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-brand-border/60">
                    <p className="font-bold text-brand-ink">6. Bitácora de Auditoría</p>
                    <p className="mt-0.5">Registro inmutable ante fiscalizaciones de la Agencia.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 4: PREFERENCIAS Y TUTORIAL                         */}
          {/* ========================================================= */}
          {tab === "preferencias" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-brand-border/70 bg-brand-sand-light/40 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <IconCompass className="h-5 w-5 text-brand-terracotta" />
                  <h3 className="font-display text-sm font-black text-brand-ink">
                    Recorrido Guiado del Sistema
                  </h3>
                </div>
                <p className="text-xs text-brand-muted leading-relaxed">
                  ¿Tienes dudas de cómo funciona el sistema o entró una nueva encargada a trabajar? Puedes volver a iniciar el tour interactivo paso a paso cuando quieras:
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onCerrar();
                      onReiniciarTour();
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-brand-terracotta text-white text-xs font-black shadow-md hover:bg-brand-terracotta-deep active:scale-98 transition flex items-center justify-center gap-2"
                  >
                    <IconCompass className="h-4 w-4" />
                    <span>Reiniciar y ver Tour Guiado ahora →</span>
                  </button>
                </div>
              </div>

              {/* Consejos de Operación Offline */}
              <div className="rounded-2xl border border-brand-border/70 bg-white p-4 space-y-3">
                <h4 className="font-display text-xs font-extrabold text-brand-ink flex items-center gap-1.5">
                  <span>💡 Consejos para trabajar en Paposo:</span>
                </h4>
                <ul className="text-xs text-brand-muted space-y-2 leading-relaxed list-disc pl-4">
                  <li>
                    <strong>Incluso sin señal de Entel o Movistar:</strong> Puedes registrar check-ins, aseos, consumos del comedor y compras de mercadería sin parar.
                  </li>
                  <li>
                    <strong>Sincronización silenciosa:</strong> Cuando el teléfono capte señal o te conectes a Wi-Fi, los datos subirán solos sin que tengas que presionar nada.
                  </li>
                  <li>
                    <strong>No borres el historial del navegador:</strong> Para mantener la base de datos local SQLite intacta en tu dispositivo.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 5: DIAGNÓSTICO Y TURNO                             */}
          {/* ========================================================= */}
          {tab === "sistema" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-brand-border/70 bg-brand-sand-light/40 p-4 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-terracotta">
                  Estado Técnico y Red
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        estaOnline ? "bg-emerald-500 shadow-xs" : "bg-amber-500 animate-pulse"
                      }`}
                    />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                        Conexión Internet
                      </p>
                      <p className="text-xs font-extrabold text-brand-ink">
                        {estaOnline ? "Conectado a Internet" : "Sin Internet (Modo Offline)"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                      Base de Datos
                    </p>
                    <p className="text-xs font-extrabold text-brand-ink">
                      PowerSync SQLite Local
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                      Versión Aplicación
                    </p>
                    <p className="text-xs font-semibold text-brand-muted">
                      v1.2.0 · PWA Offline-first
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                      Localización
                    </p>
                    <p className="text-xs font-semibold text-brand-muted">
                      Caleta Paposo, Taltal
                    </p>
                  </div>
                </div>

                {onAbrirSyncModal && (
                  <div className="pt-2 border-t border-brand-border/50">
                    <button
                      type="button"
                      onClick={() => {
                        onCerrar();
                        onAbrirSyncModal();
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-3 py-2 text-xs font-bold text-brand-ink hover:bg-brand-sand-light transition"
                    >
                      <IconRefresh className="h-4 w-4 text-brand-terracotta" />
                      <span>Ver Detalles de Sincronización PowerSync</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Cierre de Sesión / Entrega de Turno */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <IconDoorExit className="h-5 w-5 text-rose-700" />
                  <h3 className="font-display text-sm font-black text-rose-900">
                    Finalizar Turno / Cerrar Sesión
                  </h3>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Cierra la sesión actual cuando entregues el teléfono o computador a la siguiente encargada:
                </p>

                {confirmarSalida ? (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onCerrar();
                        onLogout();
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-rose-700 text-white text-xs font-extrabold shadow-sm hover:bg-rose-800 transition active:scale-95"
                    >
                      Sí, cerrar sesión ahora
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmarSalida(false)}
                      className="py-2.5 px-4 rounded-xl bg-white border border-rose-200 text-xs font-bold text-brand-ink hover:bg-rose-50 transition"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmarSalida(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition active:scale-95"
                  >
                    <IconDoorExit className="h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="border-t border-brand-border/60 bg-brand-sand-light/50 px-5 py-3 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-semibold text-brand-muted">
            Pensión Señora Miriam · Paposo
          </span>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl bg-brand-sand px-4 py-2 text-xs font-bold text-brand-ink hover:bg-brand-sand-light transition"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
