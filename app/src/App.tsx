import { useEffect, useState } from "react";
import { PowerSyncContext } from "@powersync/react";
import { powersync, connectPowerSync } from "./lib/powersync";
import { supabase } from "./lib/supabase";
import { Login } from "./screens/Login";
import { Habitaciones } from "./screens/Habitaciones";

export function App() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    // Sesión cacheada (decisión Q): si ya había sesión guardada, la
    // app queda usable de inmediato aunque el token esté vencido y no
    // haya señal para refrescarlo.
    supabase.auth.getSession().then(({ data }) => {
      const hadSession = !!data.session;
      setLoggedIn(hadSession);
      if (hadSession) connectPowerSync();
    });
  }, []);

  if (loggedIn === null) return null;

  return (
    <PowerSyncContext.Provider value={powersync}>
      {loggedIn ? <Habitaciones /> : <Login onLoggedIn={() => setLoggedIn(true)} />}
    </PowerSyncContext.Provider>
  );
}
