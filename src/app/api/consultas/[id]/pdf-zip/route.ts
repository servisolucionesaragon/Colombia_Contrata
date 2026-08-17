import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolverAccesoDocumentos } from "@/lib/consultaAcceso";
import { crearZip } from "@/lib/zip";

export const maxDuration = 60;

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

const FUENTE_LABEL: Record<string, string> = {
  registraduria: "Registraduria",
  policia: "Policia",
  procuraduria: "Procuraduria",
  contraloria: "Contraloria",
  ramaJudicial: "Rama Judicial",
  rnmc: "Medidas correctivas",
};

// Descarga todos los PDF de soporte de una consulta ya autorizada desde
// el bucket privado, los empaqueta en un .zip en memoria (sin escribir
// a disco, sin subir el zip a Storage) y lo devuelve directo como
// adjunto — igual que /pdf, accesible tanto por la empresa dueña como
// por el candidato consultado.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const { id: consultaId } = await params;
  const db = adminClient();
  const consulta = await resolverAccesoDocumentos(db, consultaId, user);
  if (!consulta) {
    return NextResponse.json({ error: "No encontramos esta consulta." }, { status: 404 });
  }

  const rutas = consulta.resultado_pdfs ?? {};
  const fuentes = Object.keys(rutas);
  if (fuentes.length === 0) {
    return NextResponse.json({ error: "No hay documentos disponibles para descargar." }, { status: 404 });
  }

  const archivos: { nombre: string; datos: Buffer }[] = [];
  for (const fuente of fuentes) {
    const { data, error } = await db.storage.from("verificaciones-pdf").download(rutas[fuente]);
    if (error || !data) continue;
    const datos = Buffer.from(await data.arrayBuffer());
    const nombre = `${FUENTE_LABEL[fuente] ?? fuente}.pdf`;
    archivos.push({ nombre, datos });
  }

  if (archivos.length === 0) {
    return NextResponse.json({ error: "No pudimos descargar los documentos." }, { status: 500 });
  }

  const zip = crearZip(archivos);

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="documentos-${consultaId.slice(0, 8)}.zip"`,
    },
  });
}
