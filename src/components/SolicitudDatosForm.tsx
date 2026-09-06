"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Solicitud = {
  id: string;
  tipo: string;
  detalle: string | null;
  estado: "recibida" | "en_tramite" | "resuelta" | "rechazada";
  respuesta: string | null;
  created_at: string;
  resuelta_at: string | null;
};

// Los derechos que la Ley 1581 de 2012 le reconoce al titular. Se muestran
// con su nombre legal y una explicación en lenguaje corriente, porque
// “supresión” o “revocación” no le dicen nada a la mayoría.
const TIPOS: { valor: string; etiqueta: string; ayuda: string }[] = [
  {
    valor: "supresion",
    etiqueta: "Supresión de mis datos",
    ayuda: "Pides que eliminemos tus datos personales de nuestras bases.",
  },
  {
    valor: "revocacion",
    etiqueta: "Revocar mi autorización",
    ayuda: "Retiras el permiso que diste para tratar tus datos.",
  },
  {
    valor: "acceso",
    etiqueta: "Acceder a mis datos",
    ayuda: "Pides saber qué datos tuyos tenemos y cómo los hemos usado.",
  },
  {
    valor: "rectificacion",
    etiqueta: "Rectificar mis datos",
    ayuda: "Hay un dato tuyo incorrecto y pides que lo corrijamos.",
  },
  {
    valor: "actualizacion",
    etiqueta: "Actualizar mis datos",
    ayuda: "Un dato tuyo cambió y pides que lo pongamos al día.",
  },
  { valor: "otro", etiqueta: "Otra solicitud", ayuda: "Cuéntanos qué necesitas." },
];

const ETIQUETA_ESTADO: Record<Solicitud["estado"], string> = {
  recibida: "Recibida",
  en_tramite: "En trámite",
  resuelta: "Resuelta",
  rechazada: "No procede",
};

const ESTILO_ESTADO: Record<Solicitud["estado"], string> = {
  recibida: "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300",
  en_tramite: "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300",
  resuelta: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400",
  rechazada: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
};

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}` };
}

export default function SolicitudDatosForm() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [tipo, setTipo] = useState("supresion");
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const cargar = async () => {
    const res = await fetch("/api/cuenta/solicitud-datos", { headers: await authHeader() });
    if (res.ok) {
      const data = await res.json();
      setSolicitudes(data.solicitudes);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEnviando(true);
    setError(null);
    setExito(false);

    const res = await fetch("/api/cuenta/solicitud-datos", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ tipo, detalle }),
    });
    setEnviando(false);

    let data: { error?: string } = {};
    try {
      data = await res.json();
    } catch {
      /* respuesta sin cuerpo */
    }

    if (!res.ok) {
      setError(data.error ?? "No pudimos registrar la solicitud.");
      return;
    }

    setExito(true);
    setDetalle("");
    await cargar();
  };

  const ayuda = TIPOS.find((t) => t.valor === tipo)?.ayuda;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Solicitar la eliminación de mis datos u otro derecho
      </h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        La Ley 1581 de 2012 te da derecho a conocer, actualizar, rectificar y
        suprimir tus datos personales, y a revocar la autorización que nos
        diste. Radica aquí tu solicitud y te respondemos por correo.
      </p>

      <form onSubmit={enviar} className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="tipoSolicitud"
            className="block text-sm text-gray-700 dark:text-gray-300 mb-1"
          >
            ¿Qué necesitas?
          </label>
          <select
            id="tipoSolicitud"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full sm:max-w-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
          >
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.etiqueta}
              </option>
            ))}
          </select>
          {ayuda && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{ayuda}</p>}
        </div>

        <div>
          <label
            htmlFor="detalleSolicitud"
            className="block text-sm text-gray-700 dark:text-gray-300 mb-1"
          >
            Detalle <span className="text-gray-400">(opcional)</span>
          </label>
          <textarea
            id="detalleSolicitud"
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            rows={3}
            placeholder="Cuéntanos qué dato específico y por qué, si quieres."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {exito && (
          <p className="text-sm text-green-700 dark:text-green-400">
            Radicamos tu solicitud. Por ley tenemos hasta 15 días hábiles para
            responderte (prorrogables 8 días más, avisándote), y te escribiremos
            al correo de tu cuenta.
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark disabled:opacity-60 px-4 py-2"
        >
          {enviando ? "Enviando..." : "Radicar solicitud"}
        </button>
      </form>

      {solicitudes.length > 0 && (
        <div className="mt-6">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Tus solicitudes
          </h4>
          <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
            {solicitudes.map((s) => (
              <li key={s.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {TIPOS.find((t) => t.valor === s.tipo)?.etiqueta ?? s.tipo}
                  </span>
                  <div className="flex items-center gap-x-2">
                    <span
                      className={`text-xs font-medium rounded-full px-2.5 py-1 ${ESTILO_ESTADO[s.estado]}`}
                    >
                      {ETIQUETA_ESTADO[s.estado]}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(s.created_at).toLocaleDateString("es-CO")}
                    </span>
                  </div>
                </div>
                {s.detalle && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{s.detalle}</p>
                )}
                {s.respuesta && (
                  <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Respuesta:</span> {s.respuesta}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
