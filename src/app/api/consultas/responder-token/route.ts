import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { procesarDecisionConsulta } from "@/lib/consultaDecision";

// La verificación real con Solverio puede tardar más de un minuto — ver
// el mismo comentario en /api/consultas/autorizar.
export const maxDuration = 180;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const SELECT_CONSULTA =
  "id, empresa_id, estado, candidato_primer_nombre, candidato_segundo_nombre, candidato_primer_apellido, candidato_segundo_apellido, candidato_email, candidato_tipo_documento, candidato_numero_documento, candidato_fecha_expedicion, documentos_requeridos";

// Responde a una consulta desde el enlace del correo de invitación, sin
// necesitar sesión iniciada — la seguridad viene del token (aleatorio,
// de un solo uso: deja de servir en cuanto la consulta deja de estar
// "pendiente"), no de un login. Deliberadamente separado de
// /api/consultas/autorizar (que sí exige sesión) para no mezclar los dos
// modelos de autenticación en un mismo endpoint.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Falta el token." }, { status: 400 });
  }

  const db = adminClient();

  const { data: consulta } = await db
    .from("consultas")
    .select(`${SELECT_CONSULTA}, empresa_id`)
    .eq("token_respuesta", token)
    .maybeSingle();

  if (!consulta) {
    return NextResponse.json({ error: "Este enlace no es válido." }, { status: 404 });
  }

  const { data: empresa } = await db
    .from("profiles")
    .select("razon_social")
    .eq("id", consulta.empresa_id)
    .maybeSingle();

  return NextResponse.json({
    candidatoNombre: `${consulta.candidato_primer_nombre} ${consulta.candidato_primer_apellido}`,
    empresaNombre: empresa?.razon_social ?? "la empresa",
    estado: consulta.estado,
    documentosRequeridos:
      (consulta.documentos_requeridos as { id: string; documento: string }[] | null) ?? [],
  });
}

export async function POST(request: NextRequest) {
  const { token, decision } = await request.json();
  if (typeof token !== "string" || (decision !== "autorizar" && decision !== "rechazar")) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const db = adminClient();

  const { data: consulta } = await db
    .from("consultas")
    .select(SELECT_CONSULTA)
    .eq("token_respuesta", token)
    .maybeSingle();

  if (!consulta) {
    return NextResponse.json({ error: "Este enlace no es válido." }, { status: 404 });
  }

  // Si ya existe una cuenta con este correo, se vincula — así el
  // candidato ve esta respuesta en su Dashboard si más adelante crea o
  // ya tiene sesión, igual que si hubiera respondido con sesión iniciada.
  const { data: authData } = await db.auth.admin.listUsers({ perPage: 1000 });
  const cuenta = authData?.users.find(
    (u) => u.email?.toLowerCase() === consulta.candidato_email.toLowerCase()
  );

  const resultado = await procesarDecisionConsulta(db, consulta, decision, cuenta?.id ?? null);
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: resultado.status });
  }

  return NextResponse.json({ success: true });
}
