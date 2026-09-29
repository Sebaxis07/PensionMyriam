import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

// Tokens de larga duración (decisión Q): GoTrue emite refresh tokens
// largos y persistimos la sesión localmente para que la app arranque
// utilizable aunque el access_token ya haya vencido durante un corte
// de señal de días. La cola local de PowerSync no depende de que la
// sesión esté "fresca": solo la necesita al momento de subir.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
