import { NextRequest, NextResponse, after } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { creditosDisponibles } from "@/lib/creditos";
import { getSolverioConfig, consultarVerificacionCompleta, semaforoANivelRiesgo } from "@/lib/solverio";

// La verificación real con Solverio puede tardar más de un minuto (una
// prueba real tardó 68.9s, dominada por una sola fuente lenta) — se
// dispara con after() después de responder al candidato en vez de
// hacerlo esperar, y se sube este límite lo más alto que permite Vercel
// para darle a ese trabajo en segundo plano más margen para completarse.
export const maxDuration = 60;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const { consultaId, decision } = await request.json();
  if (
    typeof consultaId !== "string" ||
    (decision !== "autorizar" && decision !== "rechazar")
  ) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const db = adminClient();

  const { data: consulta } = await db
    .from("consultas")
    .select(
      "id, empresa_id, candidato_id, candidato_email, estado, candidato_primer_nombre, candidato_segundo_nombre, candidato_primer_apellido, candidato_segundo_apellido, candidato_tipo_documento, candidato_numero_documento, candidato_fecha_expedicion"
    )
    .eq("id", consultaId)
    .maybeSingle();

  if (!consulta) {
    return NextResponse.json({ error: "No encontramos esta consulta." }, { status: 404 });
  }

  // Solo el candidato al que se le envió esta consulta puede responderla
  // — verificado por su propio correo (antes de que tenga cuenta
  // vinculada) o por su id (si ya quedó vinculada en una respuesta
  // previa a otra consulta).
  const esElCandidato =
    consulta.candidato_id === user.id ||
    (!consulta.candidato_id && consulta.candidato_email === user.email);
  if (!esElCandidato) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  if (consulta.estado !== "pendiente") {
    return NextResponse.json(
      { error: "Esta consulta ya fue respondida." },
      { status: 400 }
    );
  }

  if (decision === "rechazar") {
    await db
      .from("consultas")
      .update({
        estado: "rechazada",
        candidato_id: user.id,
        fecha_respuesta: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", consultaId);
    return NextResponse.json({ success: true });
  }

  const disponibles = await creditosDisponibles(db, consulta.empresa_id);
  if (disponibles <= 0) {
    return NextResponse.json(
      {
        error:
          "La empresa que te invitó no tiene créditos disponibles en este momento. Intenta de nuevo más tarde.",
      },
      { status: 400 }
    );
  }

  await db
    .from("consultas")
    .update({
      estado: "autorizada",
      candidato_id: user.id,
      credito_descontado: true,
      fecha_respuesta: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", consultaId);

  // La autorización ya quedó guardada y el crédito descontado — el
  // candidato no debe esperar a que Solverio responda (una consulta real
  // tardó 68.9s). La verificación se dispara con after(), que sigue
  // corriendo después de que esta respuesta ya se envió, sin bloquear.
  // Si falla por cualquier motivo, la autorización del candidato nunca
  // se pierde — solo queda resultado_error en la fila.
  after(async () => {
    const resultado = await ejecutarVerificacion(db, consulta);
    await guardarResultadoVerificacion(db, consultaId, resultado);
  });

  return NextResponse.json({ success: true });
}

async function ejecutarVerificacion(
  db: SupabaseClient,
  consulta: {
    candidato_primer_nombre: string;
    candidato_segundo_nombre: string | null;
    candidato_primer_apellido: string;
    candidato_segundo_apellido: string | null;
    candidato_tipo_documento: "CC" | "PPT" | "CE" | "PA";
    candidato_numero_documento: string;
    candidato_fecha_expedicion: string | null;
  }
) {
  const config = await getSolverioConfig(db);
  if (!config) {
    return { ok: false as const, error: "La verificación automática de fuentes no está configurada." };
  }

  return consultarVerificacionCompleta(config, {
    documento: consulta.candidato_numero_documento,
    primerNombre: consulta.candidato_primer_nombre,
    primerApellido: consulta.candidato_primer_apellido,
    segundoNombre: consulta.candidato_segundo_nombre,
    segundoApellido: consulta.candidato_segundo_apellido,
    tipoDocumento: consulta.candidato_tipo_documento,
    fechaExpedicion: consulta.candidato_fecha_expedicion,
  });
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
// base de datos (podría pesar varios MB), solo la ruta de Storage. La
// descarga real se hace después con una URL firmada de corta duración
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
