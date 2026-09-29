import { useEffect, useState } from "react";
import { useNomina } from "../../features/nomina/useNomina";
import { crearTrabajadores, camasLibresParaContrato, asignarTrabajador, type CamaLibreRow } from "../../features/nomina/asignarTrabajador";

/** Pantalla mínima sin estilo — prueba HU-12. */
export function NominaScreen({ usuarioId, contratoEmpresaId }: { usuarioId: string; contratoEmpresaId: string }) {
  const nomina = useNomina(contratoEmpresaId);
  const [nombresTexto, setNombresTexto] = useState("");
  const [camasLibres, setCamasLibres] = useState<CamaLibreRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sinCama = nomina.filter((t) => !t.cama_id);

  useEffect(() => {
    camasLibresParaContrato(new Date().toISOString().slice(0, 10), null).then(setCamasLibres);
  }, [nomina.length]);

  async function cargarNombres() {
    await crearTrabajadores(contratoEmpresaId, nombresTexto.split("\n"));
    setNombresTexto("");
  }

  async function asignar(trabajadorId: string, camaId: string) {
    setError(null);
    try {
      await asignarTrabajador(usuarioId, {
        trabajadorId,
        camaId,
        contratoEmpresaId,
        fechaInicio: new Date().toISOString().slice(0, 10)
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo asignar.");
    }
  }

  const faltan = sinCama.length - camasLibres.length;

  return (
    <div>
      <h1>Nómina</h1>
      <ul>
        {nomina.map((t) => (
          <li key={t.id}>
            {t.nombre} — {t.cama_id ? "con cama" : "sin cama"}
          </li>
        ))}
      </ul>

      <textarea
        value={nombresTexto}
        onChange={(e) => setNombresTexto(e.target.value)}
        placeholder="Un nombre por línea"
      />
      <button onClick={cargarNombres}>Cargar nombres</button>

      <h2>Asignar cama</h2>
      {camasLibres.length === 0 && <p>No hay piezas disponibles para asignar en este momento.</p>}
      {faltan > 0 && <p>Faltan {faltan} cama(s) para completar la nómina.</p>}
      {sinCama.map((t) => (
        <div key={t.id}>
          {t.nombre}:
          {camasLibres.map((c) => (
            <button key={c.cama_id} onClick={() => asignar(t.id, c.cama_id)}>
              Pieza {c.numero}
            </button>
          ))}
        </div>
      ))}
      {error && <p>{error}</p>}
    </div>
  );
}
