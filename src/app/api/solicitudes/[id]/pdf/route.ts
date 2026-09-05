import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolverAccesoDocumentosSolicitud } from "@/lib/solicitudAcceso";

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

// Igual que /api/consultas/[id]/pdf pero para solicitudes de persona —
// URL firmada de corta duración, bucket privado, solo el dueño de la
// solicitud puede acceder (ver resolverAccesoDocumentosSolicitud).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const { id: solicitudId } = await params;
  const fuente = request.nextUrl.searchParams.get("fuente");
  if (!fuente) {
    return NextResponse.json({ error: "Falta indicar qué documento descargar." }, { status: 400 });
  }

  const db = adminClient();
  const solicitud = await resolverAccesoDocumentosSolicitud(db, solicitudId, user);
  if (!solicitud) {
    return NextResponse.json({ error: "No encontramos esta solicitud." }, { status: 404 });
  }

  const rutas = solicitud.resultado_pdfs ?? {};
  const ruta = rutas[fuente];
  if (!ruta) {
    return NextResponse.json({ error: "Ese documento no está disponible." }, { status: 404 });
  }

  const { data: firmada, error } = await db.storage
    .from("verificaciones-pdf")
    .createSignedUrl(ruta, 300);

  if (error || !firmada) {
    return NextResponse.json({ error: "No pudimos generar el enlace de descarga." }, { status: 500 });
  }

  return NextResponse.json({ url: firmada.signedUrl });
}
