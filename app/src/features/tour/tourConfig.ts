import type { DriveStep } from "driver.js";

/**
 * Configuración de pasos para el Tour General de la Pensión Señora Miriam.
 * Diseñado con lenguaje cálido, sin tecnicismos y con foco en baja alfabetización digital.
 */
export const pasosTourGeneral: DriveStep[] = [
  {
    element: "#tour-logo-identidad, #tour-logo-identidad-desktop, #tour-header-title",
    popover: {
      title: "¡Bienvenida a Pensión Señora Miriam!",
      description:
        "Este sistema está pensado especialmente para ayudarte a organizar las habitaciones, el aseo, los consumos y las cuentas de forma sencilla y segura en Paposo.",
      side: "bottom",
      align: "start"
    }
  },
  {
    element: "#tour-sync-status, #tour-sync-status-desktop",
    popover: {
      title: "Trabaja tranquila, incluso sin Internet",
      description:
        "Este círculo te avisa el estado de conexión. Si se corta la luz o el Internet en Paposo, puedes seguir registrando todo con normalidad. Tus datos se guardan en el equipo y se envían solos cuando vuelva la señal.",
      side: "bottom",
      align: "end"
    }
  },
  {
    element: "#tour-nav-habitaciones, #tour-nav-habitaciones-mobile",
    popover: {
      title: "Las 8 Habitaciones en tiempo real",
      description:
        "Aquí ves tus 8 piezas de un vistazo: Verde (Libre), Amarillo (Ocupada), Rojo (Falta hacer aseo) y Gris (Mantención). Al tocar una pieza puedes ver quién está o marcar su salida.",
      side: "right",
      align: "start"
    }
  },
  {
    element: "#tour-nav-rack, #tour-nav-rack-mobile",
    popover: {
      title: "Calendario y Ocupación Mensual",
      description:
        "Una vista mensual con las 8 piezas y todos los días. Te permite planificar con anticipación qué fechas están libres para recibir turistas o grupos de empresas.",
      side: "right",
      align: "start"
    }
  },
  {
    element: "#tour-nav-aseo, #tour-nav-aseo-mobile",
    popover: {
      title: "Aseo Diario Obligatorio",
      description:
        "El sistema te recuerda cada mañana las piezas ocupadas que necesitan limpieza para no olvidar ninguna. Con un toque marcas la pieza como aseada.",
      side: "right",
      align: "start"
    }
  },
  {
    element: "#tour-nav-consumos, #tour-nav-consumos-mobile",
    popover: {
      title: "Comedor y Raciones de Trabajadores",
      description:
        "Registra en pocos toques desayunos, almuerzos, cenas y colaciones. Así queda la constancia exacta de lo que consumió cada turno o contratista.",
      side: "right",
      align: "start"
    }
  },
  {
    element: "#tour-nav-empresas, #tour-nav-empresas-mobile",
    popover: {
      title: "Empresas y Conciliación sin Descuadres",
      description:
        "Gestiona los contratos con empresas contratistas y sus nóminas. Al final del día, el sistema compara lo servido contra la nómina pactada para que cobres lo justo.",
      side: "right",
      align: "start"
    }
  },
  {
    element: "#tour-nav-costos, #tour-nav-costos-mobile",
    popover: {
      title: "Compras de Mercadería y Costos",
      description:
        "Anota tus compras quincenales (carnes, abarrotes, verduras, gas). El sistema calcula automáticamente el costo promedio por plato y por trabajador.",
      side: "right",
      align: "start"
    }
  },
  {
    element: "#tour-nav-reservar, #tour-nav-reservar-mobile",
    popover: {
      title: "Nueva Reserva Rápida",
      description:
        "Cuando un turista llame o escriba por WhatsApp, agenda su estadía de inmediato. En Paposo no exigimos pago anticipado para confirmar.",
      side: "right",
      align: "start"
    }
  },
  {
    element: "#tour-switch-modo, #tour-switch-modo-mobile",
    popover: {
      title: "Modo Operativo y Modo Administración",
      description:
        "Si eres Administradora, puedes alternar entre el trabajo diario de la pensión y el panel de administración donde revisas las ganancias y el semáforo del mes.",
      side: "bottom",
      align: "center"
    }
  },
  {
    element: "#tour-btn-ayuda, #tour-btn-ayuda-mobile",
    popover: {
      title: "¡Listo! La ayuda siempre estará aquí",
      description:
        "Cualquier duda que tengas, haz clic en este botón de '¿Cómo funciona?' para volver a ver este recorrido o consultar cómo leer tus ganancias.",
      side: "bottom",
      align: "end"
    }
  }
];

/**
 * Configuración de pasos para el Tour del Panel de Administración y Ganancias.
 */
export const pasosTourAdmin: DriveStep[] = [
  {
    element: "#tour-chart-tacometro",
    popover: {
      title: "Velocímetro de Ganancia del Mes",
      description:
        "Te muestra tu margen de ganancia real. Si la aguja está en la zona verde, ¡tu negocio tiene buena rentabilidad! La zona roja te avisa a tiempo si los costos de compras quincenales subieron demasiado.",
      side: "right",
      align: "center"
    }
  },
  {
    element: "#tour-kpi-conciliacion",
    popover: {
      title: "Tasa de Conciliación con Empresas",
      description:
        "Indica qué porcentaje de los días del mes ya están cerrados y conciliados con las empresas contratistas, listos para facturar sin sorpresas.",
      side: "bottom",
      align: "center"
    }
  },
  {
    element: "#tour-kpi-atraso",
    popover: {
      title: "Días de Atraso en Facturación",
      description:
        "Alerta temprana para que la Administradora cierre los días pendientes y emita las facturas a las empresas antes de que termine el mes.",
      side: "bottom",
      align: "center"
    }
  },
  {
    element: "#tour-kpi-ocupacion",
    popover: {
      title: "Ocupación Real vs Capacidad",
      description:
        "Muestra cuántas camas de tus 8 piezas están ocupadas en el mes frente al total disponible de la pensión.",
      side: "bottom",
      align: "center"
    }
  },
  {
    element: "#tour-chart-raciones",
    popover: {
      title: "Raciones Servidas vs Nómina Contratada",
      description:
        "Regla de cobro: Si la empresa contrató 20 trabajadores y asistieron 18, cobras los 20 pactados. Si asistieron 22, cobras los 22 consumidos.",
      side: "top",
      align: "center"
    }
  },
  {
    element: "#tour-card-tarifa-minima",
    popover: {
      title: "Tarifa Mínima Sugerida",
      description:
        "El sistema calcula el costo real diario por trabajador (alojamiento + 4 raciones + insumos PMP) para que nunca cobres por debajo de tus costos al firmar un contrato.",
      side: "top",
      align: "center"
    }
  }
];
