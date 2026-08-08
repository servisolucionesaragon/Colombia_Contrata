"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Bloque = {
  id: string;
  orden: number;
  activo: boolean;
  titulo: string | null;
  descripcion: string | null;
  imagen_url: string | null;
  imagen_posicion: "izquierda" | "derecha";
  boton_label: string | null;
  boton_href: string | null;
};

const uploadImage = async (file: File) => {
  const ext = file.name.split(".").pop() ?? "png";
  const path = `bloque-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("portal-assets")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("portal-assets").getPublicUrl(path);
  return data.publicUrl;
};

export default function BloquesLandingManager() {
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bloques_landing")
      .select("*")
      .order("orden", { ascending: true });
    setBloques((data as Bloque[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (
    event: FormEvent<HTMLFormElement>,
    bloque: Bloque | "new"
  ) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);
      const imageFile = formData.get("imagen") as File | null;
      const imagenUrl = imageFile && imageFile.size > 0
        ? await uploadImage(imageFile)
        : bloque !== "new"
          ? bloque.imagen_url
          : null;

      const payload = {
        titulo: (formData.get("titulo") as string) || null,
        descripcion: (formData.get("descripcion") as string) || null,
        imagen_url: imagenUrl,
        imagen_posicion: formData.get("imagen_posicion") as string,
        boton_label: (formData.get("boton_label") as string) || null,
        boton_href: (formData.get("boton_href") as string) || null,
        activo: formData.get("activo") === "on",
      };

      const { error: saveError } =
        bloque === "new"
          ? await supabase
              .from("bloques_landing")
              .insert({ ...payload, orden: bloques.length })
          : await supabase
              .from("bloques_landing")
              .update(payload)
              .eq("id", bloque.id);

      if (saveError) throw saveError;
      setEditingId(null);
      await load();
    } catch {
      setError("No pudimos guardar el bloque. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este bloque? Esta acción no se puede deshacer.")) {
      return;
    }
    await supabase.from("bloques_landing").delete().eq("id", id);
    await load();
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= bloques.length) return;
    const a = bloques[index];
    const b = bloques[target];
    await Promise.all([
      supabase.from("bloques_landing").update({ orden: b.orden }).eq("id", a.id),
      supabase.from("bloques_landing").update({ orden: a.orden }).eq("id", b.id),
    ]);
    await load();
  };

  return (
    <section>
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Bloques de contenido
          </h2>
          {editingId === null && (
            <button
              type="button"
              onClick={() => setEditingId("new")}
              className="text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
            >
              + Agregar bloque
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Bloques de texto, imagen y botón que se muestran, en este orden, al
          final de la página principal (antes del pie de página).
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
      ) : (
        <div className="space-y-3">
          {editingId === "new" && (
            <BloqueForm
              onSubmit={(e) => handleSave(e, "new")}
              onCancel={() => setEditingId(null)}
              saving={saving}
              error={error}
            />
          )}

          {bloques.length === 0 && editingId !== "new" && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Todavía no hay bloques creados.
            </p>
          )}

          {bloques.map((bloque, index) =>
            editingId === bloque.id ? (
              <BloqueForm
                key={bloque.id}
                bloque={bloque}
                onSubmit={(e) => handleSave(e, bloque)}
                onCancel={() => setEditingId(null)}
                saving={saving}
                error={error}
              />
            ) : (
              <div
                key={bloque.id}
                className="flex items-center justify-between gap-x-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3"
              >
                <div className="flex items-center gap-x-3 min-w-0">
                  {bloque.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={bloque.imagen_url}
                      alt=""
                      className="size-10 rounded-md object-cover shrink-0"
                    />
                  ) : (
                    <div className="size-10 rounded-md bg-gray-100 dark:bg-gray-800 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-x-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {bloque.titulo || "(sin título)"}
                      </p>
                      {!bloque.activo && (
                        <span className="text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5">
                          Inactivo
                        </span>
                      )}
                    </div>
                    {bloque.descripcion && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {bloque.descripcion}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Mover arriba"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === bloques.length - 1}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Mover abajo"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(bloque.id)}
                    className="text-sm font-medium text-brand-blue hover:text-brand-blue-dark"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(bloque.id)}
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

function BloqueForm({
  bloque,
  onSubmit,
  onCancel,
  saving,
  error,
}: {
  bloque?: Bloque;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(bloque?.imagen_url ?? null);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setPreview(file ? URL.createObjectURL(file) : bloque?.imagen_url ?? null);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50 dark:bg-gray-800"
    >
      <Field label="Título (opcional)" htmlFor="titulo">
        <input
          id="titulo"
          name="titulo"
          type="text"
          defaultValue={bloque?.titulo ?? ""}
          className={inputClass}
        />
      </Field>

      <Field label="Descripción (opcional)" htmlFor="descripcion">
        <textarea
          id="descripcion"
          name="descripcion"
          rows={3}
          defaultValue={bloque?.descripcion ?? ""}
          className={inputClass}
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Imagen (opcional)" htmlFor="imagen">
          <div className="flex items-center gap-x-3">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt=""
                className="size-12 rounded-md object-cover border border-gray-200 dark:border-gray-700"
              />
            )}
            <input
              id="imagen"
              name="imagen"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="text-sm text-gray-700 dark:text-gray-300"
            />
          </div>
        </Field>
        <Field label="Posición de la imagen" htmlFor="imagen_posicion">
          <select
            id="imagen_posicion"
            name="imagen_posicion"
            defaultValue={bloque?.imagen_posicion ?? "derecha"}
            className={inputClass}
          >
            <option value="derecha">Imagen a la derecha</option>
            <option value="izquierda">Imagen a la izquierda</option>
          </select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Texto del botón (opcional)" htmlFor="boton_label">
          <input
            id="boton_label"
            name="boton_label"
            type="text"
            defaultValue={bloque?.boton_label ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Enlace del botón" htmlFor="boton_href">
          <input
            id="boton_href"
            name="boton_href"
            type="text"
            placeholder="/registro"
            defaultValue={bloque?.boton_href ?? ""}
            className={inputClass}
          />
        </Field>
      </div>

      <label className="inline-flex items-center gap-x-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          name="activo"
          defaultChecked={bloque?.activo ?? true}
          className="size-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-brand-blue focus:ring-brand-blue"
        />
        Mostrar este bloque en la página principal
      </label>

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
