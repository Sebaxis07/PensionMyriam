import type { OperacionRechazadaRow } from "../features/sync/operacionesRechazadas";
import { IconAlertTriangle } from "./Icons";

const NOMBRES: Record<string, string> = {
  reserva: "Reserva", consumo: "Consumo", habitacion: "Habitación", cama: "Cama",
  aseo: "Aseo", checkin: "Ingreso", checkout: "Salida", trabajador: "Trabajador",
  empresa: "Empresa", contrato_empresa: "Contrato de empresa", insumo: "Insumo",
  compra_insumo: "Compra", producto_extra: "Producto extra"
};
const COMIDAS: Record<string, string> = { desayuno: "desayuno", almuerzo: "almuerzo", cena: "cena", colacion: "colación", cama_noche: "alojamiento" };

export function describirRechazo(registro: Pick<OperacionRechazadaRow, "tabla" | "motivo">) {
  if (/huésped ya ingresó|reserva no está confirmada|cancelación ya fue registrada/i.test(registro.motivo)) {
    return "La reserva cambió en otro teléfono. Revisa en Habitaciones si el huésped ya llegó o si la reserva fue cancelada. La operación no fue aceptada.";
  }
  if (/23P01|overlap|solap|conflicting key/.test(registro.motivo)) {
    return "La cama o las fechas coinciden con otra reserva. Revisa la asignación antes de volver a registrarla.";
  }
  if (/42501|row.level|permission|permis|autoriz/i.test(registro.motivo)) {
    return "No se pudo autorizar este registro. Solicita a la Administradora que revise el acceso.";
  }
  if (/23505|duplicate|duplicad|unique/i.test(registro.motivo)) {
    return "Ya existe un registro equivalente. Comprueba lo guardado antes de repetir la acción.";
  }
  return "El servidor no aceptó este registro. Revisa la información en el módulo correspondiente.";
}

function identificarRegistro(registro: OperacionRechazadaRow) {
  const nombre = Object.hasOwn(NOMBRES, registro.tabla) ? NOMBRES[registro.tabla] : "Registro";
  try {
    const valor = JSON.parse(registro.datos_json);
    const datos = valor?.data ?? valor;
    if (registro.tabla === "reserva" && typeof datos?.huesped_nombre === "string") {
      return `${nombre} de ${datos.huesped_nombre.slice(0, 96)}`;
    }
    if (registro.tabla === "consumo" && Object.hasOwn(COMIDAS, datos?.tipo_consumo)) {
      return `Registro de ${COMIDAS[datos.tipo_consumo]}`;
    }
  } catch { /* Un detalle mal formado no debe ocultar el rechazo. */ }
  return nombre;
}

export function RegistroRechazado({ registro, resolviendo, onResolver, onReintentar, sinConexion = false }: {
  registro: OperacionRechazadaRow;
  resolviendo: boolean;
  onResolver: (id: string) => void;
  onReintentar?: () => void;
  sinConexion?: boolean;
}) {
  const fecha = new Date(registro.fecha_hora);
  const fechaTexto = Number.isNaN(fecha.getTime()) ? "Fecha no disponible" : fecha.toLocaleString("es-CL", {
    timeZone: "America/Santiago", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  });
  return (
    <article className="space-y-3 rounded-2xl border border-red-300 bg-white p-4">
      <div className="flex items-start gap-2.5">
        <IconAlertTriangle aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-red-700" />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-red-800">Necesita revisión · No aceptado</p>
          <h5 className="mt-1 font-display text-lg font-bold text-brand-ink">{identificarRegistro(registro)}</h5>
          <p className="text-sm text-brand-ink/80">Detectado: {fechaTexto}</p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-brand-ink">{describirRechazo(registro)}</p>
      {onReintentar && <div className="space-y-2">
        <p className="text-sm">Reenvía los datos del contrato sin volver a llenar el formulario ni duplicar un contrato ya guardado. Requiere conexión.</p>
        <button type="button" disabled={resolviendo || sinConexion} onClick={onReintentar} className="min-h-11 w-full rounded-xl bg-brand-terracotta-deep px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{resolviendo ? "Reintentando…" : "Reintentar guardado del contrato"}</button>
      </div>}
      <details className="rounded-xl bg-brand-sand/40 p-3 text-sm text-brand-ink">
        <summary className="cursor-pointer font-semibold">Cómo revisar este registro</summary>
        <p className="mt-2">Comprueba los datos y, si hace falta, corrígelos desde su pantalla. Este botón solo confirma que revisaste el problema: no corrige ni vuelve a enviar el registro.</p>
      </details>
      <button type="button" disabled={resolviendo} onClick={() => onResolver(registro.id)}
        className="min-h-11 w-full rounded-xl bg-brand-terracotta-deep px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
        {resolviendo ? "Guardando revisión…" : "Ya revisé este registro"}
      </button>
    </article>
  );
}
