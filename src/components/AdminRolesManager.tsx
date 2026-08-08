"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type AdminUser = { id: string; email: string | null };
type Message = { type: "success" | "error"; text: string };

async function authFetch(path: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(path, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

export default function AdminRolesManager() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await authFetch("/api/admin/roles");
    if (res.ok) {
      const data = await res.json();
      setAdmins(data.admins ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const res = await authFetch("/api/admin/roles", {
      method: "POST",
      body: JSON.stringify({ email, action: "grant" }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setMessage({
        type: "error",
        text: data.error ?? "No pudimos completar la acción.",
      });
      return;
    }
    setMessage({
      type: "success",
      text: `${email} ahora tiene acceso de administrador.`,
    });
    setEmail("");
    load();
  };

  const handleRevoke = async (adminEmail: string) => {
    if (
      !confirm(`¿Quitar el acceso de administrador a ${adminEmail}?`)
    ) {
      return;
    }
    setMessage(null);
    const res = await authFetch("/api/admin/roles", {
      method: "POST",
      body: JSON.stringify({ email: adminEmail, action: "revoke" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({
        type: "error",
        text: data.error ?? "No pudimos completar la acción.",
      });
      return;
    }
    load();
  };

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Administradores
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        La cuenta debe estar registrada previamente en el sitio.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="email"
          required
          placeholder="correo@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed px-4 py-2 whitespace-nowrap"
        >
          {submitting ? "Agregando..." : "Dar acceso de administrador"}
        </button>
      </form>

      {message && (
        <p
          className={`mb-4 text-sm ${
            message.type === "error"
              ? "text-red-600 dark:text-red-400"
              : "text-green-600 dark:text-green-400"
          }`}
        >
          {message.text}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
      ) : admins.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No hay administradores.
        </p>
      ) : (
        <div className="space-y-2">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3"
            >
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {admin.email}
              </span>
              <button
                type="button"
                onClick={() => handleRevoke(admin.email!)}
                className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700"
              >
                Quitar acceso
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const inputClass =
  "block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none";
