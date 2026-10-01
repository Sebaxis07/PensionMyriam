import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabase";
import { connectPowerSync } from "../lib/powersync";
import logo from "../assets/logo.webp";

export function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError("No se pudo ingresar. Revisa tu usuario y contraseña.");
      return;
    }
    await connectPowerSync();
    onLoggedIn();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-sand px-4 py-8">
      <div className="w-full max-w-sm rounded-3xl border border-brand-border/80 bg-brand-card p-7 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center">
            <img src={logo} alt="Pensión Señora Miriam" className="mx-auto h-20 w-20 object-contain" />
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-brand-terracotta">
              Sistema de Gestión
            </p>
            <h1 className="mt-0.5 font-display text-2xl font-black text-brand-ink">
              Pensión Señora Miriam
            </h1>
            <p className="mt-1 text-xs text-brand-muted">
              Paposo, Región de Antofagasta
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-brand-muted">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="usuario@pension.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-3 text-base text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-brand-muted">
                Contraseña
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-3 text-base text-brand-ink focus:border-brand-terracotta focus:outline-none focus:ring-2 focus:ring-brand-terracotta/20"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-[50px] w-full items-center justify-center rounded-2xl bg-brand-terracotta p-3.5 text-base font-bold text-white shadow-brand transition-all hover:bg-brand-terracotta-deep active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
