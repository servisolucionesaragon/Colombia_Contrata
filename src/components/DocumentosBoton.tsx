"use client";

import { useState } from "react";
import DocumentosResultado from "@/components/DocumentosResultado";

type NivelRiesgo = "bajo" | "medio" | "alto";

// Botón "Ver documentos (N)" que abre un modal con DocumentosResultado —
// compartido entre EmpresaConsultasContent.tsx (tipo="consultas") y
// HistorialContent.tsx (tipo="solicitudes").
export default function DocumentosBoton({
  id,
  tipo,
  titulo,
  pdfs,
  resultadoError,
  resultadoObtenidoAt,
  nivelRiesgo,
}: {
  id: string;
  tipo: "consultas" | "solicitudes";
  titulo: string;
  pdfs: Record<string, string> | null;
  resultadoError: string | null;
  resultadoObtenidoAt: string | null;
  nivelRiesgo: NivelRiesgo | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const cantidad = pdfs ? Object.keys(pdfs).length : 0;

  if (cantidad === 0) {
    return resultadoError ? (
      <span className="text-xs text-gray-400 dark:text-gray-500">No disponible</span>
    ) : (
      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-x-1.5 text-xs font-semibold text-brand-blue hover:text-brand-blue-dark"
      >
        Ver documentos ({cantidad})
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setAbierto(false)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-x-3 mb-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{titulo}</h3>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
                aria-label="Cerrar"
              >
                &times;
              </button>
            </div>
            <DocumentosResultado
              id={id}
              tipo={tipo}
              pdfs={pdfs}
              resultadoError={resultadoError}
              resultadoObtenidoAt={resultadoObtenidoAt}
              nivelRiesgo={nivelRiesgo}
            />
          </div>
        </div>
      )}
    </>
  );
}
