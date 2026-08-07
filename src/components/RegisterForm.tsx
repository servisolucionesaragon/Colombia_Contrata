"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type AccountType = "persona" | "empresa";

export default function RegisterForm() {
  const [accountType, setAccountType] = useState<AccountType>("persona");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptDataPolicy, setAcceptDataPolicy] = useState(false);
  const [acceptSensitiveData, setAcceptSensitiveData] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const passwordsMatch =
    password.length > 0 && password === confirmPassword;
  const canSubmit =
    acceptTerms && acceptDataPolicy && acceptSensitiveData && passwordsMatch;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    // TODO: conectar con el backend de autenticación (pendiente de definir,
    // ej. Supabase) una vez esté disponible. Por ahora solo confirmamos que
    // el formulario y el consentimiento de datos quedaron correctos.
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
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gray-900">
          Datos recibidos
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          El registro todavía no está conectado a un sistema de cuentas —
          esta es una vista previa del formulario. Pronto podrás crear tu
          cuenta desde aquí.
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
              ? "bg-white text-blue-700 shadow-sm"
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
              ? "bg-white text-blue-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Empresa
        </button>
      </div>

      {accountType === "persona" ? (
        <div className="space-y-4">
          <Field label="Nombres y apellidos" htmlFor="nombre">
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              autoComplete="name"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Tipo de documento" htmlFor="tipoDocumento" className="col-span-1">
              <select
                id="tipoDocumento"
                name="tipoDocumento"
                required
                defaultValue="CC"
                className={inputClass}
              >
                <option value="CC">CC</option>
                <option value="CE">CE</option>
              </select>
            </Field>
            <Field
              label="Número de documento"
              htmlFor="numeroDocumento"
              className="col-span-2"
            >
              <input
                id="numeroDocumento"
                name="numeroDocumento"
                type="text"
                inputMode="numeric"
                required
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Razón social" htmlFor="razonSocial">
            <input
              id="razonSocial"
              name="razonSocial"
              type="text"
              required
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="NIT" htmlFor="nit">
              <input
                id="nit"
                name="nit"
                type="text"
                inputMode="numeric"
                required
                className={inputClass}
              />
            </Field>
            <Field label="Nombre de contacto" htmlFor="contacto">
              <input
                id="contacto"
                name="contacto"
                type="text"
                required
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          label={
            accountType === "persona"
              ? "Correo electrónico"
              : "Correo corporativo"
          }
          htmlFor="email"
        >
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
        </Field>
        <Field label="Teléfono" htmlFor="telefono">
          <input
            id="telefono"
            name="telefono"
            type="tel"
            required
            autoComplete="tel"
            className={inputClass}
          />
        </Field>
      </div>

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
          <Link href="/terminos" className="text-blue-700 hover:underline">
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
          <Link href="/privacidad" className="text-blue-700 hover:underline">
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

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full inline-flex items-center justify-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-700 text-white hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed px-4 py-2.5"
      >
        Crear cuenta
      </button>

      <p className="text-center text-sm text-gray-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-blue-700 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}

const inputClass =
  "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:ring-1 focus:ring-blue-700 focus:outline-none";

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
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
        className="mt-0.5 size-4 shrink-0 rounded border-gray-300 text-blue-700 focus:ring-blue-700"
      />
      <label htmlFor={id} className="text-sm text-gray-600">
        {children}
      </label>
    </div>
  );
}
