import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PowerSyncContext } from "@powersync/react";
import { powersync, connectPowerSync } from "./lib/powersync";
import { supabase } from "./lib/supabase";
import { Login } from "./screens/Login";
import { Piezas } from "./screens/Piezas";
import { NotFound } from "./screens/NotFound";

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

  function handleLogout() {
    supabase.auth.signOut();
    setLoggedIn(false);
  }

  return (
    <PowerSyncContext.Provider value={powersync}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              loggedIn ? <Piezas onLogout={handleLogout} /> : <Login onLoggedIn={() => setLoggedIn(true)} />
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </PowerSyncContext.Provider>
  );
}
