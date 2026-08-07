"use client";

import { useState, type FormEvent } from "react";
import {
  CIUDADES_POR_DEPARTAMENTO,
  DEPARTAMENTOS_COLOMBIA,
} from "@/lib/colombia";

type AccountType = "persona" | "empresa";

export default function ProfileForm() {
  const [accountType, setAccountType] = useState<AccountType>("persona");
  const [saved, setSaved] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: conectar con el backend (pendiente de definir) una vez esté
    // disponible. El tipo de cuenta debería venir ya fijado por el
    // registro, no seleccionarse aquí — este toggle es solo para poder
    // previsualizar ambos formularios sin backend todavía.
    setSaved(true);
  };

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

      {accountType === "persona" ? <PersonaFields /> : <EmpresaFields />}

      <div className="flex items-center gap-x-3 pt-2 border-t border-gray-200">
        <button
          type="submit"
          className="inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark px-5 py-2.5"
        >
          Guardar datos
        </button>
        {saved && (
          <span className="text-sm text-gray-600">
            Vista previa guardada — todavía no hay backend conectado.
          </span>
        )}
      </div>
    </form>
  );
}

function PersonaFields() {
  const [departamento, setDepartamento] = useState("");
  return (
    <div className="space-y-6">
      <FieldGroup title="Identificación">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Primer nombre" htmlFor="primerNombre">
            <input id="primerNombre" type="text" required className={inputClass} />
          </Field>
          <Field label="Segundo nombre" htmlFor="segundoNombre">
            <input id="segundoNombre" type="text" className={inputClass} />
          </Field>
          <Field label="Primer apellido" htmlFor="primerApellido">
            <input id="primerApellido" type="text" required className={inputClass} />
          </Field>
          <Field label="Segundo apellido" htmlFor="segundoApellido">
            <input id="segundoApellido" type="text" className={inputClass} />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup title="Documento">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Tipo de documento" htmlFor="tipoDocumento">
            <select id="tipoDocumento" required defaultValue="CC" className={inputClass}>
              <option value="CC">Cédula de ciudadanía</option>
              <option value="CE">Cédula de extranjería</option>
              <option value="PA">Pasaporte</option>
            </select>
          </Field>
          <Field label="Documento" htmlFor="documento">
            <input
              id="documento"
              type="text"
              inputMode="numeric"
              required
              className={inputClass}
            />
          </Field>
          <Field label="Fecha de nacimiento" htmlFor="fechaNacimiento">
            <input id="fechaNacimiento" type="date" required className={inputClass} />
          </Field>
          <Field
            label="Fecha de expedición del documento"
            htmlFor="fechaExpedicion"
          >
            <input id="fechaExpedicion" type="date" required className={inputClass} />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup title="Datos adicionales">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Género" htmlFor="genero">
            <select id="genero" required defaultValue="" className={inputClass}>
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
            <input id="profesion" type="text" required className={inputClass} />
          </Field>
          <Field label="Teléfono" htmlFor="telefono">
            <input
              id="telefono"
              type="tel"
              required
              autoComplete="tel"
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
              type="text"
              required
              autoComplete="street-address"
              className={inputClass}
            />
          </Field>
          <Field label="Departamento" htmlFor="departamento">
            <select
              id="departamento"
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
            <CitySelect id="ciudad" departamento={departamento} />
          </Field>
        </div>
      </FieldGroup>
    </div>
  );
}

function EmpresaFields() {
  const [departamento, setDepartamento] = useState("");
  return (
    <div className="space-y-6">
      <FieldGroup title="Datos de la empresa">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Razón social" htmlFor="razonSocial" className="sm:col-span-2">
            <input id="razonSocial" type="text" required className={inputClass} />
          </Field>
          <Field label="NIT" htmlFor="nit">
            <input
              id="nit"
              type="text"
              inputMode="numeric"
              required
              className={inputClass}
            />
          </Field>
          <Field label="Tipo de sociedad" htmlFor="tipoSociedad">
            <select id="tipoSociedad" required defaultValue="" className={inputClass}>
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
              type="date"
              required
              className={inputClass}
            />
          </Field>
          <Field label="Sector económico" htmlFor="sectorEconomico">
            <select id="sectorEconomico" required defaultValue="" className={inputClass}>
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
              type="url"
              placeholder="https://"
              className={inputClass}
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup title="Representante legal">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Representante legal" htmlFor="representanteLegal">
            <input
              id="representanteLegal"
              type="text"
              required
              className={inputClass}
            />
          </Field>
          <Field
            label="Documento del representante"
            htmlFor="documentoRepresentante"
          >
            <input
              id="documentoRepresentante"
              type="text"
              inputMode="numeric"
              required
              className={inputClass}
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup title="Contacto y ubicación">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Teléfono de la empresa" htmlFor="telefonoEmpresa">
            <input
              id="telefonoEmpresa"
              type="tel"
              required
              className={inputClass}
            />
          </Field>
          <Field label="Nombre de contacto" htmlFor="nombreContacto">
            <input id="nombreContacto" type="text" required className={inputClass} />
          </Field>
          <Field label="Teléfono de contacto" htmlFor="telefonoContacto">
            <input
              id="telefonoContacto"
              type="tel"
              required
              className={inputClass}
            />
          </Field>
          <Field label="Dirección" htmlFor="direccionEmpresa">
            <input
              id="direccionEmpresa"
              type="text"
              required
              autoComplete="street-address"
              className={inputClass}
            />
          </Field>
          <Field label="Departamento" htmlFor="departamentoEmpresa">
            <select
              id="departamentoEmpresa"
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
            <CitySelect id="ciudadEmpresa" departamento={departamento} />
          </Field>
        </div>
      </FieldGroup>
    </div>
  );
}

function CitySelect({
  id,
  departamento,
}: {
  id: string;
  departamento: string;
}) {
  const ciudades = CIUDADES_POR_DEPARTAMENTO[departamento] ?? [];
  return (
    // key fuerza el reinicio de la selección cuando cambia el departamento
    <select
      key={departamento}
      id={id}
      required
      disabled={!departamento}
      defaultValue=""
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
