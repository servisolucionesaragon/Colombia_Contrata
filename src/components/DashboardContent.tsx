"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Status = "loading" | "signed-out" | "ready";
type AccountType = "persona" | "empresa";
type EstadoConsulta = "pendiente" | "autorizada" | "rechazada";
type EstadoSolicitud = "pendiente" | "pagado" | "fallido";
type NivelRiesgo = "bajo" | "medio" | "alto";

type ConsultaEmpresa = {
  id: string;
  candidato_primer_nombre: string;
  candidato_primer_apellido: string;
  estado: EstadoConsulta;
  nivel_riesgo: NivelRiesgo | null;
  created_at: string;
};

type ConsultaPersona = {
  id: string;
  estado: EstadoConsulta;
  created_at: string;
};

type Solicitud = {
  id: string;
  estado: EstadoSolicitud;
  monto: number;
  created_at: string;
};

export default function DashboardContent() {
  const [status, setStatus] = useState<Status>("loading");
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);

  const [creditos, setCreditos] = useState(0);
  const [consultasEmpresa, setConsultasEmpresa] = useState<ConsultaEmpresa[]>([]);

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [consultasPersona, setConsultasPersona] = useState<ConsultaPersona[]>([]);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setStatus("signed-out");
        return;
      }

      const tipo =
        (user.user_metadata?.account_type as AccountType | undefined) ?? "persona";
      setAccountType(tipo);

      const { data: profile } = await supabase
        .from("profiles")
        .select("primer_nombre, razon_social")
        .eq("id", user.id)
        .maybeSingle();
      setNombre(
        tipo === "empresa" ? profile?.razon_social ?? null : profile?.primer_nombre ?? null
      );

      if (tipo === "empresa") {
        const ahora = new Date().toISOString();
        const [{ data: pagos }, { data: consultas }] = await Promise.all([
          supabase
            .from("pagos_empresa")
            .select("creditos, fecha_vencimiento")
            .eq("empresa_id", user.id)
            .eq("estado", "pagado"),
          supabase
            .from("consultas")
            .select("id, candidato_primer_nombre, candidato_primer_apellido, estado, nivel_riesgo, credito_descontado, created_at")
            .eq("empresa_id", user.id)
            .order("created_at", { ascending: false })
            .limit(200),
        ]);

        const comprados = (pagos ?? [])
          .filter((p) => !p.fecha_vencimiento || p.fecha_vencimiento > ahora)
          .reduce((sum, p) => sum + p.creditos, 0);
        const descontados = (consultas ?? []).filter((c) => c.credito_descontado).length;
        setCreditos(comprados - descontados);
        setConsultasEmpresa((consultas as ConsultaEmpresa[]) ?? []);
      } else {
        const [{ data: solicitudesData }, { data: consultasData }] = await Promise.all([
          supabase
            .from("solicitudes")
            .select("id, estado, monto, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(200),
          supabase
            .from("consultas")
            .select("id, estado, created_at")
            .or(`candidato_id.eq.${user.id},candidato_email.eq.${user.email}`)
            .order("created_at", { ascending: false })
            .limit(200),
        ]);
        setSolicitudes((solicitudesData as Solicitud[]) ?? []);
        setConsultasPersona((consultasData as ConsultaPersona[]) ?? []);
      }

      setStatus("ready");
    })();
  }, []);

  if (status === "loading") {
    return <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Cargando...</p>;
  }

  if (status === "signed-out") {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Debes iniciar sesión para ver tu dashboard.
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

  return accountType === "empresa" ? (
    <DashboardEmpresa nombre={nombre} creditos={creditos} consultas={consultasEmpresa} />
  ) : (
    <DashboardPersona nombre={nombre} solicitudes={solicitudes} consultas={consultasPersona} />
  );
}

