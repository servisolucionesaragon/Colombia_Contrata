"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Documento = { id: string; documento: string };

export default function PreciosDocumentosPricing() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("precios_documentos")
      .select("id, documento")
      .eq("activo", true)
      .order("documento", { ascending: true })
      .then(({ data }) => {
        setDocumentos((data as Documento[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return null;

  if (documentos.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Próximamente.
      </p>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {documentos.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-x-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <span className="flex-none flex items-center justify-center size-8 rounded-full bg-brand-blue/10 text-brand-blue">
            <svg
              className="size-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {doc.documento}
          </span>
        </div>
      ))}
    </div>
  );
}
