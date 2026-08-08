"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Status = "loading" | "signed-out" | "forbidden" | "authorized";

export default function AdminGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) {
        setStatus("signed-out");
        return;
      }
      // role vive en app_metadata (no user_metadata) porque solo se puede
      // asignar desde el backend de Supabase — el usuario no puede
      // otorgárselo a sí mismo actualizando su propio perfil.
      setStatus(user.app_metadata?.role === "admin" ? "authorized" : "forbidden");
    });
  }, []);

  if (status === "loading") {
    return <p className="text-sm text-gray-400">Verificando acceso...</p>;
  }

  if (status === "signed-out") {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-gray-600">
          Debes iniciar sesión con una cuenta de administrador para ver esta
          página.
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

  if (status === "forbidden") {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-gray-600">
          Tu cuenta no tiene permisos de administrador.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 px-5 py-2.5"
        >
          Volver al sitio
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
