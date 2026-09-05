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

// Todas las fuentes disponibles en POST /api/Verificacion/completa
// (colección "Vericol API" actualizada 2026-09-04). A diferencia del
// endpoint Enterprise anterior (que corría un conjunto fijo sin poder
// elegirlo), este POST exige mandar explícitamente la lista de fuentes.
// Cada una tiene su fila espejo en precios_documentos.clave_fuente — el
// checklist que arma la empresa (o la persona) al invitar/solicitar
// determina cuáles de estas se piden de verdad (ver ejecutarVerificacion
// en consultaDecision.ts). Se usa como fallback cuando no hay checklist
// que filtrar (ej. la consulta manual de /admin → Fuentes).
export const TODAS_LAS_FUENTES = [
  "adres",
  "bdme",
  "contraloria",
  "delitosMenores",
  "funcionPublica",
  "inpec",
  "listasRestrictivas",
  "paco",
  "peps",
  "policia",
  "procuraduria",
  "proveedoresFicticiosDian",
  "ramaJudicial",
  "registraduria",
  "rndc",
  "rnmc",
  "rucom",
  "rues",
  "rut",
  "secop",
  "sena",
  "simit",
  "siri",
  "sisben",
  "sisconmp",
  "supersociedades",
];

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
  datos: DatosVerificacion,
  fuentes: string[] = TODAS_LAS_FUENTES
): Promise<ResultadoVerificacion> {
  const tipoCodigo = TIPO_DOCUMENTO_SOLVERIO[datos.tipoDocumento];
  if (!tipoCodigo) {
    return {
      ok: false,
      error: `El proveedor de verificación no soporta el tipo de documento "${datos.tipoDocumento}" todavía.`,
    };
  }

  if (fuentes.length === 0) {
    return {
      ok: false,
      error:
        "Ninguno de los documentos seleccionados tiene una fuente de verificación automática disponible.",
    };
  }

  const requestBody: Record<string, unknown> = {
    documento: datos.documento,
    tipoDocumento: tipoCodigo,
    primerNombre: datos.primerNombre,
    primerApellido: datos.primerApellido,
    obtenerSoportes: true,
    fuentes,
  };
  if (datos.segundoNombre) requestBody.segundoNombre = datos.segundoNombre;
  if (datos.segundoApellido) requestBody.segundoApellido = datos.segundoApellido;
  if (datos.fechaExpedicion) requestBody.fechaExpedicion = datos.fechaExpedicion;

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/api/Verificacion/completa`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Api-Key": config.apiKey,
      },
      body: JSON.stringify(requestBody),
    });
  } catch {
    return { ok: false, error: "No pudimos conectar con el proveedor de verificación." };
  }

  if (response.status === 400) {
    return {
      ok: false,
      error: "El proveedor de verificación rechazó la solicitud (parámetros o fuentes inválidas).",
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

  // Estructura confirmada con una consulta de prueba real contra
  // GET /api/enterprise/verificacion/completa el 2026-08-17: todo viene
  // envuelto en { exitoso, mensaje, data: {...} }, con el riesgo como
  // número en data.nivelRiesgo (no un texto "semaforo" como sugería la
  // descripción del endpoint). Se asume la misma estructura para este
  // POST /api/Verificacion/completa (2026-09-04, mismo proveedor) porque
  // la colección de Postman tampoco trae un ejemplo de respuesta —
  // ⚠️ pendiente confirmar con una consulta manual real desde /admin →
  // Fuentes en cuanto se use por primera vez. El significado exacto de
  // cada valor de nivelRiesgo (0/1/2...) tampoco está confirmado con el
  // proveedor — se usa el mapeo más razonable (0=verde/bajo,
  // 1=amarillo/medio, 2 o más=rojo/alto).
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
