import type { TipoConsumo } from "./registrarConsumo";

export const SERVICIOS_INFO: Record<
  TipoConsumo,
  {
    label: string;
    nombreCorto: string;
    verbo: string;
    icon: string;
    horario: string;
    descripcion: string;
    esComidaComedor: boolean;
  }
> = {
  desayuno: {
    label: "Desayuno",
    nombreCorto: "Desayuno",
    verbo: "Servir desayuno",
    icon: "☕",
    horario: "06:30 - 10:30",
    descripcion: "Ración habitual de pensión",
    esComidaComedor: true
  },
  almuerzo: {
    label: "Almuerzo",
    nombreCorto: "Almuerzo",
    verbo: "Servir almuerzo",
    icon: "🍲",
    horario: "12:00 - 15:30",
    descripcion: "Ración habitual de pensión",
    esComidaComedor: true
  },
  cena: {
    label: "Cena",
    nombreCorto: "Cena",
    verbo: "Servir cena",
    icon: "🍽️",
    horario: "19:30 - 22:30",
    descripcion: "Ración habitual de pensión",
    esComidaComedor: true
  },
  colacion: {
    label: "Colación / Extra",
    nombreCorto: "Colación",
    verbo: "Entregar colación",
    icon: "🥪",
    horario: "Extras y terreno",
    descripcion: "Adicional con recargo monetario",
    esComidaComedor: false
  },
  cama_noche: {
    label: "Noche de cama",
    nombreCorto: "Cama noche",
    verbo: "Registrar pernocta",
    icon: "🛏️",
    horario: "Pernocta hospedaje",
    descripcion: "Generación nocturna automática",
    esComidaComedor: false
  }
};

export const LISTA_SERVICIOS_ORDENADA: TipoConsumo[] = [
  "desayuno",
  "almuerzo",
  "cena",
  "colacion",
  "cama_noche"
];

/**
 * Determina el servicio sugerido de forma automática según la hora local de Chile.
 */
export function obtenerServicioSugeridoPorHora(): TipoConsumo {
  const ahora = new Date();
  const hora = ahora.getHours();
  const minutos = ahora.getMinutes();
  const totalMinutos = hora * 60 + minutos;

  // Desayuno: 05:00 a 10:45 (300 a 645 min)
  if (totalMinutos >= 300 && totalMinutos < 645) {
    return "desayuno";
  }
  // Almuerzo: 10:45 a 16:30 (645 a 990 min)
  if (totalMinutos >= 645 && totalMinutos < 990) {
    return "almuerzo";
  }
  // Colación de tarde: 16:30 a 19:15 (990 a 1155 min)
  if (totalMinutos >= 990 && totalMinutos < 1155) {
    return "colacion";
  }
  // Cena: 19:15 a 23:45 (1155 a 1425 min)
  if (totalMinutos >= 1155 && totalMinutos < 1425) {
    return "cena";
  }
  // Noche: Cama
  return "cama_noche";
}
