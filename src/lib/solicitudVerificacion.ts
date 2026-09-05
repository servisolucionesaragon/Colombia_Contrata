import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSolverioConfig,
  consultarVerificacionCompleta,
  semaforoANivelRiesgo,
  TODAS_LAS_FUENTES,
  type TipoDocumentoCandidato,
  type ResultadoVerificacion,
} from "@/lib/solverio";
import { enviarCorreo } from "@/lib/resend";
import { plantillaDocumentosListos } from "@/lib/emailPlantillas";

type DocumentoRequerido = { id: string; documento: string; clave_fuente: string | null };

export type SolicitudParaVerificacion = {
  id: string;
  user_id: string;
  documentos: DocumentoRequerido[] | null;
};

// Equivalente de ejecutarVerificacion/guardarResultadoVerificacion en
// consultaDecision.ts, pero para solicitudes de persona (/solicitar) en
// vez de consultas de empresa. Se llama desde /api/webhooks/wompi
// cuando un pago pasa a "pagado" — nunca debe lanzar, cualquier fallo
// queda registrado en resultado_error sin tumbar el webhook.
export async function procesarPagoAprobadoSolicitud(
  db: SupabaseClient,
  solicitud: SolicitudParaVerificacion
): Promise<void> {
  const resultado = await ejecutarVerificacion(db, solicitud);
  await guardarResultado(db, solicitud.id, resultado);

  // Solo se notifica cuando la verificación sí terminó — la página de
  // confirmación del pago promete "te notificaremos por correo cuando
  // tus documentos estén listos", así que si falló (resultado_error)
  // no hay nada listo todavía que anunciar.
  if (resultado.ok) {
    await notificarDocumentosListos(db, solicitud.user_id);
  }
}

async function notificarDocumentosListos(db: SupabaseClient, userId: string): Promise<void> {
  try {
    const [{ data: userData }, { data: profile }] = await Promise.all([
      db.auth.admin.getUserById(userId),
      db.from("profiles").select("primer_nombre").eq("id", userId).maybeSingle(),
    ]);

    const email = userData.user?.email;
    if (!email) return;

    await enviarCorreo(db, {
      to: email,
      subject: "Tus documentos ya están listos para descargar",
      html: plantillaDocumentosListos({ nombre: profile?.primer_nombre ?? null }),
    });
  } catch {
    // Best-effort — un fallo al enviar el correo no debe afectar el
    // resultado ya guardado (el usuario igual puede verlo en /historial).
  }
}

async function ejecutarVerificacion(
  db: SupabaseClient,
  solicitud: SolicitudParaVerificacion
): Promise<ResultadoVerificacion> {
  const config = await getSolverioConfig(db);
  if (!config) {
    return { ok: false, error: "La verificación automática de fuentes no está configurada." };
  }

  const { data: profile } = await db
    .from("profiles")
    .select("primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, tipo_documento, documento, fecha_expedicion")
    .eq("id", solicitud.user_id)
    .maybeSingle();

  if (!profile?.primer_nombre || !profile?.primer_apellido || !profile?.documento || !profile?.tipo_documento) {
    return { ok: false, error: "No encontramos los datos del perfil para verificar." };
  }

  // El checklist que la persona armó al solicitar (solicitud.documentos,
  // guardado como snapshot en el momento del pago) decide qué fuentes de
  // Vericol se piden — si por alguna razón no trae checklist (dato viejo
  // de antes de este cambio), se cae de vuelta a pedirlas todas.
  const fuentes = solicitud.documentos
    ? Array.from(
        new Set(
          solicitud.documentos
            .map((d) => d.clave_fuente)
            .filter((clave): clave is string => Boolean(clave))
        )
      )
    : TODAS_LAS_FUENTES;

  return consultarVerificacionCompleta(
    config,
    {
      documento: profile.documento,
      primerNombre: profile.primer_nombre,
      primerApellido: profile.primer_apellido,
      segundoNombre: profile.segundo_nombre,
      segundoApellido: profile.segundo_apellido,
      tipoDocumento: profile.tipo_documento as TipoDocumentoCandidato,
      fechaExpedicion: profile.fecha_expedicion,
    },
    fuentes
  );
}

async function guardarResultado(
  db: SupabaseClient,
  solicitudId: string,
  resultado: ResultadoVerificacion
) {
  if (!resultado.ok) {
    await db
      .from("solicitudes")
      .update({ resultado_error: resultado.error, updated_at: new Date().toISOString() })
      .eq("id", solicitudId);
    return;
  }

  const rutasPdf = await subirPdfsSoporte(db, solicitudId, resultado.pdfs);

  await db
    .from("solicitudes")
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
    .eq("id", solicitudId);
}

// Mismo patrón que subirPdfsSoporte en consultaDecision.ts: el bucket
// privado "verificaciones-pdf" se comparte entre consultas y solicitudes
// (colisión de UUID entre las dos tablas es prácticamente imposible),
// solo se guarda la ruta de Storage, nunca el base64 en la base de datos.
async function subirPdfsSoporte(
  db: SupabaseClient,
  solicitudId: string,
  pdfs: Record<string, string> | null
): Promise<Record<string, string> | null> {
  if (!pdfs) return null;

  const rutas: Record<string, string> = {};
  for (const [fuente, base64] of Object.entries(pdfs)) {
    if (typeof base64 !== "string" || !base64) continue;
    try {
      const buffer = Buffer.from(base64, "base64");
      const ruta = `${solicitudId}/${fuente}.pdf`;
      const { error } = await db.storage
        .from("verificaciones-pdf")
        .upload(ruta, buffer, { contentType: "application/pdf", upsert: true });
      if (!error) rutas[fuente] = ruta;
    } catch {
      // Un PDF individual mal formado no debe tumbar el resto.
    }
  }

  return Object.keys(rutas).length > 0 ? rutas : null;
}
