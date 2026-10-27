import type { ReactNode } from "react";
import { IconAlertTriangle, IconCheckCircle } from "./Icons";

/** Solo presentación: conserva las validaciones y evita mostrar detalles internos. */
export function describirErrorUi(mensaje: string, alternativa = "No se pudo guardar. Revisa la conexión e intenta nuevamente."): string {
  if (/ps_crud|postgrest|powersync|"(?:code|path|expected|received)"\s*:|\b(?:23P01|23505|23503|42501|PGRST\w*)\b|violates|constraint|permission denied|is not a function|undefined|TypeError|JWT|SQL|stack trace|\b[a-f\d]{8}-[a-f\d]{4}-/i.test(mensaje)) {
    return alternativa;
  }
  return mensaje || alternativa;
}

export function AvisoInterfaz({ tono = "informacion", children }: {
  tono?: "informacion" | "exito" | "error";
  children: ReactNode;
}) {
  const estilo = tono === "error"
    ? "border-red-300 bg-red-50 text-red-900"
    : tono === "exito" ? "border-emerald-300 bg-emerald-50 text-emerald-900"
    : "border-brand-border bg-brand-card text-brand-ink";
  return (
    <div role={tono === "error" ? "alert" : "status"} aria-live={tono === "error" ? "assertive" : "polite"}
      className={`flex items-start gap-2.5 rounded-2xl border p-4 text-sm leading-relaxed ${estilo}`}>
      {tono === "exito" ? <IconCheckCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        : <IconAlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
