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

// La API key nunca se devuelve al navegador, igual que los secretos de
// Wompi — solo se informa si ya hay una guardada o no.
export async function GET(request: NextRequest) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { data } = await adminClient()
    .from("configuracion_solverio")
    .select("base_url, api_key")
    .eq("id", 1)
    .maybeSingle();

  return NextResponse.json({
    baseUrl: data?.base_url || "https://simpleverifybe-production.up.railway.app",
    apiKeyConfigurada: !!data?.api_key,
  });
}

export async function POST(request: NextRequest) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { baseUrl, apiKey } = await request.json();

  const payload: Record<string, string> = { updated_at: new Date().toISOString() };
  if (typeof baseUrl === "string" && baseUrl.trim()) payload.base_url = baseUrl.trim();
  // Dejar el campo vacío significa "no cambiar la llave", no "borrarla".
  if (typeof apiKey === "string" && apiKey.trim()) payload.api_key = apiKey.trim();

  const { error } = await adminClient()
    .from("configuracion_solverio")
    .update(payload)
    .eq("id", 1);

  if (error) {
    return NextResponse.json({ error: "No pudimos guardar la configuración." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
