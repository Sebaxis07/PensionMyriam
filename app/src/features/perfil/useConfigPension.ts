import { useCallback } from "react";
import { useQuery } from "@powersync/react";
import { z } from "zod";
import { powersync } from "../../lib/powersync";

/**
 * HU-39: "un modal de configuración para editar los datos de contacto,
 * la tarifa base por noche y los datos de transferencia, para mantener
 * actualizados los comprobantes sin tocar el código".
 *
 * POR QUÉ ESTO DEJÓ DE VIVIR SOLO EN localStorage
 *
 * La versión anterior guardaba todo en el localStorage del navegador.
 * Funcionaba para una persona en un teléfono, pero la pensión opera con
 * DOS celulares: si la Administradora cambiaba la CuentaRUT en el suyo,
 * el de la Encargada seguía emitiendo comprobantes con los datos de
 * fábrica sin que nadie se enterara. El criterio de HU-39 ("los
 * próximos comprobantes PDF reflejan la nueva información") no se
 * cumple si "los próximos" depende de qué teléfono los imprimió.
 *
 * La fuente de verdad es ahora la tabla `config_negocio` (fila única),
 * que PowerSync replica a los dos equipos y que solo la Administradora
 * puede editar (RLS, ver db/migrations/0018_cierre_facturacion_y_config.sql).
 * Sigue funcionando sin señal: lo que se lee es la réplica local.
 *
 * localStorage queda SOLO como espejo de lectura síncrona, porque los
 * generadores de PDF y el armador del mensaje de WhatsApp son funciones
 * síncronas y no pueden esperar una consulta. El espejo se refresca con
 * cada valor que llega de la réplica y nunca es la fuente de verdad.
 */
export interface ConfigPension {
  nombrePension: string;
  whatsappContacto: string;
  /**
   * Correo del negocio: sirve para recibir el comprobante de
   * transferencia y, a la vez, como canal para que un titular ejerza
   * sus derechos ARCO (HU-32). Va impreso en el voucher.
   */
  correoContacto: string;
  bancoNombre: string;
  tipoCuenta: string;
  titularNombre: string;
  rutTitular: string;
  /**
   * HU-03/HU-39: tarifa base por noche del turista. Antes de este campo,
   * Reservar.tsx y el voucher PDF usaban el literal 15000, contradiciendo
   * el propio criterio de HU-03 ("tarifa base vigente, configurable en
   * HU-39").
   */
  tarifaBaseNoche: number;
  /**
   * HU-33: plazo de gracia antes de anonimizar la nómina ya facturada.
   * El criterio oficial lo marca como "propuesto: 7 días, POR VALIDAR
   * con la Administradora" — por eso es un parámetro y no una constante.
   * Lo aplica el job de pg_cron en el servidor; acá solo se lee y edita.
   */
  diasGraciaAnonimizacion: number;
}

export const CONFIG_PENSION_DEFAULT: ConfigPension = {
  nombrePension: "Pensión Señora Miriam",
  whatsappContacto: "+56 9 8765 4321",
  correoContacto: "pension.paposo@gmail.com",
  bancoNombre: "BancoEstado",
  tipoCuenta: "CuentaRUT",
  titularNombre: "María (Pensión Señora Miriam)",
  rutTitular: "12.345.678-9",
  tarifaBaseNoche: 15000,
  diasGraciaAnonimizacion: 7
};

// v2: el espejo cambió de forma (correoConfirmacion -> correoContacto,
// nuevo diasGraciaAnonimizacion). Una clave nueva evita leer un espejo
// v1 con campos que ya no existen.
const STORAGE_KEY_CONFIG_PENSION = "pension_myriam_config_v2";

/**
 * Los límites son los mismos CHECK que tiene la tabla: la validación de
 * pantalla no puede ser más laxa que la de la base, o la fila se
 * aceptaría local y la rechazaría el servidor al sincronizar.
 */
export const ConfigPensionSchema = z.object({
  nombrePension: z.string().trim().min(1, "Escribe el nombre de la pensión"),
  whatsappContacto: z.string().trim().min(1, "Escribe el teléfono de contacto"),
  correoContacto: z
    .string()
    .trim()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Escribe un correo válido: va impreso en el comprobante"),
  bancoNombre: z.string().trim().min(1, "Escribe el nombre del banco"),
  tipoCuenta: z.string().trim().min(1, "Escribe el tipo de cuenta"),
  titularNombre: z.string().trim().min(1, "Escribe el nombre del titular de la cuenta"),
  rutTitular: z.string().trim().min(1, "Escribe el RUT del titular de la cuenta"),
  tarifaBaseNoche: z
    .number({ invalid_type_error: "La tarifa debe ser un número" })
    .int("La tarifa se cobra en pesos enteros")
    .positive("La tarifa por noche debe ser mayor que cero")
    .max(1_000_000, "La tarifa por noche no puede superar $1.000.000"),
  diasGraciaAnonimizacion: z
    .number({ invalid_type_error: "Los días deben ser un número" })
    .int("Los días deben ser un número entero")
    .min(1, "El plazo debe ser de al menos 1 día")
    .max(90, "El plazo no puede superar los 90 días")
});

