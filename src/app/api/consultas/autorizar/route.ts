import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { creditosDisponibles } from "@/lib/creditos";

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
    .select("id, empresa_id, candidato_id, candidato_email, estado")
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

  // TODO: cuando exista la integración con el proveedor de fuentes, este
  // es el lugar para disparar la consulta real de antecedentes.
  return NextResponse.json({ success: true });
}
