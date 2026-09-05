import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { procesarDecisionConsulta } from "@/lib/consultaDecision";

// La verificación real con Solverio puede tardar más de un minuto (una
// prueba real tardó 68.9s, dominada por una sola fuente lenta) — se
// dispara con after() después de responder al candidato en vez de
// hacerlo esperar. Con Fluid Compute activado en el proyecto de Vercel,
// el máximo real del plan Hobby es 300s (no 60) — se deja un buen
// margen sobre los 68.9s observados.
export const maxDuration = 180;

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
      "id, empresa_id, candidato_id, candidato_email, estado, candidato_primer_nombre, candidato_segundo_nombre, candidato_primer_apellido, candidato_segundo_apellido, candidato_tipo_documento, candidato_numero_documento, candidato_fecha_expedicion, documentos_requeridos"
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

  const resultado = await procesarDecisionConsulta(db, consulta, decision, user.id);
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: resultado.status });
  }

  return NextResponse.json({ success: true });
}
