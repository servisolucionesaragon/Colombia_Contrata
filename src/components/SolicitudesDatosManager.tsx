"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Estado = "recibida" | "en_tramite" | "resuelta" | "rechazada";

type Solicitud = {
  id: string;
  correo: string;
  nombre: string | null;
  tipo: string;
  tipoEtiqueta: string;
  detalle: string | null;
  estado: Estado;
  respuesta: string | null;
  created_at: string;
  resuelta_at: string | null;
  diasHabiles: number;
  porVencer: boolean;
  vencida: boolean;
};

const ETIQUETA_ESTADO: Record<Estado, string> = {
  recibida: "Recibida",
  en_tramite: "En trámite",
  resuelta: "Resuelta",
  rechazada: "No procede",
};

const ESTILO_ESTADO: Record<Estado, string> = {
  recibida: "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300",
  en_tramite: "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300",
  resuelta: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400",
  rechazada: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
};

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}` };
}

export default function SolicitudesDatosManager() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<"pendientes" | "todas">("pendientes");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    const res = await fetch("/api/admin/solicitudes-datos", { headers: await authHeader() });
    if (res.ok) {
      const data = await res.json();
      setSolicitudes(data.solicitudes);
    } else {
      setError("No pudimos cargar las solicitudes.");
    }
    setCargando(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const visibles = solicitudes.filter((s) =>
    filtro === "pendientes" ? s.estado === "recibida" || s.estado === "en_tramite" : true
  );

  const pendientes = solicitudes.filter(
    (s) => s.estado === "recibida" || s.estado === "en_tramite"
  ).length;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Solicitudes de datos (habeas data)
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Peticiones que radican los titulares desde su perfil para ejercer los
          derechos de la Ley 1581 de 2012. El plazo legal para responder un
          reclamo es de <strong>15 días hábiles</strong>, prorrogables 8 más
          avisándole al titular.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as "pendientes" | "todas")}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="pendientes">Solo pendientes ({pendientes})</option>
          <option value="todas">Todas ({solicitudes.length})</option>
        </select>
      </div>

      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {aviso && <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">{aviso}</p>}

      {cargando ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
      ) : visibles.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {filtro === "pendientes"
            ? "No hay solicitudes pendientes."
            : "Todavía nadie ha radicado una solicitud."}
        </p>
      ) : (
        <ul className="space-y-4">
          {visibles.map((s) => (
            <Fila
              key={s.id}
              solicitud={s}
              onGuardado={async (mensaje) => {
                setAviso(mensaje);
                await cargar();
              }}
              onError={setError}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Fila({
  solicitud,
  onGuardado,
  onError,
}: {
  solicitud: Solicitud;
  onGuardado: (mensaje: string | null) => void;
  onError: (mensaje: string | null) => void;
}) {
  const [estado, setEstado] = useState<Estado>(solicitud.estado);
  const [respuesta, setRespuesta] = useState(solicitud.respuesta ?? "");
  const [notificar, setNotificar] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cerrada = estado === "resuelta" || estado === "rechazada";
  const abierta = solicitud.estado === "recibida" || solicitud.estado === "en_tramite";

  const guardar = async () => {
    setGuardando(true);
    onError(null);
    onGuardado(null);

    const res = await fetch("/api/admin/solicitudes-datos", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ id: solicitud.id, estado, respuesta, notificar }),
    });

    let data: { error?: string; avisoCorreo?: string } = {};
    try {
      data = await res.json();
    } catch {
      /* respuesta sin cuerpo */
    }
    setGuardando(false);

    if (!res.ok) {
      onError(data.error ?? "No pudimos guardar la solicitud.");
      return;
    }
    onGuardado(data.avisoCorreo ?? null);
  };

  return (
    <li className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {solicitud.tipoEtiqueta}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {solicitud.nombre ? `${solicitud.nombre} · ` : ""}
            {solicitud.correo} · radicada el{" "}
            {new Date(solicitud.created_at).toLocaleDateString("es-CO")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {solicitud.vencida && (
            <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300">
              Fuera de plazo ({solicitud.diasHabiles} días hábiles)
            </span>
          )}
          {solicitud.porVencer && (
            <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              Vence pronto ({solicitud.diasHabiles} de 15 días hábiles)
            </span>
          )}
          <span
            className={`text-xs font-medium rounded-full px-2.5 py-1 ${ESTILO_ESTADO[solicitud.estado]}`}
          >
            {ETIQUETA_ESTADO[solicitud.estado]}
          </span>
        </div>
      </div>

      {solicitud.detalle && (
        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
          {solicitud.detalle}
        </p>
      )}

      {!abierta && solicitud.respuesta && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold">Respuesta enviada:</span> {solicitud.respuesta}
        </p>
      )}

      {abierta && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-gray-700 dark:text-gray-300" htmlFor={`estado-${solicitud.id}`}>
              Estado
            </label>
            <select
              id={`estado-${solicitud.id}`}
              value={estado}
              onChange={(e) => setEstado(e.target.value as Estado)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="recibida">Recibida</option>
              <option value="en_tramite">En trámite</option>
              <option value="resuelta">Resuelta</option>
              <option value="rechazada">No procede</option>
            </select>
          </div>

          <div>
            <label
              htmlFor={`respuesta-${solicitud.id}`}
              className="block text-sm text-gray-700 dark:text-gray-300 mb-1"
            >
              Respuesta al titular{" "}
              {cerrada ? (
                <span className="text-red-600 dark:text-red-400">(obligatoria para cerrar)</span>
              ) : (
                <span className="text-gray-400">(opcional mientras esté en trámite)</span>
              )}
            </label>
            <textarea
              id={`respuesta-${solicitud.id}`}
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              rows={3}
              placeholder="Qué se hizo con sus datos, o por qué no procede la solicitud."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
            />
          </div>

          {cerrada && (
            <label className="flex items-center gap-x-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={notificar}
                onChange={(e) => setNotificar(e.target.checked)}
                className="size-4 rounded border-gray-300 dark:border-gray-600 text-brand-blue focus:ring-brand-blue"
              />
              Enviarle la respuesta por correo a {solicitud.correo}
            </label>
          )}

          <button
            type="button"
            disabled={guardando}
            onClick={guardar}
            className="text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark disabled:opacity-60 px-4 py-2"
          >
            {guardando ? "Guardando..." : cerrada && notificar ? "Guardar y responder" : "Guardar"}
          </button>
        </div>
      )}
    </li>
  );
}
