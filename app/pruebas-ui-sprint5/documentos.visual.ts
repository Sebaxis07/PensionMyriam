import { test, expect } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
test("HU-32 documentos mantienen cláusulas completas y canal configurado",async({page})=>{
  await page.goto("/pruebas-ui-sprint5/index.html?vista=pension");
  const documentos = await page.evaluate(async()=>{
    const importar = (ruta:string):Promise<any> => import(/* @vite-ignore */ ruta);
    const { default: pdf } = await importar("/src/lib/pdf/pdfMakeConfig.ts");
    const { construirDocDefinicionVoucher } = await importar("/src/features/reportes/generarVoucherTuristaPdf.ts");
    const { construirDocDefinicionPreFactura } = await importar("/src/features/reportes/generarPreFacturaPdf.ts");
    const { useCierreMensual } = await importar("/pruebas-ui-sprint5/datos.tsx");
    const defs = [construirDocDefinicionVoucher({reservaId:"ejemplo",huespedNombre:"Huésped de ejemplo",habitacionNumero:1,fechaInicio:"2026-10-27",nochesEstimadas:2}),construirDocDefinicionPreFactura({razonSocialEmpresa:"Empresa de ejemplo",periodoMes:"Octubre 2026",folioContrato:"Ejemplo",cierre:useCierreMensual()})];
    const resultados = [];
    for(const doc of defs) resultados.push({texto:JSON.stringify(doc.content),pdf:await pdf.createPdf(doc).getBase64()});
    return resultados;
  });
  const carpeta=process.env.UI_EVIDENCIA;
  if(carpeta) await mkdir(carpeta,{recursive:true});
  for(let i=0;i<documentos.length;i++){
    expect(documentos[i].texto).toContain("PROTECCIÓN DE DATOS PERSONALES");
    expect(documentos[i].texto).toContain("contacto@example.invalid");
    expect(documentos[i].texto).toContain("30 días corridos");
    if(carpeta) await writeFile(`${carpeta}/${i===0?"voucher":"prefactura"}.pdf`,Buffer.from(documentos[i].pdf,"base64"));
  }
});