function DashboardEmpresa({
  nombre,
  creditos,
  consultas,
}: {
  nombre: string | null;
  creditos: number;
  consultas: ConsultaEmpresa[];
}) {
  const pendientes = consultas.filter((c) => c.estado === "pendiente").length;
  const autorizadas = consultas.filter((c) => c.estado === "autorizada").length;
  const rechazadas = consultas.filter((c) => c.estado === "rechazada").length;
  const riesgoAlto = consultas.filter((c) => c.nivel_riesgo === "alto").length;

  return (
    <div className="space-y-8">
      {nombre && (
        <p className="text-center text-gray-500 dark:text-gray-400">
          Hola, <span className="font-semibold text-gray-900 dark:text-gray-100">{nombre}</span>
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard label="Créditos disponibles" value={creditos} />
        <StatCard label="Consultas enviadas" value={consultas.length} />
        <StatCard label="Pendientes" value={pendientes} accent="amber" />
        <StatCard label="Autorizadas" value={autorizadas} accent="green" />
        <StatCard label="Riesgo alto" value={riesgoAlto} accent={riesgoAlto > 0 ? "red" : undefined} />
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/empresas/consultas" className={botonPrimario}>
          Invitar candidato
        </Link>
        <Link href="/empresas/consultas/masiva" className={botonSecundario}>
          Carga masiva
        </Link>
        <Link href="/empresas/planes" className={botonSecundario}>
          Comprar más créditos
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Actividad reciente
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
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2">Riesgo</th>
                </tr>
              </thead>
              <tbody>
                {consultas.slice(0, 5).map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">
                      {c.candidato_primer_nombre} {c.candidato_primer_apellido}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {new Date(c.created_at).toLocaleDateString("es-CO")}
                    </td>
                    <td className="py-3 pr-4">
                      <EstadoBadge estado={c.estado} />
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
        {consultas.length > 5 && (
          <Link
            href="/empresas/consultas"
            className="mt-4 inline-block text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
          >
            Ver todas las consultas
          </Link>
        )}
        {rechazadas > 0 && (
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            {rechazadas} candidato(s) rechazaron la solicitud de verificación.
          </p>
        )}
      </div>
    </div>
  );
}

function DashboardPersona({
  nombre,
  solicitudes,
  consultas,
}: {
  nombre: string | null;
  solicitudes: Solicitud[];
  consultas: ConsultaPersona[];
}) {
  const solicitudesPagadas = solicitudes.filter((s) => s.estado === "pagado").length;
  const consultasPendientes = consultas.filter((c) => c.estado === "pendiente").length;
  const consultasAutorizadas = consultas.filter((c) => c.estado === "autorizada").length;

  return (
    <div className="space-y-8">
      {nombre && (
        <p className="text-center text-gray-500 dark:text-gray-400">
          Hola, <span className="font-semibold text-gray-900 dark:text-gray-100">{nombre}</span>
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Solicitudes de documentos" value={solicitudes.length} />
        <StatCard label="Pagadas" value={solicitudesPagadas} accent="green" />
        <StatCard label="Autorizaciones pendientes" value={consultasPendientes} accent="amber" />
        <StatCard label="Autorizadas" value={consultasAutorizadas} accent="green" />
      </div>

      {consultasPendientes > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950 p-4 text-center">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Tienes {consultasPendientes} empresa(s) esperando tu autorización para verificar tus
            antecedentes.
          </p>
          <Link
            href="/autorizaciones"
            className="mt-2 inline-block text-sm font-semibold text-amber-900 dark:text-amber-200 underline"
          >
            Revisar autorizaciones
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/solicitar" className={botonPrimario}>
          Solicitar mis documentos
        </Link>
        <Link href="/autorizaciones" className={botonSecundario}>
          Autorizaciones
        </Link>
        <Link href="/historial" className={botonSecundario}>
          Ver historial
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Tus solicitudes recientes
          </h2>
          {solicitudes.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Aún no has solicitado documentos.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {solicitudes.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {new Date(s.created_at).toLocaleDateString("es-CO")}
                  </span>
                  <EstadoBadgeSolicitud estado={s.estado} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Consultas recibidas
          </h2>
          {consultas.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Ninguna empresa te ha invitado todavía.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {consultas.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {new Date(c.created_at).toLocaleDateString("es-CO")}
                  </span>
                  <EstadoBadge estado={c.estado} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "amber" | "green" | "red";
}) {
  const valueColor =
    accent === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : accent === "green"
      ? "text-green-600 dark:text-green-400"
      : accent === "red"
      ? "text-red-600 dark:text-red-400"
      : "text-gray-900 dark:text-gray-100";
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
      <p className={`text-2xl sm:text-3xl font-bold ${valueColor}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
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

function EstadoBadge({ estado }: { estado: EstadoConsulta }) {
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

function EstadoBadgeSolicitud({ estado }: { estado: EstadoSolicitud }) {
  const estilos: Record<EstadoSolicitud, string> = {
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

const botonPrimario =
  "inline-flex items-center justify-center gap-x-2 text-sm font-bold rounded-xl border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark px-5 py-2.5";
const botonSecundario =
  "inline-flex items-center justify-center gap-x-2 text-sm font-semibold rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-5 py-2.5";
