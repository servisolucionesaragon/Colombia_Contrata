"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Fuente = {
  fuente: string;
  estado: string;
  error: string | null;
  duracionMs: number;
  tieneSoporte: boolean;
};

type Resultado = {
  semaforo: "verde" | "amarillo" | "rojo" | null;
  estadoConsulta: string | null;
  fuentes: Fuente[];
  pdfs: Record<string, string> | null;
};

const formVacio = {
  primerNombre: "",
  segundoNombre: "",
  primerApellido: "",
  segundoApellido: "",
  tipoDocumento: "CC",
  numeroDocumento: "",
  fechaExpedicion: "",
};

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}` };
}

function descargarPdf(fuente: string, base64: string) {
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
  const blob = new Blob([array], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function ConsultaManualAdmin() {
  const [form, setForm] = useState(formVacio);
  const [consultando, setConsultando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConsultando(true);
    setError(null);
    setResultado(null);

    // Un corte del servidor (ej. Vercel matando la función a los 60s) no
    // siempre devuelve JSON — sin este try/catch, esa respuesta rompía la
    // función a mitad de camino y dejaba el botón trabado en
    // "Consultando..." para siempre, sin ningún mensaje de error.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 170_000);

    try {
      const res = await fetch("/api/admin/consulta-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify(form),
        signal: controller.signal,
      });

      let data: { error?: string } & Partial<Resultado> = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(
          res.ok
            ? "El servidor no devolvió una respuesta válida."
            : `El servidor cortó la conexión (código ${res.status}) — probablemente la consulta tardó más de lo que aguanta el servidor.`
        );
      }

      if (!res.ok) {
        setError(data.error ?? "No pudimos completar la consulta.");
        return;
      }
      setResultado(data as Resultado);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("La consulta tardó demasiado y se canceló desde el navegador.");
      } else {
        setError(err instanceof Error ? err.message : "No pudimos completar la consulta.");
      }
    } finally {
      clearTimeout(timeoutId);
      setConsultando(false);
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Consulta manual</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Corre una verificación directa contra el proveedor sin pasar por
        ninguna empresa ni descontar créditos de nadie — útil para probar
        la integración o resolver un caso puntual. Puede tardar hasta un
        minuto: el proveedor consulta varias fuentes en paralelo y alguna
        puede ser lenta.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 grid sm:grid-cols-2 gap-3">
        <input
          type="text"
          required
          placeholder="Primer nombre"
          value={form.primerNombre}
          onChange={(e) => setForm((p) => ({ ...p, primerNombre: e.target.value }))}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Segundo nombre (opcional)"
          value={form.segundoNombre}
          onChange={(e) => setForm((p) => ({ ...p, segundoNombre: e.target.value }))}
          className={inputClass}
        />
        <input
          type="text"
          required
          placeholder="Primer apellido"
          value={form.primerApellido}
          onChange={(e) => setForm((p) => ({ ...p, primerApellido: e.target.value }))}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Segundo apellido (opcional)"
          value={form.segundoApellido}
          onChange={(e) => setForm((p) => ({ ...p, segundoApellido: e.target.value }))}
          className={inputClass}
        />
        <select
          value={form.tipoDocumento}
          onChange={(e) => setForm((p) => ({ ...p, tipoDocumento: e.target.value }))}
          className={inputClass}
        >
          <option value="CC">Cédula de ciudadanía</option>
          <option value="CE">Cédula de extranjería</option>
          <option value="PPT">Permiso por protección temporal</option>
          <option value="PA">Pasaporte (no soportado por el proveedor)</option>
        </select>
        <input
          type="text"
          required
          placeholder="Número de documento"
          value={form.numeroDocumento}
          onChange={(e) => setForm((p) => ({ ...p, numeroDocumento: e.target.value }))}
          className={inputClass}
        />
        <input
          type="date"
          placeholder="Fecha de expedición (opcional)"
          value={form.fechaExpedicion}
          onChange={(e) => setForm((p) => ({ ...p, fechaExpedicion: e.target.value }))}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={consultando}
          className="sm:col-span-2 inline-flex items-center justify-center gap-x-2 text-sm font-bold rounded-xl border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3"
        >
          {consultando ? "Consultando (puede tardar hasta un minuto)..." : "Consultar"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {resultado && (
        <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
          <div className="flex items-center gap-x-3">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Resultado:</span>
            <SemaforoBadge semaforo={resultado.semaforo} />
            {resultado.estadoConsulta && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                ({resultado.estadoConsulta})
              </span>
            )}
          </div>

          {resultado.fuentes.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-4">Fuente</th>
                    <th className="py-2 pr-4">Estado</th>
                    <th className="py-2">Duración</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.fuentes.map((f) => (
                    <tr key={f.fuente} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <td className="py-2 pr-4 text-gray-900 dark:text-gray-100">{f.fuente}</td>
                      <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                        {f.error ? `error: ${f.error}` : f.estado}
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        {(f.duracionMs / 1000).toFixed(1)}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {resultado.pdfs && Object.keys(resultado.pdfs).length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                Documentos
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(resultado.pdfs).map(([fuente, base64]) => (
                  <button
                    key={fuente}
                    type="button"
                    onClick={() => descargarPdf(fuente, base64)}
                    className="text-xs font-medium text-brand-blue hover:text-brand-blue-dark underline"
                  >
                    {fuente}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SemaforoBadge({ semaforo }: { semaforo: "verde" | "amarillo" | "rojo" | null }) {
  if (!semaforo) {
    return (
      <span className="text-xs font-medium rounded-full px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
        sin clasificar
      </span>
    );
  }
  const estilos: Record<"verde" | "amarillo" | "rojo", string> = {
    verde: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400",
    amarillo: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
    rojo: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400",
  };
  return (
    <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${estilos[semaforo]}`}>
      {semaforo}
    </span>
  );
}

const inputClass =
  "block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none";
