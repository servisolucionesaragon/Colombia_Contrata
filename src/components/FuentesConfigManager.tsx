"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import ConsultaManualAdmin from "@/components/ConsultaManualAdmin";

type Estado = {
  baseUrl: string;
  apiKeyConfigurada: boolean;
};

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}` };
}

export default function FuentesConfigManager() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [loading, setLoading] = useState(true);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/fuentes-config", { headers: await authHeader() });
    if (res.ok) {
      const data = await res.json();
      setEstado(data);
      setBaseUrl(data.baseUrl);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMensaje(null);
    setError(null);

    const res = await fetch("/api/admin/fuentes-config", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ baseUrl, apiKey }),
    });

    setSaving(false);
    if (!res.ok) {
      setError("No pudimos guardar la configuración. Intenta de nuevo.");
      return;
    }

    setApiKey("");
    setMensaje("Guardado.");
    await cargar();
  };

  if (loading || !estado) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>;
  }

  return (
    <div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Fuentes</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Datos de conexión con el proveedor de verificación de antecedentes
          (Solverio Verify). Cuando un candidato autoriza una consulta, la
          plataforma llama a estas credenciales para traer el resultado
          real. Más adelante se podrán activar o desactivar fuentes
          individuales desde aquí.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field
          label="Endpoint base"
          htmlFor="fuentes-base-url"
          hint="Normalmente no hay que tocarlo — solo cambia si el proveedor actualiza su dominio."
        >
          <input
            id="fuentes-base-url"
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field
          label="API key"
          htmlFor="fuentes-api-key"
          hint={
            estado.apiKeyConfigurada
              ? "Ya hay una guardada — déjala en blanco para no cambiarla."
              : "Aún no está configurada."
          }
        >
          <input
            id="fuentes-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={estado.apiKeyConfigurada ? "•••••••• (sin cambios)" : "sk_live_..."}
            className={inputClass}
            autoComplete="off"
          />
        </Field>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {mensaje && <p className="text-sm text-green-600 dark:text-green-400">{mensaje}</p>}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed px-4 py-2"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </form>

      <div className="mt-6 rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Estado
        </p>
        <span
          className={`mt-1 inline-block text-xs font-medium rounded-full px-2.5 py-1 ${
            estado.apiKeyConfigurada
              ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400"
              : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
          }`}
        >
          {estado.apiKeyConfigurada ? "Configurado" : "Falta la API key"}
        </span>
      </div>

      {estado.apiKeyConfigurada && <ConsultaManualAdmin />}
    </div>
  );
}

const inputClass =
  "block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}
