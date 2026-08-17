"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Estado = "cargando" | "pagado" | "pendiente" | "fallido" | "no-encontrado";

export default function ConfirmacionContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const [estado, setEstado] = useState<Estado>("cargando");

  useEffect(() => {
    if (!reference) {
      setEstado("no-encontrado");
      return;
    }

    supabase
      .from("solicitudes")
      .select("estado")
      .eq("wompi_referencia", reference)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) setEstado("no-encontrado");
        else if (data.estado === "pagado") setEstado("pagado");
        else if (data.estado === "fallido") setEstado("fallido");
        else setEstado("pendiente");
      });
  }, [reference]);

  if (estado === "cargando") {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
        Confirmando el estado de tu pago...
      </p>
    );
  }

  if (estado === "no-encontrado") {
    return (
      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No encontramos esta solicitud. Si acabas de pagar, escríbenos a
          soporte con el número de referencia de tu transacción.
        </p>
        <Link
          href="/historial"
          className="mt-4 inline-block text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
        >
          Ver mi historial
        </Link>
      </div>
    );
  }

  if (estado === "pagado") {
    return (
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center size-14 rounded-full bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400">
          <svg
            className="size-7"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          ¡Pago confirmado!
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Te notificaremos por correo cuando tus documentos estén listos
          para descargar.
        </p>
        <Link
          href="/historial"
          className="mt-4 inline-block text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
        >
          Ver mi historial
        </Link>
      </div>
    );
  }

  if (estado === "fallido") {
    return (
      <div className="text-center">
        <p className="text-sm text-red-600 dark:text-red-400">
          El pago no se pudo completar. Puedes intentarlo de nuevo desde
          "Solicitar documentos".
        </p>
        <Link
          href="/solicitar"
          className="mt-4 inline-block text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
        >
          Intentar de nuevo
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Estamos confirmando tu pago con Wompi. Esto puede tardar unos
        segundos — actualiza esta página en un momento.
      </p>
    </div>
  );
}
