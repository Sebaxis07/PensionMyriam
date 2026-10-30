// Configuración centralizada de pdfMake para navegador y entornos de prueba
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Inicializar fuentes virtuales de pdfMake
const vfs = (pdfFonts as any)?.pdfMake?.vfs || (pdfFonts as any)?.vfs || (pdfFonts as any);
if (vfs) {
  (pdfMake as any).vfs = vfs;
}

export default pdfMake;

export function formatearMonedaCLP(monto: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(monto);
}
