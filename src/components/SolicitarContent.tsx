"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Documento = { id: string; documento: string };
type Status =
  | "loading"
  | "signed-out"
  | "no-persona"
  | "ready"
  | "submitting"
  | "pago-no-disponible";

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export default function SolicitarContent() {
  const [status, setStatus] = useState<Status>("loading");
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [precio, setPrecio] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [perfilIncompleto, setPerfilIncompleto] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setStatus("signed-out");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (profile?.account_type !== "persona") {
        setStatus("no-persona");
        return;
      }

      const [{ data: docs }, { data: config }] = await Promise.all([
        supabase
          .from("precios_documentos")
          .select("id, documento")
          .eq("activo", true)
          .order("documento", { ascending: true }),
        supabase
          .from("configuracion_persona")
          .select("precio_desde")
          .eq("id", 1)
          .single(),
      ]);

      setDocumentos((docs as Documento[]) ?? []);
      setPrecio(config?.precio_desde ?? null);
      setStatus("ready");
    })();
  }, []);

  const toggleDoc = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setStatus("submitting");
    setErrorMsg(null);
    setPerfilIncompleto(false);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const res = await fetch("/api/solicitudes/crear", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ documentoIds: seleccionados }),
    });
    const result = await res.json();

    if (!res.ok) {
      setErrorMsg(result.error ?? "No pudimos crear la solicitud.");
      setPerfilIncompleto(result.code === "PERFIL_INCOMPLETO");
      setStatus("ready");
      return;
    }

    if (!result.pagoDisponible) {
      setStatus("pago-no-disponible");
      return;
    }

    window.location.href = result.checkoutUrl;
  };

  if (status === "loading") {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>;
  }

  if (status === "signed-out") {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Debes iniciar sesión para solicitar tus documentos.
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

  if (status === "no-persona") {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
        Esta solicitud es solo para cuentas de persona natural. Si tu cuenta
        es de empresa, contáctanos para el flujo de verificación de
        candidatos.
      </p>
    );
  }

  if (status === "pago-no-disponible") {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tu solicitud quedó registrada. Los pagos en línea estarán
          disponibles muy pronto — te avisaremos por correo cuando puedas
          completar el pago.
        </p>
      </div>
    );
  }

  return (
    <div>
      {documentos.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          Aún no hay documentos disponibles.
        </p>
      ) : (
        <div className="space-y-2">
          {documentos.map((doc) => (
            <label
              key={doc.id}
              className="flex items-center gap-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-brand-blue"
            >
              <input
                type="checkbox"
                checked={seleccionados.includes(doc.id)}
                onChange={() => toggleDoc(doc.id)}
                className="size-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-brand-blue focus:ring-brand-blue"
              />
              <span className="text-sm text-gray-800 dark:text-gray-200">
                {doc.documento}
              </span>
            </label>
          ))}
        </div>
      )}

      {precio != null && (
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Total a pagar
          </span>
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {formatCOP(precio)}
          </span>
        </div>
      )}

      {errorMsg && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          {errorMsg}{" "}
          {perfilIncompleto && (
            <Link href="/perfil" className="font-semibold underline">
              Ir a mi perfil
            </Link>
          )}
        </p>
      )}

      <button
        type="button"
        disabled={seleccionados.length === 0 || status === "submitting"}
        onClick={handleSubmit}
        className="mt-6 w-full inline-flex items-center justify-center gap-x-2 text-sm font-bold rounded-xl border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed px-6 py-3"
      >
        {status === "submitting" ? "Procesando..." : "Continuar al pago"}
      </button>
    </div>
  );
}
