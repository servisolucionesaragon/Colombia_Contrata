"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Status = "loading" | "signed-out" | "no-empresa" | "ready";

type Fila = {
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
  email: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaExpedicion: string;
  valido: boolean;
  motivo?: string;
};

const emailValido = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const TIPOS_DOCUMENTO = ["CC", "PPT", "CE", "PA"];
const fechaValida = (v: string) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v);

// Parser de CSV simple (sin librería): separa por coma, respeta comillas
// dobles básicas. No pretende cubrir todos los casos raros de CSV, pero
// alcanza para un archivo exportado desde Excel o Google Sheets.
function parseCSV(texto: string): string[][] {
  return texto
    .split(/\r\n|\n|\r/)
    .filter((linea) => linea.trim().length > 0)
    .map((linea) =>
      linea
        .split(",")
        .map((celda) => celda.trim().replace(/^"|"$/g, ""))
    );
}

const COLUMNAS: { clave: keyof Omit<Fila, "valido" | "motivo">; encabezados: string[] }[] = [
  { clave: "primerNombre", encabezados: ["primer nombre", "primernombre"] },
  { clave: "segundoNombre", encabezados: ["segundo nombre", "segundonombre"] },
  { clave: "primerApellido", encabezados: ["primer apellido", "primerapellido"] },
  { clave: "segundoApellido", encabezados: ["segundo apellido", "segundoapellido"] },
  { clave: "email", encabezados: ["correo electrónico del consultado", "correo electronico del consultado", "correo", "email"] },
  { clave: "tipoDocumento", encabezados: ["tipo de documento", "tipodocumento"] },
  { clave: "numeroDocumento", encabezados: ["número de identificación", "numero de identificacion", "numerodocumento", "documento"] },
  { clave: "fechaExpedicion", encabezados: ["fecha de expedición", "fecha de expedicion", "fechaexpedicion"] },
];

const TIPO_DOCUMENTO_ALIAS: Record<string, string> = {
  "cédula de ciudadanía": "CC",
  "cedula de ciudadania": "CC",
  cc: "CC",
  "permiso por protección temporal": "PPT",
  "permiso por proteccion temporal": "PPT",
  ppt: "PPT",
  "cédula de extranjería": "CE",
  "cedula de extranjeria": "CE",
  ce: "CE",
  pasaporte: "PA",
  pa: "PA",
};

