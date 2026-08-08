"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Documento = {
  id: string;
  documento: string;
  activo: boolean;
};

export default function PreciosDocumentosManager() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("precios_documentos")
      .select("id, documento, activo")
      .order("documento", { ascending: true });
    setDocumentos((data as Documento[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (
    event: FormEvent<HTMLFormElement>,
    id: string | "new"
  ) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      documento: formData.get("documento") as string,
      activo: formData.get("activo") === "on",
    };

    const { error } =
      id === "new"
        ? await supabase.from("precios_documentos").insert(payload)
        : await supabase.from("precios_documentos").update(payload).eq("id", id);

    setSaving(false);
    if (error) {
      setError("No pudimos guardar el documento. Intenta de nuevo.");
      return;
    }
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este documento? Esta acción no se puede deshacer.")) {
      return;
    }
    await supabase.from("precios_documentos").delete().eq("id", id);
    load();
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Documentos disponibles
        </h2>
        {editingId === null && (
          <button
            type="button"
            onClick={() => setEditingId("new")}
            className="text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
          >
            + Agregar documento
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
      ) : (
        <div className="space-y-3">
          {editingId === "new" && (
            <DocumentoForm
              onSubmit={(e) => handleSave(e, "new")}
              onCancel={() => setEditingId(null)}
              saving={saving}
              error={error}
            />
          )}

          {documentos.length === 0 && editingId !== "new" && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Todavía no hay documentos configurados.
            </p>
          )}

          {documentos.map((doc) =>
            editingId === doc.id ? (
              <DocumentoForm
                key={doc.id}
                documento={doc}
                onSubmit={(e) => handleSave(e, doc.id)}
                onCancel={() => setEditingId(null)}
                saving={saving}
                error={error}
              />
            ) : (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3"
              >
                <div className="flex items-center gap-x-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {doc.documento}
                  </p>
                  {!doc.activo && (
                    <span className="text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5">
                      Inactivo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-x-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingId(doc.id)}
                    className="text-sm font-medium text-brand-blue hover:text-brand-blue-dark"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
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

function DocumentoForm({
  documento,
  onSubmit,
  onCancel,
  saving,
  error,
}: {
  documento?: Documento;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50 dark:bg-gray-800"
    >
      <Field label="Nombre del documento" htmlFor="documento">
        <input
          id="documento"
          name="documento"
          type="text"
          required
          defaultValue={documento?.documento ?? ""}
          className={inputClass}
        />
      </Field>
      <label className="inline-flex items-center gap-x-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          name="activo"
          defaultChecked={documento?.activo ?? true}
          className="size-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-brand-blue focus:ring-brand-blue"
        />
        Documento activo (visible para personas)
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
