import { useState } from "react";
import { useQuery } from "@powersync/react";
import { supabase } from "../../lib/supabase";

export type RolUsuario = "administradora" | "encargada";

/**
 * HU-35: "una contraseña de al menos 12 caracteres (política propia del
 * proyecto, superior al mínimo de 8 de OWASP ASVS 5.0)". Antes acá y en
 * la función de Postgres se exigían 6.
 */
export const LARGO_MINIMO_PASSWORD = 12;

export interface UsuarioItem {
  id: string;
  auth_uid: string;
  rol: RolUsuario;
  nombre: string;
  /** HU-36: el correo vive en public.usuario desde 0017 (auth.users no se replica). */
  email: string | null;
  created_at?: string;
}

export interface CrearUsuarioInput {
  nombre: string;
  email: string;
  password: string;
  rol: RolUsuario;
}

export interface DatosCuentaNormalizados {
  nombre: string;
  email: string;
  password: string;
  rol: RolUsuario;
}

/**
 * Validación y normalización del alta de cuenta. Es una función pura y
 * exportada a propósito: así la prueba verifica ESTA lógica —la que
 * corre en producción— y no una copia reescrita dentro del test.
 *
 * Lanza con un mensaje en lenguaje cercano (las usuarias tienen
 * alfabetización digital básica, CLAUDE.md). Es la primera barrera, no
 * la única: la misma política se verifica en el servidor, donde sí es
 * infranqueable (db/migrations/0017_seguridad_cuentas.sql).
 */
export function validarDatosCuenta(input: CrearUsuarioInput): DatosCuentaNormalizados {
  const nombre = (input.nombre ?? "").trim();
  const email = (input.email ?? "").trim().toLowerCase();
  // La contraseña NO se recorta: puede empezar o terminar con espacio a
  // propósito, y recortarla cambiaría la credencial que queda guardada.
  const password = input.password ?? "";

  if (!nombre) {
    throw new Error("Por favor ingresa el nombre de la persona.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(
      "Por favor ingresa un correo electrónico válido (ej: nombre@pension-myriam.local)."
    );
  }
  if (password.trim().length === 0) {
    throw new Error("Por favor ingresa una contraseña.");
  }
  if (password.length < LARGO_MINIMO_PASSWORD) {
    throw new Error(`La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`);
  }
  if (input.rol !== "administradora" && input.rol !== "encargada") {
    throw new Error("Debes elegir si la cuenta será Administradora o Encargada.");
  }

  return { nombre, email, password, rol: input.rol };
}

export function useGestionUsuarios() {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // HU-36: "veo nombre, correo, rol (con distintivo visual) y fecha de
  // registro". Sale de la réplica local, así que la lista también se
  // consulta sin señal. En el celular de la Encargada esta consulta
  // devuelve solo su propia fila (bucket usuario_propio_encargada,
  // infra/powersync/config.yaml) y la pestaña que la usa está fuera de
  // su alcance.
  const { data: usuarios, isLoading } = useQuery<UsuarioItem>(
    "select id, auth_uid, rol, nombre, email, created_at from usuario order by rol asc, nombre asc"
  );

  async function crearUsuario(input: CrearUsuarioInput): Promise<boolean> {
    const datos = validarDatosCuenta(input);

    // Crear la credencial exige hablar con el servidor: no hay forma de
    // emitir un hash bcrypt ni una identidad de GoTrue desde la cola
    // offline. Se avisa antes de intentarlo para no dejar la operación
    // colgada y que la nueva colaboradora quede sin poder entrar.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error(
        "Se requiere conexión a Internet para dar de alta una nueva cuenta de acceso."
      );
    }

    setGuardando(true);
    setError(null);

    try {
      // Vía RPC y no supabase.auth.signUp: HU-35 pide que "mi sesión
      // siga activa" al terminar. signUp o admin.createUser desde el
      // cliente reemplazarían la sesión de la Administradora por la de
      // la cuenta recién creada, dejándola fuera de su propio panel. El
      // RPC crea la cuenta en el servidor y no toca el token de quien
      // llama.
      const { error: rpcError } = await supabase.rpc("crear_cuenta_usuario", {
        p_email: datos.email,
        p_password: datos.password,
        p_nombre: datos.nombre,
        p_rol: datos.rol
      });

      if (rpcError) {
        throw new Error(rpcError.message || "Error al crear la cuenta en el servidor.");
      }

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperado al crear la cuenta.";
      setError(msg);
      throw new Error(msg);
    } finally {
      setGuardando(false);
    }
  }

  return {
    usuarios: usuarios ?? [],
    isLoading,
    guardando,
    error,
    crearUsuario
  };
}
