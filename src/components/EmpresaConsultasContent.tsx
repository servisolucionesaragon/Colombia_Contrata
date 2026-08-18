"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import DocumentosResultado from "@/components/DocumentosResultado";

type Status = "loading" | "signed-out" | "no-empresa" | "ready";

type NivelRiesgo = "bajo" | "medio" | "alto";

type Documento = { id: string; documento: string };

type Consulta = {
  id: string;
  candidato_primer_nombre: string;
  candidato_primer_apellido: string;
  candidato_email: string;
  candidato_tipo_documento: string;
  candidato_numero_documento: string;
  estado: "pendiente" | "autorizada" | "rechazada";
  nivel_riesgo: NivelRiesgo | null;
  resultado_pdfs: Record<string, string> | null;
  resultado_error: string | null;
  resultado_obtenido_at: string | null;
  created_at: string;
};

const TIPOS_DOCUMENTO = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "PPT", label: "Permiso por protección temporal" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "PA", label: "Pasaporte" },
];

const formVacio = {
  primerNombre: "",
  segundoNombre: "",
  primerApellido: "",
  segundoApellido: "",
  email: "",
  tipoDocumento: "CC",
  numeroDocumento: "",
  fechaExpedicion: "",
};

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}` };
}

export default function EmpresaConsultasContent() {
  const [status, setStatus] = useState<Status>("loading");
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [esAdministrador, setEsAdministrador] = useState(true);
  const [creditos, setCreditos] = useState<number | null>(null);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [form, setForm] = useState(formVacio);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [documentosSeleccionados, setDocumentosSeleccionados] = useState<string[]>([]);
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
          .select(
            "id, candidato_primer_nombre, candidato_primer_apellido, candidato_email, candidato_tipo_documento, candidato_numero_documento, estado, nivel_riesgo, resultado_pdfs, resultado_error, resultado_obtenido_at, created_at"
          )
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
        .select("account_type, empresa_id_padre, rol_empresa")
        .eq("id", userData.user.id)
        .maybeSingle();

      const empresaId =
        profile?.account_type === "empresa"
          ? userData.user.id
          : profile?.account_type === "empresa_miembro"
          ? profile.empresa_id_padre
          : null;

      if (!empresaId) {
        setStatus("no-empresa");
        return;
      }

      setEmpresaId(empresaId);
      setEsAdministrador(
        profile?.account_type === "empresa" || profile?.rol_empresa === "administrador"
      );
      const { data: docs } = await supabase
        .from("precios_documentos")
        .select("id, documento")
        .eq("activo", true)
        .order("documento", { ascending: true });
      setDocumentos((docs as Documento[]) ?? []);
      await cargar(empresaId);
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
      body: JSON.stringify({ candidatos: [form], documentoIds: documentosSeleccionados }),
    });
    const result = await res.json();

    setEnviando(false);
    if (!res.ok) {
      setError(result.error ?? "No pudimos enviar la invitación.");
      setPerfilIncompleto(result.code === "PERFIL_INCOMPLETO");
      return;
    }

    setMensaje('Invitación enviada. Aparecerá aquí como "pendiente" hasta que el candidato autorice.');
    setForm(formVacio);
    setDocumentosSeleccionados([]);

    if (empresaId) await cargar(empresaId);
  };

  const toggleDocumento = (id: string) => {
    setDocumentosSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const set = (campo: keyof typeof formVacio) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [campo]: e.target.value }));

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
          {esAdministrador && (
            <Link
              href="/empresas/planes"
              className="text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
            >
              Comprar más créditos
            </Link>
          )}
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
        <form onSubmit={handleSubmit} className="mt-4 grid sm:grid-cols-2 gap-3">
          <input
            type="text"
            required
            placeholder="Primer nombre"
            value={form.primerNombre}
            onChange={set("primerNombre")}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Segundo nombre (opcional)"
            value={form.segundoNombre}
            onChange={set("segundoNombre")}
            className={inputClass}
          />
          <input
            type="text"
            required
            placeholder="Primer apellido"
            value={form.primerApellido}
            onChange={set("primerApellido")}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Segundo apellido (opcional)"
            value={form.segundoApellido}
            onChange={set("segundoApellido")}
            className={inputClass}
          />
          <input
            type="email"
            required
            placeholder="Correo electrónico del consultado"
            value={form.email}
            onChange={set("email")}
            className="sm:col-span-2 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
          />
          <select value={form.tipoDocumento} onChange={set("tipoDocumento")} className={inputClass}>
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            required
            placeholder="Número de identificación"
            value={form.numeroDocumento}
            onChange={set("numeroDocumento")}
            className={inputClass}
          />
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Fecha de expedición
            </label>
            <input
              type="date"
              required
              value={form.fechaExpedicion}
              onChange={set("fechaExpedicion")}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">
              Documentos requeridos
            </label>
            {documentos.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Aún no hay documentos disponibles.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {documentos.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-center gap-x-2.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 cursor-pointer hover:border-brand-blue"
                  >
                    <input
                      type="checkbox"
                      checked={documentosSeleccionados.includes(doc.id)}
                      onChange={() => toggleDocumento(doc.id)}
                      className="size-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-brand-blue focus:ring-brand-blue"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {doc.documento}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={enviando || documentosSeleccionados.length === 0}
            className="sm:col-span-2 inline-flex items-center justify-center gap-x-2 text-sm font-bold rounded-xl border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3 mt-1"
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
                  <th className="py-2 pr-4">Documento</th>
                  <th className="py-2 pr-4">Correo</th>
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4">Riesgo</th>
                  <th className="py-2">Documentos</th>
                </tr>
              </thead>
              <tbody>
                {consultas.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">
                      {c.candidato_primer_nombre} {c.candidato_primer_apellido}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {c.candidato_tipo_documento} {c.candidato_numero_documento}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {c.candidato_email}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {new Date(c.created_at).toLocaleDateString("es-CO")}
                    </td>
                    <td className="py-3 pr-4">
                      <EstadoBadge estado={c.estado} />
                    </td>
                    <td className="py-3 pr-4">
                      {c.estado !== "autorizada" ? (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      ) : !c.nivel_riesgo && !c.resultado_error && !c.resultado_obtenido_at ? (
                        <span className="text-xs text-gray-400 dark:text-gray-500">Verificando...</span>
                      ) : (
                        <RiesgoBadge nivel={c.nivel_riesgo} />
                      )}
                    </td>
                    <td className="py-3">
                      {c.estado === "autorizada" ? (
                        <DocumentosBoton
                          consulta={c}
                          candidatoNombre={`${c.candidato_primer_nombre} ${c.candidato_primer_apellido}`}
                        />
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
      </div>
    </div>
  );
}

function DocumentosBoton({
  consulta,
  candidatoNombre,
}: {
  consulta: Consulta;
  candidatoNombre: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const cantidad = consulta.resultado_pdfs ? Object.keys(consulta.resultado_pdfs).length : 0;

  if (cantidad === 0) {
    return consulta.resultado_error ? (
      <span className="text-xs text-gray-400 dark:text-gray-500">No disponible</span>
    ) : (
      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-x-1.5 text-xs font-semibold text-brand-blue hover:text-brand-blue-dark"
      >
        Ver documentos ({cantidad})
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setAbierto(false)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-x-3 mb-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Documentos de {candidatoNombre}
              </h3>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
                aria-label="Cerrar"
              >
                &times;
              </button>
            </div>
            <DocumentosResultado
              consultaId={consulta.id}
              pdfs={consulta.resultado_pdfs}
              resultadoError={consulta.resultado_error}
              resultadoObtenidoAt={consulta.resultado_obtenido_at}
              nivelRiesgo={consulta.nivel_riesgo}
            />
          </div>
        </div>
      )}
    </>
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
