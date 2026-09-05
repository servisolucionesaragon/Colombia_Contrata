"use client";

import { useState, type SVGProps } from "react";
import { supabase } from "@/lib/supabase";
import { FUENTE_LABEL } from "@/lib/solverio";

type NivelRiesgo = "bajo" | "medio" | "alto";

type FuenteResultado = {
  fuente: string;
  estado: string | null;
  error: string | null;
  tieneSoporte: boolean;
};

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}` };
}

// No todas las fuentes que Vericol consulta devuelven un PDF (ver
// FUENTE_LABEL/TODAS_LAS_FUENTES en solverio.ts) — muchas solo traen un
// resultado en JSON (ej. "sin novedad"). resultado_json ya guarda la
// respuesta completa desde que se construyó la integración; esto solo
// la lee para mostrar también esas fuentes sin soporte en pantalla, en
// vez de que queden invisibles por no tener botón de descarga.
function extraerFuentes(resultadoJson: unknown): FuenteResultado[] {
  if (!resultadoJson || typeof resultadoJson !== "object") return [];
  const data = (resultadoJson as { data?: unknown }).data;
  if (!data || typeof data !== "object") return [];
  const fuentes = (data as { fuentes?: unknown }).fuentes;
  if (!Array.isArray(fuentes)) return [];

  return fuentes
    .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
    .map((f) => ({
      fuente: typeof f.fuente === "string" ? f.fuente : "",
      estado: typeof f.estado === "string" ? f.estado : null,
      error: typeof f.error === "string" ? f.error : null,
      tieneSoporte: f.tieneSoporte === true,
    }))
    .filter((f) => f.fuente);
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
  resultadoJson,
  nivelRiesgo,
}: {
  id: string;
  tipo?: "consultas" | "solicitudes";
  pdfs: Record<string, string> | null;
  resultadoError: string | null;
  resultadoObtenidoAt: string | null;
  resultadoJson?: unknown;
  nivelRiesgo: NivelRiesgo | null;
}) {
  const [descargando, setDescargando] = useState<string | null>(null);
  const [descargandoTodo, setDescargandoTodo] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  const base = `/api/${tipo}/${id}`;
  const fuentesConPdf = pdfs ? Object.keys(pdfs) : [];
  const todasLasFuentes = extraerFuentes(resultadoJson);
  const fuentesSinPdf = todasLasFuentes.filter(
    (f) => !f.tieneSoporte && !fuentesConPdf.includes(f.fuente)
  );

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

  if (fuentesConPdf.length === 0 && fuentesSinPdf.length === 0) {
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
        {fuentesConPdf.length > 0 && (
          <button
            type="button"
            disabled={descargandoTodo}
            onClick={descargarTodo}
            className="inline-flex items-center gap-x-1.5 text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2"
          >
            <IconArchive className="size-4" />
            {descargandoTodo ? "Preparando .zip..." : "Descargar todo (.zip)"}
          </button>
        )}
      </div>

      {fuentesConPdf.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-2">
          {fuentesConPdf.map((fuente) => (
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
      )}

      {fuentesSinPdf.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
            Otros resultados (sin documento descargable)
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {fuentesSinPdf.map((f) => (
              <div
                key={f.fuente}
                className="flex items-start gap-x-2.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5"
              >
                <IconInfo className="size-5 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
                <span>
                  <span className="block text-sm text-gray-700 dark:text-gray-300">
                    {FUENTE_LABEL[f.fuente] ?? f.fuente}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {f.error ? f.error : f.estado ? f.estado.replace(/_/g, " ") : "Sin información"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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

function IconInfo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
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
