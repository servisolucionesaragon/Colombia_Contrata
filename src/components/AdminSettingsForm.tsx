"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

type ImageField = {
  file: File | null;
  previewUrl: string | null;
};

const emptyImage: ImageField = { file: null, previewUrl: null };

export default function AdminSettingsForm() {
  const [nombrePortal, setNombrePortal] = useState("Colombia Contrata");
  const [eslogan, setEslogan] = useState(
    "Todos tus documentos de contratación pública, en un solo lugar",
  );
  const [colorPrimario, setColorPrimario] = useState("#1d4ed8");
  const [logo, setLogo] = useState<ImageField>({
    file: null,
    previewUrl: "/icono.png",
  });
  const [favicon, setFavicon] = useState<ImageField>({
    file: null,
    previewUrl: "/icono.png",
  });
  const [saved, setSaved] = useState(false);

  const handleImageChange =
    (setter: (field: ImageField) => void) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      setter({
        file,
        previewUrl: file ? URL.createObjectURL(file) : null,
      });
    };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: conectar con el backend (guardar en base de datos y subir
    // logo/favicon a almacenamiento) una vez esté definido.
    setSaved(true);
  };

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

      <div className="flex items-center gap-x-3">
        <button
          type="submit"
          className="inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark px-5 py-2.5"
        >
          Guardar cambios
        </button>
        {saved && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Vista previa actualizada — todavía no se guarda en un backend
            real.
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
