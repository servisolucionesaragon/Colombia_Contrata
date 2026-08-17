"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type NivelRiesgo = "bajo" | "medio" | "alto";

type Consulta = {
  id: string;
  empresa_nombre: string | null;
  candidato_primer_nombre: string;
  candidato_primer_apellido: string;
  candidato_email: string;
  candidato_tipo_documento: string;
  candidato_numero_documento: string;
  fecha_respuesta: string | null;
  nivel_riesgo: NivelRiesgo | null;
  nivel_riesgo_notas: string | null;
};

type FiltroClasificacion = "todos" | "sin-clasificar" | "clasificados";

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}` };
}

export default function RiesgoConsultasManager() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroClasificacion>("sin-clasificar");
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [borradores, setBorradores] = useState<
    Record<string, { nivel: NivelRiesgo | ""; notas: string }>
  >({});

  const cargar = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/riesgo-consultas", { headers: await authHeader() });
    if (res.ok) {
      const data = await res.json();
      setConsultas(data.consultas);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const borradorDe = (c: Consulta) =>
    borradores[c.id] ?? { nivel: c.nivel_riesgo ?? "", notas: c.nivel_riesgo_notas ?? "" };

  const actualizarBorrador = (id: string, cambios: Partial<{ nivel: NivelRiesgo | ""; notas: string }>) => {
    setBorradores((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { nivel: "", notas: "" }), ...cambios },
    }));
  };

  const guardar = async (c: Consulta) => {
    const borrador = borradorDe(c);
    if (!borrador.nivel) return;

    setGuardandoId(c.id);
    setError(null);
    const res = await fetch("/api/admin/riesgo-consultas", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ consultaId: c.id, nivelRiesgo: borrador.nivel, notas: borrador.notas }),
    });
    setGuardandoId(null);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "No pudimos guardar la clasificación.");
      return;
    }
    await cargar();
  };

  const filtradas = consultas.filter((c) => {
    if (filtro === "sin-clasificar") return !c.nivel_riesgo;
    if (filtro === "clasificados") return !!c.nivel_riesgo;
    return true;
  });

  const nivelBadge = (nivel: NivelRiesgo | null) => {
    if (!nivel) {
      return (
        <span className="text-xs font-medium rounded-full px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          sin clasificar
        </span>
      );
    }
    const estilos: Record<NivelRiesgo, string> = {
      bajo: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400",
      medio: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
      alto: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400",
    };
    return (
      <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${estilos[nivel]}`}>
        {nivel}
      </span>
    );
  };

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Clasificación de riesgo
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Consultas ya autorizadas por el candidato. Mientras no exista la
          integración con el proveedor de fuentes, asigna aquí un nivel de
          riesgo a mano según el resultado que hayas recibido — la empresa lo
          verá en su dashboard y en su lista de consultas.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as FiltroClasificacion)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="sin-clasificar">Sin clasificar</option>
          <option value="clasificados">Ya clasificados</option>
          <option value="todos">Todas las autorizadas</option>
        </select>
      </div>

      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 pr-4">Candidato</th>
                <th className="py-2 pr-4">Empresa</th>
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Estado actual</th>
                <th className="py-2 pr-4">Nivel</th>
                <th className="py-2 pr-4">Notas</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c) => {
                const borrador = borradorDe(c);
                return (
                  <tr
                    key={c.id}
                    className="border-b border-gray-100 dark:border-gray-800 last:border-0 align-top"
                  >
                    <td className="py-3 pr-4">
                      <p className="text-gray-900 dark:text-gray-100">
                        {c.candidato_primer_nombre} {c.candidato_primer_apellido}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {c.candidato_tipo_documento} {c.candidato_numero_documento}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{c.candidato_email}</p>
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {c.empresa_nombre || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {c.fecha_respuesta
                        ? new Date(c.fecha_respuesta).toLocaleDateString("es-CO")
                        : "—"}
                    </td>
                    <td className="py-3 pr-4">{nivelBadge(c.nivel_riesgo)}</td>
                    <td className="py-3 pr-4">
                      <select
                        value={borrador.nivel}
                        onChange={(e) =>
                          actualizarBorrador(c.id, { nivel: e.target.value as NivelRiesgo | "" })
                        }
                        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Elegir...</option>
                        <option value="bajo">Bajo</option>
                        <option value="medio">Medio</option>
                        <option value="alto">Alto</option>
                      </select>
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="text"
                        placeholder="Opcional"
                        value={borrador.notas}
                        onChange={(e) => actualizarBorrador(c.id, { notas: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        disabled={!borrador.nivel || guardandoId === c.id}
                        onClick={() => guardar(c)}
                        className="text-sm font-medium text-brand-blue hover:text-brand-blue-dark disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Guardar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500 dark:text-gray-400">
                    No hay consultas que coincidan.
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
