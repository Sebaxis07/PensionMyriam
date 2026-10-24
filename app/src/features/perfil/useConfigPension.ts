import { useState, useCallback } from "react";

export interface ConfigPension {
  nombrePension: string;
  whatsappContacto: string;
  bancoNombre: string;
  tipoCuenta: string;
  titularNombre: string;
  rutTitular: string;
  correoConfirmacion: string;
  // HU-03/HU-39: tarifa base por noche para turistas, editable por la
  // Administradora (el modal de edición es responsabilidad de HU-39,
  // Sprint 5 — ver tarea documentada para Codex). Antes de este campo,
  // Reservar.tsx y el voucher PDF usaban el literal 15000 directo,
  // contradiciendo el propio criterio de HU-03 ("tarifa base vigente,
  // configurable en HU-39"). El valor por defecto preserva el mismo
  // comportamiento que tenía la app hasta ahora.
  tarifaBaseNoche: number;
}

export const CONFIG_PENSION_DEFAULT: ConfigPension = {
  nombrePension: "Pensión Señora Miriam",
  whatsappContacto: "+56 9 8765 4321",
  bancoNombre: "BancoEstado",
  tipoCuenta: "CuentaRUT",
  titularNombre: "María (Pensión Señora Miriam)",
  rutTitular: "12.345.678-9",
  correoConfirmacion: "pension.paposo@gmail.com",
  tarifaBaseNoche: 15000
};

const STORAGE_KEY_CONFIG_PENSION = "pension_myriam_config_v1";

export function obtenerConfigPension(): ConfigPension {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG_PENSION);
    if (!raw) return CONFIG_PENSION_DEFAULT;
    const parsed = JSON.parse(raw);
    return { ...CONFIG_PENSION_DEFAULT, ...parsed };
  } catch {
    return CONFIG_PENSION_DEFAULT;
  }
}

export function guardarConfigPension(nuevaConfig: Partial<ConfigPension>): ConfigPension {
  try {
    const actual = obtenerConfigPension();
    const actualizada = { ...actual, ...nuevaConfig };
    localStorage.setItem(STORAGE_KEY_CONFIG_PENSION, JSON.stringify(actualizada));
    return actualizada;
  } catch {
    return { ...CONFIG_PENSION_DEFAULT, ...nuevaConfig };
  }
}

export function useConfigPension() {
  const [config, setConfigState] = useState<ConfigPension>(obtenerConfigPension);

  const actualizarConfig = useCallback((cambios: Partial<ConfigPension>) => {
    const guardada = guardarConfigPension(cambios);
    setConfigState(guardada);
  }, []);

  const restaurarDefectos = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_CONFIG_PENSION);
    } catch {
      // Ignorar errores de storage
    }
    setConfigState(CONFIG_PENSION_DEFAULT);
  }, []);

  return {
    config,
    actualizarConfig,
    restaurarDefectos
  };
}
