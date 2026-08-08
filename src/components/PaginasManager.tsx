"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import RichTextEditor from "@/components/RichTextEditor";

type Pagina = {
  id: string;
  slug: string;
  titulo: string;
  contenido: string | null;
  activo: boolean;
  mostrar_en_menu: boolean;
  orden: number;
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export default function PaginasManager() {
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("paginas")
      .select("*")
      .order("titulo", { ascending: true });
    setPaginas((data as Pagina[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (
    event: FormEvent<HTMLFormElement>,
    pagina: Pagina | "new"
  ) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      titulo: formData.get("titulo") as string,
      slug: slugify(formData.get("slug") as string),
      contenido: (formData.get("contenido") as string) || null,
      activo: formData.get("activo") === "on",
      mostrar_en_menu: formData.get("mostrar_en_menu") === "on",
    };

    if (!payload.slug) {
      setError("La URL (slug) no puede quedar vacía.");
      setSaving(false);
      return;
    }

    const { error: saveError } =
      pagina === "new"
        ? await supabase.from("paginas").insert(payload)
        : await supabase.from("paginas").update(payload).eq("id", pagina.id);

    setSaving(false);
    if (saveError) {
      setError(
        saveError.code === "23505"
          ? "Ya existe otra página con esa URL. Usa una distinta."
          : "No pudimos guardar la página. Intenta de nuevo."
      );
      return;
    }
    setEditingId(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta página? Esta acción no se puede deshacer.")) {
      return;
    }
    await supabase.from("paginas").delete().eq("id", id);
    await load();
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Páginas
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Páginas propias con su URL (ej. "Nosotros"). Enlázalas desde un
            botón de un Bloque de contenido o desde donde quieras.
          </p>
        </div>
        {editingId === null && (
          <button
            type="button"
            onClick={() => setEditingId("new")}
            className="shrink-0 text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
          >
            + Agregar página
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
      ) : (
        <div className="space-y-3">
          {editingId === "new" && (
            <PaginaForm
              onSubmit={(e) => handleSave(e, "new")}
              onCancel={() => setEditingId(null)}
              saving={saving}
              error={error}
            />
          )}

          {paginas.length === 0 && editingId !== "new" && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Todavía no hay páginas creadas.
            </p>
          )}

          {paginas.map((pagina) =>
            editingId === pagina.id ? (
              <PaginaForm
                key={pagina.id}
                pagina={pagina}
                onSubmit={(e) => handleSave(e, pagina)}
                onCancel={() => setEditingId(null)}
                saving={saving}
                error={error}
              />
            ) : (
              <div
                key={pagina.id}
                className="flex items-center justify-between gap-x-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-x-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {pagina.titulo}
                    </p>
                    {pagina.mostrar_en_menu && (
                      <span className="text-xs rounded-full bg-brand-blue/10 text-brand-blue px-2 py-0.5">
                        En el menú
                      </span>
                    )}
                    {!pagina.activo && (
                      <span className="text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5">
                        Inactiva
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    /paginas/{pagina.slug}
                  </p>
                </div>
                <div className="flex items-center gap-x-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingId(pagina.id)}
                    className="text-sm font-medium text-brand-blue hover:text-brand-blue-dark"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(pagina.id)}
                    className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}

function PaginaForm({
  pagina,
  onSubmit,
  onCancel,
  saving,
  error,
}: {
  pagina?: Pagina;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [titulo, setTitulo] = useState(pagina?.titulo ?? "");
  const [slug, setSlug] = useState(pagina?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!pagina);

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50 dark:bg-gray-800"
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Título" htmlFor="titulo">
          <input
            id="titulo"
            name="titulo"
            type="text"
            required
            value={titulo}
            onChange={(e) => {
              setTitulo(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            className={inputClass}
          />
        </Field>
        <Field label="URL de la página" htmlFor="slug">
          <div className="flex items-center gap-x-1">
            <span className="text-sm text-gray-400 shrink-0">/paginas/</span>
            <input
              id="slug"
              name="slug"
              type="text"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              className={inputClass}
            />
          </div>
        </Field>
      </div>

      <Field label="Contenido" htmlFor="contenido-editor">
        <RichTextEditor name="contenido" defaultValue={pagina?.contenido} />
      </Field>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <label className="inline-flex items-center gap-x-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            name="activo"
            defaultChecked={pagina?.activo ?? true}
            className="size-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-brand-blue focus:ring-brand-blue"
          />
          Página activa
        </label>
        <label className="inline-flex items-center gap-x-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            name="mostrar_en_menu"
            defaultChecked={pagina?.mostrar_en_menu ?? false}
            className="size-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-brand-blue focus:ring-brand-blue"
          />
          Mostrar en el menú de navegación
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-x-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed px-4 py-2"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          Cancelar
        </button>
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
