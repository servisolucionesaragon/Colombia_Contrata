"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  CIUDADES_POR_DEPARTAMENTO,
  DEPARTAMENTOS_COLOMBIA,
} from "@/lib/colombia";

type AccountType = "persona" | "empresa";
type Status = "loading" | "signed-out" | "ready";
type ProfileRow = Record<string, string | null>;

export default function ProfileForm() {
  const [status, setStatus] = useState<Status>("loading");
  const [accountType, setAccountType] = useState<AccountType>("persona");
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [initial, setInitial] = useState<ProfileRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) {
        setStatus("signed-out");
        return;
      }
      // account_type se guarda en el registro (ver RegisterForm) y define
      // qué formulario mostrar — el usuario ya no elige esto aquí.
      const type = user.user_metadata?.account_type as AccountType | undefined;
      setAccountType(type === "empresa" ? "empresa" : "persona");
      setEmail(user.email ?? null);
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      setInitial(profile ?? null);
      setStatus("ready");
    });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;
    setSaving(true);
    setErrorMessage(null);
    setSaved(false);

    const formData = new FormData(event.currentTarget);
    const payload: ProfileRow & { id: string; account_type: AccountType } = {
      id: userId,
      account_type: accountType,
    };
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        payload[key] = value.length > 0 ? value : null;
      }
    }

    const { error } = await supabase.from("profiles").upsert(payload);
    setSaving(false);
    if (error) {
      setErrorMessage("No pudimos guardar tus datos. Intenta de nuevo.");
      return;
    }
    setSaved(true);
  };

  if (status === "loading") {
    return <p className="text-sm text-gray-500">Cargando tu cuenta...</p>;
  }

  if (status === "signed-out") {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-600">
          Debes iniciar sesión para completar tu perfil.
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
        <div>
          <span className="text-xs text-gray-500">Tipo de cuenta</span>
          <p className="text-sm font-semibold text-gray-900">
            {accountType === "persona" ? "Persona natural" : "Empresa"}
          </p>
        </div>
        {email && <span className="text-sm text-gray-500">{email}</span>}
      </div>

      {accountType === "persona" ? (
        <PersonaFields initial={initial} />
      ) : (
        <EmpresaFields initial={initial} />
      )}

      {errorMessage && (
        <p className="text-sm text-red-600 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          {errorMessage}
        </p>
      )}

      <div className="flex items-center gap-x-3 pt-2 border-t border-gray-200">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark disabled:bg-gray-300 disabled:cursor-not-allowed px-5 py-2.5"
        >
          {saving ? "Guardando..." : "Guardar datos"}
        </button>
        {saved && (
          <span className="text-sm text-green-600">
            Tus datos se guardaron correctamente.
          </span>
        )}
      </div>
    </form>
  );
}

