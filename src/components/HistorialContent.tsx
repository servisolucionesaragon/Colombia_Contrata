"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Status = "loading" | "signed-out" | "ready";

export default function HistorialContent() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setStatus(data.user ? "ready" : "signed-out");
    });
  }, []);

  if (status === "loading") {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>;
  }

  if (status === "signed-out") {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Debes iniciar sesión para ver tu historial.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark px-5 py-2.5"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center py-10">
      <div className="mx-auto flex items-center justify-center size-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
        <svg
          className="size-6"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3v5h5" />
          <path d="M3.05 13a9 9 0 1 0 2.13-8.13L3 8" />
          <path d="M12 7v5l4 2" />
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Aún no tienes solicitudes
      </h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Cuando solicites documentos, tu historial de consultas aparecerá
        aquí.
      </p>
    </div>
  );
}
