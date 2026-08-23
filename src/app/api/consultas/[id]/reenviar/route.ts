import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { resolverContextoEmpresa } from "@/lib/empresaContext";
import { enviarCorreo } from "@/lib/resend";
import { plantillaInvitacionConsulta } from "@/lib/emailPlantillas";

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

// Reenvía el correo de invitación a un candidato que todavía no ha
// respondido — pensado para cuando el correo se perdió, cayó en spam o
// simplemente no lo vio. Genera un token nuevo en vez de reusar el
// viejo (invalida cualquier enlace anterior que hubiera quedado dando
// vueltas) y solo aplica a consultas en estado "pendiente": una vez
// autorizada o rechazada, reenviar no tiene sentido.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const { id: consultaId } = await params;
  const db = adminClient();

  const contexto = await resolverContextoEmpresa(db, user.id);
  if (!contexto) {
    return NextResponse.json({ error: "Esta acción es solo para cuentas de empresa." }, { status: 400 });
  }

  const { data: consulta } = await db
    .from("consultas")
    .select("id, empresa_id, estado, candidato_primer_nombre, candidato_primer_apellido, candidato_email")
    .eq("id", consultaId)
    .maybeSingle();

  if (!consulta || consulta.empresa_id !== contexto.empresaId) {
    return NextResponse.json({ error: "No encontramos esta consulta." }, { status: 404 });
  }

  if (consulta.estado !== "pendiente") {
    return NextResponse.json(
      { error: "Solo se puede reenviar una invitación que todavía está pendiente." },
      { status: 400 }
    );
  }

  const tokenRespuesta = crypto.randomBytes(24).toString("hex");
  const { error: updateError } = await db
    .from("consultas")
    .update({ token_respuesta: tokenRespuesta, updated_at: new Date().toISOString() })
    .eq("id", consultaId);

  if (updateError) {
    return NextResponse.json({ error: "No pudimos reenviar la invitación." }, { status: 500 });
  }

  const resultado = await enviarCorreo(db, {
    to: consulta.candidato_email,
    subject: `${contexto.razonSocial ?? "Una empresa"} te invitó a Colombia Contrata`,
    html: plantillaInvitacionConsulta({
      candidatoNombre: `${consulta.candidato_primer_nombre} ${consulta.candidato_primer_apellido}`,
      empresaNombre: contexto.razonSocial ?? "una empresa",
      token: tokenRespuesta,
    }),
  });

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error ?? "No pudimos enviar el correo." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
