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

async function requireUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

// Devuelve las consultas dirigidas al usuario que llama (por su id ya
// vinculado, o por su correo si todavía nadie las respondió), con el
// nombre de la empresa resuelto server-side — el candidato no tiene
// permiso para leer profiles de otra cuenta directamente por RLS.
export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const db = adminClient();

  const { data: consultas } = await db
    .from("consultas")
    .select("id, empresa_id, estado, created_at")
    .or(`candidato_id.eq.${user.id},candidato_email.eq.${user.email}`)
    .order("created_at", { ascending: false });

  const empresaIds = [...new Set((consultas ?? []).map((c) => c.empresa_id))];
  const { data: empresas } =
    empresaIds.length > 0
      ? await db.from("profiles").select("id, razon_social").in("id", empresaIds)
      : { data: [] as { id: string; razon_social: string | null }[] };

  const nombrePorId = new Map((empresas ?? []).map((e) => [e.id, e.razon_social]));

  const resultado = (consultas ?? []).map((c) => ({
    id: c.id,
    empresaNombre: nombrePorId.get(c.empresa_id) ?? "Una empresa",
    estado: c.estado,
    fecha: c.created_at,
  }));

  return NextResponse.json({ consultas: resultado });
}
