import { useState } from "react";
import { useQuery } from "@powersync/react";
import { supabase } from "../../lib/supabase";

export type RolUsuario = "administradora" | "encargada";

export interface UsuarioItem {
  id: string;
  auth_uid: string;
  rol: RolUsuario;
  nombre: string;
  created_at?: string;
}

export interface CrearUsuarioInput {
  nombre: string;
  email: string;
  password: string;
  rol: RolUsuario;
}

export function useGestionUsuarios() {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Consulta de usuarios locales sincronizados con PowerSync
  const { data: usuarios, isLoading } = useQuery<UsuarioItem>(
    "select id, auth_uid, rol, nombre, created_at from usuario order by nombre asc"
  );

  async function crearUsuario(input: CrearUsuarioInput): Promise<boolean> {
    const nombre = input.nombre.trim();
    const email = input.email.trim().toLowerCase();
    const password = input.password.trim();
    const rol = input.rol;

    if (!nombre) {
      throw new Error("Por favor ingresa el nombre de la persona.");
    }
    if (!email || !email.includes("@") || !email.includes(".")) {
      throw new Error("Por favor ingresa un correo electrónico válido (ej: nombre@pension-myriam.local).");
    }
    if (password.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres.");
    }
    if (rol !== "administradora" && rol !== "encargada") {
      throw new Error("Debes elegir si la cuenta será Administradora o Encargada.");
    }

    // Verificar conectividad a internet para crear la credencial de autenticación
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("Se requiere conexión a Internet para dar de alta una nueva cuenta de acceso.");
    }

    setGuardando(true);
    setError(null);

    try {
      // 1. Invocar la función RPC en Postgres
      const { error: rpcError } = await supabase.rpc("crear_cuenta_usuario", {
        p_email: email,
        p_password: password,
        p_nombre: nombre,
        p_rol: rol
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
