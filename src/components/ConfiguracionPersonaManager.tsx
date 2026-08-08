"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

export default function ConfiguracionPersonaManager() {
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [precioDesde, setPrecioDesde] = useState("");
  const [activo, setActivo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("configuracion_persona")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) {
          setTitulo(data.titulo);
          setDescripcion(data.descripcion);
          setCtaLabel(data.cta_label);
          setPrecioDesde(
            data.precio_desde != null ? String(data.precio_desde) : ""
          );
          setActivo(data.activo);
        }
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const { error: updateError } = await supabase
      .from("configuracion_persona")
      .update({
        titulo,
        descripcion,
        cta_label: ctaLabel,
        precio_desde: precioDesde ? Number(precioDesde) : null,
        activo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    setSaving(false);
    if (updateError) {
      setError("No pudimos guardar los cambios. Intenta de nuevo.");
      return;
    }
    setSaved(true);
  };

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Planes de personas
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Esta es la tarjeta que ven las personas naturales en la página
          principal.
        </p>
      </div>

      <Field label="Título" htmlFor="titulo">
        <input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Descripción" htmlFor="descripcion">
        <textarea
          id="descripcion"
          rows={2}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className={inputClass}
        />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Precio desde (COP, opcional)" htmlFor="precioDesde">
          <input
            id="precioDesde"
            type="number"
            min={0}
            value={precioDesde}
            onChange={(e) => setPrecioDesde(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Texto del botón" htmlFor="ctaLabel">
          <input
            id="ctaLabel"
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <label className="inline-flex items-center gap-x-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
          className="size-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-brand-blue focus:ring-brand-blue"
        />
        Mostrar esta tarjeta en la página principal
      </label>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-x-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed px-5 py-2.5"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400">
            Cambios guardados correctamente.
          </span>
        )}
      </div>
    </form>
  );
}

const inputClass =
  "block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
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
    </div>
  );
}
