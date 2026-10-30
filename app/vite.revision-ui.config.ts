// Entorno local de presentación con datos ficticios. No inicia sesión ni conecta APIs.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import path from "node:path";

const raiz = fileURLToPath(new URL(".", import.meta.url));
const mock = fileURLToPath(new URL("./pruebas-ui/datos.tsx", import.meta.url));
const base = "8bd04a5ec610b90e3b87d3eed6fb5e42d0fa433b";
const originales = new Set([
  "src/index.css", "src/components/RoomCard.tsx", "src/components/RoomSheet.tsx",
  "src/components/SyncStatusBadge.tsx", "src/components/SyncStatusModal.tsx",
  "src/components/Header.tsx", "src/screens/Piezas.tsx", "src/screens/Reservar.tsx",
  "src/screens/RackHotelero.tsx", "src/screens/AseoHoy.tsx", "src/screens/sprint2/ContratoScreen.tsx",
  "src/screens/sprint2/EmpresasScreen.tsx", "src/screens/sprint2/NominaScreen.tsx"
]);

export default defineConfig({
  plugins: [
    { name: "solo-presentacion-local", enforce: "pre", resolveId(id) {
      if (id === "@powersync/react" || /(?:^|\/)(?:powersync|supabase)(?:\.ts)?$/.test(id)) return mock;
    }, load(id) {
      const relativo = path.relative(raiz, id.split("?")[0]).replaceAll("\\", "/");
      if (process.env.UI_ANTES === "1" && originales.has(relativo)) {
        return execFileSync("git", ["show", `${base}:app/${relativo}`], { cwd: raiz, encoding: "utf8" });
      }
    } }, react()
  ],
  server: { host: "127.0.0.1", strictPort: true },
});
