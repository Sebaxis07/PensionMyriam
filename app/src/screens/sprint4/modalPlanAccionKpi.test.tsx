// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  ModalPlanAccionKpi,
  type MetricasMargenInfo,
  type MetricasConciliacionInfo,
  type MetricasOcupacionInfo
} from "./ModalPlanAccionKpi";

/**
 * HU-37: "hacer clic en la tarjeta de Conciliación, para entender en
 * lenguaje cercano cuántas raciones tienen descuadre e ir directo a
 * resolverlas".
 *
 * Criterios:
 *  1. Con descuadres, el modal explica POR QUÉ conviene justificarlas y
 *     ofrece un botón a la pantalla de Conciliación de Empresas.
 *  2. Sin descuadres, el modal informa que todo está al día.
 *
 * La versión anterior de esta prueba no renderizaba el modal: construía
 * objetos de métricas y afirmaba cosas sobre esos objetos
 * (`expect(metricas.pendientesJustificar).toBe(8)`), de modo que pasaba
 * aunque el modal no existiera. Acá se renderiza el componente y se
 * revisa lo que la Administradora ve y puede tocar.
 */

const MARGEN: MetricasMargenInfo = {
  margenPorcentaje: 44,
  estadoSemaforo: "verde",
  ingresosTotales: 46515000,
  costosTotales: 26054000,
  costoDiarioTrabajador: 13500,
  tarifaMinimaSugerida: 19500
};

const OCUPACION: MetricasOcupacionInfo = {
  totalHabitaciones: 8,
  ocupadas: 5,
  disponibles: 3,
  enMantencion: 0,
  ocupadasEmpresa: 3,
  ocupadasTurista: 2,
  porcentajeOcupacion: 63
};

const CON_DESCUADRE: MetricasConciliacionInfo = {
  tasaConciliacion: 58,
  totalRegistros: 19,
  conciliados: 11,
  pendientesJustificar: 8,
  racionesServidas: 85,
  racionesEsperadas: 93,
  diasConDescuadre: ["2026-10-01"]
};

const AL_DIA: MetricasConciliacionInfo = {
  tasaConciliacion: 100,
  totalRegistros: 19,
  conciliados: 19,
  pendientesJustificar: 0,
  racionesServidas: 93,
  racionesEsperadas: 93,
  diasConDescuadre: []
};

function renderModal(
  conciliacion: MetricasConciliacionInfo,
  extra: Partial<Parameters<typeof ModalPlanAccionKpi>[0]> = {}
) {
  const onCerrar = vi.fn();
  const onIrAConciliacion = vi.fn();
  render(
    <ModalPlanAccionKpi
      abierto
      tipoKpi="conciliacion"
      onCerrar={onCerrar}
      metricasMargen={MARGEN}
      metricasConciliacion={conciliacion}
      metricasOcupacion={OCUPACION}
      onIrAConciliacion={onIrAConciliacion}
      onAbrirRegistrarCompra={vi.fn()}
      {...extra}
    />
  );
  return { onCerrar, onIrAConciliacion };
}

describe("HU-37 — modal de la tarjeta de Conciliación", () => {
  afterEach(() => cleanup());

  it("con raciones descuadradas dice cuántas son", () => {
    renderModal(CON_DESCUADRE);
    expect(screen.getByText(/8 raciones con descuadre por justificar/i)).toBeInTheDocument();
  });

  it("explica por qué conviene justificarlas, en lenguaje cercano y sin jerga", () => {
    renderModal(CON_DESCUADRE);
    // El criterio pide la razón, no solo el número: qué pasa si no lo hace.
    expect(
      screen.getByText(/la empresa podría rechazar la factura a fin de mes/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/quedarían platos sin cobrar/i)).toBeInTheDocument();
  });

  it("ofrece un botón que lleva directo a la pantalla de Conciliación de Empresas", () => {
    const { onIrAConciliacion, onCerrar } = renderModal(CON_DESCUADRE);

    const boton = screen.getByRole("button", { name: /Ir a Conciliar Raciones de Empresas/i });
    fireEvent.click(boton);

    expect(onIrAConciliacion).toHaveBeenCalledTimes(1);
    // Y cierra el modal: "ir directo a resolverlas" no debe dejar la
    // ventana encima de la pantalla de destino.
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("sin descuadres informa que todo está al día y no alarma", () => {
    renderModal(AL_DIA);
    expect(screen.getByText(/Cierre contable al día: 0 descuadres pendientes/i)).toBeInTheDocument();
    expect(screen.getByText(/perfectamente cuadrada para facturar/i)).toBeInTheDocument();
    expect(screen.queryByText(/con descuadre por justificar/i)).not.toBeInTheDocument();
  });

  it("al no haber descuadres informa cuántas raciones se sirvieron, para dar contexto", () => {
    renderModal(AL_DIA);
    expect(screen.getByText(/Todas las raciones servidas \(93\)/i)).toBeInTheDocument();
  });

  it("no muestra nada si la tarjeta no fue tocada", () => {
    render(
      <ModalPlanAccionKpi
        abierto={false}
        tipoKpi="conciliacion"
        onCerrar={vi.fn()}
        metricasMargen={MARGEN}
        metricasConciliacion={CON_DESCUADRE}
        metricasOcupacion={OCUPACION}
        onAbrirRegistrarCompra={vi.fn()}
      />
    );
    expect(screen.queryByText(/con descuadre por justificar/i)).not.toBeInTheDocument();
  });

  it("recuerda en el paso a paso que por Ley 21.719 no se registran datos médicos (HU-31)", () => {
    renderModal(CON_DESCUADRE);
    expect(screen.getByText(/no se registran datos médicos/i)).toBeInTheDocument();
  });
});
