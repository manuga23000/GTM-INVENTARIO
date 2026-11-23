"use client";

import { ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Pila de modales abiertos: sólo el de arriba responde a Escape.
const pila: string[] = [];

interface ModalProps {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Botones fijos al pie (quedan visibles aunque el contenido scrollee). */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Si es false, click en el fondo no cierra. */
  closeOnBackdrop?: boolean;
}

const SIZES = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

/**
 * Modal accesible: en mobile se muestra como hoja inferior a pantalla casi completa,
 * en escritorio como diálogo centrado. Bloquea el scroll del fondo y atrapa el foco.
 */
export default function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = "lg",
  closeOnBackdrop = true,
}: ModalProps) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    pila.push(id);
    const previo = document.activeElement as HTMLElement | null;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Foco inicial en el primer campo (no en el botón cerrar). En pantallas táctiles
    // no enfocamos inputs para que no se abra el teclado de golpe.
    const tactil = window.matchMedia("(pointer: coarse)").matches;
    const primero = panelRef.current?.querySelector<HTMLElement>(
      tactil ? "[data-autofocus]" : "[data-autofocus], input:not([type=hidden]), select, textarea"
    );
    (primero || panelRef.current)?.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (pila[pila.length - 1] !== id) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const idx = pila.lastIndexOf(id);
      if (idx !== -1) pila.splice(idx, 1);
      document.body.style.overflow = overflowPrevio;
      previo?.focus?.();
    };
  }, [id]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
        className={cn(
          "flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-neutral-800 bg-neutral-900 shadow-2xl outline-none animate-slide-up sm:max-h-[90vh] sm:rounded-2xl sm:animate-scale-in",
          SIZES[size]
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            {/* Manija visual de hoja inferior en mobile */}
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-neutral-700 sm:hidden" />
            <h2 id={`${id}-title`} className="text-lg font-bold text-white sm:text-xl">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-sm text-neutral-400">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="icon-btn -mr-2 shrink-0" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-neutral-800 bg-neutral-900 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
