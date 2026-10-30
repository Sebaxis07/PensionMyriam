import { useEffect, useRef, useState } from "react";
import { Dialogo } from "../../components/Dialogo";
import { AvisoInterfaz, describirErrorUi } from "../../components/MensajeInterfaz";
import { useConexionInterfaz } from "../../components/useConexionInterfaz";
import {
  IconUser,
  IconClose,
  IconDoorExit,
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
import { useConfigPension, type ConfigPension } from "./useConfigPension";
import { GestionCuentasTab } from "../usuarios/GestionCuentasTab";
import { LARGO_MINIMO_PASSWORD } from "../usuarios/useGestionUsuarios";
import {
  solicitarSupresionDatos,
  registrarExportacionFichaTitular,
  estaAnonimizado,
  type TipoTitular
} from "../privacidad/supresionDatos";
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
  const barraSecciones = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<TabActivoPerfil>(tabInicial);
  const { config, isLoading: cargandoConfig, actualizarConfig } = useConfigPension();

  // Estados locales para edición de pensión
  const [formPension, setFormPension] = useState<ConfigPension>(config);
  const [editandoConfig, setEditandoConfig] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);
  const [errorPension, setErrorPension] = useState<string | null>(null);

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
  // HU-34: la constancia en la bitácora debe llevar motivo. Antes no se
  // pedía en ninguna parte.
  const [motivoSupresion, setMotivoSupresion] = useState("");
  const [suprimiendo, setSuprimiendo] = useState(false);

  useEffect(() => { barraSecciones.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" }); }, [tab]);

  const esAdmin = usuario.rol === "administradora";
  const estaOnline = useConexionInterfaz();
  const configSerializada = JSON.stringify(config);
  useEffect(() => {
    if (!editandoConfig) setFormPension(JSON.parse(configSerializada));
  }, [configSerializada, editandoConfig]);

  // La configuración ahora se valida (Zod, con los mismos límites que los
  // CHECK de la tabla) y se escribe en la réplica local, que PowerSync
  // sube cuando haya señal. Por eso puede fallar y hay que decirlo: antes
  // era un setItem en localStorage que no podía rechazar nada.
  const handleGuardarPension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!esAdmin || cargandoConfig || guardandoConfig) return;
    setErrorPension(null);
    setGuardandoConfig(true);
    try {
      await actualizarConfig(formPension);
      setGuardadoExitoso(true);
      setTimeout(() => setGuardadoExitoso(false), 3000);
    } catch (err: any) {
      // Zod devuelve el primer mensaje en lenguaje cercano; si viene otra
      // cosa, se muestra tal cual antes que un "error" sin explicación.
      const primerMensaje = err?.errors?.[0]?.message ?? err?.message;
      setErrorPension(describirErrorUi(primerMensaje || "No se pudieron guardar los datos."));
    } finally { setGuardandoConfig(false); }
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

    if (nuevaPassword.length < LARGO_MINIMO_PASSWORD) {
      setMensajePassword({
        tipo: "error",
        texto: `La nueva contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`
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
        texto: "No se pudo buscar en este teléfono. Intenta nuevamente."
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

      // Entregar una copia de los datos de una persona es una SALIDA de
      // datos personales del sistema: queda en la bitácora igual que la
      // supresión. Si no hay señal no se puede registrar, y eso se dice
      // en el mensaje en vez de dar por hecho que quedó asentado.
      const registrada = await registrarExportacionFichaTitular({
        tipo_titular: t.tipo as TipoTitular,
        titular_id: t.id
      });

      setMensajePrivacidad({
        tipo: "exito",
        texto: registrada
          ? `Ficha de datos entregada para ${t.nombre}. Quedó registrada en la bitácora conforme al derecho de acceso y portabilidad.`
          : `Ficha de datos entregada para ${t.nombre}. Sin señal no se pudo registrar en la bitácora: vuelve a generarla con conexión para dejar constancia.`
      });
    } catch (err: any) {
      setMensajePrivacidad({
        tipo: "error",
        texto: "No se pudo generar la ficha. Intenta nuevamente."
      });
    }
  };

  // Anonimizar titular (Derecho de Supresión, HU-34).
  //
  // Antes esto era `powersync.execute("update trabajador set …")`: una
  // escritura local que no dejaba constancia en la bitácora, no pedía
  // motivo y no bloqueaba a nadie (el único freno era que la pestaña
  // estuviera oculta). Ahora va por el RPC del servidor, que autoriza
  // por rol y escribe la bitácora en la misma transacción — ver
  // features/privacidad/supresionDatos.ts y
  // db/migrations/0019_supresion_arco.sql.
  const handleConfirmarAnonimizacion = async () => {
    if (!titularAAnonimizar) return;
    const t = titularAAnonimizar;

    setSuprimiendo(true);
    setMensajePrivacidad(null);
    try {
      const resultado = await solicitarSupresionDatos({
        tipoTitular: t.tipo as TipoTitular,
        titularId: t.id,
        motivo: motivoSupresion
      });

      if (!resultado.ok) throw new Error("No se confirmó la eliminación. Intenta nuevamente.");
      setTitularAAnonimizar(null);
      setMotivoSupresion("");
      setMensajePrivacidad({
        tipo: "exito",
        texto: resultado.ya_estaba_anonimizado
          ? "Los datos ya estaban eliminados en el servidor. La solicitud quedó registrada igualmente. Los teléfonos sin conexión se actualizarán cuando recuperen la señal."
          : "El servidor confirmó la eliminación de los datos personales y registró la solicitud. Las raciones, las fechas y los montos quedan intactos. Los teléfonos sin conexión se actualizarán cuando recuperen la señal."
      });

      setResultadosTitulares([]);
    } catch (err: any) {
      setMensajePrivacidad({
        tipo: "error",
        texto: describirErrorUi(err?.message || "No se pudo completar la eliminación de datos.")
      });
    } finally {
      setSuprimiendo(false);
    }
  };

  return (
    <Dialogo titulo="Mi perfil y configuración" onCerrar={() => { if (!suprimiendo && !guardandoConfig && !guardandoPassword) onCerrar(); }} className="ui-operativa fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/60 p-3 sm:p-4 backdrop-blur-xs">
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
              <p className="text-sm font-semibold text-brand-ink/80">
                {usuario.nombre} · {esAdmin ? "Administradora General" : "Encargada de Turno"}
              </p>
            </div>
          </div>
          <button
            disabled={suprimiendo || guardandoConfig || guardandoPassword} onClick={onCerrar}
            className="rounded-full p-2 text-brand-ink/80 hover:bg-brand-sand hover:text-brand-ink transition-colors"
            aria-label="Cerrar perfil" title="Cerrar ventana"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        {/* Barra de Pestañas Navegables */}
        <div ref={barraSecciones} aria-label="Secciones del perfil" className="flex border-b border-brand-border/60 bg-white/70 px-4 pt-2 gap-1 overflow-x-auto shrink-0">
          <button
            type="button"
            aria-pressed={tab === "perfil"} onClick={() => setTab("perfil")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
              tab === "perfil"
                ? "border-brand-terracotta text-brand-terracotta-deep bg-brand-sand-light/50 font-extrabold"
                : "border-transparent text-brand-ink/80 hover:text-brand-ink"
            }`}
          >
            <IconUser className="h-3.5 w-3.5" />
            <span>Mi Perfil</span>
          </button>

          {esAdmin && (
            <button
              type="button"
              aria-pressed={tab === "cuentas"} onClick={() => setTab("cuentas")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
                tab === "cuentas"
                  ? "border-brand-terracotta text-brand-terracotta-deep bg-brand-sand-light/50 font-extrabold"
                  : "border-transparent text-brand-ink/80 hover:text-brand-ink"
              }`}
            >
              <IconUsers className="h-3.5 w-3.5 text-brand-terracotta" />
              <span>Cuentas Personal</span>
            </button>
          )}

          <button
            type="button"
            aria-pressed={tab === "pension"} onClick={() => setTab("pension")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
              tab === "pension"
                ? "border-brand-terracotta text-brand-terracotta-deep bg-brand-sand-light/50 font-extrabold"
                : "border-transparent text-brand-ink/80 hover:text-brand-ink"
            }`}
          >
            <IconDollarSign className="h-3.5 w-3.5" />
            <span>Pensión y Banco</span>
          </button>

          {esAdmin && (
            <button
              type="button"
              aria-pressed={tab === "privacidad"} onClick={() => setTab("privacidad")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
                tab === "privacidad"
                  ? "border-brand-terracotta text-brand-terracotta-deep bg-brand-sand-light/50 font-extrabold"
                  : "border-transparent text-brand-ink/80 hover:text-brand-ink"
              }`}
            >
              <IconClipboardCheck className="h-3.5 w-3.5 text-brand-terracotta" />
              <span>Datos personales</span>
            </button>
          )}

          <button
            type="button"
            aria-pressed={tab === "preferencias"} onClick={() => setTab("preferencias")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
              tab === "preferencias"
                ? "border-brand-terracotta text-brand-terracotta-deep bg-brand-sand-light/50 font-extrabold"
                : "border-transparent text-brand-ink/80 hover:text-brand-ink"
            }`}
          >
            <IconCompass className="h-3.5 w-3.5" />
            <span>Tutorial</span>
          </button>

          <button
            type="button"
            aria-pressed={tab === "sistema"} onClick={() => setTab("sistema")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
              tab === "sistema"
                ? "border-brand-terracotta text-brand-terracotta-deep bg-brand-sand-light/50 font-extrabold"
                : "border-transparent text-brand-ink/80 hover:text-brand-ink"
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
                <span className="text-sm font-black uppercase tracking-wider text-brand-terracotta">
                  Datos de Sesión Activa
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label htmlFor="perfil-campo-1" className="text-sm font-bold text-brand-ink/80 block">Nombre Completo</label>
                    <p className="text-sm font-extrabold text-brand-ink mt-0.5">{usuario.nombre}</p>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-brand-ink/80 block">Rol Asignado</label>
                    <span
                      className={`inline-block mt-0.5 rounded-full px-2.5 py-0.5 text-sm font-black uppercase tracking-wider ${
                        esAdmin ? "bg-brand-terracotta/15 text-brand-terracotta" : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {esAdmin ? "Administradora" : "Encargada"}
                    </span>
                  </div>
                  <div className="sm:col-span-2 border-t border-brand-border/50 pt-2 text-sm text-brand-ink/80 leading-relaxed">
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
                <p className="text-sm text-brand-ink/80 leading-relaxed">
                  Si deseas cambiar tu clave de acceso al sistema, puedes hacerlo aquí cuando tengas conexión a Internet:
                </p>

                {mensajePassword && (
                  <div
                    className={`rounded-xl p-3 text-sm flex items-start gap-2 ${
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
                    <label className="text-sm font-bold text-brand-ink block mb-1">
                      Nueva Contraseña
                    </label>
                    <input id="perfil-campo-1"
                      type="password"
                      placeholder={`Mínimo ${LARGO_MINIMO_PASSWORD} caracteres`}
                      value={nuevaPassword}
                      onChange={(e) => setNuevaPassword(e.target.value)}
                      className="w-full rounded-xl border border-brand-border bg-brand-sand-light/30 px-3 py-2 text-sm text-brand-ink focus:border-brand-terracotta focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="perfil-campo-2" className="text-sm font-bold text-brand-ink block mb-1">
                      Confirmar Nueva Contraseña
                    </label>
                    <input id="perfil-campo-2"
                      type="password"
                      placeholder="Repite la contraseña"
                      value={confirmarPassword}
                      onChange={(e) => setConfirmarPassword(e.target.value)}
                      className="w-full rounded-xl border border-brand-border bg-brand-sand-light/30 px-3 py-2 text-sm text-brand-ink focus:border-brand-terracotta focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={guardandoPassword || !nuevaPassword}
                      className="rounded-xl bg-brand-terracotta-deep px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-brand-terracotta-deep transition active:scale-95 disabled:opacity-50"
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
            <form onSubmit={handleGuardarPension} noValidate aria-busy={guardandoConfig || cargandoConfig} className="space-y-4">
              <div><h3 className="font-display text-xl font-bold">Datos de la pensión</h3><p className="mt-2 text-sm">Estos datos se usan en los próximos comprobantes y mensajes de WhatsApp.</p></div>
              {!esAdmin && <AvisoInterfaz>Solo lectura. La Administradora puede cambiar estos datos.</AvisoInterfaz>}
              {cargandoConfig && <p role="status">Cargando la configuración del teléfono…</p>}
              {guardadoExitoso && <AvisoInterfaz tono="exito">Datos guardados en este teléfono, pendientes de sincronización. Revisa el indicador de sincronización para conocer el estado del envío.</AvisoInterfaz>}
              {errorPension && <AvisoInterfaz tono="error">{errorPension}</AvisoInterfaz>}
              <fieldset disabled={!esAdmin || cargandoConfig || guardandoConfig} className="min-w-0 space-y-4">
                {([
                  { titulo: "Contacto y tarifa", campos: [
                    ["nombrePension", "Nombre de la pensión", "text"],
                    ["whatsappContacto", "Teléfono de contacto", "tel"],
                    ["correoContacto", "Correo para contacto y solicitudes de datos", "email"],
                    ["tarifaBaseNoche", "Tarifa por noche ($ CLP)", "number"]
                  ] },
                  { titulo: "Datos para transferencias", campos: [
                    ["bancoNombre", "Banco", "text"], ["tipoCuenta", "Tipo de cuenta", "text"],
                    ["titularNombre", "Nombre del titular", "text"], ["rutTitular", "RUT del titular", "text"]
                  ] }
                ]).map(grupo => <section key={grupo.titulo} className="space-y-4 rounded-2xl border border-brand-border bg-white p-4">
                  <h4 className="font-display text-lg font-bold">{grupo.titulo}</h4>
                  {grupo.campos.map(([clave, etiqueta, tipo]) => <div key={clave}>
                    <label htmlFor={"config-" + clave} className="mb-1 block text-sm font-bold">{etiqueta}</label>
                    <input id={"config-" + clave} type={tipo} required min={tipo === "number" ? 1 : undefined} max={tipo === "number" ? 1000000 : undefined} step={tipo === "number" ? 1 : undefined}
                      value={formPension[clave as keyof ConfigPension]} onChange={e => { setEditandoConfig(true); setGuardadoExitoso(false); setFormPension({ ...formPension, [clave]: tipo === "number" ? Number(e.target.value) : e.target.value }); }}
                      className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-base text-brand-ink disabled:bg-brand-sand/20 disabled:text-brand-ink"
                      aria-describedby={clave === "correoContacto" ? "config-correo-ayuda" : undefined}/>
                    {clave === "correoContacto" && <p id="config-correo-ayuda" className="mt-2 text-sm">Este correo aparece en los comprobantes. Verifica que puedas recibir allí las solicitudes sobre datos personales.</p>}
                  </div>)}
                </section>)}
              </fieldset>
              <AvisoInterfaz>Plazo configurado para proteger las nóminas: {config.diasGraciaAnonimizacion} días. El plazo y las condiciones de aplicación están pendientes de validación con la Administradora. Cerrar facturación no elimina los datos de inmediato.</AvisoInterfaz>
              {esAdmin && <button type="submit" disabled={cargandoConfig || guardandoConfig} className="w-full rounded-xl bg-brand-terracotta-deep px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{guardandoConfig ? "Guardando en este teléfono…" : "Guardar datos de la pensión"}</button>}
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
                      Solicitudes sobre datos personales
                    </h3>
                  </div>
                  <span className="text-sm font-black uppercase tracking-wider bg-emerald-200/80 text-emerald-800 px-2.5 py-0.5 rounded-full">
                    Plazo: 30 Días
                  </span>
                </div>
                <p className="text-sm text-emerald-800 leading-relaxed">
                  Aquí puedes atender una solicitud para consultar o eliminar datos personales. Registra solo lo necesario y evita información médica o sensible. El plazo de respuesta es de 30 días corridos.
                </p>
              </div>

              {/* Alerta de feedback */}
              {mensajePrivacidad && (
                <div
                  role={mensajePrivacidad.tipo === "error" ? "alert" : "status"} className={`rounded-xl p-3 text-sm flex items-start gap-2 animate-in fade-in ${
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

              {!estaOnline && <AvisoInterfaz>Sin conexión. Puedes buscar datos guardados en el teléfono. Para eliminar datos personales necesitas Internet; puedes hacerlo cuando vuelva la señal.</AvisoInterfaz>}
              {/* Herramienta de Derechos de Titulares (ARCO) */}
              <div className="rounded-2xl border border-brand-border/70 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-brand-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <IconSearch className="h-4 w-4 text-brand-terracotta" />
                    <h4 className="font-display text-sm font-black text-brand-ink uppercase tracking-wider">
                      Buscar a la persona
                    </h4>
                  </div>
                </div>

                <p className="text-sm text-brand-ink/80 leading-relaxed">
                  Busca a la persona para entregar una copia de sus datos o atender su solicitud de eliminación. La búsqueda consulta los datos guardados en este teléfono.
                </p>

                <form onSubmit={handleBuscarTitulares} className="flex flex-col gap-2 sm:flex-row"><label htmlFor="privacidad-busqueda" className="sr-only">Nombre o RUT de la persona</label>
                  <input
                    type="text"
                    id="privacidad-busqueda" placeholder="Nombre o RUT de la persona"
                    value={busquedaTitular}
                    onChange={(e) => setBusquedaTitular(e.target.value)}
                    className="flex-1 rounded-xl border border-brand-border bg-brand-sand-light/30 px-3 py-2 text-sm text-brand-ink focus:border-brand-terracotta focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={buscandoTitular || !busquedaTitular.trim()}
                    className="rounded-xl bg-brand-terracotta-deep px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-brand-terracotta-deep transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <IconSearch className="h-3.5 w-3.5" />
                    <span>{buscandoTitular ? "Buscando..." : "Buscar"}</span>
                  </button>
                </form>

                {/* Lista de Resultados Encontrados */}
                {resultadosTitulares.length > 0 && (
                  <div className="mt-3 space-y-2 pt-2 border-t border-brand-border/40">
                    <span className="text-sm font-bold uppercase tracking-wider text-brand-ink/80 block">
                      Titulares Encontrados ({resultadosTitulares.length}):
                    </span>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {resultadosTitulares.map((titular) => {
                        // La marca exacta la define features/privacidad/
                        // supresionDatos.ts, para que pantalla y servidor
                        // no discrepen sobre qué cuenta como anonimizado.
                        const yaAnonimizado =
                          estaAnonimizado(titular.tipo as TipoTitular, titular.nombre) ||
                          titular.nombre.includes("ANONIMIZADO") ||
                          !!titular.anonimizado_at;

                        return (
                          <div
                            key={titular.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-brand-border/60 bg-brand-sand-light/40"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-extrabold text-brand-ink">
                                  {titular.nombre}
                                </span>
                                {yaAnonimizado && (
                                  <span className="rounded-full bg-stone-200 text-stone-700 px-2 py-0.2 text-[9px] font-bold">
                                    Anonimizado
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-brand-ink/80 mt-0.5">
                                {titular.rut ? `RUT: ${titular.rut}` : "Sin RUT"} · Tipo: {titular.tipo === "trabajador" ? "Nómina Contratista" : "Huésped Turista"}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleExportarFichaTitular(titular)}
                                className="flex items-center gap-1 rounded-lg border border-brand-border/80 bg-white px-2.5 py-1.5 text-sm font-bold text-brand-ink hover:bg-brand-sand transition"
                                title="Exportar ficha de datos (Portabilidad Art. 14)"
                              >
                                <IconFileText className="h-3.5 w-3.5 text-brand-terracotta" />
                                <span>Exportar Ficha</span>
                              </button>

                              {!yaAnonimizado && (
                                <button
                                  type="button"
                                  disabled={!estaOnline || suprimiendo} onClick={() => { setMotivoSupresion(""); setMensajePrivacidad(null); setTitularAAnonimizar(titular); }}
                                  className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-sm font-bold text-rose-700 hover:bg-rose-100 transition"
                                  title="Anonimizar datos personales (Derecho al Olvido)"
                                >
                                  <span>Eliminar datos personales</span>
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
                <Dialogo titulo="Confirmar eliminación de datos personales" onCerrar={() => { if (!suprimiendo) { setTitularAAnonimizar(null); setMotivoSupresion(""); } }} className="ui-operativa fixed inset-0 z-[70] flex items-center justify-center bg-brand-ink/70 p-3">
                  <div className="w-full max-w-lg space-y-4 rounded-3xl border border-rose-300 bg-brand-card p-5 shadow-2xl" aria-busy={suprimiendo}>
                    <h3 className="font-display text-xl font-bold text-rose-900">Eliminar datos personales</h3>
                    <p className="text-base">Persona seleccionada: <strong>{titularAAnonimizar.nombre}</strong></p>
                    <p className="text-sm">Se reemplazará su nombre y se quitarán sus datos de identificación del registro seleccionado. Esta acción es irreversible.</p>
                    <p className="text-sm font-bold">Las raciones, las fechas y los montos del libro de cuentas quedan intactos.</p>
                    <p className="text-sm">Los teléfonos sin conexión conservarán su copia hasta que vuelvan a sincronizar.</p>
                    <div><label htmlFor="supresion-motivo" className="mb-2 block text-sm font-bold">¿Por qué se eliminan estos datos?</label>
                      <textarea id="supresion-motivo" autoFocus rows={3} minLength={5} maxLength={500} disabled={suprimiendo} value={motivoSupresion} onChange={e => setMotivoSupresion(e.target.value)} aria-describedby="supresion-ayuda" className="w-full rounded-xl border border-brand-border bg-white p-3"/>
                      <p id="supresion-ayuda" className="mt-2 text-sm">Escribe entre 5 y 500 caracteres, sin información médica ni sensible. El motivo y la fecha quedan como respaldo de la solicitud.</p>
                    </div>
                    {!estaOnline && <AvisoInterfaz>Necesitas conexión para confirmar esta operación.</AvisoInterfaz>}
                    {mensajePrivacidad?.tipo === "error" && <AvisoInterfaz tono="error">{mensajePrivacidad.texto}</AvisoInterfaz>}
                    {suprimiendo && <p role="status">Esperando confirmación del servidor…</p>}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button type="button" disabled={suprimiendo} onClick={() => { setTitularAAnonimizar(null); setMotivoSupresion(""); }} className="rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-bold">Cancelar</button>
                      <button type="button" onClick={handleConfirmarAnonimizacion} disabled={suprimiendo || !estaOnline || motivoSupresion.trim().length < 5} className="rounded-xl bg-rose-800 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{suprimiendo ? "Eliminando…" : "Confirmar eliminación"}</button>
                    </div>
                  </div>
                </Dialogo>
              )}

              <AvisoInterfaz>La eliminación automática de nombres y RUT espera al término del contrato y al cierre del período correspondiente. El plazo configurado de {config.diasGraciaAnonimizacion} días y estas condiciones requieren validación con la Administradora.</AvisoInterfaz>
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
                <p className="text-sm text-brand-ink/80 leading-relaxed">
                  ¿Tienes dudas de cómo funciona el sistema o entró una nueva encargada a trabajar? Puedes volver a iniciar el tour interactivo paso a paso cuando quieras:
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onCerrar();
                      onReiniciarTour();
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-brand-terracotta-deep text-white text-sm font-black shadow-md hover:bg-brand-terracotta-deep active:scale-98 transition flex items-center justify-center gap-2"
                  >
                    <IconCompass className="h-4 w-4" />
                    <span>Reiniciar y ver Tour Guiado ahora →</span>
                  </button>
                </div>
              </div>

              {/* Consejos de Operación Offline */}
              <div className="rounded-2xl border border-brand-border/70 bg-white p-4 space-y-3">
                <h4 className="font-display text-sm font-extrabold text-brand-ink flex items-center gap-1.5">
                  <span>💡 Consejos para trabajar en Paposo:</span>
                </h4>
                <ul className="text-sm text-brand-ink/80 space-y-2 leading-relaxed list-disc pl-4">
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
                <span className="text-sm font-black uppercase tracking-wider text-brand-terracotta">
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
                      <p className="text-sm font-bold uppercase tracking-wider text-brand-ink/80">
                        Conexión Internet
                      </p>
                      <p className="text-sm font-extrabold text-brand-ink">
                        {estaOnline ? "Conectado a Internet" : "Sin Internet (Modo Offline)"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-brand-ink/80">
                      Base de Datos
                    </p>
                    <p className="text-sm font-extrabold text-brand-ink">
                      PowerSync SQLite Local
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-brand-ink/80">
                      Versión Aplicación
                    </p>
                    <p className="text-sm font-semibold text-brand-ink/80">
                      v1.2.0 · PWA Offline-first
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-brand-ink/80">
                      Localización
                    </p>
                    <p className="text-sm font-semibold text-brand-ink/80">
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
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-bold text-brand-ink hover:bg-brand-sand-light transition"
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
                <p className="text-sm text-rose-800 leading-relaxed">
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
                      className="flex-1 py-2.5 px-3 rounded-xl bg-rose-700 text-white text-sm font-extrabold shadow-sm hover:bg-rose-800 transition active:scale-95"
                    >
                      Sí, cerrar sesión ahora
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmarSalida(false)}
                      className="py-2.5 px-4 rounded-xl bg-white border border-rose-200 text-sm font-bold text-brand-ink hover:bg-rose-50 transition"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmarSalida(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100 transition active:scale-95"
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
          <span className="text-sm font-semibold text-brand-ink/80">
            Pensión Señora Miriam · Paposo
          </span>
          <button
            type="button"
            disabled={suprimiendo || guardandoConfig || guardandoPassword} onClick={onCerrar}
            className="rounded-xl bg-brand-sand px-4 py-2 text-sm font-bold text-brand-ink hover:bg-brand-sand-light transition"
          >
            Listo
          </button>
        </div>
      </div>
    </Dialogo>
  );
}
