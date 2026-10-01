import pdfMake, { formatearMonedaCLP } from "../../lib/pdf/pdfMakeConfig";
import type { TDocumentDefinitions } from "pdfmake/interfaces";
import type { EstadoCierreMensual } from "../cierre/useCierreMensual";

export interface DatosPreFactura {
  razonSocialEmpresa: string;
  rutEmpresa?: string | null;
  periodoMes: string; // ej: "Octubre 2026"
  folioContrato: string;
  cierre: EstadoCierreMensual;
}

const ETIQUETAS_TIPO: Record<string, string> = {
  cama_noche: "Cama / Noche",
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  cena: "Cena",
  colacion: "Colación Extra"
};

const ETIQUETAS_MOTIVO: Record<string, string> = {
  turno_extra: "Turno Extra",
  almuerzo_mina: "Almuerzo en Mina",
  corte_ruta: "Corte de Ruta",
  ausencia_justificada: "Ausencia Justificada",
  otro: "Otro motivo"
};

export function construirDocDefinicionPreFactura(datos: DatosPreFactura): TDocumentDefinitions {
  const { cierre } = datos;

  // Filas de trabajadores
  const filasTrabajadores = cierre.trabajadoresDetalle.map((t) => [
    { text: t.nombre, style: "tdTexto" },
    { text: String(t.camaNoche), style: "tdNum" },
    { text: String(t.desayuno), style: "tdNum" },
    { text: String(t.almuerzo), style: "tdNum" },
    { text: String(t.cena), style: "tdNum" },
    { text: String(t.colaciones), style: "tdNum" }
  ]);

  // Filas de justificaciones
  const filasJustificaciones = cierre.justificacionesMes.map((j) => [
    { text: j.fecha, style: "tdTexto" },
    { text: ETIQUETAS_TIPO[j.tipo] || j.tipo, style: "tdTexto" },
    { text: `${j.diferencia} ración(es)`, style: "tdNum" },
    { text: ETIQUETAS_MOTIVO[j.motivo] || j.motivo, style: "tdTexto" },
    { text: j.supervisor_nombre || "Autorizado en faena", style: "tdTexto" }
  ]);

  // Filas de colaciones extras
  const filasExtras = cierre.colacionesDetalle.map((e) => [
    { text: e.nombre, style: "tdTexto" },
    { text: String(e.cantidad), style: "tdNum" },
    { text: formatearMonedaCLP(e.precioUnitario), style: "tdNum" },
    { text: formatearMonedaCLP(e.subtotal), style: "tdNum" }
  ]);

  return {
    pageSize: "LETTER",
    pageMargins: [35, 35, 35, 35],
    content: [
      // Membrete
      {
        columns: [
          {
            stack: [
              { text: "PENSIÓN SEÑORA MIRIAM", style: "headerMarca" },
              { text: "Servicios de Hospedaje y Alimentación a Empresas", style: "subMarca" },
              { text: "Caleta Paposo · Comuna de Taltal · Región de Antofagasta", style: "metaMarca" }
            ]
          },
          {
            stack: [
              { text: "PRE-FACTURA MENSUAL", style: "tituloDoc", alignment: "right" },
              { text: `Período: ${datos.periodoMes}`, style: "metaDocDestacado", alignment: "right" },
              { text: `Fecha emisión: ${new Date().toLocaleDateString("es-CL")}`, style: "metaDoc", alignment: "right" }
            ]
          }
        ]
      },
      { text: "", margin: [0, 10, 0, 0] },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 542, y2: 0, lineWidth: 1.5, lineColor: "#B45309" }] },
      { text: "", margin: [0, 10, 0, 0] },

      // Información de la Empresa Cliente
      {
        style: "cajaInfo",
        table: {
          widths: ["*"],
          body: [
            [
              {
                fillColor: "#F9FAFB",
                stack: [
                  {
                    columns: [
                      {
                        stack: [
                          { text: [{ text: "Empresa Contratista: ", bold: true }, datos.razonSocialEmpresa] },
                          { text: [{ text: "RUT: ", bold: true }, datos.rutEmpresa || "No especificado"] }
                        ]
                      },
                      {
                        stack: [
                          { text: [{ text: "Dotación pactada: ", bold: true }, `${cierre.headcountContratado} trabajadores`] },
                          { text: [{ text: "Tarifa diaria pactada: ", bold: true }, formatearMonedaCLP(cierre.tarifaPactadaDiaria)] }
                        ],
                        alignment: "right"
                      }
                    ],
                    style: "textoInfo"
                  }
                ]
              }
            ]
          ]
        },
        layout: "noBorders"
      },

      { text: "", margin: [0, 10, 0, 0] },

      // 1. Desglose del Servicio Contratado
      { text: "1. LIQUIDACIÓN DE CONTRATO COMPLETO", style: "seccionTitulo" },
      {
        text: `Facturación por dotación completa de ${cierre.headcountContratado} trabajadores x ${cierre.totalDiasContrato} días del período:`,
        style: "parrafoNota"
      },
      {
        table: {
          widths: ["*", "auto", "auto", "auto"],
          body: [
            [
              { text: "Concepto", style: "th" },
              { text: "Días", style: "th" },
              { text: "Tarifa Diaria x Persona", style: "th" },
              { text: "Subtotal", style: "th" }
            ],
            [
              {
                text: `Pensión Completa (${cierre.headcountContratado} personas pactadas)`,
                style: "tdTexto"
              },
              { text: String(cierre.totalDiasContrato), style: "tdNum" },
              { text: formatearMonedaCLP(cierre.tarifaPactadaDiaria), style: "tdNum" },
              { text: formatearMonedaCLP(cierre.totalContratoCompleto), style: "tdNumTotal" }
            ]
          ]
        },
        layout: "lightHorizontalLines"
      },

      // 2. Colaciones Extras si las hay
      filasExtras.length > 0
        ? [
            { text: "", margin: [0, 10, 0, 0] },
            { text: "2. COLACIONES Y EXTRAS FUERA DE CONVENIO", style: "seccionTitulo" },
            {
              table: {
                widths: ["*", "auto", "auto", "auto"],
                body: [
                  [
                    { text: "Producto Extra", style: "th" },
                    { text: "Cantidad", style: "th" },
                    { text: "Precio Unitario", style: "th" },
                    { text: "Subtotal", style: "th" }
                  ],
                  ...filasExtras,
                  [
                    { text: "Subtotal Colaciones Extras", style: "tdTotalLabel", colSpan: 3 },
                    {},
                    {},
                    { text: formatearMonedaCLP(cierre.totalColacionesExtras), style: "tdNumTotal" }
                  ]
                ]
              },
              layout: "lightHorizontalLines"
            }
          ]
        : [],

      { text: "", margin: [0, 10, 0, 0] },

      // Total a Facturar
      {
        table: {
          widths: ["*", "auto"],
          body: [
            [
              { text: "TOTAL GENERAL A FACTURAR (EXENTO DE IVA)", style: "thGranTotal" },
              { text: formatearMonedaCLP(cierre.granTotal), style: "tdGranTotal" }
            ]
          ]
        },
        layout: "noBorders"
      },

      { text: "", margin: [0, 15, 0, 0] },

      // 3. Auditoría de Descuadres y Justificaciones Aprobadas
      { text: "3. AUDITORÍA DE VARIACIONES Y JUSTIFICACIONES", style: "seccionTitulo" },
      {
        text: "Registro de respaldos autorizados ante diferencias de consumo en faena (no alteran el cobro pactado):",
        style: "parrafoNota"
      },
      filasJustificaciones.length > 0
        ? {
            table: {
              widths: ["auto", "auto", "auto", "*", "*"],
              body: [
                [
                  { text: "Fecha", style: "th" },
                  { text: "Servicio", style: "th" },
                  { text: "Diferencia", style: "th" },
                  { text: "Motivo Aprobado", style: "th" },
                  { text: "Supervisor que Autorizó", style: "th" }
                ],
                ...filasJustificaciones
              ]
            },
            layout: "lightHorizontalLines"
          }
        : { text: "No se registraron diferencias de consumo en el período.", style: "parrafoVacio" },

      { text: "", margin: [0, 15, 0, 0] },

      // 4. Detalle de Consumos por Trabajador
      { text: "4. RESUMEN DE ASISTENCIA POR TRABAJADOR", style: "seccionTitulo" },
      filasTrabajadores.length > 0
        ? {
            table: {
              widths: ["*", "auto", "auto", "auto", "auto", "auto"],
              body: [
                [
                  { text: "Nombre Trabajador", style: "th" },
                  { text: "Noches", style: "th" },
                  { text: "Desayunos", style: "th" },
                  { text: "Almuerzos", style: "th" },
                  { text: "Cenas", style: "th" },
                  { text: "Colaciones", style: "th" }
                ],
                ...filasTrabajadores
              ]
            },
            layout: "lightHorizontalLines"
          }
        : { text: "Sin consumos registrados en este período.", style: "parrafoVacio" },

      { text: "", margin: [0, 30, 0, 0] },

      // Firmas
      {
        columns: [
          {
            stack: [
              { canvas: [{ type: "line", x1: 20, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: "#9CA3AF" }] },
              { text: "María (Administradora)", style: "textoFirma" },
              { text: "Pensión Señora Miriam", style: "subFirma" }
            ],
            alignment: "center"
          },
          {
            stack: [
              { canvas: [{ type: "line", x1: 20, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: "#9CA3AF" }] },
              { text: "Supervisor de Faena / Adquisiciones", style: "textoFirma" },
              { text: datos.razonSocialEmpresa, style: "subFirma" }
            ],
            alignment: "center"
          }
        ]
      }
    ],
    styles: {
      headerMarca: { fontSize: 13, bold: true, color: "#92400E" },
      subMarca: { fontSize: 9, color: "#78350F" },
      metaMarca: { fontSize: 7.5, color: "#6B7280" },
      tituloDoc: { fontSize: 13, bold: true, color: "#1F2937" },
      metaDocDestacado: { fontSize: 9.5, bold: true, color: "#92400E" },
      metaDoc: { fontSize: 8, color: "#4B5563" },
      cajaInfo: { margin: [0, 5, 0, 5] },
      textoInfo: { fontSize: 9, color: "#1F2937", lineHeight: 1.3 },
      seccionTitulo: { fontSize: 10, bold: true, color: "#92400E", margin: [0, 8, 0, 3] },
      parrafoNota: { fontSize: 8, color: "#4B5563", margin: [0, 0, 0, 5] },
      parrafoVacio: { fontSize: 8.5, italics: true, color: "#6B7280", margin: [0, 3, 0, 3] },
      th: { bold: true, fontSize: 8.5, color: "#4B5563", margin: [0, 2, 0, 2] },
      tdTexto: { fontSize: 8.5, color: "#1F2937", margin: [0, 2, 0, 2] },
      tdNum: { fontSize: 8.5, color: "#1F2937", alignment: "right", margin: [0, 2, 0, 2] },
      tdNumTotal: { fontSize: 9, bold: true, color: "#92400E", alignment: "right", margin: [0, 2, 0, 2] },
      tdTotalLabel: { fontSize: 8.5, bold: true, color: "#4B5563", alignment: "right", margin: [0, 2, 0, 2] },
      thGranTotal: { fontSize: 10.5, bold: true, color: "#92400E", margin: [0, 4, 0, 4] },
      tdGranTotal: { fontSize: 13, bold: true, color: "#92400E", alignment: "right", margin: [0, 4, 0, 4] },
      textoFirma: { fontSize: 8.5, bold: true, color: "#374151", margin: [0, 4, 0, 2] },
      subFirma: { fontSize: 7.5, color: "#6B7280" }
    }
  };
}

export function descargarPreFacturaPdf(datos: DatosPreFactura): void {
  const docDef = construirDocDefinicionPreFactura(datos);
  const nombreLimpio = datos.razonSocialEmpresa.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const periodoLimpio = datos.periodoMes.toLowerCase().replace(/[^a-z0-9]/g, "_");
  pdfMake.createPdf(docDef).download(`prefactura_${nombreLimpio}_${periodoLimpio}.pdf`);
}
