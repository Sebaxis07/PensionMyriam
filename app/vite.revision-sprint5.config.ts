// Adaptadores exclusivos de revisión: Vite productivo no carga este archivo.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import path from "node:path";
const raiz = fileURLToPath(new URL(".", import.meta.url));
const datos = fileURLToPath(new URL("./pruebas-ui-sprint5/datos.tsx", import.meta.url));
export default defineConfig({
  plugins: [{ name: "revision-sprint5", enforce: "pre", resolveId(id) {
    if (id === "@powersync/react" || /(?:^|\/)(?:powersync|supabase|useCierreMensual|useDashboardAdminMetricas)(?:\.ts)?$/.test(id)) return datos;
  }, load(id) {
    const relativo = path.relative(raiz, id.split("?")[0]).replaceAll("\\", "/");
    if (process.env.UI_ANTES === "1" && relativo.startsWith("src/") && /\.(?:tsx?|css)$/.test(relativo)) {
      try { return execFileSync("git", ["show", `6fb9b44:app/${relativo}`], { cwd: raiz, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { /* Nuevo componente visual. */ }
    }
  } }, react()], server: { host: "127.0.0.1", strictPort: true }
});
