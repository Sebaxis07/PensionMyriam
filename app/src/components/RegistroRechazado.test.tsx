// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { RegistroRechazado, describirRechazo } from "./RegistroRechazado";
import { describirErrorUi } from "./MensajeInterfaz";

afterEach(cleanup);
const registro={id:"rechazo-ejemplo",tabla:"reserva",operacion:"PUT",motivo:"23P01 conflicting key violates constraint",datos_json:JSON.stringify({huesped_nombre:"Huésped de ejemplo"}),fecha_hora:"2026-10-26T12:00:00Z",resuelta:0,resuelta_por:null,resuelta_en:null};

describe("Presentación de HU-42",()=>{
  it("identifica el registro y explica el conflicto sin códigos internos",()=>{
    render(<RegistroRechazado registro={registro} resolviendo={false} onResolver={()=>{}}/>);
    expect(screen.getByRole("heading")).toHaveTextContent("Reserva de Huésped de ejemplo");
    expect(screen.getByText(/La cama o las fechas coinciden/)).toBeVisible();
    expect(document.body).not.toHaveTextContent(/23P01|constraint|PUT/);
  });
  it("no filtra importes, RUT ni JSON de un contrato en texto o atributos",()=>{
    const {container}=render(<RegistroRechazado registro={{...registro,tabla:"contrato_empresa",datos_json:'{"tarifa_convenida":98765432,"rut":"DATO-NO-MOSTRAR"}'}} resolviendo={false} onResolver={()=>{}}/>);
    expect(container.innerHTML).not.toMatch(/98765432|DATO-NO-MOSTRAR|tarifa_convenida/);
    expect(screen.getByRole("heading")).toHaveTextContent("Contrato de empresa");
  });
  it("un detalle mal formado no hace desaparecer el rechazo",()=>{
    render(<RegistroRechazado registro={{...registro,datos_json:"{"}} resolviendo={false} onResolver={()=>{}}/>);
    expect(screen.getByRole("heading")).toHaveTextContent("Reserva");
    expect(screen.getByRole("button",{name:"Ya revisé este registro"})).toBeEnabled();
  });
  it("la única acción conserva el id original y se deshabilita al resolver",()=>{
    const resolver=vi.fn();
    const {rerender}=render(<RegistroRechazado registro={registro} resolviendo={false} onResolver={resolver}/>);
    fireEvent.click(screen.getByRole("button"));
    expect(resolver).toHaveBeenCalledTimes(1);
    expect(resolver).toHaveBeenCalledWith(registro.id);
    rerender(<RegistroRechazado registro={registro} resolviendo onResolver={resolver}/>);
    expect(screen.getByRole("button",{name:"Guardando revisión…"})).toBeDisabled();
  });
  it("distingue falta de permiso y duplicado sin devolver el error original",()=>{
    expect(describirRechazo({tabla:"consumo",motivo:"42501 permission denied"})).toMatch(/autorizar/);
    expect(describirRechazo({tabla:"consumo",motivo:"23505 duplicate key"})).toMatch(/equivalente/);
  });
  it("mantiene las validaciones legibles y sustituye detalles técnicos de otros formularios",()=>{
    expect(describirErrorUi("Indica la cantidad comprada.")).toBe("Indica la cantidad comprada.");
    expect(describirErrorUi("PGRST403 permission denied 42501")).not.toMatch(/PGRST|42501|permission/);
  });
});
