"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type LandingConfig = {
  hero_titulo_prefijo: string;
  hero_titulo_destacado: string;
  hero_subtitulo: string;
  hero_cta_primario_label: string;
  hero_cta_secundario_label: string;
  como_funciona_activo: boolean;
  como_funciona_titulo: string;
  paso1_titulo: string;
  paso1_descripcion: string;
  paso2_titulo: string;
  paso2_descripcion: string;
  paso3_titulo: string;
  paso3_descripcion: string;
  documentos_activo: boolean;
  documentos_titulo: string;
  documentos_subtitulo: string;
  planes_activo: boolean;
  planes_titulo: string;
  planes_empresa_titulo: string;
  planes_empresa_subtitulo: string;
};

const empty: LandingConfig = {
  hero_titulo_prefijo: "",
  hero_titulo_destacado: "",
  hero_subtitulo: "",
  hero_cta_primario_label: "",
  hero_cta_secundario_label: "",
  como_funciona_activo: true,
  como_funciona_titulo: "",
  paso1_titulo: "",
  paso1_descripcion: "",
  paso2_titulo: "",
  paso2_descripcion: "",
  paso3_titulo: "",
  paso3_descripcion: "",
  documentos_activo: true,
  documentos_titulo: "",
  documentos_subtitulo: "",
  planes_activo: true,
  planes_titulo: "",
  planes_empresa_titulo: "",
  planes_empresa_subtitulo: "",
};

export default function LandingConfigManager() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<LandingConfig>(empty);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("configuracion_landing")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) setConfig(data as LandingConfig);
        setLoading(false);
      });
  }, []);

  const set = <K extends keyof LandingConfig>(key: K, value: LandingConfig[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const { error: updateError } = await supabase
      .from("configuracion_landing")
      .update({ ...config, updated_at: new Date().toISOString() })
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
    <form onSubmit={handleSubmit} className="space-y-10">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Página principal
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Edita los textos de la página de inicio y decide qué secciones se
          muestran. Los cambios se ven en el sitio en menos de 60 segundos.
        </p>
      </div>

      {/* Hero */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Encabezado principal
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Título (parte normal)" htmlFor="hero_titulo_prefijo">
            <input
              id="hero_titulo_prefijo"
              value={config.hero_titulo_prefijo}
              onChange={(e) => set("hero_titulo_prefijo", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Título (parte resaltada en azul)" htmlFor="hero_titulo_destacado">
            <input
              id="hero_titulo_destacado"
              value={config.hero_titulo_destacado}
              onChange={(e) => set("hero_titulo_destacado", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Subtítulo" htmlFor="hero_subtitulo">
          <textarea
            id="hero_subtitulo"
            rows={2}
            value={config.hero_subtitulo}
            onChange={(e) => set("hero_subtitulo", e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Texto botón principal" htmlFor="hero_cta_primario_label">
            <input
              id="hero_cta_primario_label"
              value={config.hero_cta_primario_label}
              onChange={(e) => set("hero_cta_primario_label", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Texto botón secundario" htmlFor="hero_cta_secundario_label">
            <input
              id="hero_cta_secundario_label"
              value={config.hero_cta_secundario_label}
              onChange={(e) => set("hero_cta_secundario_label", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
        <SectionHeader
          title="Sección “Cómo funciona”"
          activo={config.como_funciona_activo}
          onToggle={(v) => set("como_funciona_activo", v)}
        />
        <Field label="Título de la sección" htmlFor="como_funciona_titulo">
          <input
            id="como_funciona_titulo"
            value={config.como_funciona_titulo}
            onChange={(e) => set("como_funciona_titulo", e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="grid sm:grid-cols-3 gap-4">
          <PasoFields
            n={1}
            titulo={config.paso1_titulo}
            descripcion={config.paso1_descripcion}
            onTitulo={(v) => set("paso1_titulo", v)}
            onDescripcion={(v) => set("paso1_descripcion", v)}
          />
          <PasoFields
            n={2}
            titulo={config.paso2_titulo}
            descripcion={config.paso2_descripcion}
            onTitulo={(v) => set("paso2_titulo", v)}
            onDescripcion={(v) => set("paso2_descripcion", v)}
          />
          <PasoFields
            n={3}
            titulo={config.paso3_titulo}
            descripcion={config.paso3_descripcion}
            onTitulo={(v) => set("paso3_titulo", v)}
            onDescripcion={(v) => set("paso3_descripcion", v)}
          />
        </div>
      </section>

      {/* Documentos disponibles */}
      <section className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
        <SectionHeader
          title="Sección “Documentos disponibles”"
          activo={config.documentos_activo}
          onToggle={(v) => set("documentos_activo", v)}
        />
        <Field label="Título de la sección" htmlFor="documentos_titulo">
          <input
            id="documentos_titulo"
            value={config.documentos_titulo}
            onChange={(e) => set("documentos_titulo", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Subtítulo" htmlFor="documentos_subtitulo">
          <textarea
            id="documentos_subtitulo"
            rows={2}
            value={config.documentos_subtitulo}
            onChange={(e) => set("documentos_subtitulo", e.target.value)}
            className={inputClass}
          />
        </Field>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          La lista de documentos se edita en la pestaña “Documentos disponibles”.
        </p>
      </section>

      {/* Planes */}
      <section className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
        <SectionHeader
          title="Sección “Planes”"
          activo={config.planes_activo}
          onToggle={(v) => set("planes_activo", v)}
        />
        <Field label="Título de la sección" htmlFor="planes_titulo">
          <input
            id="planes_titulo"
            value={config.planes_titulo}
            onChange={(e) => set("planes_titulo", e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Título \"Planes para empresas\"" htmlFor="planes_empresa_titulo">
            <input
              id="planes_empresa_titulo"
              value={config.planes_empresa_titulo}
              onChange={(e) => set("planes_empresa_titulo", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Subtítulo \"Planes para empresas\"" htmlFor="planes_empresa_subtitulo">
            <input
              id="planes_empresa_subtitulo"
              value={config.planes_empresa_subtitulo}
              onChange={(e) => set("planes_empresa_subtitulo", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          La tarjeta "Persona independiente" se edita en la pestaña "Planes de
          personas" y los planes de empresa en la pestaña "Planes de empresa".
        </p>
      </section>

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

function SectionHeader({
  title,
  activo,
  onToggle,
}: {
  title: string;
  activo: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </h3>
      <label className="inline-flex items-center gap-x-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => onToggle(e.target.checked)}
          className="size-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-brand-blue focus:ring-brand-blue"
        />
        Mostrar en la página principal
      </label>
    </div>
  );
}

function PasoFields({
  n,
  titulo,
  descripcion,
  onTitulo,
  onDescripcion,
}: {
  n: number;
  titulo: string;
  descripcion: string;
  onTitulo: (value: string) => void;
  onDescripcion: (value: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
        Paso {n}
      </p>
      <input
        aria-label={`Título del paso ${n}`}
        value={titulo}
        onChange={(e) => onTitulo(e.target.value)}
        className={inputClass}
      />
      <textarea
        aria-label={`Descripción del paso ${n}`}
        rows={3}
        value={descripcion}
        onChange={(e) => onDescripcion(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}
