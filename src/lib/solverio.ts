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

  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    return { ok: false, error: "La respuesta del proveedor de verificación no se pudo interpretar." };
  }

  // El formato exacto de la respuesta no viene documentado con un ejemplo
  // real todavía — se intenta extraer el semáforo y los soportes en PDF
  // con los nombres de campo más probables, pero siempre se guarda el
  // JSON completo (raw) aparte para no perder nada si estos nombres no
  // coinciden exactamente una vez se vea una respuesta real.
  const resultado = data?.resultado as Record<string, unknown> | undefined;
  const semaforoRaw =
    (data?.semaforo as string | undefined) ??
    (resultado?.semaforo as string | undefined) ??
    (data?.resultadoGeneral as string | undefined);
  const semaforo = normalizarSemaforo(semaforoRaw);

  const pdfsRaw = data?.soportesPdf ?? data?.soportes_pdf ?? null;
  const pdfs =
    pdfsRaw && typeof pdfsRaw === "object" ? (pdfsRaw as Record<string, string>) : null;

  // Los PDF en base64 ya se extraen aparte (y se suben a Storage) — no
  // tiene sentido duplicarlos dentro del JSON que se guarda en la base de
  // datos, podrían pesar varios MB.
  const rawSinPdfs = { ...data };
  delete rawSinPdfs.soportesPdf;
  delete rawSinPdfs.soportes_pdf;

  return { ok: true, semaforo, raw: rawSinPdfs, pdfs };
}

function normalizarSemaforo(valor: string | undefined): "verde" | "amarillo" | "rojo" | null {
  if (!valor) return null;
  const v = valor.toLowerCase();
  if (v.includes("verde") || v === "green") return "verde";
  if (v.includes("amarillo") || v === "yellow") return "amarillo";
  if (v.includes("rojo") || v === "red") return "rojo";
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
