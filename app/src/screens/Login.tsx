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
    <div className="flex min-h-screen items-center justify-center bg-brand-sand p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-brand-border bg-brand-card p-6 shadow-lg"
      >
        <img src={logo} alt="" className="mx-auto h-20 w-20" />
        <h1 className="text-center font-display text-xl font-semibold text-brand-ink">
          Pensión Señora Miriam
        </h1>
        <input
          type="email"
          required
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-brand-border p-3 text-lg"
        />
        <input
          type="password"
          required
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-brand-border p-3 text-lg"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled