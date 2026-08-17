"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Usuario = {
  id: string;
  email: string | null;
  nombre: string | null;
  tipoCuenta: "persona" | "empresa" | null;
  esAdmin: boolean;
  activo: boolean;
  creadoEn: string;
};

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}` };
}

export default function UsuariosManager() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [cambiandoId, setCambiandoId] = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/usuarios", { headers: await authHeader() });
    if (res.ok) {
      const data = await res.json();
      setUsuarios(data.usuarios);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const toggleActivo = async (usuario: Usuario) => {
    const accion = usuario.activo ? "desactivar" : "activar";
    if (!confirm(`¿Seguro que quieres ${accion} la cuenta de ${usuario.email}?`)) return;

    setCambiandoId(usuario.id);
    setError(null);
    const res = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ userId: usuario.id, activo: !usuario.activo }),
    });
    setCambiandoId(null);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "No pudimos actualizar el usuario.");
      return;
    }
    await cargar();
  };

  const filtrados = usuarios.filter((u) => {
    const texto = `${u.nombre ?? ""} ${u.email ?? ""}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-4 gap-x-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Usuarios</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Cuentas registradas de personas y empresas. Desactivar una
            cuenta le impide iniciar sesión.
          </p>
        </div>
      </div>

      <input
        type="text"
        placeholder="Buscar por nombre o correo..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="mb-4 w-full max-w-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
      />

      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Correo</th>
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Registro</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">
                    {u.nombre || <span className="text-gray-400">—</span>}
                    {u.esAdmin && (
                      <span className="ml-2 text-xs rounded-full bg-brand-blue/10 text-brand-blue px-2 py-0.5">
                        Admin
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{u.email}</td>
                  <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 capitalize">
                    {u.tipoCuenta ?? "—"}
                  </td>
                  <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                    {new Date(u.creadoEn).toLocaleDateString("es-CO")}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`text-xs font-medium rounded-full px-2.5 py-1 ${
                        u.activo
                          ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      disabled={cambiandoId === u.id}
                      onClick={() => toggleActivo(u)}
                      className={`text-sm font-medium disabled:opacity-50 ${
                        u.activo
                          ? "text-red-600 dark:text-red-400 hover:text-red-700"
                          : "text-brand-blue hover:text-brand-blue-dark"
                      }`}
                    >
                      {u.activo ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500 dark:text-gray-400">
                    No hay usuarios que coincidan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
