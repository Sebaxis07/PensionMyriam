import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// PowerSync usa SQLite WASM sobre OPFS/IndexedDB: necesita los headers
// de aislamiento cross-origin para SharedArrayBuffer.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      manifest: {
        name: "Pensión Señora Miriam",
        short_name: "Pensión Miriam",
        description: "Reservas, habitaciones y consumos — Pensión Señora Miriam",
        // Colores de marca (Guiaestilos/.../styles.css): terracotta y sand.
        theme_color: "#D9583B",
        background_color: "#e1dcd2",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" }
        ]
      },
      workbox: {
        // no cachear la API/auth: solo el shell de la app. Los datos
        // los maneja PowerSync (SQLite local), no el service worker.
        navigateFallbackDenylist: [/^\/auth/, /^\/rest/],
        // Los binarios WASM de SQLite pesan hasta ~2.5 MB cada uno y
        // vienen en 4 variantes (sync/async × una/varias cifras); solo
        // se usa una en tiempo de ejecución. Precacharlas TODAS en la
        // instalación castigaría a un celular de gama media con señal
        // intermitente (justo la usuaria que este proyecto protege).
        // Se excluyen del precache y se sirven bajo demanda con
        // runtime caching: la primera vez que se necesitan se piden
        // por red y quedan cacheadas para los usos siguientes.
        globIgnores: ["**/*.wasm"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith(".wasm"),
            handler: "CacheFirst",
            options: {
              cacheName: "powersync-wasm",
              expiration: { maxEntries: 4 }
            }
          }
        ]
      }
    })
  ],
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp"
    }
  },
  preview: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp"
    }
  },
  worker: { format: "es" },
  optimizeDeps: {
    // @powersync/web crea sus propios Web Workers (new Worker(new
    // URL(...))). El pre-bundler de esbuild en dev no sabe seguir esa
    // referencia y sirve un archivo que no existe en
    // .vite/deps/WASQLiteDB.worker.js, dejando la conexión a PowerSync
    // colgada para siempre sin ningún error visible ("Failed to fetch a
    // worker script"). Excluirlo del pre-bundle es el fix documentado.
    exclude: ["@powersync/web"]
  }
});
