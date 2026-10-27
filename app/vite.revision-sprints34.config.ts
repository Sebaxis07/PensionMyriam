// Configuración local independiente: no forma parte de la aplicación de producción.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import path from "node:path";

const raiz = fileURLToPath(new URL(".", import.meta.url));
const datos = fileURLToPath(new URL("./pruebas-ui-sprints34/datos.tsx", import.meta.url));
const base = "0cbbea165c8d96ae2dbcfbfeea8d1a98e881f735";

export default defineConfig({
  plugins: [{ name: "revision-aislada-sprints34", enforce: "pre", resolveId(id) {
    if (id === "@powersync/react" || /(?:^|\/)(?:powersync|supabase|useCierreMensual|useDashboardAdminMetricas)(?:\.ts)?$/.test(id)) return datos;
  }, load(id) {
    const relativo = path.relative(raiz, id.split("?")[0]).replaceAll("\\", "/");
    if (process.env.UI_ANTES === "1" && relativo.startsWith("src/") && /\.(?:tsx?|css)$/.test(relativo)) {
      try { return execFileSync("git", ["show", `${base}:app/${relativo}`], { cwd: raiz, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
      catch { /* Componentes nuevos no existen en la comparación anterior. */ }
    }
  } }, react()],
  server: { host: "127.0.0.1", strictPort: true }
});
