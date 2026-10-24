import { describe, it, expect } from "vitest";
import { clasificarErrorSync } from "./connector";

/**
 * HU-28/HU-42: clasifica los errores que puede devolver PostgREST al
 * subir una operación de la cola de PowerSync. La distinción central
 * es "ya se aplicó, es un reintento" (23505 sobre uuid_idempotente,
 * ver 0001_init.sql) vs. "esto es un rechazo real de negocio" (mismo
 * código 23505 pero sobre otra columna, o cualquier otro error
 * permanente) vs. "transitorio, hay que reintentar" (5xx / red).
 */
describe("clasificarErrorSync", () => {
  it("clasifica como transitorio un error 5xx del servidor", () => {
    expect(clasificarErrorSync({ status: 503, message: "Service Unavailable" })).toBe("transitorio");
  });

  it("clasifica como transitorio un error de red sin status ni code", () => {
    expect(clasificarErrorSync(new TypeError("fetch failed"))).toBe("transitorio");
  });

  it("clasifica como duplicado_idempotente un reintento que choca con el unique de uuid_idempotente", () => {
    const error = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "aseo_uuid_idempotente_key"'
    };
    expect(clasificarErrorSync(error)).toBe("duplicado_idempotente");
  });

  it("clasifica como duplicado_idempotente sin importar en qué tabla ocurra (checkin, consumo, etc.)", () => {
    const error = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "consumo_uuid_idempotente_key"'
    };
    expect(clasificarErrorSync(error)).toBe("duplicado_idempotente");
  });

  it("NO confunde un 23505 de negocio (otro unique distinto) con un duplicado idempotente benigno", () => {
    // Ej.: índice único de "no doble ración del mismo tipo el mismo día" —
    // es un rechazo real que la Administradora debe poder ver, no un
    // simple reintento de la misma operación.
    const error = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "consumo_unico_por_dia_tipo"'
    };
    expect(clasificarErrorSync(error)).toBe("rechazo_permanente");
  });

  it("clasifica como rechazo_permanente una violación de exclusion constraint (doble-booking real, HU-01/HU-42)", () => {
    const error = {
      code: "23P01",
      message: 'conflicting key value violates exclusion constraint "reserva_no_solapa_cama"'
    };
    expect(clasificarErrorSync(error)).toBe("rechazo_permanente");
  });

  it("clasifica como rechazo_permanente una violación de constraint de negocio (check/FK)", () => {
    expect(clasificarErrorSync({ code: "23514", message: "check constraint violated" })).toBe(
      "rechazo_permanente"
    );
    expect(clasificarErrorSync({ code: "23503", message: "foreign key violation" })).toBe(
      "rechazo_permanente"
    );
  });

  it("clasifica como rechazo_permanente un error de esquema/sintaxis (42xxx) y de validación PostgREST", () => {
    expect(clasificarErrorSync({ code: "42703", message: "column does not exist" })).toBe(
      "rechazo_permanente"
    );
    expect(clasificarErrorSync({ code: "PGRST116", message: "no rows found" })).toBe("rechazo_permanente");
  });

  it("clasifica como rechazo_permanente un HTTP 4xx genérico", () => {
    expect(clasificarErrorSync({ status: 403, message: "forbidden by RLS" })).toBe("rechazo_permanente");
  });
});
