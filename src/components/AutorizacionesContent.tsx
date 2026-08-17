"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import DocumentosResultado from "@/components/DocumentosResultado";

type Status = "loading" | "signed-out";

type NivelRiesgo = "bajo" | "medio" | "alto";

type Consulta = {
  id: string;
  empresaNombre: string;
  estado: "pendiente" | "autorizada" | "rechazada";
  fecha: string;
  nombreCompleto: string;
  documento: string;
  nivelRiesgo: NivelRiesgo | null;
  resultadoPdfs: Record<string, string> | null;
  resultadoError: string | null;
  resultadoObtenidoAt: string | null;
};

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}` };
}

export default function AutorizacionesContent() {
  const [status, setStatus] = useState<Status>("loading");
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [aceptaHabeasData, setAceptaHabeasData] = useState<Record<string, boolean>>({});
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    setCargandoLista(true);
    const res = await fetch("/api/consultas/pendientes", { headers: await authHeader() });
    if (res.ok) {
      const data = await res.json();
      setConsultas(data.consultas);
    }
    setCargandoLista(false);
  };

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setStatus("signed-out");
        return;
      }
      await cargar();
    })();
  }, []);

  const responder = async (consultaId: string, decision: "autorizar" | "rechazar") => {
    setProcesandoId(consultaId);
    setError(null);
    const res = await fetch("/api/consultas/autorizar", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ consultaId, decision }),
    });
    setProcesandoId(null);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "No pudimos procesar tu respuesta.");
      return;
    }
    await cargar();
  };

  if (status === "signed-out") {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Debes iniciar sesión para ver tus autorizaciones.
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

  if (cargandoLista) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>;
  }

  if (consultas.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
        No tienes solicitudes de verificación de antecedentes.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {consultas.map((c) => (
        <div
          key={c.id}
          className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5"
        >
          <div className="flex items-start justify-between gap-x-3 flex-wrap">
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {c.empresaNombre}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Solicitó verificar tus antecedentes el{" "}
                {new Date(c.fecha).toLocaleDateString("es-CO")}
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Datos enviados por la empresa: {c.nombreCompleto} — {c.documento}
              </p>
            </div>
            <EstadoBadge estado={c.estado} />
          </div>

          {c.estado === "pendiente" && (
            <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
              <label className="flex items-start gap-x-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={aceptaHabeasData[c.id] ?? false}
                  onChange={(e) =>
                    setAceptaHabeasData((prev) => ({ ...prev, [c.id]: e.target.checked }))
                  }
                  className="mt-0.5 size-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-brand-blue focus:ring-brand-blue"
                />
                Autorizo el tratamiento de mis datos personales, incluidos
                mis datos sensibles (antecedentes judiciales, disciplinarios,
                fiscales, penales), para que <strong>{c.empresaNombre}</strong>{" "}
                consulte esta información, conforme a la{" "}
                <Link href="/privacidad" className="text-brand-blue hover:underline">
                  Política de Tratamiento de Datos
                </Link>
                .
              </label>

              <div className="mt-4 flex items-center gap-x-3">
                <button
                  type="button"
                  disabled={!aceptaHabeasData[c.id] || procesandoId === c.id}
                  onClick={() => responder(c.id, "autorizar")}
                  className="inline-flex items-center gap-x-2 text-sm font-bold rounded-xl border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed px-5 py-2.5"
                >
                  {procesandoId === c.id ? "Procesando..." : "Autorizar"}
                </button>
                <button
                  type="button"
                  disabled={procesandoId === c.id}
                  onClick={() => responder(c.id, "rechazar")}
                  className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            </div>
          )}

          {c.estado === "autorizada" && (
            <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
              {!c.nivelRiesgo && !c.resultadoError && !c.resultadoObtenidoAt ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Verificando tus antecedentes...
                </p>
              ) : (
                <DocumentosResultado
                  consultaId={c.id}
                  pdfs={c.resultadoPdfs}
                  resultadoError={c.resultadoError}
                  resultadoObtenidoAt={c.resultadoObtenidoAt}
                  nivelRiesgo={c.nivelRiesgo}
                />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: Consulta["estado"] }) {
  const estilos = {
    pendiente: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
    autorizada: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400",
    rechazada: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400",
  };
  return (
    <span className={`shrink-0 text-xs font-medium rounded-full px-2.5 py-1 ${estilos[estado]}`}>
      {estado}
    </span>
  );
}
