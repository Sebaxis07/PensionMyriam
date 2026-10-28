import { useEffect, useState } from "react";
/** Refleja la señal del navegador; el servidor confirma cada operación en línea. */
export function useConexionInterfaz() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const actualizar = () => setOnline(navigator.onLine);
    window.addEventListener("online", actualizar);
    window.addEventListener("offline", actualizar);
    return () => {
      window.removeEventListener("online", actualizar);
      window.removeEventListener("offline", actualizar);
    };
  }, []);
  return online;
}
