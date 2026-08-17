import type { SupabaseClient } from "@supabase/supabase-js";

export type TipoDocumentoCandidato = "CC" | "PPT" | "CE" | "PA";

export type DatosVerificacion = {
  documento: string;
  primerNombre: string;
  primerApellido: string;
  segundoNombre?: string | null;
  segundoApellido?: string | null;
  tipoDocumento: TipoDocumentoCandidato;
  fechaExpedicion?: string | null;
};

export type ResultadoVerificacion =
  | {
      ok: true;
      semaforo: "verde" | "amarillo" | "rojo" | null;
      raw: unknown;
      pdfs: Record<string, string> | null;
    }
  | {
      ok: false;
      error: string;
    };

// Solverio solo reconoce CC/NIT/CE/PPT como tipoDocumento — no tiene
// código para Pasaporte (PA). Sin código para PA, se rechaza antes de
// llamar a la API en vez de mandar un tipo equivocado (que por defecto
// asumiría CC del lado de Solverio).
const TIPO_DOCUMENTO_SOLVERIO: Partial<Record<TipoDocumentoCandidato, string>> = {
  CC: "1",
  CE: "5",
  PPT: "10",
};

export async function getSolverioConfig(
  db: SupabaseClient
): Promise<{ baseUrl: string; apiKey: string } | null> {
  const { data } = await db
    .from("configuracion_solverio")
    .select("base_url, api_key")
    .eq("id", 1)
    .maybeSingle();

  if (!data?.api_key) return null;
  return { baseUrl: data.base_url, apiKey: data.api_key };
}

export async function consultarVerificacionCompleta(
  config: { baseUrl: string; apiKey: string },
  datos: DatosVerificacion
): Promise<ResultadoVerificacion> {
  const tipoCodigo = TIPO_DOCUMENTO_SOLVERIO[datos.tipoDocumento];
  if (!tipoCodigo) {
    return {
      ok: false,
      error: `El proveedor de verificación no soporta el tipo de documento "${datos.tipoDocumento}" todavía.`,
    };
  }

  const params = new URLSearchParams({
    documento: datos.documento,
    primerNombre: datos.primerNombre,
    primerApellido: datos.primerApellido,
    tipoDocumento: tipoCodigo,
  });
  if (datos.segundoNombre) params.set("segundoNombre", datos.segundoNombre);
  if (datos.segundoApellido) params.set("segundoApellido", datos.segundoApellido);
  if (datos.fechaExpedicion) params.set("fechaExpedicion", datos.fechaExpedicion);

  let response: Response;
  try {
    response = await fetch(
      `${config.baseUrl}/api/enterprise/verificacion/completa?${params.toString()}`,
      {
        method: "GET",
        headers: { Accept: "application/json", "X-Api-Key": config.apiKey },
      }
    );
  } catch {
    return { ok: false, error: "No pudimos conectar con el proveedor de verificación." };
  }

  if (response.status === 403) {
    return {
      ok: false,
      error:
        "El plan de Solverio de esta cuenta no tiene habilitada la verificación completa (Enterprise).",
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      error: `El proveedor de verificación respondió con un error (${response.status}).`,
    };
  }

  let body: { exitoso?: boolean; mensaje?: string | null; data?: Record<string, unknown> };
  try {
    body = await response.json();
  } catch {
    return { ok: false, error: "La respuesta del proveedor de verificación no se pudo interpretar." };
  }

  if (body.exitoso === false) {
    return { ok: false, error: body.mensaje || "El proveedor de verificación devolvió un error." };
  }

  // Estructura real confirmada con una consulta de prueba real el
  // 2026-08-17 (la colección de Postman del proveedor no traía un
  // ejemplo): todo viene envuelto en { exitoso, mensaje, data: {...} }.
  // Dentro de "data", el riesgo es un número (data.nivelRiesgo), no un
  // texto "semaforo" como sugería la descripción del endpoint — el
  // significado exacto de cada valor (0/1/2...) todavía no está
  // confirmado con el proveedor, se usa el mapeo más razonable
  // (0=verde/bajo, 1=amarillo/medio, 2 o más=rojo/alto) hasta poder
  // confirmarlo con más consultas reales o con Solverio directamente.
  const data = body.data ?? {};
  const nivelRiesgoRaw = data.nivelRiesgo;
  const semaforo = normalizarNivelRiesgo(nivelRiesgoRaw);

  const pdfsRaw = data.soportesPdf;
  const pdfs =
    pdfsRaw && typeof pdfsRaw === "object" ? (pdfsRaw as Record<string, string>) : null;

  // Los PDF en base64 ya se extraen aparte (y se suben a Storage) — no
  // tiene sentido duplicarlos dentro del JSON que se guarda en la base de
  // datos, podrían pesar varios MB (en la prueba real, más de 700 KB).
  const dataSinPdfs = { ...data };
  delete dataSinPdfs.soportesPdf;

  return { ok: true, semaforo, raw: { ...body, data: dataSinPdfs }, pdfs };
}

function normalizarNivelRiesgo(valor: unknown): "verde" | "amarillo" | "rojo" | null {
  if (typeof valor === "number") {
    if (valor <= 0) return "verde";
    if (valor === 1) return "amarillo";
    return "rojo";
  }
  if (typeof valor === "string") {
    const v = valor.toLowerCase();
    if (v.includes("verde") || v === "green" || v === "bajo") return "verde";
    if (v.includes("amarillo") || v === "yellow" || v === "medio") return "amarillo";
    if (v.includes("rojo") || v === "red" || v === "alto") return "rojo";
  }
  return null;
}

export function semaforoANivelRiesgo(
  semaforo: "verde" | "amarillo" | "rojo" | null
): "bajo" | "medio" | "alto" | null {
  if (semaforo === "verde") return "bajo";
  if (semaforo === "amarillo") return "medio";
  if (semaforo === "rojo") return "alto";
  return null;
}