export default function CargaMasivaContent() {
  const [status, setStatus] = useState<Status>("loading");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setStatus(profile?.account_type === "empresa" ? "ready" : "no-empresa");
    })();
  }, []);

  const handleFile = async (file: File) => {
    setError(null);
    setMensaje(null);
    setNombreArchivo(file.name);

    const texto = await file.text();
    const filasCSV = parseCSV(texto);
    if (filasCSV.length === 0) {
      setError("El archivo está vacío.");
      setFilas([]);
      return;
    }

    const encabezado = filasCSV[0].map((h) => h.toLowerCase().trim());
    const indices = COLUMNAS.map((col) => ({
      clave: col.clave,
      idx: encabezado.findIndex((h) => col.encabezados.includes(h)),
    }));

    const faltantes = indices.filter(
      (i) => i.idx === -1 && i.clave !== "segundoNombre" && i.clave !== "segundoApellido" && i.clave !== "fechaExpedicion"
    );
    if (faltantes.length > 0) {
      setError(
        "Al archivo le faltan columnas obligatorias. Descarga la plantilla de ejemplo para ver los encabezados exactos."
      );
      setFilas([]);
      return;
    }

    const valorDe = (fila: string[], clave: string) => {
      const columna = indices.find((i) => i.clave === clave);
      return columna && columna.idx >= 0 ? (fila[columna.idx] ?? "").trim() : "";
    };

    const datos: Fila[] = filasCSV.slice(1).map((fila) => {
      const primerNombre = valorDe(fila, "primerNombre");
      const segundoNombre = valorDe(fila, "segundoNombre");
      const primerApellido = valorDe(fila, "primerApellido");
      const segundoApellido = valorDe(fila, "segundoApellido");
      const email = valorDe(fila, "email").toLowerCase();
      const tipoDocumentoRaw = valorDe(fila, "tipoDocumento");
      const tipoDocumento =
        TIPO_DOCUMENTO_ALIAS[tipoDocumentoRaw.toLowerCase()] ?? tipoDocumentoRaw.toUpperCase();
      const numeroDocumento = valorDe(fila, "numeroDocumento");
      const fechaExpedicion = valorDe(fila, "fechaExpedicion");

      const motivos: string[] = [];
      if (!primerNombre) motivos.push("falta primer nombre");
      if (!primerApellido) motivos.push("falta primer apellido");
      if (!emailValido(email)) motivos.push("correo inválido");
      if (!TIPOS_DOCUMENTO.includes(tipoDocumento)) motivos.push("tipo de documento inválido");
      if (!numeroDocumento) motivos.push("falta número de documento");
      if (!fechaValida(fechaExpedicion)) motivos.push("fecha de expedición inválida (usa AAAA-MM-DD)");

      return {
        primerNombre,
        segundoNombre,
        primerApellido,
        segundoApellido,
        email,
        tipoDocumento,
        numeroDocumento,
        fechaExpedicion,
        valido: motivos.length === 0,
        motivo: motivos.join(", ") || undefined,
      };
    });

    setFilas(datos);
  };

  const validas = filas.filter((f) => f.valido);

  const confirmarCarga = async () => {
    if (validas.length === 0) return;
    setEnviando(true);
    setError(null);
    setMensaje(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const res = await fetch("/api/consultas/crear", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        candidatos: validas,
        loteReferencia: nombreArchivo
          ? `${nombreArchivo} — ${new Date().toLocaleString("es-CO")}`
          : undefined,
      }),
    });
    const result = await res.json();

    setEnviando(false);
    if (!res.ok) {
      setError(result.error ?? "No pudimos cargar el archivo.");
      return;
    }

    setMensaje(`Se enviaron ${result.creadas} invitaciones correctamente.`);
    setFilas([]);
    setNombreArchivo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (status === "loading") {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>;
  }

  if (status === "signed-out" || status === "no-empresa") {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
        Esta sección es solo para cuentas de empresa con sesión iniciada.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Sube un archivo CSV
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          El archivo debe tener las columnas: primer nombre, segundo nombre
          (opcional), primer apellido, segundo apellido (opcional), correo
          electrónico del consultado, tipo de documento, número de
          identificación y fecha de expedición (opcional, formato
          AAAA-MM-DD).
        </p>
        <a
          href="/plantilla-candidatos.csv"
          download
          className="mt-3 inline-flex items-center gap-x-2 text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
        >
          Descargar plantilla de ejemplo (CSV)
        </a>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="mt-4 block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-blue file:text-white file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-brand-blue-dark"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
      )}
      {mensaje && (
        <div className="text-center">
          <p className="text-sm text-green-600 dark:text-green-400">{mensaje}</p>
          <Link
            href="/empresas/consultas"
            className="mt-2 inline-block text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
          >
            Ver consultas enviadas
          </Link>
        </div>
      )}

      {filas.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {validas.length} de {filas.length} filas son válidas.
            </p>
            <button
              type="button"
              disabled={validas.length === 0 || enviando}
              onClick={confirmarCarga}
              className="inline-flex items-center gap-x-2 text-sm font-bold rounded-xl border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark disabled:opacity-60 disabled:cursor-not-allowed px-6 py-2.5"
            >
              {enviando ? "Enviando..." : `Confirmar carga (${validas.length})`}
            </button>
          </div>

          <div className="mt-4 max-h-96 overflow-y-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 pr-4">Nombre</th>
                  <th className="py-2 pr-4">Documento</th>
                  <th className="py-2 pr-4">Correo</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <td className="py-2 pr-4 text-gray-900 dark:text-gray-100">
                      {[f.primerNombre, f.segundoNombre, f.primerApellido, f.segundoApellido]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </td>
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                      {f.tipoDocumento} {f.numeroDocumento || "—"}
                    </td>
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                      {f.email || "—"}
                    </td>
                    <td className="py-2">
                      {f.valido ? (
                        <span className="text-xs font-medium rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 px-2.5 py-1">
                          Válida
                        </span>
                      ) : (
                        <span
                          className="text-xs font-medium rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 px-2.5 py-1"
                          title={f.motivo}
                        >
                          Inválida
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
