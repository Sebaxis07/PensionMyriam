import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
// Autoalojada (no Google Fonts en runtime): la señal en Paposo se corta
// por horas, y un font en un CDN externo dejaría el texto invisible o
// con FOUT justo en ese corte. Al empaquetarla, Vite la trata como un
// asset más y el Service Worker la deja disponible offline igual que el
// resto del shell de la app.
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
