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

type Ambiente = "sandbox" | "produccion";

// La llave pública de cada ambiente no es un secreto (está pensada para
// usarse en el navegador), así que se devuelve completa. Los dos
// secretos de cada ambiente nunca se devuelven — solo si están
// configurados o no — para que el formulario de /admin pueda mostrar su
// estado sin exponerlos de vuelta al navegador.
export async function GET(request: NextRequest) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { data } = await adminClient()
    .from("configuracion_wompi")
    .select(
      "ambiente_activo, sandbox_base_url, sandbox_public_key, sandbox_integrity_secret, sandbox_events_secret, produccion_base_url, produccion_public_key, produccion_integrity_secret, produccion_events_secret"
    )
    .eq("id", 1)
    .maybeSingle();

  return NextResponse.json({
    ambienteActivo: (data?.ambiente_activo as Ambiente) ?? "sandbox",
    sandbox: {
      baseUrl: data?.sandbox_base_url || "https://sandbox.wompi.co/v1",
      publicKey: data?.sandbox_public_key ?? "",
      integritySecretConfigurado: !!data?.sandbox_integrity_secret,
      eventsSecretConfigurado: !!data?.sandbox_events_secret,
    },
    produccion: {
      baseUrl: data?.produccion_base_url || "https://production.wompi.co/v1",
      publicKey: data?.produccion_public_key ?? "",
      integritySecretConfigurado: !!data?.produccion_integrity_secret,
      eventsSecretConfigurado: !!data?.produccion_events_secret,
    },
  });
}

type EnvPayload = {
  baseUrl?: string;
  publicKey?: string;
  integritySecret?: string;
  eventsSecret?: string;
};

export async function POST(request: NextRequest) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { ambienteActivo, sandbox, produccion } = body as {
    ambienteActivo?: Ambiente;
    sandbox?: EnvPayload;
    produccion?: EnvPayload;
  };

  const payload: Record<string, string> = { updated_at: new Date().toISOString() };

  if (ambienteActivo === "sandbox" || ambienteActivo === "produccion") {
    payload.ambiente_activo = ambienteActivo;
  }

  // Solo se actualizan los campos que llegaron con contenido — dejar un
  // campo vacío en el formulario significa "no cambiar este valor", no
  // "borrarlo", para no obligar a reescribir los tres cada vez.
  const aplicarEnv = (env: EnvPayload | undefined, prefijo: "sandbox" | "produccion") => {
    if (!env) return;
    if (typeof env.baseUrl === "string" && env.baseUrl.trim()) {
      payload[`${prefijo}_base_url`] = env.baseUrl.trim();
    }
    if (typeof env.publicKey === "string" && env.publicKey.trim()) {
      payload[`${prefijo}_public_key`] = env.publicKey.trim();
    }
    if (typeof env.integritySecret === "string" && env.integritySecret.trim()) {
      payload[`${prefijo}_integrity_secret`] = env.integritySecret.trim();
    }
    if (typeof env.eventsSecret === "string" && env.eventsSecret.trim()) {
      payload[`${prefijo}_events_secret`] = env.eventsSecret.trim();
    }
  };
  aplicarEnv(sandbox, "sandbox");
  aplicarEnv(produccion, "produccion");

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
