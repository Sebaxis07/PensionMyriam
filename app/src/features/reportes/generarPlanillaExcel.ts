import ExcelJS from "exceljs";

export interface FilaConsumoExcel {
  fechaHora: string;
  trabajadorNombre: string;
  tipoConsumo: string;
  productoExtra: string;
  recargo: number;
}

export interface FilaDescuadreExcel {
  fecha: string;
  tipo: string;
  esperado: number;
  servido: number;
  diferencia: number;
  motivo: string;
  supervisor: string;
}

export interface DatosPlanillaExcel {
  razonSocialEmpresa: string;
  periodoMes: string;
  consumos: FilaConsumoExcel[];
  descuadres: FilaDescuadreExcel[];
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

export async function construirLibroExcel(datos: DatosPlanillaExcel): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Pensión Señora Miriam";
  wb.created = new Date();

  // ----------------------------------------------------
  // HOJA 1: Libro de Consumos
  // ----------------------------------------------------
  const wsConsumos = wb.addWorksheet("Libro de Consumos", {
    views: [{ showGridLines: true }]
  });

  // Título
  wsConsumos.addRow(["PENSIÓN SEÑORA MIRIAM - LIBRO INMUTABLE DE CONSUMOS"]);
  wsConsumos.addRow([`Empresa: ${datos.razonSocialEmpresa} | Período: ${datos.periodoMes}`]);
  wsConsumos.addRow([]);

  wsConsumos.getRow(1).font = { bold: true, size: 14, color: { argb: "FF92400E" } };
  wsConsumos.getRow(2).font = { italic: true, size: 10, color: { argb: "FF4B5563" } };

  // Encabezados
  const headerRow1 = wsConsumos.addRow([
    "Fecha y Hora",
    "Trabajador",
    "Tipo de Servicio",
    "Producto / Detalle",
    "Monto Adicional (CLP)"
  ]);

  headerRow1.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow1.alignment = { vertical: "middle", horizontal: "center" };
  headerRow1.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFB45309" } // Brand terracotta
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  });

  // Filas de datos
  datos.consumos.forEach((c) => {
    const r = wsConsumos.addRow([
      c.fechaHora,
      c.trabajadorNombre,
      ETIQUETAS_TIPO[c.tipoConsumo] || c.tipoConsumo,
      c.productoExtra || "-",
      c.recargo
    ]);
    r.getCell(5).numFmt = '"$"#,##0';
  });

  // Ancho de columnas automático
  wsConsumos.columns = [
    { width: 22 },
    { width: 30 },
    { width: 20 },
    { width: 26 },
    { width: 22 }
  ];

  // ----------------------------------------------------
  // HOJA 2: Auditoría de Descuadres
  // ----------------------------------------------------
  const wsDescuadres = wb.addWorksheet("Auditoría de Descuadres", {
    views: [{ showGridLines: true }]
  });

  // Título
  wsDescuadres.addRow(["PENSIÓN SEÑORA MIRIAM - AUDITORÍA DE DESCUADRES Y JUSTIFICACIONES"]);
  wsDescuadres.addRow([`Empresa: ${datos.razonSocialEmpresa} | Período: ${datos.periodoMes}`]);
  wsDescuadres.addRow([]);

  wsDescuadres.getRow(1).font = { bold: true, size: 14, color: { argb: "FF92400E" } };
  wsDescuadres.getRow(2).font = { italic: true, size: 10, color: { argb: "FF4B5563" } };

  // Encabezados
  const headerRow2 = wsDescuadres.addRow([
    "Fecha",
    "Servicio",
    "Dotación Pactada",
    "Raciones Servidas",
    "Diferencia",
    "Motivo Tipificado",
    "Supervisor que Autorizó"
  ]);

  headerRow2.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow2.alignment = { vertical: "middle", horizontal: "center" };
  headerRow2.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF047857" } // Emerald
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  });

  // Filas de descuadres
  datos.descuadres.forEach((d) => {
    wsDescuadres.addRow([
      d.fecha,
      ETIQUETAS_TIPO[d.tipo] || d.tipo,
      d.esperado,
      d.servido,
      d.diferencia,
      ETIQUETAS_MOTIVO[d.motivo] || d.motivo,
      d.supervisor
    ]);
  });

  wsDescuadres.columns = [
    { width: 14 },
    { width: 20 },
    { width: 18 },
    { width: 18 },
    { width: 14 },
    { width: 24 },
    { width: 28 }
  ];

  return wb;
}

export async function descargarPlanillaExcel(datos: DatosPlanillaExcel): Promise<void> {
  const wb = await construirLibroExcel(datos);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const nombreLimpio = datos.razonSocialEmpresa.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const periodoLimpio = datos.periodoMes.toLowerCase().replace(/[^a-z0-9]/g, "_");
  a.href = url;
  a.download = `planilla_contadora_${nombreLimpio}_${periodoLimpio}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
