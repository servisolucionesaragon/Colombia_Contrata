"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlataforma(): "android" | "ios" | null {
  const ua = navigator.userAgent;
  const esIOSSafari =
    /iPhone|iPad|iPod/.test(ua) ||
    // iPadOS 13+ se identifica como "Macintosh" pero tiene pantalla táctil.
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  // Chrome/Firefox/Edge en iOS usan el motor de Safari pero no pueden
  // instalarse como app independiente — solo Safari puede.
  const esOtroNavegadorIOS = /CriOS|FxiOS|EdgiOS/.test(ua);
  if (esIOSSafari && !esOtroNavegadorIOS) return "ios";

  if (/Android/.test(ua)) return "android";

  return null;
}

function yaInstalada(): boolean {
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return standalone || iosStandalone;
}

export default function InstallPwaBanner() {
  const [plataforma, setPlataforma] = useState<"android" | "ios" | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) === "true") return;
    if (yaInstalada()) return;

    const plat = detectPlataforma();
    if (!plat) return;
    setPlataforma(plat);

    if (plat === "ios") {
      // iOS no tiene evento de instalación — si es Safari en un
      // iPhone/iPad, mostramos las instrucciones manuales directamente.
      setVisible(true);
      return;
    }

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    const handleInstalled = () => {
      setVisible(false);
      localStorage.setItem(DISMISSED_KEY, "true");
    };
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const cerrar = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "true");
  };

  const instalar = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
      localStorage.setItem(DISMISSED_KEY, "true");
    }
    setDeferredPrompt(null);
  };

  if (!visible || !plataforma) return null;

  return (
    <div className="w-full bg-brand-blue/5 dark:bg-brand-blue/10 border-b border-brand-blue/20 dark:border-brand-blue/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-x-3">
        <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">
          {plataforma === "android" ? (
            <>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                Instala Colombia Contrata
              </span>{" "}
              en tu celular o tablet para entrar más rápido.
            </>
          ) : (
            <>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                Instala Colombia Contrata:
              </span>{" "}
              toca <span className="font-semibold">Compartir</span> y luego{" "}
              <span className="font-semibold">&quot;Agregar a inicio&quot;</span>.
            </>
          )}
        </p>
        {plataforma === "android" && (
          <button
            type="button"
            onClick={instalar}
            className="shrink-0 text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark px-3 py-1.5"
          >
            Instalar
          </button>
        )}
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar"
          className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none px-1"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
