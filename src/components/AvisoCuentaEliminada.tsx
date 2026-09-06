"use client";

import { useEffect, useState } from "react";

// Confirmación de que la cuenta se borró. Lee el parámetro en el cliente
// (no vía searchParams del server component) a propósito: la página de
// inicio usa `revalidate = 60`, y leer searchParams en el servidor la
// volvería dinámica, perdiendo esa caché para todos los visitantes.
export default function AvisoCuentaEliminada() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("cuenta") !== "eliminada") return;
    setVisible(true);
    // Se limpia la URL para que no reaparezca al recargar o compartir.
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  if (!visible) return null;

  return (
    <div className="bg-green-50 dark:bg-green-950/40 border-b border-green-200 dark:border-green-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-start justify-between gap-x-4">
        <p className="text-sm text-green-800 dark:text-green-300">
          Tu cuenta fue eliminada. Gracias por haber usado Colombia Contrata.
        </p>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="text-green-700 dark:text-green-400 hover:text-green-900 text-lg leading-none"
          aria-label="Cerrar"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
