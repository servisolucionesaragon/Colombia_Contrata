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

// La llave pública de Wompi no es un secreto (está pensada para usarse en
// el navegador), así que se devuelve completa. Los dos secretos nunca se
// devuelven — solo si están configurados o no — para que el formulario de
// /admin pueda mostrar su estado sin exponerlos de vuelta al navegador.
export async function GET(request: NextRequest) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { data } = await adminClient()
    .from("configuracion_wompi")
    .select("public_key, integrity_secret, events_secret")
    .eq("id", 1)
    .maybeSingle();

  return NextResponse.json({
    publicKey: data?.public_key ?? "",
    integritySecretConfigurado: !!data?.integrity_secret,
    eventsSecretConfigurado: !!data?.events_secret,
  });
}

export async function POST(request: NextRequest) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { publicKey, integritySecret, eventsSecret } = await request.json();

  // Solo se actualizan los campos que llegaron con contenido — dejar un
  // campo vacío en el formulario significa "no cambiar este valor", no
  // "borrarlo", para no obligar a reescribir los tres cada vez.
  const payload: Record<string, string> = { updated_at: new Date().toISOString() };
  if (typeof publicKey === "string" && publicKey.trim()) {
    payload.public_key = publicKey.trim();
  }
  if (typeof integritySecret === "string" && integritySecret.trim()) {
    payload.integrity_secret = integritySecret.trim();
  }
  if (typeof eventsSecret === "string" && eventsSecret.trim()) {
    payload.events_secret = eventsSecret.trim();
  }

  const { error } = await adminClient()
    .from("configuracion_wompi")
    .update(payload)
    .eq("id", 1);

  if (error) {
    return NextResponse.json(
      { error: "No pudimos guardar la configuración." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
