"use client";

import { useEffect, useState } from "react";
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
};

type Periodo = "mensual" | "anual";

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Math.round(value));

export default function PlanesEmpresaPricing() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>("mensual");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("planes_empresa")
      .select(
        "id, nombre, descripcion, creditos, precio_mensual, precio_anual, destacado, features, cta_label, mostrar_precio_desde"
      )
      .is("empresa_id", null)
      .eq("activo", true)
      .order("precio_mensual", { ascending: true })
      .then(({ data }) => {
        setPlanes((data as Plan[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading || planes.length === 0) return null;

  return (
    <div>
      <div className="flex justify-center">
        <div
          role="tablist"
          aria-label="Periodo de facturación"
          className="inline-flex p-1 gap-1 rounded-lg bg-gray-100 dark:bg-gray-800"
        >
          <button
            type="button"
            role="tab"
            aria-selected={periodo === "mensual"}
            onClick={() => setPeriodo("mensual")}
            className={`text-sm font-medium rounded-md px-4 py-2 transition-colors ${
              periodo === "mensual"
                ? "bg-white dark:bg-gray-700 text-brand-blue shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Mensual
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={periodo === "anual"}
            onClick={() => setPeriodo("anual")}
            className={`inline-flex items-center gap-x-2 text-sm font-medium rounded-md px-4 py-2 transition-colors ${
              periodo === "anual"
                ? "bg-white dark:bg-gray-700 text-brand-blue shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Anual
            <span className="text-xs font-semibold rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 px-2 py-0.5">
              Ahorra con el plan anual
            </span>
          </button>
        </div>
      </div>

      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {planes.map((plan) => (
          <PlanCard key={plan.id} plan={plan} periodo={periodo} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan, periodo }: { plan: Plan; periodo: Periodo }) {
  const tieneAnual = plan.precio_anual != null && plan.precio_anual > 0;
  const mostrarAnual = periodo === "anual" && tieneAnual;
  const precioMostrado = mostrarAnual
    ? (plan.precio_anual as number) / 12
    : plan.precio_mensual;
  const ahorroPct =
    mostrarAnual && plan.precio_mensual > 0
      ? Math.round(
          (1 - (plan.precio_anual as number) / (plan.precio_mensual * 12)) *
            100
        )
      : 0;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 bg-white dark:bg-gray-900 transition-shadow hover:shadow-lg hover:shadow-gray-900/5 ${
        plan.destacado
          ? "border-brand-blue ring-2 ring-brand-blue"
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      {plan.destacado && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold rounded-full bg-brand-blue text-white px-3 py-1">
          Recomendado
        </span>
      )}

      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {plan.nombre}
      </h3>
      {plan.descripcion && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {plan.descripcion}
        </p>
      )}

      <div className="mt-4">
        <div className="flex items-baseline gap-x-1">
          {plan.mostrar_precio_desde && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Desde
            </span>
          )}
          <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {formatCOP(precioMostrado)}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">/mes</span>
        </div>
        {mostrarAnual && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Facturado anualmente · {formatCOP(plan.precio_anual as number)}/año
            {ahorroPct > 0 ? ` · ${ahorroPct}% de ahorro` : ""}
          </p>
        )}
        <p className="mt-2 text-sm text-brand-blue">
          {plan.creditos.toLocaleString("es-CO")} consultas / mes
        </p>
      </div>

      <a
        href={`/empresas/planes?periodo=${periodo}`}
        className={`mt-6 inline-flex items-center justify-center gap-x-2 text-sm font-bold rounded-xl px-4 py-2.5 transition-all ${
          plan.destacado
            ? "bg-brand-blue text-white hover:bg-brand-blue-dark hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-blue/25"
            : "border border-brand-blue text-brand-blue hover:bg-brand-blue/10"
        }`}
      >
        {plan.cta_label || `Elegir ${plan.nombre}`}
      </a>

      {plan.features.length > 0 && (
        <ul className="mt-6 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-4">
          {plan.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-x-2 text-sm text-gray-600 dark:text-gray-400"
            >
              <svg
                className="size-4 shrink-0 mt-0.5 text-green-600 dark:text-green-500"
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
              {feature}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
