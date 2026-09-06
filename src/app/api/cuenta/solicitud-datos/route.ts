import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enviarCorreo } from "@/lib/resend";

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

// Derechos del titular según la Ley 1581 de 2012 (arts. 8 y 15). No es una
// lista inventada: son las peticiones que la norma le reconoce a quien
// entrega sus datos, y cada una tiene un trámite distinto.
export const TIPOS_SOLICITUD = [
  "supresion",
  "revocacion",
  "acceso",
  "rectificacion",
  "actualizacion",
  "otro",
] as const;

const ETIQUETA_TIPO: Record<string, string> = {
  supresion: "Supresión de datos",
  revocacion: "Revocación de la autorización",
  acceso: "Acceso a mis datos",
  rectificacion: "Rectificación de datos",
  actualizacion: "Actualización de datos",
  otro: "Otra solicitud",
};

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const db = adminClient();
  const { data } = await db
    .from("solicitudes_datos")
    .select("id, tipo, detalle, estado, respuesta, created_at, resuelta_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ solicitudes: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const { tipo, detalle } = await request.json();
  if (typeof tipo !== "string" || !TIPOS_SOLICITUD.includes(tipo as never)) {
    return NextResponse.json({ error: "Elige el tipo de solicitud." }, { status: 400 });
  }

  const db = adminClient();

  // Una sola petición abierta a la vez del mismo tipo: evita que un doble
  // clic o la impaciencia generen expedientes duplicados del mismo caso.
  const { data: abierta } = await db
    .from("solicitudes_datos")
    .select("id")
    .eq("user_id", user.id)
    .eq("tipo", tipo)
    .in("estado", ["recibida", "en_tramite"])
    .maybeSingle();

  if (abierta) {
    return NextResponse.json(
      { error: "Ya tienes una solicitud de este tipo en trámite. Te responderemos por correo." },
      { status: 409 }
    );
  }

  const { data: perfil } = await db
    .from("profiles")
    .select("primer_nombre, primer_apellido, razon_social")
    .eq("id", user.id)
    .maybeSingle();

  const nombre =
    perfil?.razon_social ||
    [perfil?.primer_nombre, perfil?.primer_apellido].filter(Boolean).join(" ") ||
    null;

  const { data: creada, error } = await db
    .from("solicitudes_datos")
    .insert({
      user_id: user.id,
      correo: user.email,
      nombre,
      tipo,
      detalle: typeof detalle === "string" && detalle.trim() ? detalle.trim() : null,
    })
    .select("id, created_at")
    .single();

  if (error || !creada) {
    return NextResponse.json(
      { error: "No pudimos registrar la solicitud. Intenta de nuevo." },
      { status: 500 }
    );
  }

  // El aviso al responsable del tratamiento va en segundo plano: la
  // solicitud ya quedó registrada, y un fallo de correo no debe hacerle
  // creer al titular que no se radicó.
  after(async () => {
    const { data: config } = await db
      .from("configuracion_portal")
      .select("correo_contacto")
      .eq("id", 1)
      .maybeSingle();

    const destino = config?.correo_contacto || "contacto@colombiacontrata.com";
    const etiqueta = ETIQUETA_TIPO[tipo] ?? tipo;

    await enviarCorreo(db, {
      to: destino,
      subject: `Solicitud de habeas data: ${etiqueta}`,
      html: `<p><strong>${etiqueta}</strong></p>
<p>Titular: ${nombre ?? "(sin nombre en el perfil)"}<br>
Correo: ${user.email}<br>
Radicado: ${creada.id}</p>
<p>Detalle: ${detalle && typeof detalle === "string" ? detalle : "(sin detalle)"}</p>
<p>La Ley 1581 de 2012 da 15 días hábiles para atender un reclamo (prorrogables 8 más) y 10 días hábiles para una consulta.</p>`,
    });
  });

  return NextResponse.json({ success: true, id: creada.id });
}