/** Fila tal como llega de la réplica local (nombres de columna de Postgres). */
export interface ConfigNegocioRow {
  id: string;
  nombre_pension: string | null;
  whatsapp_contacto: string | null;
  correo_contacto_arco: string | null;
  banco_nombre: string | null;
  tipo_cuenta: string | null;
  titular_nombre: string | null;
  rut_titular: string | null;
  tarifa_base_noche: number | null;
  dias_gracia_anonimizacion: number | null;
}

/**
 * Cada campo cae al valor de fábrica por separado: si la réplica todavía
 * no bajó una columna, el comprobante sale con el dato de siempre en vez
 * de con un hueco en blanco.
 */
export function filaAConfig(fila: Partial<ConfigNegocioRow> | null | undefined): ConfigPension {
  if (!fila) return CONFIG_PENSION_DEFAULT;
  const tarifa = Number(fila.tarifa_base_noche);
  const dias = Number(fila.dias_gracia_anonimizacion);
  return {
    nombrePension: fila.nombre_pension || CONFIG_PENSION_DEFAULT.nombrePension,
    whatsappContacto: fila.whatsapp_contacto || CONFIG_PENSION_DEFAULT.whatsappContacto,
    correoContacto: fila.correo_contacto_arco || CONFIG_PENSION_DEFAULT.correoContacto,
    bancoNombre: fila.banco_nombre || CONFIG_PENSION_DEFAULT.bancoNombre,
    tipoCuenta: fila.tipo_cuenta || CONFIG_PENSION_DEFAULT.tipoCuenta,
    titularNombre: fila.titular_nombre || CONFIG_PENSION_DEFAULT.titularNombre,
    rutTitular: fila.rut_titular || CONFIG_PENSION_DEFAULT.rutTitular,
    tarifaBaseNoche: Number.isFinite(tarifa) && tarifa > 0 ? tarifa : CONFIG_PENSION_DEFAULT.tarifaBaseNoche,
    diasGraciaAnonimizacion:
      Number.isFinite(dias) && dias > 0 ? dias : CONFIG_PENSION_DEFAULT.diasGraciaAnonimizacion
  };
}

/**
 * Lectura SÍNCRONA para los generadores de comprobantes (pdfmake,
 * WhatsApp). Devuelve el último valor replicado que el hook dejó en el
 * espejo; si nunca hubo uno (primera carga, storage bloqueado), los
 * valores de fábrica.
 */
export function obtenerConfigPension(): ConfigPension {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG_PENSION);
    if (!raw) return CONFIG_PENSION_DEFAULT;
    return { ...CONFIG_PENSION_DEFAULT, ...JSON.parse(raw) };
  } catch {
    return CONFIG_PENSION_DEFAULT;
  }
}

/** Refresca el espejo de lectura síncrona. No es la fuente de verdad. */
export function sincronizarEspejoConfig(config: ConfigPension): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG_PENSION, JSON.stringify(config));
  } catch {
    // Storage lleno o bloqueado: los comprobantes salen con los valores
    // de fábrica. No se rompe nada.
  }
}

/**
 * Escribe la configuración en la réplica local; PowerSync la sube cuando
 * haya señal (también sirve sin conexión). Si quien escribe no es la
 * Administradora, RLS no le deja ninguna fila que actualizar en el
 * servidor — por eso la pantalla además debe impedírselo, para que no
 * crea que guardó algo que nunca se va a propagar.
 */
export async function guardarConfigNegocio(cambios: ConfigPension): Promise<ConfigPension> {
  const datos = ConfigPensionSchema.parse(cambios);
  await powersync.execute(
    `update config_negocio
        set nombre_pension = ?, whatsapp_contacto = ?, correo_contacto_arco = ?,
            banco_nombre = ?, tipo_cuenta = ?, titular_nombre = ?, rut_titular = ?,
            tarifa_base_noche = ?, dias_gracia_anonimizacion = ?, updated_at = ?
      where id = 'singleton'`,
    [
      datos.nombrePension,
      datos.whatsappContacto,
      datos.correoContacto,
      datos.bancoNombre,
      datos.tipoCuenta,
      datos.titularNombre,
      datos.rutTitular,
      datos.tarifaBaseNoche,
      datos.diasGraciaAnonimizacion,
      new Date().toISOString()
    ]
  );
  sincronizarEspejoConfig(datos);
  return datos;
}

export function useConfigPension() {
  const { data: filas, isLoading } = useQuery<ConfigNegocioRow>(
    "select * from config_negocio where id = 'singleton'"
  );

  const config = filaAConfig(filas?.[0]);

  // Mantiene al día el espejo que leen los generadores de comprobantes.
  if (filas && filas.length > 0) {
    sincronizarEspejoConfig(config);
  }

  const actualizarConfig = useCallback(
    async (nueva: ConfigPension) => guardarConfigNegocio(nueva),
    []
  );

  /**
   * Vuelve a dejar los valores de fábrica. Es una escritura normal por el
   * mismo camino validado (no un borrado): la fila de configuración es
   * única y compartida por los dos celulares, así que "restaurar" no
   * puede significar eliminarla.
   */
  const restaurarDefectos = useCallback(
    async () => guardarConfigNegocio(CONFIG_PENSION_DEFAULT),
    []
  );

  return {
    config,
    isLoading,
    actualizarConfig,
    restaurarDefectos
  };
}
