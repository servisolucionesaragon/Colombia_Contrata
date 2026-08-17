"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Pago = {
  tabla: "solicitudes" | "pagos_empresa";
  id: string;
  tipo: "persona" | "empresa";
  nombre: string | null;
  email: string | null;
  detalle: string;
  monto: number;
  estado: "pendiente" | "pagado" | "fallido";
  referencia: string;
  fecha: string;
  vigenteHasta?: string | null;
};

type FiltroTipo = "todos" | "persona" | "empresa";
type FiltroEstado = "todos" | "pendiente" | "pagado" | "fallido";

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}` };
}

export default function PagosManager() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/pagos", { headers: await authHeader() });
    if (res.ok) {
      const data = await res.json();
      setPagos(data.pagos);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const marcarComo = async (pago: Pago, nuevoEstado: "pendiente" | "pagado" | "fallido") => {
    if (
      !confirm(
        `¿Marcar este pago (${pago.nombre ?? pago.email ?? pago.referencia}) como "${nuevoEstado}"?`
      )
    ) {
      return;
    }
    setActualizandoId(pago.id);
    setError(null);
    const res = await fetch("/api/admin/pagos", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ tabla: pago.tabla, id: pago.id, estado: nuevoEstado }),
    });
    setActualizandoId(null);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "No pudimos actualizar el pago.");
      return;
    }
    await cargar();
  };

  const filtrados = pagos.filter((p) => {
    if (filtroTipo !== "todos" && p.tipo !== filtroTipo) return false;
    if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false;
    return true;
  });

  const estadoBadge = (estado: Pago["estado"]) => {
    const estilos = {
      pagado: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400",
      pendiente: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
      fallido: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400",
    };
    return (
      <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${estilos[estado]}`}>
        {estado}
      </span>
    );
  };

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pagos</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Solicitudes de personas y compras de planes de empresa. Puedes
          marcar un pago manualmente si se hizo por fuera de Wompi (ej.
          transferencia).
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as FiltroTipo)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="todos">Todos los tipos</option>
          <option value="persona">Personas</option>
          <option value="empresa">Empresas</option>
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagado">Pagado</option>
          <option value="fallido">Fallido</option>
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
                <th className="py-2 pr-4">Cliente</th>
                <th className="py-2 pr-4">Detalle</th>
                <th className="py-2 pr-4">Monto</th>
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr
                  key={`${p.tabla}-${p.id}`}
                  className="border-b border-gray-100 dark:border-gray-800 last:border-0 align-top"
                >
                  <td className="py-3 pr-4">
                    <p className="text-gray-900 dark:text-gray-100">
                      {p.nombre || <span className="text-gray-400">—</span>}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{p.email}</p>
                  </td>
                  <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                    <span className="text-xs rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 mr-1 capitalize">
                      {p.tipo}
                    </span>
                    {p.detalle}
                    {p.tipo === "empresa" && p.estado === "pagado" && p.vigenteHasta && (
                      <p className="text-xs text-gray-400 mt-1">
                        Vigente hasta {new Date(p.vigenteHasta).toLocaleDateString("es-CO")}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-900 dark:text-gray-100 font-medium">
                    {formatCOP(p.monto)}
                  </td>
                  <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                    {new Date(p.fecha).toLocaleDateString("es-CO")}
                  </td>
                  <td className="py-3 pr-4">{estadoBadge(p.estado)}</td>
                  <td className="py-3 text-right">
                    {p.estado !== "pagado" && (
                      <button
                        type="button"
                        disabled={actualizandoId === p.id}
                        onClick={() => marcarComo(p, "pagado")}
                        className="text-sm font-medium text-brand-blue hover:text-brand-blue-dark disabled:opacity-50"
                      >
                        Marcar pagado
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500 dark:text-gray-400">
                    No hay pagos que coincidan.
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
