import { useState } from "react";
import { useConciliacion, recalcularConciliacion } from "../../features/conciliacion/useConciliacion";
import { justificarDescuadre, MOTIVOS_DESCUADRE, type MotivoDescuadre } from "../../features/conciliacion/justificarDescuadre";

/** Pantalla mínima sin estilo — prueba HU-16/17. */
export function ConciliacionScreen({ usuarioId, contratoEmpresaId }: { usuarioId: string; contratoEmpresaId: string }) {
  const dias = useConciliacion(contratoEmpresaId);
  const [motivo, setMotivo] = useState<MotivoDescuadre>("ausencia_justificada");
  const [supervisorNombre, setSupervisorNombre] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function recalcular(fecha: string) {
    setError(null);
    try {
      await recalcularConciliacion(contratoEmpresaId, fecha);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo recalcular.");
    }
  }

  async function justificar(conciliacionDiariaId: string) {
    await justificarDescuadre(usuarioId, { conciliacionDiariaId, motivo, supervisorNombre });
    setSupervisorNombre("");
  }

  return (
    <div>
      <h1>Conciliación</h1>
      <table>
        <tbody>
          {dias.map((d) => (
            <tr key={d.id}>
              <td>{d.fecha}</td>
              <td>
                esperado {d.raciones_esperadas} / servido {d.raciones_servidas}
              </td>
              <td>{d.estado}</td>
              <td>
                <button onClick={() => recalcular(d.fecha)}>Recalcular</button>
              </td>
              {d.estado === "pendiente" && d.raciones_esperadas !== d.raciones_servidas && (
                <td>
                  Se factura igual por los {d.headcount_esperado} contratados.
                  <select value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoDescuadre)}>
                    {MOTIVOS_DESCUADRE.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <input
                    value={supervisorNombre}
                    onChange={(e) => setSupervisorNombre(e.target.value)}
                    placeholder="Nombre del supervisor"
                  />
                  <button onClick={() => justificar(d.id)} disabled={!supervisorNombre.trim()}>
                    Justificar diferencia
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {error && <p>{error}</p>}
    </div>
  );
}
