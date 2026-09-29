import { useState } from "react";
import { useConsumoHoy } from "../../features/consumo/useConsumoHoy";
import { consumoRapido } from "../../features/consumo/consumoRapido";
import { TIPOS_RACION, type TipoRacion } from "../../features/consumo/registrarConsumo";

/** Pantalla mínima sin estilo — prueba HU-13/14/15. */
export function ConsumoScreen({ usuarioId, contratoEmpresaId }: { usuarioId: string; contratoEmpresaId: string }) {
  const [tipoRacion, setTipoRacion] = useState<TipoRacion>("almuerzo");
  const filas = useConsumoHoy(contratoEmpresaId, tipoRacion);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);

  function alternar(id: string) {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function marcar() {
    const resultados = await consumoRapido(usuarioId, seleccionados, tipoRacion);
    const fallidos = resultados.filter((r) => !r.ok);
    if (fallidos.length) alert(fallidos.map((f) => f.error).join("\n"));
    setSeleccionados([]);
  }

  return (
    <div>
      <h1>Consumo rápido</h1>
      <select value={tipoRacion} onChange={(e) => setTipoRacion(e.target.value as TipoRacion)}>
        {TIPOS_RACION.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <ul>
        {filas.map((f) => (
          <li key={f.id}>
            <label>
              <input
                type="checkbox"
                disabled={!!f.ya_registrado}
                checked={seleccionados.includes(f.id)}
                onChange={() => alternar(f.id)}
              />
              {f.nombre} {f.ya_registrado ? "(ya registrado)" : ""}
            </label>
          </li>
        ))}
      </ul>
      <button onClick={marcar} disabled={!seleccionados.length}>
        Marcar {tipoRacion} para {seleccionados.length}
      </button>
    </div>
  );
}
