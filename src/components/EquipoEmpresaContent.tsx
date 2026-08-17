"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Status = "loading" | "signed-out" | "no-permiso" | "ready";
type Rol = "administrador" | "analista" | "auxiliar";

type Miembro = {
  id: string;
  nombre: string | null;
  email: string | null;
  rol: Rol;
  esDueño: boolean;
  activo: boolean;
};

const formVacio = {
  nombre: "",
  apellido: "",
  correo: "",
  password: "",
  rol: "auxiliar" as Rol,
};

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}` };
}

export default function EquipoEmpresaContent() {
  const [status, setStatus] = useState<Status>("loading");
  const [equipo, setEquipo] = useState<Miembro[]>([]);
  const [form, setForm] = useState(formVacio);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);

  const cargar = async () => {
    const res = await fetch("/api/empresa/equipo", { headers: await authHeader() });
    if (res.ok) {
      const data = await res.json();
      setEquipo(data.equipo);
      setStatus("ready");
    } else {
      setStatus("no-permiso");
    }
  };

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setStatus("signed-out");
        return;
      }
      await cargar();
    })();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEnviando(true);
    setMensaje(null);
    setError(null);

    const res = await fetch("/api/empresa/equipo", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(form),
    });
    const result = await res.json();

    setEnviando(false);
    if (!res.ok) {
      setError(result.error ?? "No pudimos crear el miembro del equipo.");
      return;
    }

    setMensaje(`Cuenta creada para ${form.correo}. Comparte la contraseña con esa persona por fuera del sitio.`);
    setForm(formVacio);
    await cargar();
  };

  const cambiarRol = async (miembro: Miembro, rol: Rol) => {
    setActualizandoId(miembro.id);
    setError(null);
    const res = await fetch("/api/empresa/equipo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ userId: miembro.id, rol }),
    });
    setActualizandoId(null);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "No pudimos actualizar el rol.");
      return;
    }
    await cargar();
  };

  const cambiarAcceso = async (miembro: Miembro) => {
    setActualizandoId(miembro.id);
    setError(null);
    const res = await fetch("/api/empresa/equipo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ userId: miembro.id, activo: !miembro.activo }),
    });
    setActualizandoId(null);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "No pudimos actualizar el acceso.");
      return;
    }
    await cargar();
  };

  if (status === "loading") {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>;
  }

  if (status === "signed-out") {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Debes iniciar sesión con tu cuenta de empresa.
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

  if (status === "no-permiso") {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
        Solo el administrador de la empresa puede gestionar el equipo.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Agregar miembro al equipo
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Define una contraseña temporal y compártela con la persona por
          fuera del sitio (ej. WhatsApp o correo). Analista y Auxiliar
          pueden crear y ver consultas, pero no comprar planes ni gestionar
          el equipo.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 grid sm:grid-cols-2 gap-3">
          <input
            type="text"
            required
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
            className={inputClass}
          />
          <input
            type="text"
            required
            placeholder="Apellido"
            value={form.apellido}
            onChange={(e) => setForm((prev) => ({ ...prev, apellido: e.target.value }))}
            className={inputClass}
          />
          <input
            type="email"
            required
            placeholder="Correo"
            value={form.correo}
            onChange={(e) => setForm((prev) => ({ ...prev, correo: e.target.value }))}
            className={inputClass}
          />
          <input
            type="text"
            required
            minLength={6}
            placeholder="Contraseña temporal (mín. 6 caracteres)"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            className={inputClass}
          />
          <select
            value={form.rol}
            onChange={(e) => setForm((prev) => ({ ...prev, rol: e.target.value as Rol }))}
            className={inputClass}
          >
            <option value="auxiliar">Auxiliar</option>
            <option value="analista">Analista</option>
            <option value="administrador">Administrador</option>
          </select>
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex items-center justify-center gap-x-2 text-sm font-bold rounded-xl border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3"
          >
            {enviando ? "Creando..." : "Crear cuenta"}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {mensaje && <p className="mt-3 text-sm text-green-600 dark:text-green-400">{mensaje}</p>}
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Equipo actual
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Correo</th>
                <th className="py-2 pr-4">Rol</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {equipo.map((m) => (
                <tr key={m.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">
                    {m.nombre || <span className="text-gray-400">—</span>}
                    {m.esDueño && (
                      <span className="ml-2 text-xs rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5">
                        cuenta principal
                      </span>
                    )}
                    {!m.activo && (
                      <span className="ml-2 text-xs rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 px-2 py-0.5">
                        desactivado
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{m.email}</td>
                  <td className="py-3 pr-4">
                    {m.esDueño ? (
                      <span className="text-xs font-medium rounded-full px-2.5 py-1 bg-brand-blue/10 text-brand-blue">
                        administrador
                      </span>
                    ) : (
                      <select
                        value={m.rol}
                        disabled={actualizandoId === m.id}
                        onChange={(e) => cambiarRol(m, e.target.value as Rol)}
                        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                      >
                        <option value="auxiliar">Auxiliar</option>
                        <option value="analista">Analista</option>
                        <option value="administrador">Administrador</option>
                      </select>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    {!m.esDueño && (
                      <button
                        type="button"
                        disabled={actualizandoId === m.id}
                        onClick={() => cambiarAcceso(m)}
                        className="text-sm font-medium text-brand-blue hover:text-brand-blue-dark disabled:opacity-50"
                      >
                        {m.activo ? "Desactivar" : "Activar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none";
