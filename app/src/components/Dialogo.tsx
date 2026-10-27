import { useEffect, useRef, type ReactNode } from "react";

const SELECTOR_FOCO = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';

export function Dialogo({ titulo, onCerrar, className, children }: {
  titulo: string;
  onCerrar: () => void;
  className: string;
  children: ReactNode;
}) {
  const marco = useRef<HTMLDivElement>(null);
  const focoOrigen = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const cerrarActual = useRef(onCerrar);
  cerrarActual.current = onCerrar;

  useEffect(() => {
    const origen = focoOrigen.current;
    const elemento = marco.current;
    if (!elemento) return;
    const controles = () => Array.from(elemento.querySelectorAll<HTMLElement>(SELECTOR_FOCO))
      .filter((control) => control.getClientRects().length > 0);
    // Respetar el autoFocus de un formulario sin perder el botón de origen.
    if (!elemento.contains(document.activeElement)) (controles()[0] ?? elemento).focus();
    const desbordamientoAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function manejarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cerrarActual.current();
      }
      if (evento.key !== "Tab") return;
      const elementos = controles();
      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      if (!primero) {
        evento.preventDefault();
        elemento?.focus();
      } else if (evento.shiftKey && (document.activeElement === primero || document.activeElement === elemento)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (document.activeElement === ultimo || document.activeElement === elemento)) {
        evento.preventDefault();
        primero.focus();
      }
    }
    elemento.addEventListener("keydown", manejarTecla);
    return () => {
      elemento.removeEventListener("keydown", manejarTecla);
      document.body.style.overflow = desbordamientoAnterior;
      if (origen?.isConnected) origen.focus();
    };
  }, []);

  return (
    <div ref={marco} role="dialog" aria-modal="true" aria-label={titulo} tabIndex={-1}
      className={className}
      onClick={(evento) => { if (evento.target === evento.currentTarget) onCerrar(); }}>
      {children}
    </div>
  );
}
