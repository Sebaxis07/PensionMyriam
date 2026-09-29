import { useQuery } from "@powersync/react";
import { supabase } from "./supabase";
import { useEffect, useState } from "react";

type UsuarioRow = { id: string; rol: string; nombre: string };

/**
 * Resuelve la fila de public.usuario de quien inició sesión, a partir
 * del auth_uid del JWT — offline, sin pedirle nada al servidor (usuario
 * está sincronizado de solo lectura, ver 0004_sync_usuario.sql). Todas
 * las escrituras (creado_por/realizado_por/responsable) necesitan este
 * id, no el auth_uid.
 */
export function useUsuarioActual() {
  const [authUid, setAuthUid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthUid(data.session?.user.id ?? null);
    });
  }, []);

  const { data } = useQuery<UsuarioRow>(
    "select id, rol, nombre from usuario where auth_uid = ?",
    [authUid ?? ""]
  );

  return data?.[0] ?? null;
}
