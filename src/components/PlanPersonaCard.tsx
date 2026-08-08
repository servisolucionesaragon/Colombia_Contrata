"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ConfigPersona = {
  titulo: string;
  descripcion: string;
  cta_label: string;
  precio_desde: number | null;
  activo: boolean;
};

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export default function PlanPersonaCard() {
  const [config, setConfig] = useState<ConfigPersona | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("configuracion_persona")
      .select("titulo, descripcion, cta_label, precio_desde, activo")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        setConfig(data as ConfigPersona | null);
        setLoading(false);
      });
  }, []);

  if (loading || !config || !config.activo) return null;

  return (
    <div className="mt-12 max-w-2xl mx-auto p-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center transition-shadow hover:shadow-lg hover:shadow-gray-900/5">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        {config.titulo}
      </h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {config.descripcion}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
        {config.precio_desde != null && (
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Desde {formatCOP(config.precio_desde)}
          </p>
        )}
        <a
          href="/registro"
          className="inline-flex items-center gap-x-2 text-sm font-bold rounded-xl border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-blue/25 transition-all px-5 py-2.5"
        >
          {config.cta_label}
        </a>
      </div>
    </div>
  );
}
