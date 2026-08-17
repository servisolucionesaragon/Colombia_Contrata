"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Status = "loading" | "signed-out" | "no-empresa" | "ready";

type Consulta = {
  id: string;
  candidato_nombre: string | null;
  candidato_email: string;
  estado: "pendiente" | "autorizada" | "rechazada";
  created_at: string;
};

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}` };
}

export default function EmpresaConsultasContent() {
  const [status, setStatus] = useState<Status>("loading");
  const [creditos, setCreditos] = useState<number | null>(null);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [perfilIncompleto, setPerfilIncompleto] = useState(false);

  const cargar = async (userId: string) => {
    const ahora = new Date().toISOString();
    const [{ data: pagos }, { count: consumidos }, { data: consultasData }] =
      await Promise.all([
        supabase
          .from("pagos_empresa")
          .select("creditos, fecha_vencimiento")
          .eq("empresa_id", userId)
          .eq("estado", "pagado"),
        supabase
          .from("consultas")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", userId)
          .eq("credito_descontado", true),
        supabase
          .from("consultas")
          .select("id, candidato_nombre, candidato_email, estado, created_at")
          .eq("empresa_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    const comprados = (pagos ?? [])
      .filter((p) => !p.fecha_vencimiento || p.fecha_vencimiento > ahora)
      .reduce((sum, p) => sum + p.creditos, 0);

    setCreditos(comprados - (consumidos ?? 0));
    setConsultas((consultasData as Consulta[]) ?? []);
  };

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setStatus("signed-out");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (profile?.account_type !== "empresa") {
        setStatus("no-empresa");
        return;
      }

      await cargar(userData.user.id);
      setStatus("ready");
    })();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEnviando(true);
    setMensaje(null);
    setError(null);
    setPerfilIncompleto(false);

    const res = await fetch("/api/consultas/crear", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ candidatos: [{ nombre, documento, email }] }),
    });
    const result = await res.json();

    setEnviando(false);
    if (!res.ok) {
      setError(result.error ?? "No pudimos enviar la invitación.");
      setPerfilIncompleto(result.code === "PERFIL_INCOMPLETO");
      return;
    }

    setMensaje("Invitación enviada. Aparecerá aquí como \"pendiente\" hasta que el candidato autorice.");
    setNombre("");
    setDocumento("");
    setEmail("");

    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) await cargar(userData.user.id);
  };

  if (status === "loading") {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>;
  }

  if (status === "signed-out") {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Debes iniciar sesión con tu cuenta de empresa para invitar candidatos.
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
        Esta sección es solo para cuentas de empresa.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Créditos disponibles</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {creditos ?? 0}
            </p>
          </div>
          <div className="flex items-center gap-x-3">
            <Link
              href="/empresas/planes"
              className="text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
            >
              Comprar más créditos
            </Link>
            <Link
              href="/empresas/consultas/masiva"
              className="inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-brand-blue text-brand-blue hover:bg-brand-blue/10 px-4 py-2"
            >
              Carga masiva (CSV)
            </Link>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          Invitar a un candidato es gratis — el crédito solo se descuenta
          cuando el candidato autoriza la consulta.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Invitar un candidato
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 grid sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Documento (opcional)"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            className={inputClass}
          />
          <input
            type="email"
            required
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={enviando}
            className="sm:col-span-3 inline-flex items-center justify-center gap-x-2 text-sm font-bold rounded-xl border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3"
          >
            {enviando ? "Enviando..." : "Invitar candidato"}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}{" "}
            {perfilIncompleto && (
              <Link href="/perfil" className="font-semibold underline">
                Ir a mi perfil
              </Link>
            )}
          </p>
        )}
        {mensaje && <p className="mt-3 text-sm text-green-600 dark:text-green-400">{mensaje}</p>}
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Consultas enviadas
        </h2>
        {consultas.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Aún no has invitado a ningún candidato.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 pr-4">Candidato</th>
                  <th className="py-2 pr-4">Correo</th>
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {consultas.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">
                      {c.candidato_nombre || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {c.candidato_email}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {new Date(c.created_at).toLocaleDateString("es-CO")}
                    </td>
                    <td className="py-3">
                      <EstadoBadge estado={c.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: Consulta["estado"] }) {
  const estilos = {
    pendiente: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
    autorizada: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400",
    rechazada: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400",
  };
  return (
    <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${estilos[estado]}`}>
      {estado}
    </span>
  );
}

const inputClass =
  "block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none";
