"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Reemplazo de alert / confirm / prompt nativos por avisos y diálogos propios.
// ---------------------------------------------------------------------------

type ToastTipo = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  tipo: ToastTipo;
  mensaje: string;
}

export interface DialogAction {
  value: string;
  label: string;
  description?: string;
  tone?: "primary" | "danger" | "secondary";
}

interface DialogOptions {
  title: string;
  message?: ReactNode;
  actions: DialogAction[];
  cancelLabel?: string;
  tone?: "danger" | "warning" | "info";
}

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning" | "info";
}

interface FeedbackContextValue {
  toast: (mensaje: string, tipo?: ToastTipo) => void;
  /** Muestra un diálogo con varias acciones. Resuelve con el value elegido o null. */
  choose: (opts: DialogOptions) => Promise<string | null>;
  /** Diálogo Sí/No. */
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback debe usarse dentro de <FeedbackProvider>");
  return ctx;
}

const TOAST_ICON = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const TOAST_STYLE = {
  success: "border-emerald-500/40 text-emerald-300",
  error: "border-red-500/50 text-red-300",
  info: "border-sky-500/40 text-sky-300",
  warning: "border-amber-500/40 text-amber-300",
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<DialogOptions | null>(null);
  const resolverRef = useRef<((v: string | null) => void) | null>(null);
  const nextId = useRef(1);

  const cerrarToast = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (mensaje: string, tipo: ToastTipo = "success") => {
      const id = nextId.current++;
      setToasts((ts) => [...ts.slice(-3), { id, tipo, mensaje }]);
      setTimeout(() => cerrarToast(id), tipo === "error" ? 6000 : 3500);
    },
    [cerrarToast]
  );

  const choose = useCallback((opts: DialogOptions) => {
    resolverRef.current?.(null);
    setDialog(opts);
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const confirm = useCallback(
    async (opts: ConfirmOptions) => {
      const r = await choose({
        title: opts.title,
        message: opts.message,
        tone: opts.tone,
        cancelLabel: opts.cancelLabel,
        actions: [
          {
            value: "ok",
            label: opts.confirmLabel || "Confirmar",
            tone: opts.tone === "danger" ? "danger" : "primary",
          },
        ],
      });
      return r === "ok";
    },
    [choose]
  );

  const resolver = (v: string | null) => {
    resolverRef.current?.(v);
    resolverRef.current = null;
    setDialog(null);
  };

  const value = useMemo(() => ({ toast, choose, confirm }), [toast, choose, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {/* Toasts */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-[10000] flex flex-col items-center gap-2 px-3 sm:top-auto sm:right-4 sm:bottom-4 sm:left-auto sm:items-end"
      >
        {toasts.map((t) => {
          const Icon = TOAST_ICON[t.tipo];
          return (
            <div
              key={t.id}
              role={t.tipo === "error" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-neutral-900/95 px-4 py-3 shadow-xl backdrop-blur animate-toast-in",
                TOAST_STYLE[t.tipo]
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="flex-1 text-sm text-neutral-100">{t.mensaje}</p>
              <button
                onClick={() => cerrarToast(t.id)}
                className="-mr-1 rounded p-0.5 text-neutral-500 hover:text-white"
                aria-label="Cerrar aviso"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Diálogo */}
      {dialog && (
        <Modal
          size="sm"
          title={
            <span className="flex items-center gap-2">
              {dialog.tone === "danger" && <AlertTriangle className="h-5 w-5 text-red-500" />}
              {dialog.tone === "warning" && <AlertTriangle className="h-5 w-5 text-amber-400" />}
              {dialog.title}
            </span>
          }
          onClose={() => resolver(null)}
          footer={
            <button type="button" onClick={() => resolver(null)} className="btn btn-secondary w-full">
              {dialog.cancelLabel || "Cancelar"}
            </button>
          }
        >
          {dialog.message && <div className="mb-4 text-sm text-neutral-300">{dialog.message}</div>}
          <div className="flex flex-col gap-2">
            {dialog.actions.map((a, i) => (
              <button
                key={a.value}
                type="button"
                data-autofocus={i === 0 ? true : undefined}
                onClick={() => resolver(a.value)}
                className={cn(
                  "btn h-auto w-full flex-col items-start py-3 text-left whitespace-normal",
                  a.tone === "danger" ? "btn-danger" : a.tone === "secondary" ? "btn-secondary" : "btn-primary",
                  !a.description && "items-center"
                )}
              >
                <span>{a.label}</span>
                {a.description && <span className="text-xs font-normal opacity-80">{a.description}</span>}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </FeedbackContext.Provider>
  );
}