function PersonaFields({ initial }: { initial: ProfileRow | null }) {
  const [departamento, setDepartamento] = useState(
    initial?.departamento ?? ""
  );
  return (
    <div className="space-y-6">
      <FieldGroup title="Identificación">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Primer nombre" htmlFor="primerNombre">
            <input
              id="primerNombre"
              name="primer_nombre"
              type="text"
              required
              defaultValue={initial?.primer_nombre ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Segundo nombre" htmlFor="segundoNombre">
            <input
              id="segundoNombre"
              name="segundo_nombre"
              type="text"
              defaultValue={initial?.segundo_nombre ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Primer apellido" htmlFor="primerApellido">
            <input
              id="primerApellido"
              name="primer_apellido"
              type="text"
              required
              defaultValue={initial?.primer_apellido ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Segundo apellido" htmlFor="segundoApellido">
            <input
              id="segundoApellido"
              name="segundo_apellido"
              type="text"
              defaultValue={initial?.segundo_apellido ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup title="Documento">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Tipo de documento" htmlFor="tipoDocumento">
            <select
              id="tipoDocumento"
              name="tipo_documento"
              required
              defaultValue={initial?.tipo_documento ?? "CC"}
              className={inputClass}
            >
              <option value="CC">Cédula de ciudadanía</option>
              <option value="CE">Cédula de extranjería</option>
              <option value="PA">Pasaporte</option>
            </select>
          </Field>
          <Field label="Documento" htmlFor="documento">
            <input
              id="documento"
              name="documento"
              type="text"
              inputMode="numeric"
              required
              defaultValue={initial?.documento ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Fecha de nacimiento" htmlFor="fechaNacimiento">
            <input
              id="fechaNacimiento"
              name="fecha_nacimiento"
              type="date"
              required
              defaultValue={initial?.fecha_nacimiento ?? ""}
              className={inputClass}
            />
          </Field>
          <Field
            label="Fecha de expedición del documento"
            htmlFor="fechaExpedicion"
          >
            <input
              id="fechaExpedicion"
              name="fecha_expedicion"
              type="date"
              required
              defaultValue={initial?.fecha_expedicion ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup title="Datos adicionales">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Género" htmlFor="genero">
            <select
              id="genero"
              name="genero"
              required
              defaultValue={initial?.genero ?? ""}
              className={inputClass}
            >
              <option value="" disabled>
                Selecciona una opción
              </option>
              <option value="femenino">Femenino</option>
              <option value="masculino">Masculino</option>
              <option value="otro">Otro</option>
              <option value="prefiero_no_decir">Prefiero no decir</option>
            </select>
          </Field>
          <Field label="Profesión u oficio" htmlFor="profesion">
            <input
              id="profesion"
              name="profesion"
              type="text"
              required
              defaultValue={initial?.profesion ?? ""}
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
              defaultValue={initial?.telefono ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup title="Ubicación">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Dirección" htmlFor="direccion" className="sm:col-span-2">
            <input
              id="direccion"
              name="direccion"
              type="text"
              required
              autoComplete="street-address"
              defaultValue={initial?.direccion ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Departamento" htmlFor="departamento">
            <select
              id="departamento"
              name="departamento"
              required
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                Selecciona un departamento
              </option>
              {DEPARTAMENTOS_COLOMBIA.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ciudad" htmlFor="ciudad">
            <CitySelect
              id="ciudad"
              name="ciudad"
              departamento={departamento}
              initialValue={initial?.ciudad ?? ""}
            />
          </Field>
        </div>
      </FieldGroup>
    </div>
  );
}

function EmpresaFields({ initial }: { initial: ProfileRow | null }) {
  const [departamento, setDepartamento] = useState(
    initial?.departamento_empresa ?? ""
  );
  return (
    <div className="space-y-6">
      <FieldGroup title="Datos de la empresa">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Razón social" htmlFor="razonSocial" className="sm:col-span-2">
            <input
              id="razonSocial"
              name="razon_social"
              type="text"
              required
              defaultValue={initial?.razon_social ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="NIT" htmlFor="nit">
            <input
              id="nit"
              name="nit"
              type="text"
              inputMode="numeric"
              required
              defaultValue={initial?.nit ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Tipo de sociedad" htmlFor="tipoSociedad">
            <select
              id="tipoSociedad"
              name="tipo_sociedad"
              required
              defaultValue={initial?.tipo_sociedad ?? ""}
              className={inputClass}
            >
              <option value="" disabled>
                Selecciona una opción
              </option>
              <option value="sas">S.A.S.</option>
              <option value="sa">S.A.</option>
              <option value="ltda">Ltda.</option>
              <option value="persona_natural">
                Persona natural con establecimiento
              </option>
              <option value="otra">Otra</option>
            </select>
          </Field>
          <Field label="Fecha de constitución" htmlFor="fechaConstitucion">
            <input
              id="fechaConstitucion"
              name="fecha_constitucion"
              type="date"
              required
              defaultValue={initial?.fecha_constitucion ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Sector económico" htmlFor="sectorEconomico">
            <select
              id="sectorEconomico"
              name="sector_economico"
              required
              defaultValue={initial?.sector_economico ?? ""}
              className={inputClass}
            >
              <option value="" disabled>
                Selecciona una opción
              </option>
              <option value="fintech">Fintech / servicios financieros</option>
              <option value="rrhh">Recursos humanos</option>
              <option value="inmobiliario">Arrendamiento / inmobiliario</option>
              <option value="bpo">BPO / contact center</option>
              <option value="ecommerce">E-commerce / marketplace</option>
              <option value="salud">Salud</option>
              <option value="educacion">Educación</option>
              <option value="construccion">Construcción</option>
              <option value="manufactura">Manufactura</option>
              <option value="comercio">Comercio</option>
              <option value="otro">Otro</option>
            </select>
          </Field>
          <Field label="Sitio web" htmlFor="sitioWeb">
            <input
              id="sitioWeb"
              name="sitio_web"
              type="url"
              placeholder="https://"
              defaultValue={initial?.sitio_web ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Teléfono de la empresa" htmlFor="telefonoEmpresa">
            <input
              id="telefonoEmpresa"
              name="telefono_empresa"
              type="tel"
              required
              defaultValue={initial?.telefono_empresa ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Dirección" htmlFor="direccionEmpresa">
            <input
              id="direccionEmpresa"
              name="direccion_empresa"
              type="text"
              required
              autoComplete="street-address"
              defaultValue={initial?.direccion_empresa ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Departamento" htmlFor="departamentoEmpresa">
            <select
              id="departamentoEmpresa"
              name="departamento_empresa"
              required
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                Selecciona un departamento
              </option>
              {DEPARTAMENTOS_COLOMBIA.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ciudad" htmlFor="ciudadEmpresa">
            <CitySelect
              id="ciudadEmpresa"
              name="ciudad_empresa"
              departamento={departamento}
              initialValue={initial?.ciudad_empresa ?? ""}
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup title="Representante legal">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Representante legal" htmlFor="representanteLegal">
            <input
              id="representanteLegal"
              name="representante_legal"
              type="text"
              required
              defaultValue={initial?.representante_legal ?? ""}
              className={inputClass}
            />
          </Field>
          <Field
            label="Documento del representante"
            htmlFor="documentoRepresentante"
          >
            <input
              id="documentoRepresentante"
              name="documento_representante"
              type="text"
              inputMode="numeric"
              required
              defaultValue={initial?.documento_representante ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup title="Persona de contacto">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nombre de contacto" htmlFor="nombreContacto">
            <input
              id="nombreContacto"
              name="nombre_contacto"
              type="text"
              required
              defaultValue={initial?.nombre_contacto ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Teléfono de contacto" htmlFor="telefonoContacto">
            <input
              id="telefonoContacto"
              name="telefono_contacto"
              type="tel"
              required
              defaultValue={initial?.telefono_contacto ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
      </FieldGroup>
    </div>
  );
}

function CitySelect({
  id,
  name,
  departamento,
  initialValue,
}: {
  id: string;
  name: string;
  departamento: string;
  initialValue: string;
}) {
  const ciudades = CIUDADES_POR_DEPARTAMENTO[departamento] ?? [];
  return (
    // key fuerza el reinicio de la selección cuando cambia el departamento
    <select
      key={departamento}
      id={id}
      name={name}
      required
      disabled={!departamento}
      defaultValue={initialValue}
      className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-400`}
    >
      <option value="" disabled>
        {departamento
          ? "Selecciona una ciudad"
          : "Selecciona primero un departamento"}
      </option>
      {ciudades.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

const inputClass =
  "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none";

function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-900 mb-3">{title}</h2>
      {children}
    </section>
  );
}

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
