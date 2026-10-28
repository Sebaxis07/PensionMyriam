import { beforeEach, describe, expect, it, vi } from "vitest";
const { getAll, execute } = vi.hoisted(() => ({getAll:vi.fn(),execute:vi.fn()}));
vi.mock("../../lib/powersync",()=>({powersync:{writeTransaction:async(fn:any)=>fn({getAll,execute})}}));
import { cancelarReserva } from "./cancelarReserva";
const entrada={reservaId:"50000000-0000-0000-0000-00000000ca01",usuarioId:"10000000-0000-0000-0000-00000000ca01",motivo:"El huésped no viajará",uuidCancelacion:"90000000-0000-0000-0000-00000000ca01"};
describe("Cancelación de reserva antes de la llegada",()=>{
  beforeEach(()=>{vi.clearAllMocks();getAll.mockResolvedValue([{estado:"confirmada",tipo_cliente:"turista",ingreso:0}]);execute.mockResolvedValue({rowsAffected:1});});
  it("guarda estado, motivo, responsable y UUID sin tocar la habitación",async()=>{await cancelarReserva(entrada);expect(execute).toHaveBeenCalledTimes(1);expect(execute.mock.calls[0][0]).toContain("estado = 'cancelada'");expect(execute.mock.calls[0][1]).toEqual([entrada.motivo,entrada.usuarioId,expect.any(String),entrada.uuidCancelacion,entrada.reservaId]);});
  it("exige motivo antes de escribir",async()=>{await expect(cancelarReserva({...entrada,motivo:"  "})).rejects.toThrow();expect(execute).not.toHaveBeenCalled();});
  it("no duplica una cancelación ya registrada",async()=>{getAll.mockResolvedValue([{estado:"cancelada",tipo_cliente:"turista",ingreso:0}]);await cancelarReserva(entrada);expect(execute).not.toHaveBeenCalled();});
  it("rechaza una reserva con check-in",async()=>{getAll.mockResolvedValue([{estado:"confirmada",tipo_cliente:"turista",ingreso:1}]);await expect(cancelarReserva(entrada)).rejects.toThrow("ya ingresó");expect(execute).not.toHaveBeenCalled();});
  it("no cancela un contrato de empresa",async()=>{getAll.mockResolvedValue([{estado:"confirmada",tipo_cliente:"empresa",ingreso:0}]);await expect(cancelarReserva(entrada)).rejects.toThrow("turista");});
  it("no informa éxito si falla la escritura local",async()=>{execute.mockRejectedValue(new Error("No se pudo guardar"));await expect(cancelarReserva(entrada)).rejects.toThrow("No se pudo guardar");});
});
