"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Estado = "cargando" | "invalido" | "ya-respondida" | "lista" | "confirmada" | "error";

type Info = {
  candidatoNombre: string;
  empresaNombre: string;
  estado: string;
};

export default function ResponderConsultaContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const decisionInicial = searchParams.get("decision") === "rechazar" ? "rechazar" : "autorizar";

  const [estado, setEstado] = useState<Estado>("cargando");
  const [info, setInfo] = useState<Info | null>(null);
  const [decision, setDecision] = useState<"autorizar" | "rechazar">(decisionInicial);
  const [habeasData, setHabeasData] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisionFinal, setDecisionFinal] = useState<"autorizar" | "rechazar" | null>(null);

  useEffect(() => {
    if (!token) {
      setEstado("invalido");
      return;
    }
    fetch(`/api/consultas/responder-token?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          setEstado("invalido");
          return;
        }
        const data: Info = await res.json();
        setInfo(data);
        setEstado(data.estado === "pendiente" ? "lista" : "ya-respondida");
      })
      .catch(() => setEstado("invalido"));
  }, [token]);

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    const res = await fetch("/api/consultas/responder-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, decision }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) {
      setError(data.error ?? "No pudimos procesar tu respuesta.");
      return;
    }
    setDecisionFinal(decision);
    setEstado("confirmada");
  };

  if (estado === "cargando") {
    return <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Cargando...</p>;
  }

  if (estado === "invalido") {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
        Este enlace no es válido o ya expiró.
      </p>
    );
  }

  if (estado === "ya-respondida") {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
        Esta invitación ya fue respondida anteriormente. Si crees que es un
        error, entra a{" "}
        <Link href="/login" className="text-brand-blue hover:underline">
          tu cuenta
        </Link>{" "}
        para revisar el estado en Autorizaciones.
      </p>
    );
  }

  if (estado === "confirmada") {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-900 dark:text-gray-100 font-semibold">
          {decisionFinal === "autorizar"
            ? "Autorización registrada."
            : "Quedó registrado que rechazaste esta invitación."}
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {decisionFinal === "autorizar"
            ? "La empresa que te invitó verá el resultado apenas esté listo."
            : "No se realizará ninguna verificación."}
        </p>
      </div>
    );
  }

  if (!info) return null;

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
        <span className="font-semibold text-gray-900 dark:text-gray-100">{info.empresaNombre}</span>{" "}
        invitó a{" "}
        <span className="font-semibold text-gray-900 dark:text-gray-100">{info.candidatoNombre}</span>{" "}
        a verificar sus antecedentes en Colombia Contrata.
      </p>

      <div className="flex justify-center gap-x-2">
        <button
          type="button"
          onClick={() => setDecision("autorizar")}
          className={`text-sm font-semibold rounded-lg px-4 py-2 transition-colors ${
            decision === "autorizar"
              ? "bg-brand-blue text-white"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          Autorizar
        </button>
        <button
          type="button"
          onClick={() => setDecision("rechazar")}
          className={`text-sm font-semibold rounded-lg px-4 py-2 transition-colors ${
            decision === "rechazar"
              ? "bg-red-600 text-white"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          Rechazar
        </button>
      </div>

      {decision === "autorizar" && (
        <label className="flex items-start gap-x-2 text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={habeasData}
            onChange={(e) => setHabeasData(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Autorizo, en los términos de la Ley 1581 de 2012 (Habeas Data), a que{" "}
            {info.empresaNombre} verifique mis antecedentes a través de Colombia
            Contrata.
          </span>
        </label>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}

      <button
        type="button"
        disabled={enviando || (decision === "autorizar" && !habeasData)}
        onClick={confirmar}
        className={`w-full inline-flex items-center justify-center gap-x-2 text-sm font-bold rounded-xl border border-transparent text-white px-6 py-3 disabled:opacity-60 disabled:cursor-not-allowed ${
          decision === "autorizar"
            ? "bg-brand-blue hover:bg-brand-blue-dark"
            : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {enviando
          ? "Enviando..."
          : decision === "autorizar"
          ? "Confirmar autorización"
          : "Confirmar rechazo"}
      </button>
    </div>
  );
}
