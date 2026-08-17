import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  if (data.user.app_metadata?.role !== "admin") return null;
  return data.user;
}

export async function GET(request: NextRequest) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const db = adminClient();

  const [{ data: consultas }, { data: perfiles }] = await Promise.all([
    db
      .from("consultas")
      .select(
        "id, empresa_id, candidato_primer_nombre, candidato_primer_apellido, candidato_email, candidato_tipo_documento, candidato_numero_documento, fecha_respuesta, nivel_riesgo, nivel_riesgo_notas"
      )
      .eq("estado", "autorizada")
      .order("fecha_respuesta", { ascending: false }),
    db.from("profiles").select("id, razon_social"),
  ]);

  const empresaPorId = new Map((perfiles ?? []).map((p) => [p.id, p.razon_social]));

  const consultasConEmpresa = (consultas ?? []).map((c) => ({
    ...c,
    empresa_nombre: empresaPorId.get(c.empresa_id) ?? null,
  }));

  return NextResponse.json({ consultas: consultasConEmpresa });
}

export async function POST(request: NextRequest) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { consultaId, nivelRiesgo, notas } = await request.json();
  if (
    typeof consultaId !== "string" ||
    (nivelRiesgo !== "bajo" && nivelRiesgo !== "medio" && nivelRiesgo !== "alto" && nivelRiesgo !== null)
  ) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const db = adminClient();
  const { error } = await db
    .from("consultas")
    .update({
      nivel_riesgo: nivelRiesgo,
      nivel_riesgo_notas: typeof notas === "string" ? notas : null,
      nivel_riesgo_actualizado_at: new Date().toISOString(),
    })
    .eq("id", consultaId)
    .eq("estado", "autorizada");

  if (error) {
    return NextResponse.json({ error: "No pudimos guardar la clasificación." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
