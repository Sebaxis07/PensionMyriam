import { useState } from "react";
import { useEmpresas } from "../../features/empresas/useEmpresas";
import { crearEmpresa } from "../../features/empresas/crearEmpresa";

/** Pantalla mínima sin estilo — Antigravity la reemplaza. Solo prueba
 * que HU-11 funciona de punta a punta contra los hooks reales. */
export function EmpresasScreen() {
  const empresas = useEmpresas();
  const [razonSocial, setRazonSocial] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setError(null);
    try {
      await crearEmpresa({ razonSocial });
      setRazonSocial("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  }

  return (
    <div>
      <h1>Empresas</h1>
      <ul>
        {empresas.map((e) => (
          <li key={e.id}>{e.razon_social}</li>
        ))}
        {!empresas.length && <li>Todavía no hay empresas registradas.</li>}
      </ul>
      <input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} placeholder="Razón social" />
      <button onClick={guardar}>Guardar</button>
      {error && <p>{error}</p>}
    </div>
  );
}
