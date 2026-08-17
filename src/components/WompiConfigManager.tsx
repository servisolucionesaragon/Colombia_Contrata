"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Ambiente = "sandbox" | "produccion";

type EnvEstado = {
  baseUrl: string;
  publicKey: string;
  integritySecretConfigurado: boolean;
  eventsSecretConfigurado: boolean;
};

type Estado = {
  ambienteActivo: Ambiente;
  sandbox: EnvEstado;
  produccion: EnvEstado;
};

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}` };
}

export default function WompiConfigManager() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [loading, setLoading] = useState(true);
  const [cambiandoAmbiente, setCambiandoAmbiente] = useState(false);

  const cargar = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/wompi-config", { headers: await authHeader() });
    if (res.ok) setEstado(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const cambiarAmbiente = async (ambiente: Ambiente) => {
    if (!estado || ambiente === estado.ambienteActivo) return;
    if (
      ambiente === "produccion" &&
      !confirm(
        "¿Cambiar el ambiente activo a Producción? Desde ese momento /solicitar va a cobrar con dinero real."
      )
    ) {
      return;
    }

    setCambiandoAmbiente(true);
    await fetch("/api/admin/wompi-config", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ ambienteActivo: ambiente }),
    });
    setCambiandoAmbiente(false);
    await cargar();
  };

  if (loading || !estado) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>;
  }

  return (
    <div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Pagos — Wompi
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Wompi tiene dos ambientes independientes: <strong>Sandbox</strong>{" "}
          (pruebas, sin dinero real) y <strong>Producción</strong> (pagos
          reales). Como Colombia Contrata no tiene un sitio de pruebas
          aparte, aquí puedes guardar las llaves de ambos a la vez y elegir
          cuál está activo con el interruptor de abajo — así puedes probar
          en Sandbox sin perder las llaves de Producción cuando estén
          listas. Las obtienes desde tu panel de Wompi (
          <a
            href="https://comercios.wompi.co"
            target="_blank"
            rel="noreferrer"
            className="text-brand-blue hover:underline"
          >
            comercios.wompi.co
          </a>
          ).
        </p>
      </div>

      <div className="mt-5 flex items-center gap-x-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Ambiente activo:
        </span>
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 gap-1">
          <button
            type="button"
            disabled={cambiandoAmbiente}
            onClick={() => cambiarAmbiente("sandbox")}
            className={`text-sm font-semibold rounded-md px-3 py-1.5 transition-colors disabled:opacity-50 ${
              estado.ambienteActivo === "sandbox"
                ? "bg-brand-blue text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            Sandbox
          </button>
          <button
            type="button"
            disabled={cambiandoAmbiente}
            onClick={() => cambiarAmbiente("produccion")}
            className={`text-sm font-semibold rounded-md px-3 py-1.5 transition-colors disabled:opacity-50 ${
              estado.ambienteActivo === "produccion"
                ? "bg-red-600 text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            Producción
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {estado.ambienteActivo === "sandbox"
          ? "Ahora mismo /solicitar usa las llaves de Sandbox — cualquier pago es simulado, sin dinero real."
          : "⚠️ Ahora mismo /solicitar usa las llaves de Producción — los pagos son reales."}
      </p>

      <EnvSection
        ambiente="sandbox"
        titulo="Sandbox (pruebas)"
        estado={estado.sandbox}
        onSaved={cargar}
      />
      <EnvSection
        ambiente="produccion"
        titulo="Producción (dinero real)"
        estado={estado.produccion}
        onSaved={cargar}
      />

      <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
        En Wompi, la URL de eventos/webhook es la misma para los dos
        ambientes (se configura por separado en cada uno dentro del panel
        de Wompi):{" "}
        <code className="text-xs">https://colombiacontrata.com/api/webhooks/wompi</code>.
      </p>
    </div>
  );
}

function EnvSection({
  ambiente,
  titulo,
  estado,
  onSaved,
}: {
  ambiente: Ambiente;
  titulo: string;
  estado: EnvEstado;
  onSaved: () => Promise<void>;
}) {
  const [baseUrl, setBaseUrl] = useState(estado.baseUrl);
  const [publicKey, setPublicKey] = useState(estado.publicKey);
  const [integritySecret, setIntegritySecret] = useState("");
  const [eventsSecret, setEventsSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prefijo = ambiente === "sandbox" ? "test" : "prod";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMensaje(null);
    setError(null);

    const res = await fetch("/api/admin/wompi-config", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ [ambiente]: { baseUrl, publicKey, integritySecret, eventsSecret } }),
    });

    setSaving(false);
    if (!res.ok) {
      setError("No pudimos guardar la configuración. Intenta de nuevo.");
      return;
    }

    setIntegritySecret("");
    setEventsSecret("");
    setMensaje("Guardado.");
    await onSaved();
  };

  const completo =
    !!estado.publicKey && estado.integritySecretConfigurado && estado.eventsSecretConfigurado;

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-x-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{titulo}</h3>
        <span
          className={`text-xs font-medium rounded-full px-2.5 py-1 ${
            completo
              ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400"
              : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
          }`}
        >
          {completo ? "Configurado" : "Incompleto"}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        <Field
          label="URL base de la API"
          htmlFor={`${ambiente}-base-url`}
          hint="Normalmente no hay que tocarla — solo cambia si Wompi actualiza sus dominios."
        >
          <input
            id={`${ambiente}-base-url`}
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Llave pública" htmlFor={`${ambiente}-public-key`} hint={`Empieza con pub_${prefijo}_...`}>
          <input
            id={`${ambiente}-public-key`}
            type="text"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder={`pub_${prefijo}_...`}
            className={inputClass}
          />
        </Field>

        <Field
          label="Secreto de integridad"
          htmlFor={`${ambiente}-integrity-secret`}
          hint={
            estado.integritySecretConfigurado
              ? "Ya hay uno guardado — déjalo en blanco para no cambiarlo."
              : "Aún no está configurado."
          }
        >
          <input
            id={`${ambiente}-integrity-secret`}
            type="password"
            value={integritySecret}
            onChange={(e) => setIntegritySecret(e.target.value)}
            placeholder={
              estado.integritySecretConfigurado
                ? "•••••••• (sin cambios)"
                : `${prefijo}_integrity_...`
            }
            className={inputClass}
            autoComplete="off"
          />
        </Field>

        <Field
          label="Secreto de eventos (webhook)"
          htmlFor={`${ambiente}-events-secret`}
          hint={
            estado.eventsSecretConfigurado
              ? "Ya hay uno guardado — déjalo en blanco para no cambiarlo."
              : "Aún no está configurado."
          }
        >
          <input
            id={`${ambiente}-events-secret`}
            type="password"
            value={eventsSecret}
            onChange={(e) => setEventsSecret(e.target.value)}
            placeholder={
              estado.eventsSecretConfigurado ? "•••••••• (sin cambios)" : `${prefijo}_events_...`
            }
            className={inputClass}
            autoComplete="off"
          />
        </Field>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {mensaje && <p className="mt-3 text-sm text-green-600 dark:text-green-400">{mensaje}</p>}

      <button
        type="submit"
        disabled={saving}
        className="mt-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed px-4 py-2"
      >
        {saving ? "Guardando..." : `Guardar ${titulo}`}
      </button>
    </form>
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
