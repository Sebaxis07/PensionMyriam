// Todas las rutas pasan por Caddy con las mismas rutas que espera
// supabase-js (/auth/v1, /rest/v1). En dev apuntan a localhost; en
// producción, al dominio del Droplet.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "http://localhost:8080";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
export const POWERSYNC_URL = import.meta.env.VITE_POWERSYNC_URL ?? "http://localhost:8081";
