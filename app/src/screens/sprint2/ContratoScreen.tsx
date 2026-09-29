import { useState } from "react";
import { useEmpresas } from "../../features/empresas/useEmpresas";
import { crearContratoEmpresa } from "../../features/reservaEmpresa/crearContratoEmpresa";

/** Pantalla mínima sin estilo — prueba HU-02. */
export function ContratoScreen({ usuarioId }: { usuarioId: string }) {
  const empresas = useEmpresas();
  const [empresaId, setEmpresaId] = useState("");
  const [vigenciaDesde, setVigenciaDesde] = useState(new Date().toISOString().slice(0, 10));
  const [headcount, setHeadcount] = useState(1);
  const [tarifaConvenida, setTarifaConvenida] = useState(20000);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function guardar() {
    setError(null);
    setOk(false);
    try {
      await crearContratoEmpresa(usuarioId, { empresaId, vigenciaDesde, headcount, tarifaConvenida });
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  }

  return (
    <div>
      <h1>Nuevo contrato de empresa</h1>
      <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
        <option value="">Elige una empresa</option>
        {empresas.map((e) => (
          <option key={e.id} value={e.id}>
            {e.razon_social}
          </option>
        ))}
      </select>
      <input type="date" value={vigenciaDesde} onChange={(e) => setVigenciaDesde(e.target.value)} />
      <input type="number" value={headcount} onChange={(e) => setHeadcount(Number(e.target.value))} placeholder="Cantidad de trabajadores" />
      <input type="number" value={tarifaConvenida} onChange={(e) => setTarifaConvenida(Number(e.target.value))} placeholder="Tarifa convenida" />
      <button onClick={guardar} disabled={!empresaId}>
        Confirmar contrato
      </button>
      {ok && <p>Contrato creado.</p>}
      {error && <p>{error}</p>}
    </div>
  );
}
