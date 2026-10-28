import { AvisoInterfaz, describirErrorUi } from "../../components/MensajeInterfaz";
import { useConexionInterfaz } from "../../components/useConexionInterfaz";
import { useEffect, useRef, useState } from "react";
import {
  useGestionUsuarios,
  LARGO_MINIMO_PASSWORD,
  type RolUsuario,
  type UsuarioItem
} from "./useGestionUsuarios";
import {
  IconCheckCircle,
  IconPlus,
  IconAlertTriangle
} from "../../components/Icons";

/**
 * HU-36 pide la "fecha de registro" legible. Se formatea en es-CL y sin
 * hora: a la Administradora le interesa desde cuándo existe la cuenta,
 * no el timestamp exacto.
 */
export function formatearFechaRegistro(creadoEn?: string | null): string {
  if (!creadoEn) return "fecha no registrada";
  const fecha = new Date(creadoEn);
  if (Number.isNaN(fecha.getTime())) return "fecha no registrada";
  return fecha.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

interface GestionCuentasTabProps {
  usuarioActual: { id: string; nombre: string; rol: string };
}

export function GestionCuentasTab({ usuarioActual }: GestionCuentasTabProps) {
  const aviso = useRef<HTMLDivElement>(null);
  const online = useConexionInterfaz();
  const { usuarios, isLoading, guardando, crearUsuario } = useGestionUsuarios();

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<RolUsuario>("encargada");
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  useEffect(() => { if (mensajeError || mensajeExito) aviso.current?.scrollIntoView({ block: "nearest" }); }, [mensajeError, mensajeExito]);

  const esAdmin = usuarioActual.rol === "administradora";

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setMensajeError(null);
    setMensajeExito(null);

    try {
      const creada = await crearUsuario({
        nombre,
        email,
        password,
        rol
      });

      if (!creada) { setMensajeError("No se pudo crear la cuenta. Intenta nuevamente."); return; }
      setMostrarPassword(false);
      setMensajeExito(`✓ Cuenta creada exitosamente para ${nombre} con rol de ${rol === "administradora" ? "Administradora" : "Encargada"}.`);
      setNombre("");
      setEmail("");
      setPassword("");
      setRol("encargada");
      setMostrarFormulario(false);


    } catch (err) {
      setMensajeError(describirErrorUi(err instanceof Error ? err.message : "Error al crear la cuenta."));
    }
  }

  if (!esAdmin) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center text-sm text-amber-900">
        <IconAlertTriangle className="mx-auto h-8 w-8 text-amber-600 mb-2" />
        <p className="font-bold text-sm">Acceso Restringido</p>
        <p className="mt-1">Solo la Administradora puede crear y gestionar cuentas de usuario.</p>
      </div>
    );
  }

  return (
    <div className="ui-operativa space-y-6">
      {!online && <AvisoInterfaz>Sin conexión. Puedes revisar las cuentas guardadas en este teléfono. Para crear una cuenta necesitas Internet.</AvisoInterfaz>}
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-brand-ink">
            Cuentas del Personal y Accesos
          </h3>
          <p className="text-sm text-brand-ink/80 mt-0.5">
            Crea cuentas de acceso para el equipo. Puedes asignar rol de <strong>Encargada</strong> o <strong>Administradora</strong>.
          </p>
        </div>

        <button
          type="button"
          disabled={guardando} onClick={() => {
            setPassword("");
            setMostrarFormulario(!mostrarFormulario);
            setMensajeError(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-terracotta-deep hover:bg-brand-terracotta-deep text-white px-3.5 py-2 text-sm font-bold shadow-brand transition active:scale-95 self-start sm:self-center cursor-pointer"
        >
          <IconPlus className="h-4 w-4" />
          <span>{mostrarFormulario ? "Cancelar" : "+ Crear Nueva Cuenta"}</span>
        </button>
      </div>

      {/* Mensajes de Estado */}
      {mensajeExito && (
        <div ref={aviso} role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 text-sm font-bold text-emerald-900 animate-in fade-in">
          <IconCheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {mensajeError && (
        <div ref={aviso} role="alert" className="flex items-center gap-2 rounded-2xl border border-red-300 bg-red-50 p-3.5 text-sm font-bold text-red-900 animate-in fade-in">
          <IconAlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <span>{mensajeError}</span>
        </div>
      )}

      {/* Formulario Desplegable para Crear Cuenta */}
      {mostrarFormulario && (
        <form
          onSubmit={handleCrear}
          className="rounded-3xl border border-brand-border/80 bg-brand-sand/30 p-5 space-y-4 shadow-sm animate-in fade-in duration-150"
        >
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-brand-terracotta-deep block">
              Nueva Cuenta
            </span>
            <h4 className="font-display text-base font-bold text-brand-ink">
              Datos de Acceso del Nuevo Usuario
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Nombre completo */}
            <div>
              <label htmlFor="cuenta-campo-1" className="block text-sm font-bold text-brand-ink mb-1">
                Nombre de la persona <span className="text-brand-terracotta">*</span>
              </label>
              <input disabled={guardando} id="cuenta-campo-1"
                type="text"
                required
                placeholder="Ej: Rosa Alvarado"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-terracotta focus:outline-none"
              />
            </div>

            {/* Correo electrónico */}
            <div>
              <label htmlFor="cuenta-campo-2" className="block text-sm font-bold text-brand-ink mb-1">
                Correo electrónico de acceso <span className="text-brand-terracotta">*</span>
              </label>
              <input disabled={guardando} id="cuenta-campo-2"
                type="email"
                required
                placeholder="ej: rosa@pension-myriam.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-terracotta focus:outline-none"
              />
            </div>

            {/* Contraseña */}
            <div className="sm:col-span-2">
              <label htmlFor="cuenta-password" className="block text-sm font-bold text-brand-ink mb-1">
                Contraseña inicial <span className="text-brand-terracotta">*</span> (mínimo {LARGO_MINIMO_PASSWORD} caracteres)
              </label>
              <div className="relative">
                <input disabled={guardando}
                  id="cuenta-password" aria-describedby="cuenta-password-ayuda" autoComplete="new-password" type={mostrarPassword ? "text" : "password"}
                  required
                  minLength={LARGO_MINIMO_PASSWORD}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 pr-16 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-terracotta focus:outline-none"
                />
                <button
                  type="button"
                  disabled={guardando} onClick={() => setMostrarPassword(!mostrarPassword)}
                  aria-pressed={mostrarPassword} className="mt-1 rounded-lg px-2 text-sm font-bold text-brand-terracotta-deep"
                >
                  {mostrarPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>
          </div>

          <p id="cuenta-password-ayuda" role="status" className="text-sm">{password.length >= LARGO_MINIMO_PASSWORD ? "✓ Cumple el largo mínimo de contraseña." : `Usa al menos ${LARGO_MINIMO_PASSWORD} caracteres.`}</p>
          {/* Selector Visual de Rol */}
          <div className="space-y-1.5 pt-1">
            <p className="block text-sm font-bold text-brand-ink">Selecciona el rol y nivel de acceso:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Opción Encargada */}
              <button type="button" disabled={guardando} aria-pressed={rol === "encargada"} onClick={() => setRol("encargada")}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  rol === "encargada"
                    ? "border-brand-terracotta bg-white ring-2 ring-brand-terracotta/30 shadow-xs"
                    : "border-brand-border bg-white/70 hover:bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👔</span>
                    <strong className="text-sm font-bold text-brand-ink">Encargada de Turno</strong>
                  </div>
                  <span className="rounded-full bg-blue-100 text-blue-900 border border-blue-200 px-2 py-0.5 text-sm font-black uppercase">
                    Operativo
                  </span>
                </div>
                <p className="text-sm text-brand-ink/80 mt-1.5 leading-relaxed">
                  Para quien atiende el mesón de comidas, anota raciones, asigna habitaciones y supervisa el aseo. <strong>No ve costos, compras ni márgenes.</strong>
                </p>
              </button>

              {/* Opción Administradora */}
              <button type="button" disabled={guardando} aria-pressed={rol === "administradora"} onClick={() => setRol("administradora")}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  rol === "administradora"
                    ? "border-brand-terracotta bg-white ring-2 ring-brand-terracotta/30 shadow-xs"
                    : "border-brand-border bg-white/70 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👑</span>
                    <strong className="text-sm font-bold text-brand-ink">Administradora</strong>
                  </div>
                  <span className="rounded-full bg-brand-terracotta/15 text-brand-terracotta-deep border border-brand-terracotta/30 px-2 py-0.5 text-sm font-black uppercase">
                    Acceso Total
                  </span>
                </div>
                <p className="text-sm text-brand-ink/80 mt-1.5 leading-relaxed">
                  Acceso completo al negocio: finanzas, margen mensual, compra de mercadería, gestión de contratos con mineras y creación de cuentas.
                </p>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-brand-border/60">
            <button
              type="button"
              disabled={guardando} onClick={() => setMostrarFormulario(false)}
              className="rounded-xl border border-brand-border bg-white px-4 py-2.5 text-sm font-bold text-brand-ink/80 hover:text-brand-ink"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !online}
              className="rounded-xl bg-brand-terracotta-deep hover:bg-brand-terracotta-deep px-5 py-2.5 text-sm font-bold text-white shadow-brand transition active:scale-95 disabled:opacity-50"
            >
              {guardando ? "Creando cuenta…" : "Guardar y Crear Cuenta"}
            </button>
          </div>
        </form>
      )}

      {isLoading && <p role="status">Cargando cuentas…</p>}
      {/* Lista de Cuentas Existentes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider text-brand-ink/80">
            Cuentas Registradas en el Sistema ({usuarios.length})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {usuarios.map((u: UsuarioItem) => {
            const esUsuarioActual = u.id === usuarioActual.id;
            const esRolAdmin = u.rol === "administradora";

            return (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-brand-border/80 bg-white shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-bold text-sm ${
                      esRolAdmin
                        ? "bg-brand-terracotta/15 text-brand-terracotta-deep border border-brand-terracotta/20"
                        : "bg-blue-100 text-blue-900 border border-blue-200"
                    }`}
                  >
                    {esRolAdmin ? "👑" : "👔"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="break-all text-sm sm:text-sm font-bold text-brand-ink">
                        {u.nombre}
                      </p>
                      {esUsuarioActual && (
                        <span className="rounded-full bg-brand-sand px-1.5 py-0.2 text-sm font-bold text-brand-ink/80">
                          (Tú)
                        </span>
                      )}
                    </div>
                    {/* HU-36: "veo nombre, correo, rol (con distintivo
                        visual) y fecha de registro". El correo y la
                        fecha faltaban: la tarjeta solo mostraba nombre y
                        rol. La presentación final (jerarquía, truncado,
                        tipografía) queda para Codex — ver
                        docs/sprint-5-handoff-codex.md. */}
                    <p className="break-all text-sm text-brand-ink/80" title={u.email ?? undefined}>
                      {u.email ?? "Sin correo registrado"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-sm font-bold border ${
                          esRolAdmin
                            ? "bg-brand-terracotta/10 text-brand-terracotta-deep border-brand-terracotta/20"
                            : "bg-blue-50 text-blue-800 border-blue-200"
                        }`}
                      >
                        {esRolAdmin ? "Administradora" : "Encargada"}
                      </span>
                      <span className="text-sm text-brand-ink/80">
                        Desde {formatearFechaRegistro(u.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {!isLoading && !usuarios.length && (
            <p className="col-span-full py-6 text-center text-sm text-brand-ink/80">
              No hay cuentas disponibles en este teléfono.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
