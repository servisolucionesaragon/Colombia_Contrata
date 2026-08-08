"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Precio = { id: string; documento: string; precio: number };

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export default function PreciosDocumentosPricing() {
  const [precios, setPrecios] = useState<Precio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("precios_documentos")
      .select("id, documento, precio")
      .eq("activo", true)
      .order("documento", { ascending: true })
      .then(({ data }) => {
        setPrecios((data as Precio[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return null;

  if (precios.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Próximamente.
      </p>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {precios.map((precio) => (
        <div
          key={precio.id}
          className="flex items-center justify-between gap-x-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-x-3 min-w-0">
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
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
              {precio.documento}
            </span>
          </div>
          <span className="text-sm font-semibold text-brand-blue whitespace-nowrap">
            {formatCOP(precio.precio)}
          </span>
        </div>
      ))}
    </div>
  );
}
