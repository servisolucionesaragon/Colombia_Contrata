"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type AccountType = "persona" | "empresa";

// Versión de los documentos legales aceptados — actualizar cuando cambien
// /terminos o /privacidad, para que la trazabilidad del consentimiento
// registre exactamente qué versión aceptó el usuario.
const POLICY_VERSION = "2026-08-07-draft";

export default function RegisterForm() {
  const [accountType, setAccountType] = useState<AccountType>("persona");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptDataPolicy, setAcceptDataPolicy] = useState(false);
  const [acceptSensitiveData, setAcceptSensitiveData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passwordsMatch =
    password.length > 0 && password === confirmPassword;
  const canSubmit =
    acceptTerms &&
    acceptDataPolicy &&
    acceptSensitiveData &&
    passwordsMatch &&
    !submitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/perfil`,
        data: {
          account_type: accountType,
          consent: {
            terms: true,
            data_policy: true,
            sensitive_data: true,
            policy_version: POLICY_VERSION,
            accepted_at: new Date().toISOString(),
          },
        },
      },
    });

    setSubmitting(false);
    if (error) {
      setErrorMessage(traducirError(error.message));
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto flex items-center justify-center size-12 rounded-full bg-green-50 text-green-600">
          <svg
            className="size-6"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2Z" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gray-900">
          Revisa tu correo
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Te enviamos un enlace de confirmación a{" "}
          <span className="font-medium text-gray-900">{email}</span>. Haz
          clic en el enlace para activar tu cuenta y completar tu perfil.
        </p>
        <p className="mt-3 text-xs text-gray-500">
          ¿No llega? Revisa la carpeta de spam o correo no deseado.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div
        role="tablist"
        aria-label="Tipo de cuenta"
        className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg"
      >
        <button
          type="button"
          role="tab"
          aria-selected={accountType === "persona"}
          onClick={() => setAccountType("persona")}
          className={`text-sm font-medium rounded-md py-2 transition-colors ${
            accountType === "persona"
              ? "bg-white text-brand-blue shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Persona natural
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={accountType === "empresa"}
          onClick={() => setAccountType("empresa")}
          className={`text-sm font-medium rounded-md py-2 transition-colors ${
            accountType === "empresa"
              ? "bg-white text-brand-blue shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Empresa
        </button>
      </div>

      <Field
        label={
          accountType === "persona" ? "Correo electrónico" : "Correo corporativo"
        }
        htmlFor="email"
      >
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Contraseña" htmlFor="password">
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Confirmar contraseña" htmlFor="confirmPassword">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      {confirmPassword.length > 0 && !passwordsMatch && (
        <p className="-mt-3 text-sm text-red-600">
          Las contraseñas no coinciden.
        </p>
      )}

      <div className="space-y-3 pt-2 border-t border-gray-200">
        <Checkbox
          id="acceptTerms"
          checked={acceptTerms}
          onChange={setAcceptTerms}
        >
          Acepto los{" "}
          <Link href="/terminos" className="text-brand-blue hover:underline">
            Términos y Condiciones
          </Link>
          .
        </Checkbox>

        <Checkbox
          id="acceptDataPolicy"
          checked={acceptDataPolicy}
          onChange={setAcceptDataPolicy}
        >
          Autorizo el tratamiento de mis datos personales conforme a la{" "}
          <Link href="/privacidad" className="text-brand-blue hover:underline">
            Política de Tratamiento de Datos Personales
          </Link>
          .
        </Checkbox>

        <Checkbox
          id="acceptSensitiveData"
          checked={acceptSensitiveData}
          onChange={setAcceptSensitiveData}
        >
          <span className="font-medium text-gray-900">
            Autorizo expresamente
          </span>{" "}
          el tratamiento de mis datos sensibles (antecedentes penales,
          policiales, disciplinarios y judiciales) para efectos de la
          consulta y generación de los documentos que seleccione en la
          plataforma.
        </Checkbox>
      </div>

      {errorMessage && (
        <p className="text-sm text-red-600 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full inline-flex items-center justify-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark disabled:bg-gray-300 disabled:cursor-not-allowed px-4 py-2.5"
      >
        {submitting ? "Creando cuenta..." : "Crear cuenta"}
      </button>

      <p className="text-center text-sm text-gray-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-brand-blue hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}

function traducirError(message: string): string {
  const errores: Record<string, string> = {
    "User already registered": "Este correo ya tiene una cuenta registrada.",
    "Password should be at least 6 characters":
      "La contraseña debe tener al menos 6 caracteres.",
    "Signup requires a valid password": "La contraseña no es válida.",
    "Unable to validate email address: invalid format":
      "El formato del correo no es válido.",
    "Email rate limit exceeded":
      "Se han enviado demasiados correos. Intenta de nuevo en unos minutos.",
  };
  return (
    errores[message] ??
    `No pudimos crear la cuenta. Intenta de nuevo. (${message})`
  );
}

const inputClass =
  "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none";

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
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Checkbox({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-x-3">
      <input
        id={id}
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
      />
      <label htmlFor={id} className="text-sm text-gray-600">
        {children}
      </label>
    </div>
  );
}
