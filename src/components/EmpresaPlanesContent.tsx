"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
};

type Periodo = "mensual" | "anual";
type Status = "loading" | "signed-out" | "no-empresa" | "sin-permiso" | "ready" | "pago-no-disponible";

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Math.round(value));

export default function EmpresaPlanesContent() {
  const [status, setStatus] = useState<Status>("loading");
  const [planes, setPlanes] = useState<Plan[]>([]);
  // El landing público (PlanesEmpresaPricing.tsx) enlaza aquí con
  // ?periodo=anual cuando el usuario ya eligió "Anual" allá — sin esto,
  // esta página siempre abría en "Mensual" sin importar lo que se
  // seleccionó antes, y si el usuario compraba sin volver a marcar
  // "Anual" acababa pagando el valor mensual pensando que era el anual.
  const [periodo, setPeriodo] = useState<Periodo>(() => {
    if (typeof window !== "undefined") {
      const desdeUrl = new URLSearchParams(window.location.search).get("periodo");
      if (desdeUrl === "anual") return "anual";
    }
    return "mensual";
  });
  const [comprandoId, setComprandoId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [perfilIncompleto, setPerfilIncompleto] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setStatus("signed-out");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type, empresa_id_padre, rol_empresa")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (profile?.account_type !== "empresa" && profile?.account_type !== "empresa_miembro") {
        setStatus("no-empresa");
        return;
      }

      if (profile.account_type === "empresa_miembro" && profile.rol_empresa !== "administrador") {
        setStatus("sin-permiso");
        return;
      }

      const empresaId =
        profile.account_type === "empresa" ? userData.user.id : profile.empresa_id_padre;

      const { data: planesData } = await supabase
        .from("planes_empresa")
        .select(
          "id, nombre, descripcion, creditos, precio_mensual, precio_anual, destacado, features, cta_label"
        )
        .or(`empresa_id.is.null,empresa_id.eq.${empresaId}`)
        .eq("activo", true)
        .order("precio_mensual", { ascending: true });

      setPlanes((planesData as Plan[]) ?? []);
      setStatus("ready");
    })();
  }, []);

  const comprar = async (plan: Plan) => {
    setComprandoId(plan.id);
    setErrorMsg(null);
    setPerfilIncompleto(false);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const res = await fetch("/api/pagos-empresa/crear", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ planId: plan.id, periodo }),
    });
    const result = await res.json();

    if (!res.ok) {
      setErrorMsg(result.error ?? "No pudimos iniciar la compra.");
      setPerfilIncompleto(result.code === "PERFIL_INCOMPLETO");
      setComprandoId(null);
      return;
    }

    if (!result.pagoDisponible) {
      setStatus("pago-no-disponible");
      return;
    }

    window.location.href = result.checkoutUrl;
  };

  if (status === "loading") {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>;
  }

  if (status === "signed-out") {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Debes iniciar sesión con tu cuenta de empresa para comprar un plan.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark px-5 py-2.5"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (status === "no-empresa") {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
        Esta sección es solo para cuentas de empresa. Si eres persona
        natural, ve a{" "}
        <Link href="/solicitar" className="text-brand-blue hover:underline">
          Solicitar documentos
        </Link>
        .
      </p>
    );
  }

  if (status === "sin-permiso") {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
        Solo el administrador de tu empresa puede comprar o cambiar planes.
      </p>
    );
  }

  if (status === "pago-no-disponible") {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tu compra quedó registrada. Los pagos en línea estarán
          disponibles muy pronto — te avisaremos por correo cuando puedas
          completar el pago.
        </p>
      </div>
    );
  }

  if (planes.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
        No hay planes disponibles en este momento.
      </p>
    );
  }

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
            className={`text-sm font-medium rounded-md px-4 py-2 transition-colors ${
              periodo === "anual"
                ? "bg-white dark:bg-gray-700 text-brand-blue shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Anual{" "}
            <span className="text-xs text-gray-400">(1 solo pago al año)</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400 text-center">
          {errorMsg}{" "}
          {perfilIncompleto && (
            <Link href="/perfil" className="font-semibold underline">
              Ir a mi perfil
            </Link>
          )}
        </p>
      )}

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {planes.map((plan) => {
          const tieneAnual = plan.precio_anual != null && plan.precio_anual > 0;
          const precioMostrado =
            periodo === "anual" && tieneAnual ? (plan.precio_anual as number) : plan.precio_mensual;

          return (
            <div
              key={plan.id}
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
                  <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCOP(precioMostrado)}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {periodo === "anual" && tieneAnual ? "/año" : "/mes"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-brand-blue">
                  {plan.creditos.toLocaleString("es-CO")} consultas
                  {periodo === "anual" && tieneAnual ? " / mes durante el año" : " / mes"}
                </p>
              </div>

              {periodo === "anual" && !tieneAnual ? (
                <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
                  Este plan no tiene precio anual configurado.
                </p>
              ) : (
                <button
                  type="button"
                  disabled={comprandoId === plan.id}
                  onClick={() => comprar(plan)}
                  className={`mt-6 inline-flex items-center justify-center gap-x-2 text-sm font-bold rounded-xl px-4 py-2.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                    plan.destacado
                      ? "bg-brand-blue text-white hover:bg-brand-blue-dark"
                      : "border border-brand-blue text-brand-blue hover:bg-brand-blue/10"
                  }`}
                >
                  {comprandoId === plan.id
                    ? "Procesando..."
                    : plan.cta_label || `Comprar ${plan.nombre}`}
                </button>
              )}

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
        })}
      </div>
    </div>
  );
}
