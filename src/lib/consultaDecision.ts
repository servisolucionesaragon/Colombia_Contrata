import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { creditosDisponibles, esEmpresaAdmin } from "@/lib/creditos";
import {
  getSolverioConfig,
  consultarVerificacionCompleta,
  semaforoANivelRiesgo,
  TODAS_LAS_FUENTES,
} from "@/lib/solverio";

export type ConsultaParaDecision = {
  id: string;
  empresa_id: string;
  estado: string;
  candidato_primer_nombre: string;
  candidato_segundo_nombre: string | null;
  candidato_primer_apellido: string;
  candidato_segundo_apellido: string | null;
  candidato_tipo_documento: "CC" | "PPT" | "CE" | "PA";
  candidato_numero_documento: string;
  candidato_fecha_expedicion: string | null;
  documentos_requeridos: Array<{ id: string; documento: string; clave_fuente: string | null }> | null;
};

type Resultado = { ok: true } | { ok: false; error: string; status: number };

// Lógica compartida entre /api/consultas/autorizar (candidato con sesión
// iniciada) y /api/consultas/responder-token (candidato que responde
// desde el enlace del correo, sin sesión) — así el chequeo de créditos y
// el disparo de la verificación con Solverio viven en un solo lugar.
export async function procesarDecisionConsulta(
  db: SupabaseClient,
  consulta: ConsultaParaDecision,
  decision: "autorizar" | "rechazar",
  candidatoId: string | null
): Promise<Resultado> {
  if (consulta.estado !== "pendiente") {
    return { ok: false, error: "Esta consulta ya fue respondida.", status: 400 };
  }

  if (decision === "rechazar") {
    await db
      .from("consultas")
      .update({
        estado: "rechazada",
        candidato_id: candidatoId,
        fecha_respuesta: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", consulta.id);
    await notificarEmpresa(db, consulta, "rechazada");
    return { ok: true };
  }

  // Una empresa que además es administradora del sitio puede autorizar
  // sin depender de créditos comprados — pensado para poder probar el
  // flujo real (incluida la verificación con Solverio) sin tener que
  // simular un pago primero.
  const esAdmin = await esEmpresaAdmin(db, consulta.empresa_id);

  if (!esAdmin) {
    const disponibles = await creditosDisponibles(db, consulta.empresa_id);
    if (disponibles <= 0) {
      return {
        ok: false,
        error:
          "La empresa que te invitó no tiene créditos disponibles en este momento. Intenta de nuevo más tarde.",
        status: 400,
      };
    }
  }

  await db
    .from("consultas")
    .update({
      estado: "autorizada",
      candidato_id: candidatoId,
      credito_descontado: !esAdmin,
      fecha_respuesta: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", consulta.id);

  await notificarEmpresa(db, consulta, "autorizada");

  // La autorización ya quedó guardada — el candidato no debe esperar a
  // que Solverio responda (una consulta real tardó 68.9s). Se dispara
  // con after(), que sigue corriendo después de que la respuesta ya se
  // envió, sin bloquear. Si falla, la autorización nunca se pierde.
  after(async () => {
    const resultado = await ejecutarVerificacion(db, consulta);
    await guardarResultadoVerificacion(db, consulta.id, resultado);
  });

  return { ok: true };
}

async function ejecutarVerificacion(db: SupabaseClient, consulta: ConsultaParaDecision) {
  const config = await getSolverioConfig(db);
  if (!config) {
    return { ok: false as const, error: "La verificación automática de fuentes no está configurada." };
  }

  // El checklist que la empresa armó al invitar (documentos_requeridos,
  // guardado como snapshot en el momento de la invitación) decide qué
  // fuentes de Vericol se piden de verdad — ya no se pide siempre el
  // conjunto completo. Si por alguna razón la consulta no trae checklist
  // (dato viejo de antes de este cambio), se cae de vuelta a pedirlas
  // todas para no romper consultas ya en curso.
  const fuentes = consulta.documentos_requeridos
    ? Array.from(
        new Set(
          consulta.documentos_requeridos
            .map((d) => d.clave_fuente)
            .filter((clave): clave is string => Boolean(clave))
        )
      )
    : TODAS_LAS_FUENTES;

  return consultarVerificacionCompleta(
    config,
    {
      documento: consulta.candidato_numero_documento,
      primerNombre: consulta.candidato_primer_nombre,
      primerApellido: consulta.candidato_primer_apellido,
      segundoNombre: consulta.candidato_segundo_nombre,
      segundoApellido: consulta.candidato_segundo_apellido,
      tipoDocumento: consulta.candidato_tipo_documento,
      fechaExpedicion: consulta.candidato_fecha_expedicion,
    },
    fuentes
  );
}

async function guardarResultadoVerificacion(
  db: SupabaseClient,
  consultaId: string,
  resultado: Awaited<ReturnType<typeof ejecutarVerificacion>>
) {
  if (!resultado.ok) {
    await db
      .from("consultas")
      .update({ resultado_error: resultado.error, updated_at: new Date().toISOString() })
      .eq("id", consultaId);
    return;
  }

  const rutasPdf = await subirPdfsSoporte(db, consultaId, resultado.pdfs);

  await db
    .from("consultas")
    .update({
      resultado_semaforo: resultado.semaforo,
      resultado_json: resultado.raw,
      resultado_pdfs: rutasPdf,
      resultado_obtenido_at: new Date().toISOString(),
      resultado_error: null,
      nivel_riesgo: semaforoANivelRiesgo(resultado.semaforo),
      nivel_riesgo_actualizado_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", consultaId);
}

// Decodifica cada PDF en base64 que haya devuelto Solverio y lo sube al
// bucket privado "verificaciones-pdf" — nunca se guarda el base64 en la
// base de datos, solo la ruta de Storage. La descarga real se hace
// después con una URL firmada de corta duración
// (ver /api/consultas/[id]/pdf), nunca con una URL pública.
async function subirPdfsSoporte(
  db: SupabaseClient,
  consultaId: string,
  pdfs: Record<string, string> | null
): Promise<Record<string, string> | null> {
  if (!pdfs) return null;

  const rutas: Record<string, string> = {};
  for (const [fuente, base64] of Object.entries(pdfs)) {
    if (typeof base64 !== "string" || !base64) continue;
    try {
      const buffer = Buffer.from(base64, "base64");
      const ruta = `${consultaId}/${fuente}.pdf`;
      const { error } = await db.storage
        .from("verificaciones-pdf")
        .upload(ruta, buffer, { contentType: "application/pdf", upsert: true });
      if (!error) rutas[fuente] = ruta;
    } catch {
      // Un PDF individual mal formado no debe tumbar el resto de la
      // verificación — simplemente se omite de rutas.
    }
  }

  return Object.keys(rutas).length > 0 ? rutas : null;
}

// Notificación en la plataforma (no por correo) para que la empresa se
// entere de que un candidato respondió sin tener que entrar a revisar
// /empresas/consultas manualmente — ver NotificacionesBell.tsx. Un
// fallo al insertarla nunca debe tumbar la autorización/rechazo, que ya
// quedó guardada antes de llegar acá.
async function notificarEmpresa(
  db: SupabaseClient,
  consulta: ConsultaParaDecision,
  tipo: "autorizada" | "rechazada"
) {
  const nombre = `${consulta.candidato_primer_nombre} ${consulta.candidato_primer_apellido}`;
  const mensaje =
    tipo === "autorizada"
      ? "autorizó la verificación de sus antecedentes."
      : "rechazó la verificación de sus antecedentes.";

  try {
    await db.from("notificaciones").insert({
      empresa_id: consulta.empresa_id,
      consulta_id: consulta.id,
      tipo,
      candidato_nombre: nombre,
      mensaje,
    });
  } catch {
    // Best-effort — no notificar no debe romper el flujo de autorizar/rechazar.
  }
}
