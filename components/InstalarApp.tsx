"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";

// Evento que Chrome/Edge disparan cuando la app se puede instalar (no existe en Safari)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const CLAVE_OCULTO = "gtm-instalar-oculto";

/** Registra el service worker (solo en producción). Se monta una vez en el layout. */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("No se pudo registrar el service worker", e));
  }, []);
  return null;
}

type Plataforma = "instalada" | "ios" | "otra";

function detectarPlataforma(): Plataforma {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "instalada";
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "otra";
}

function leerOculto(): boolean {
  try {
    return localStorage.getItem(CLAVE_OCULTO) === "1";
  } catch {
    return false;
  }
}

const sinSuscripcion = () => () => {};

/** Tarjeta que invita a instalar la app en el dispositivo. */
export default function InstalarApp() {
  // En el servidor no hay navigator/localStorage: se renderiza null y se completa en el cliente
  const plataforma = useSyncExternalStore<Plataforma | null>(sinSuscripcion, detectarPlataforma, () => null);
  const ocultoGuardado = useSyncExternalStore(sinSuscripcion, leerOculto, () => true);
  const [ocultoAhora, setOcultoAhora] = useState(false);
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalada, setInstalada] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // mostramos nuestro propio botón
      setEvento(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalada(true);
      setEvento(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const ocultar = () => {
    setOcultoAhora(true);
    try {
      localStorage.setItem(CLAVE_OCULTO, "1");
    } catch {
      // modo privado: se oculta solo por esta vez
    }
  };

  const instalar = async () => {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    setEvento(null);
    if (outcome === "accepted") setInstalada(true);
  };

  if (!plataforma || plataforma === "instalada" || instalada || ocultoGuardado || ocultoAhora) return null;
  if (plataforma === "otra" && !evento) return null; // navegador sin soporte de instalación

  return (
    <div className="card relative mb-6 flex items-start gap-4 border-brand-600/40 p-4 animate-fade-in">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 pr-6">
        <p className="font-semibold text-white">Instalá GTM en este dispositivo</p>
        {plataforma === "ios" ? (
          <p className="mt-1 text-sm text-neutral-400">
            En Safari tocá <Share className="inline h-4 w-4 align-text-bottom text-sky-400" />{" "}
            <strong className="text-neutral-200">Compartir</strong> y después{" "}
            <SquarePlus className="inline h-4 w-4 align-text-bottom" />{" "}
            <strong className="text-neutral-200">Agregar a inicio</strong>.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-neutral-400">
              Abrila desde un ícono, en pantalla completa y sin la barra del navegador.
            </p>
            <button onClick={instalar} className="btn btn-primary mt-3">
              <Download className="h-4 w-4" />
              Instalar app
            </button>
          </>
        )}
      </div>
      <button onClick={ocultar} className="icon-btn absolute top-2 right-2 h-8 w-8" aria-label="No mostrar más">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
