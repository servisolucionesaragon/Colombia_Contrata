"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Estado = {
  publicKey: string;
  integritySecretConfigurado: boolean;
  eventsSecretConfigurado: boolean;
};

export default function WompiConfigManager() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [loading, setLoading] = useState(true);
  const [publicKey, setPublicKey] = useState("");
  const [integritySecret, setIntegritySecret] = useState("");
  const [eventsSecret, setEventsSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch("/api/admin/wompi-config", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = (await res.json()) as Estado;
      setEstado(data);
      setPublicKey(data.publicKey);
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

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch("/api/admin/wompi-config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ publicKey, integritySecret, eventsSecret }),
    });

    setSaving(false);
    if (!res.ok) {
      setError("No pudimos guardar la configuración. Intenta de nuevo.");
      return;
    }

    setIntegritySecret("");
    setEventsSecret("");
    setMensaje("Configuración guardada.");
    await cargar();
  };

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>;
  }

  const pagosActivos =
    !!estado?.publicKey && estado?.integritySecretConfigurado && estado?.eventsSecretConfigurado;

  return (
    <div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Pagos — Wompi
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Llaves de la pasarela de pagos Wompi, usadas por{" "}
          <code className="text-xs">/solicitar</code> para armar el checkout
          y confirmar los pagos. Las obtienes desde tu panel de Wompi (
          <a
            href="https://comercios.wompi.co"
            target="_blank"
            rel="noreferrer"
            className="text-brand-blue hover:underline"
          >
            comercios.wompi.co
          </a>
          ) una vez tu cuenta esté validada.
        </p>
      </div>

      <div
        className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
          pagosActivos
            ? "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400"
            : "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
        }`}
      >
        {pagosActivos
          ? "Las tres llaves están configuradas — el checkout de Wompi está activo en /solicitar."
          : "Faltan una o más llaves — mientras tanto, /solicitar registra las solicitudes pero muestra \"los pagos estarán disponibles pronto\"."}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field
          label="Llave pública"
          htmlFor="wompi-public-key"
          hint="No es secreta — empieza con pub_test_ (sandbox) o pub_prod_ (producción)."
        >
          <input
            id="wompi-public-key"
            type="text"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder="pub_test_..."
            className={inputClass}
          />
        </Field>

        <Field
          label="Secreto de integridad"
          htmlFor="wompi-integrity-secret"
          hint={
            estado?.integritySecretConfigurado
              ? "Ya hay uno guardado — déjalo en blanco para no cambiarlo."
              : "Aún no está configurado."
          }
        >
          <input
            id="wompi-integrity-secret"
            type="password"
            value={integritySecret}
            onChange={(e) => setIntegritySecret(e.target.value)}
            placeholder={
              estado?.integritySecretConfigurado ? "•••••••• (sin cambios)" : "prod_integrity_... / test_integrity_..."
            }
            className={inputClass}
            autoComplete="off"
          />
        </Field>

        <Field
          label="Secreto de eventos (webhook)"
          htmlFor="wompi-events-secret"
          hint={
            estado?.eventsSecretConfigurado
              ? "Ya hay uno guardado — déjalo en blanco para no cambiarlo."
              : "Aún no está configurado."
          }
        >
          <input
            id="wompi-events-secret"
            type="password"
            value={eventsSecret}
            onChange={(e) => setEventsSecret(e.target.value)}
            placeholder={
              estado?.eventsSecretConfigurado ? "•••••••• (sin cambios)" : "prod_events_... / test_events_..."
            }
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

      <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
        En Wompi, la URL de eventos/webhook que debes configurar es{" "}
        <code className="text-xs">https://colombiacontrata.com/api/webhooks/wompi</code>.
      </p>
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
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}
    </div>
  );
}
