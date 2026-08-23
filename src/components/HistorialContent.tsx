"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Status = "loading" | "signed-out" | "ready";
type EstadoPago = "pendiente" | "pagado" | "fallido";
type EstadoConsulta = "pendiente" | "autorizada" | "rechazada";
type NivelRiesgo = "bajo" | "medio" | "alto";

type Solicitud = {
  id: string;
  created_at: string;
  monto: number;
  estado: EstadoPago;
  documentos: { id: string; documento: string }[];
};

type ConsultaRecibida = {
  id: string;
  empresaNombre: string;
  estado: EstadoConsulta;
  fecha: string;
};

type PagoEmpresa = {
  id: string;
  created_at: string;
  plan_nombre: string;
  periodo: string;
  monto: number;
  estado: EstadoPago;
  fecha_vencimiento: string | null;
};

type ConsultaEnviada = {
  id: string;
  candidato_primer_nombre: string;
  candidato_primer_apellido: string;
  candidato_email: string;
  estado: EstadoConsulta;
  nivel_riesgo: NivelRiesgo | null;
  created_at: string;
};

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

export default function HistorialContent() {
  const [status, setStatus] = useState<Status>("loading");
  const [esEmpresa, setEsEmpresa] = useState(false);

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [consultasRecibidas, setConsultasRecibidas] = useState<ConsultaRecibida[]>([]);

  const [pagosEmpresa, setPagosEmpresa] = useState<PagoEmpresa[]>([]);
  const [consultasEnviadas, setConsultasEnviadas] = useState<ConsultaEnviada[]>([]);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setStatus("signed-out");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type, empresa_id_padre")
        .eq("id", user.id)
        .maybeSingle();

      const empresaId =
        profile?.account_type === "empresa"
          ? user.id
          : profile?.account_type === "empresa_miembro"
          ? profile.empresa_id_padre
          : null;

      if (empresaId) {
        setEsEmpresa(true);
        const [{ data: pagos }, { data: consultas }] = await Promise.all([
          supabase
            .from("pagos_empresa")
            .select("id, created_at, plan_nombre, periodo, monto, estado, fecha_vencimiento")
            .eq("empresa_id", empresaId)
            .order("created_at", { ascending: false })
            .limit(200),
          supabase
            .from("consultas")
            .select(
              "id, candidato_primer_nombre, candidato_primer_apellido, candidato_email, estado, nivel_riesgo, created_at"
            )
            .eq("empresa_id", empresaId)
            .order("created_at", { ascending: false })
            .limit(200),
        ]);
        setPagosEmpresa((pagos as PagoEmpresa[]) ?? []);
        setConsultasEnviadas((consultas as ConsultaEnviada[]) ?? []);
      } else {
        const [{ data: solicitudesData }, resPendientes] = await Promise.all([
          supabase
            .from("solicitudes")
            .select("id, created_at, monto, estado, documentos")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(200),
          fetch("/api/consultas/pendientes", { headers: await authHeader() }),
        ]);
        setSolicitudes((solicitudesData as Solicitud[]) ?? []);
        if (resPendientes.ok) {
          const data = await resPendientes.json();
          setConsultasRecibidas(data.consultas ?? []);
        }
      }

      setStatus("ready");
    })();
  }, []);

  if (status === "loading") {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>;
  }

  if (status === "signed-out") {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Debes iniciar sesión para ver tu historial.
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

  if (esEmpresa) {
    return (
      <div className="space-y-8">
        <Seccion titulo="Compras de créditos">
          {pagosEmpresa.length === 0 ? (
            <VacioMensaje texto="Aún no has comprado ningún plan de créditos." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-4">Plan</th>
                    <th className="py-2 pr-4">Período</th>
                    <th className="py-2 pr-4">Monto</th>
                    <th className="py-2 pr-4">Fecha</th>
                    <th className="py-2 pr-4">Vence</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pagosEmpresa.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">{p.plan_nombre}</td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 capitalize">{p.periodo}</td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{formatCOP(p.monto)}</td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                        {new Date(p.created_at).toLocaleDateString("es-CO")}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                        {p.fecha_vencimiento
                          ? new Date(p.fecha_vencimiento).toLocaleDateString("es-CO")
                          : "—"}
                      </td>
                      <td className="py-3">
                        <EstadoPagoBadge estado={p.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link
            href="/empresas/planes"
            className="mt-4 inline-block text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
          >
            Comprar más créditos
          </Link>
        </Seccion>

        <Seccion titulo="Consultas enviadas">
          {consultasEnviadas.length === 0 ? (
            <VacioMensaje texto="Aún no has invitado a ningún candidato." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-4">Candidato</th>
                    <th className="py-2 pr-4">Correo</th>
                    <th className="py-2 pr-4">Fecha</th>
                    <th className="py-2 pr-4">Estado</th>
                    <th className="py-2">Riesgo</th>
                  </tr>
                </thead>
                <tbody>
                  {consultasEnviadas.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">
                        {c.candidato_primer_nombre} {c.candidato_primer_apellido}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{c.candidato_email}</td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                        {new Date(c.created_at).toLocaleDateString("es-CO")}
                      </td>
                      <td className="py-3 pr-4">
                        <EstadoConsultaBadge estado={c.estado} />
                      </td>
                      <td className="py-3">
                        {c.estado === "autorizada" ? (
                          <RiesgoBadge nivel={c.nivel_riesgo} />
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link
            href="/empresas/consultas"
            className="mt-4 inline-block text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
          >
            Invitar candidato o ver documentos
          </Link>
        </Seccion>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Seccion titulo="Solicitudes de documentos">
        {solicitudes.length === 0 ? (
          <VacioMensaje texto="Aún no has solicitado documentos." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">Documentos</th>
                  <th className="py-2 pr-4">Monto</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {new Date(s.created_at).toLocaleDateString("es-CO")}
                    </td>
                    <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">
                      {(s.documentos ?? []).map((d) => d.documento).join(", ") || "—"}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{formatCOP(s.monto)}</td>
                    <td className="py-3">
                      <EstadoPagoBadge estado={s.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link
          href="/solicitar"
          className="mt-4 inline-block text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
        >
          Solicitar mis documentos
        </Link>
      </Seccion>

      <Seccion titulo="Consultas de antecedentes recibidas">
        {consultasRecibidas.length === 0 ? (
          <VacioMensaje texto="Ninguna empresa te ha invitado todavía a verificar tus antecedentes." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 pr-4">Empresa</th>
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {consultasRecibidas.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">{c.empresaNombre}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {new Date(c.fecha).toLocaleDateString("es-CO")}
                    </td>
                    <td className="py-3">
                      <EstadoConsultaBadge estado={c.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link
          href="/autorizaciones"
          className="mt-4 inline-block text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
        >
          Ir a Autorizaciones
        </Link>
      </Seccion>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{titulo}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function VacioMensaje({ texto }: { texto: string }) {
  return <p className="text-sm text-gray-500 dark:text-gray-400">{texto}</p>;
}

function EstadoPagoBadge({ estado }: { estado: EstadoPago }) {
  const estilos: Record<EstadoPago, string> = {
    pendiente: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
    pagado: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400",
    fallido: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400",
  };
  return (
    <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${estilos[estado]}`}>
      {estado}
    </span>
  );
}

function EstadoConsultaBadge({ estado }: { estado: EstadoConsulta }) {
  const estilos: Record<EstadoConsulta, string> = {
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

function RiesgoBadge({ nivel }: { nivel: NivelRiesgo | null }) {
  if (!nivel) {
    return <span className="text-xs text-gray-400 dark:text-gray-500">Sin clasificar</span>;
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
}
