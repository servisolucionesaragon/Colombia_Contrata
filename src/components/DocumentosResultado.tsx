"use client";

import { useState, type SVGProps } from "react";
import { supabase } from "@/lib/supabase";
import { FUENTE_LABEL } from "@/lib/solverio";

type NivelRiesgo = "bajo" | "medio" | "alto";

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}` };
}

// Panel "amigable" de los documentos resultantes de una verificación,
// compartido entre la vista de empresa (dentro de un modal, ver
// EmpresaConsultasContent.tsx, tipo="consultas") y la de persona (ver
// HistorialContent.tsx, tipo="solicitudes") — cada una llama a sus
// propios endpoints /pdf y /pdf-zip, con reglas de acceso distintas
// (empresa dueña de la consulta vs. persona dueña de su solicitud).
export default function DocumentosResultado({
  id,
  tipo = "consultas",
  pdfs,
  resultadoError,
  resultadoObtenidoAt,
  nivelRiesgo,
}: {
  id: string;
  tipo?: "consultas" | "solicitudes";
  pdfs: Record<string, string> | null;
  resultadoError: string | null;
  resultadoObtenidoAt: string | null;
  nivelRiesgo: NivelRiesgo | null;
}) {
  const [descargando, setDescargando] = useState<string | null>(null);
  const [descargandoTodo, setDescargandoTodo] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  const base = `/api/${tipo}/${id}`;
  const fuentes = pdfs ? Object.keys(pdfs) : [];

  const descargar = async (fuente: string) => {
    setDescargando(fuente);
    setErrorDescarga(null);
    const res = await fetch(
      `${base}/pdf?fuente=${encodeURIComponent(fuente)}`,
      { headers: await authHeader() }
    );
    setDescargando(null);
    if (!res.ok) {
      setErrorDescarga("No pudimos abrir ese documento.");
      return;
    }
    const { url } = await res.json();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const descargarTodo = async () => {
    setDescargandoTodo(true);
    setErrorDescarga(null);
    const res = await fetch(`${base}/pdf-zip`, {
      headers: await authHeader(),
    });
    if (!res.ok) {
      setDescargandoTodo(false);
      setErrorDescarga("No pudimos armar el archivo .zip.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `documentos-${id.slice(0, 8)}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setDescargandoTodo(false);
  };

  if (fuentes.length === 0) {
    if (resultadoError) {
      return (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          La verificación automática no pudo completarse todavía.
        </p>
      );
    }
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Aún no hay documentos disponibles para esta consulta.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-x-2">
          {nivelRiesgo && <RiesgoBadge nivel={nivelRiesgo} />}
          {resultadoObtenidoAt && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Verificado el {new Date(resultadoObtenidoAt).toLocaleDateString("es-CO")}
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={descargandoTodo}
          onClick={descargarTodo}
          className="inline-flex items-center gap-x-1.5 text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2"
        >
          <IconArchive className="size-4" />
          {descargandoTodo ? "Preparando .zip..." : "Descargar todo (.zip)"}
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {fuentes.map((fuente) => (
          <button
            key={fuente}
            type="button"
            disabled={descargando === fuente}
            onClick={() => descargar(fuente)}
            className="flex items-center gap-x-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2.5 text-left disabled:opacity-50"
          >
            <IconDocument className="size-5 text-brand-blue shrink-0" />
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {descargando === fuente ? "Abriendo..." : FUENTE_LABEL[fuente] ?? fuente}
            </span>
            <IconDownload className="size-4 text-gray-400 dark:text-gray-500 ml-auto shrink-0" />
          </button>
        ))}
      </div>

      {errorDescarga && (
        <p className="text-xs text-red-600 dark:text-red-400">{errorDescarga}</p>
      )}
    </div>
  );
}

function RiesgoBadge({ nivel }: { nivel: NivelRiesgo }) {
  const estilos: Record<NivelRiesgo, string> = {
    bajo: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400",
    medio: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
    alto: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400",
  };
  return (
    <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${estilos[nivel]}`}>
      Riesgo {nivel}
    </span>
  );
}

function IconDocument(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75h6M9 15.75h4.5M9 9.75h1.5M6.75 4.5h6.879a1.5 1.5 0 011.06.44l3.622 3.62a1.5 1.5 0 01.44 1.061V19.5a1.5 1.5 0 01-1.5 1.5H6.75a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5z" />
    </svg>
  );
}

function IconDownload(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3" />
    </svg>
  );
}

function IconArchive(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}
