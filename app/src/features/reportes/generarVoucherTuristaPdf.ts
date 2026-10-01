import pdfMake, { formatearMonedaCLP } from "../../lib/pdf/pdfMakeConfig";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

export interface DatosVoucherTurista {
  reservaId: string;
  huespedNombre: string;
  habitacionNumero: number;
  fechaInicio: string;
  fechaFin?: string | null;
  nochesEstimadas?: number;
  tarifaNoche?: number;
}

export function construirDocDefinicionVoucher(datos: DatosVoucherTurista): TDocumentDefinitions {
  const tarifaPorNoche = datos.tarifaNoche ?? 15000;
  const noches = Math.max(1, datos.nochesEstimadas ?? 1);
  const total = noches * tarifaPorNoche;

  return {
    pageSize: "LETTER",
    pageMargins: [40, 40, 40, 40],
    content: [
      // Membrete
      {
        columns: [
          {
            stack: [
              { text: "PENSIÓN SEÑORA MIRIAM", style: "headerMarca" },
              { text: "Hospedaje Familiar y Alimentación", style: "subMarca" },
              { text: "Caleta Paposo, Región de Antofagasta · Chile", style: "metaMarca" }
            ]
          },
          {
            stack: [
              { text: "COMPROBANTE DE RESERVA", style: "tituloDoc", alignment: "right" },
              { text: `Folio: #${datos.reservaId.slice(0, 8).toUpperCase()}`, style: "metaDoc", alignment: "right" },
              { text: `Fecha de emisión: ${new Date().toLocaleDateString("es-CL")}`, style: "metaDoc", alignment: "right" }
            ]
          }
        ]
      },
      { text: "", margin: [0, 15, 0, 0] },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 532, y2: 0, lineWidth: 1.5, lineColor: "#B45309" }] },
      { text: "", margin: [0, 15, 0, 0] },

      // Saludo
      {
        text: `Estimado/a ${datos.huespedNombre}:`,
        style: "saludo"
      },
      {
        text: "Confirmamos la reserva de su estadía en Pensión Señora Miriam con los siguientes detalles:",
        style: "parrafo"
      },

      // Tabla de Detalle
      {
        style: "tablaDetalle",
        table: {
          widths: ["*", "auto"],
          body: [
            [{ text: "Habitación asignada", style: "th" }, { text: `Pieza #${datos.habitacionNumero}`, style: "td" }],
            [{ text: "Fecha de llegada", style: "th" }, { text: datos.fechaInicio, style: "td" }],
            [{ text: "Fecha de salida estimada", style: "th" }, { text: datos.fechaFin || "Por definir", style: "td" }],
            [{ text: "Cantidad de noches", style: "th" }, { text: `${noches} noche(s)`, style: "td" }],
            [{ text: "Tarifa por noche", style: "th" }, { text: formatearMonedaCLP(tarifaPorNoche), style: "td" }],
            [
              { text: "Total Estimado de Estadía", style: "thTotal" },
              { text: formatearMonedaCLP(total), style: "tdTotal" }
            ]
          ]
        },
        layout: "lightHorizontalLines"
      },

      { text: "", margin: [0, 15, 0, 0] },

      // Cuadro de Información Bancaria
      {
        style: "cajaBanco",
        table: {
          widths: ["*"],
          body: [
            [
              {
                fillColor: "#FEF3C7",
                stack: [
                  { text: "Datos para Transferencia Electrónica (Opcional)", style: "tituloBanco" },
                  {
                    text: [
                      { text: "Banco: ", bold: true }, "BancoEstado\n",
                      { text: "Tipo de Cuenta: ", bold: true }, "CuentaRUT\n",
                      { text: "Titular: ", bold: true }, "María (Pensión Señora Miriam)\n",
                      { text: "RUT: ", bold: true }, "12.345.678-9\n",
                      { text: "Correo de comprobante: ", bold: true }, "contacto@pension-myriam.local"
                    ],
                    style: "textoBanco"
                  },
                  {
                    text: "Nota: No exigimos abono ni garantía obligatoria. Puede abonar previamente o pagar en efectivo / transferencia al momento de su llegada.",
                    style: "notaBanco"
                  }
                ]
              }
            ]
          ]
        },
        layout: "noBorders"
      },

      { text: "", margin: [0, 25, 0, 0] },

      // Despedida
      {
        text: "¡Le esperamos con la calidez y hospitalidad de siempre en Caleta Paposo!",
        style: "despedida",
        alignment: "center"
      }
    ],
    styles: {
      headerMarca: { fontSize: 15, bold: true, color: "#92400E" },
      subMarca: { fontSize: 10, color: "#78350F" },
      metaMarca: { fontSize: 8, color: "#6B7280" },
      tituloDoc: { fontSize: 14, bold: true, color: "#1F2937" },
      metaDoc: { fontSize: 9, color: "#4B5563" },
      saludo: { fontSize: 11, bold: true, margin: [0, 0, 0, 5], color: "#1F2937" },
      parrafo: { fontSize: 10, margin: [0, 0, 0, 15], color: "#374151" },
      th: { bold: true, fontSize: 10, color: "#4B5563", margin: [0, 4, 0, 4] },
      td: { fontSize: 10, color: "#111827", alignment: "right", margin: [0, 4, 0, 4] },
      thTotal: { bold: true, fontSize: 12, color: "#92400E", margin: [0, 6, 0, 6] },
      tdTotal: { bold: true, fontSize: 13, color: "#92400E", alignment: "right", margin: [0, 6, 0, 6] },
      cajaBanco: { margin: [0, 10, 0, 10] },
      tituloBanco: { fontSize: 11, bold: true, color: "#92400E", margin: [0, 0, 0, 6] },
      textoBanco: { fontSize: 9.5, color: "#1F2937", lineHeight: 1.4 },
      notaBanco: { fontSize: 8.5, italics: true, color: "#4B5563", margin: [0, 6, 0, 0] },
      despedida: { fontSize: 10.5, italics: true, color: "#4B5563" }
    }
  };
}

export function descargarVoucherTuristaPdf(datos: DatosVoucherTurista): void {
  const docDef = construirDocDefinicionVoucher(datos);
  const nombreLimpio = datos.huespedNombre.toLowerCase().replace(/[^a-z0-9]/g, "_");
  pdfMake.createPdf(docDef).download(`voucher_${nombreLimpio}_pieza${datos.habitacionNumero}.pdf`);
}
