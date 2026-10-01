import { z } from "zod";
import { powersync } from "../../lib/powersync";

// HU-11: "razón social, RUT, contacto y tarifa convenida por trabajador"
// — la tarifa en realidad vive en contrato_empresa (versionada por
// vigencia, ver crearContratoEmpresa), no en empresa: una empresa puede
// tener varios contratos a lo largo del tiempo con tarifas distintas.
export const EmpresaSchema = z.object({
  razonSocial: z.string().trim().min(1, "Ingresa la razón social de la empresa"),
  rut: z.string().trim().optional(),
  contacto: z.string().trim().optional()
});
export type EmpresaInput = z.infer<typeof EmpresaSchema>;

export async function crearEmpresa(input: EmpresaInput): Promise<string> {
  const datos = EmpresaSchema.parse(input);
  const id = crypto.randomUUID();
  await powersync.execute(
    "insert into empresa (id, razon_social, rut, contacto, created_at) values (?, ?, ?, ?, ?)",
    [id, datos.razonSocial, datos.rut || null, datos.contacto || null, new Date().toISOString()]
  );
  return id;
}
