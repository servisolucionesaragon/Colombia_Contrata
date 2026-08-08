"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Plan = {
  id: string;
  nombre: string;
  descripcion: string | null;
  creditos: number;
  precio_mensual: number;
  precio_anual: number | null;
  destacado: boolean;
  features: string[];
  cta_label: string | null;
  mostrar_precio_desde: boolean;
  empresa_id: string | null;
  activo: boolean;
};

type EmpresaOption = { id: string; razon_social: string | null };

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export default function PlanesEmpresaManager() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: planesData }, { data: empresasData }] = await Promise.all([
      supabase
        .from("planes_empresa")
        .select("*")
        .order("precio_mensual", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, razon_social")
        .eq("account_type", "empresa"),
    ]);
    setPlanes((planesData as Plan[]) ?? []);
    setEmpresas((empresasData as EmpresaOption[]) ?? []);
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
    const featuresRaw = (formData.get("features") as string) ?? "";
    const empresaId = (formData.get("empresa_id") as string) || null;
    const precioAnualRaw = formData.get("precio_anual") as string;

    const payload = {
      nombre: formData.get("nombre") as string,
      descripcion: (formData.get("descripcion") as string) || null,
      creditos: Number(formData.get("creditos")),
      precio_mensual: Number(formData.get("precio_mensual")),
      precio_anual: precioAnualRaw ? Number(precioAnualRaw) : null,
      destacado: formData.get("destacado") === "on",
      features: featuresRaw
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
      cta_label: (formData.get("cta_label") as string) || null,
      mostrar_precio_desde: formData.get("mostrar_precio_desde") === "on",
      empresa_id: empresaId,
      activo: formData.get("activo") === "on",
    };

    const { error } =
      id === "new"
        ? await supabase.from("planes_empresa").insert(payload)
        : await supabase.from("planes_empresa").update(payload).eq("id", id);

    setSaving(false);
    if (error) {
      setError("No pudimos guardar el plan. Intenta de nuevo.");
      return;
    }
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este plan? Esta acción no se puede deshacer.")) {
      return;
    }
    await supabase.from("planes_empresa").delete().eq("id", id);
    load();
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Planes de empresa
        </h2>
        {editingId === null && (
          <button
            type="button"
            onClick={() => setEditingId("new")}
            className="text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
          >
            + Agregar plan
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
      ) : (
        <div className="space-y-3">
          {editingId === "new" && (
            <PlanForm
              empresas={empresas}
              onSubmit={(e) => handleSave(e, "new")}
              onCancel={() => setEditingId(null)}
              saving={saving}
              error={error}
            />
          )}

          {planes.length === 0 && editingId !== "new" && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Todavía no hay planes creados.
            </p>
          )}

          {planes.map((plan) =>
            editingId === plan.id ? (
              <PlanForm
                key={plan.id}
                plan={plan}
                empresas={empresas}
                onSubmit={(e) => handleSave(e, plan.id)}
                onCancel={() => setEditingId(null)}
                saving={saving}
                error={error}
              />
            ) : (
              <div
                key={plan.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3"
              >
                <div>
                  <div className="flex items-center gap-x-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {plan.nombre}
                    </p>
                    {plan.destacado && (
                      <span className="text-xs rounded-full bg-brand-blue/10 text-brand-blue px-2 py-0.5">
                        Recomendado
                      </span>
                    )}
                    {plan.empresa_id && (
                      <span className="text-xs rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5">
                        Plan privado ·{" "}
                        {empresas.find((e) => e.id === plan.empresa_id)
                          ?.razon_social ?? "empresa"}
                      </span>
                    )}
                    {!plan.activo && (
                      <span className="text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {plan.creditos} consultas/mes · {formatCOP(plan.precio_mensual)}
                    /mes
                    {plan.precio_anual
                      ? ` · ${formatCOP(plan.precio_anual)}/año`
                      : ""}
                  </p>
                  {plan.descripcion && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {plan.descripcion}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-x-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingId(plan.id)}
                    className="text-sm font-medium text-brand-blue hover:text-brand-blue-dark"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(plan.id)}
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

function PlanForm({
  plan,
  empresas,
  onSubmit,
  onCancel,
  saving,
  error,
}: {
  plan?: Plan;
  empresas: EmpresaOption[];
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
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nombre del plan" htmlFor="nombre">
          <input
            id="nombre"
            name="nombre"
            type="text"
            required
            defaultValue={plan?.nombre ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Consultas incluidas / mes" htmlFor="creditos">
          <input
            id="creditos"
            name="creditos"
            type="number"
            min={0}
            required
            defaultValue={plan?.creditos ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Precio mensual (COP)" htmlFor="precio_mensual">
          <input
            id="precio_mensual"
            name="precio_mensual"
            type="number"
            min={0}
            required
            defaultValue={plan?.precio_mensual ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Precio anual (COP, opcional)" htmlFor="precio_anual">
          <input
            id="precio_anual"
            name="precio_anual"
            type="number"
            min={0}
            defaultValue={plan?.precio_anual ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Texto del botón (opcional)" htmlFor="cta_label">
          <input
            id="cta_label"
            name="cta_label"
            type="text"
            placeholder={`Elegir ${plan?.nombre ?? "plan"}`}
            defaultValue={plan?.cta_label ?? ""}
            className={inputClass}
          />
        </Field>
        <Field
          label="Plan privado para una empresa (opcional)"
          htmlFor="empresa_id"
        >
          <select
            id="empresa_id"
            name="empresa_id"
            defaultValue={plan?.empresa_id ?? ""}
            className={inputClass}
          >
            <option value="">Plan público (visible a todas)</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.razon_social ?? empresa.id}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Descripción corta" htmlFor="descripcion">
        <input
          id="descripcion"
          name="descripcion"
          type="text"
          defaultValue={plan?.descripcion ?? ""}
          className={inputClass}
        />
      </Field>

      <Field
        label="Características (una por línea, se muestran con check)"
        htmlFor="features"
      >
        <textarea
          id="features"
          name="features"
          rows={4}
          defaultValue={plan?.features?.join("\n") ?? ""}
          className={inputClass}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <label className="inline-flex items-center gap-x-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            name="activo"
            defaultChecked={plan?.activo ?? true}
            className="size-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-brand-blue focus:ring-brand-blue"
          />
          Plan activo
        </label>
        <label className="inline-flex items-center gap-x-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            name="destacado"
            defaultChecked={plan?.destacado ?? false}
            className="size-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-brand-blue focus:ring-brand-blue"
          />
          Marcar como "Recomendado"
        </label>
        <label className="inline-flex items-center gap-x-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            name="mostrar_precio_desde"
            defaultChecked={plan?.mostrar_precio_desde ?? false}
            className="size-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-brand-blue focus:ring-brand-blue"
          />
          Mostrar precio como "Desde $X" (para planes tipo cotización)
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
