import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolverAccesoDocumentos } from "@/lib/consultaAcceso";

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

// Genera una URL firmada de corta duración para descargar un PDF de
// soporte de una verificación ya autorizada. Nunca se expone una URL
// pública fija — el bucket "verificaciones-pdf" es privado y cada
// descarga pide una URL nueva, válida solo por unos minutos. Solo la
// empresa dueña de la consulta puede acceder — el candidato nunca ve
// estos documentos (ver resolverAccesoDocumentos).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const { id: consultaId } = await params;
  const fuente = request.nextUrl.searchParams.get("fuente");
  if (!fuente) {
    return NextResponse.json({ error: "Falta indicar qué documento descargar." }, { status: 400 });
  }

  const db = adminClient();
  const consulta = await resolverAccesoDocumentos(db, consultaId, user);
  if (!consulta) {
    return NextResponse.json({ error: "No encontramos esta consulta." }, { status: 404 });
  }

  const rutas = consulta.resultado_pdfs ?? {};
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
