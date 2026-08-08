"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type ImageField = {
  file: File | null;
  previewUrl: string | null;
};

const uploadImage = async (file: File, prefix: string) => {
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("portal-assets")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("portal-assets").getPublicUrl(path);
  return data.publicUrl;
};

export default function AdminSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [nombrePortal, setNombrePortal] = useState("Colombia Contrata");
  const [eslogan, setEslogan] = useState("");
  const [colorPrimario, setColorPrimario] = useState("#1d4ed8");
  const [logo, setLogo] = useState<ImageField>({ file: null, previewUrl: null });
  const [favicon, setFavicon] = useState<ImageField>({
    file: null,
    previewUrl: null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("configuracion_portal")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) {
          setNombrePortal(data.nombre_portal);
          setEslogan(data.eslogan);
          setColorPrimario(data.color_primario);
          setLogo({ file: null, previewUrl: data.logo_url });
          setFavicon({ file: null, previewUrl: data.favicon_url });
        }
        setLoading(false);
      });
  }, []);

  const handleImageChange =
    (setter: (field: ImageField) => void) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      setter({
        file,
        previewUrl: file ? URL.createObjectURL(file) : null,
      });
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const newLogoUrl = logo.file
        ? await uploadImage(logo.file, "logo")
        : logo.previewUrl;
      const newFaviconUrl = favicon.file
        ? await uploadImage(favicon.file, "favicon")
        : favicon.previewUrl;

      const { error: updateError } = await supabase
        .from("configuracion_portal")
        .update({
          nombre_portal: nombrePortal,
          eslogan,
          color_primario: colorPrimario,
          logo_url: newLogoUrl,
          favicon_url: newFaviconUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      if (updateError) throw updateError;

      setLogo({ file: null, previewUrl: newLogoUrl });
      setFavicon({ file: null, previewUrl: newFaviconUrl });
      setSaved(true);
    } catch {
      setError("No pudimos guardar los cambios. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Identidad del portal
        </h2>
        <div className="space-y-4">
          <Field label="Nombre del portal" htmlFor="nombrePortal">
            <input
              id="nombrePortal"
              type="text"
              value={nombrePortal}
              onChange={(e) => setNombrePortal(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Eslogan" htmlFor="eslogan">
            <textarea
              id="eslogan"
              rows={2}
              value={eslogan}
              onChange={(e) => setEslogan(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Marca visual
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <ImageUpload
            label="Logo"
            hint="Recomendado: SVG o PNG con fondo transparente."
            image={logo}
            onChange={handleImageChange(setLogo)}
          />
          <ImageUpload
            label="Ícono / Favicon"
            hint="Recomendado: PNG o ICO cuadrado, 512×512px."
            image={favicon}
            onChange={handleImageChange(setFavicon)}
          />
        </div>

        <div className="mt-4">
          <Field label="Color primario" htmlFor="colorPrimario">
            <div className="flex items-center gap-x-3">
              <input
                id="colorPrimario"
                type="color"
                value={colorPrimario}
                onChange={(e) => setColorPrimario(e.target.value)}
                className="size-10 rounded-lg border border-gray-300 dark:border-gray-600 p-1"
              />
              <input
                type="text"
                value={colorPrimario}
                onChange={(e) => setColorPrimario(e.target.value)}
                className={`${inputClass} max-w-32`}
                aria-label="Código hexadecimal del color primario"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Botones, enlaces y acentos del sitio.
              </span>
            </div>
          </Field>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Vista previa
        </h2>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between bg-white dark:bg-gray-800">
          <div className="flex items-center gap-x-3">
            {logo.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo.previewUrl}
                alt="Vista previa del logo"
                className="h-8 w-auto"
              />
            ) : (
              <span
                className="text-xl font-semibold"
                style={{ color: colorPrimario }}
              >
                {nombrePortal || "Colombia Contrata"}
              </span>
            )}
          </div>
          <button
            type="button"
            className="text-sm font-semibold rounded-lg text-white px-4 py-2"
            style={{ backgroundColor: colorPrimario }}
          >
            Crear cuenta
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{eslogan}</p>
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
  "block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none";

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

function ImageUpload({
  label,
  hint,
  image,
  onChange,
}: {
  label: string;
  hint: string;
  image: ImageField;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </span>
      <div className="flex items-center gap-x-4">
        <div className="flex items-center justify-center size-16 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 overflow-hidden">
          {image.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.previewUrl}
              alt={`Vista previa de ${label}`}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <svg
              className="size-6 text-gray-300 dark:text-gray-600"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          )}
        </div>
        <div>
          <label className="inline-flex text-sm font-medium text-brand-blue hover:text-brand-blue-dark cursor-pointer">
            Subir archivo
            <input
              type="file"
              accept="image/*"
              onChange={onChange}
              className="sr-only"
            />
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{hint}</p>
        </div>
      </div>
    </div>
  );
}
