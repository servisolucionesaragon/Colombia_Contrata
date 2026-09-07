import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Vercel pone la IP real del visitante en x-forwarded-for; el primer
// valor de la lista es el cliente y los siguientes son los proxies.
function ipDeLaPeticion(request: NextRequest): string | null {
  const reenviada = request.headers.get("x-forwarded-for");
  if (reenviada) {
    const primera = reenviada.split(",")[0]?.trim();
    if (primera) return primera;
  }
  return request.headers.get("x-real-ip");
}

// Deja la constancia del consentimiento de Habeas Data con la IP desde la
// que se otorgó. Va en una tabla propia y no en `user_metadata` a
// propósito: ese campo lo puede modificar el propio usuario con
// supabase.auth.updateUser, así que no sirve como prueba. Esta tabla solo
// la escribe el servidor con la Service Role Key (RLS activo sin ninguna
// policy = nadie más entra).
export async function POST(request: NextRequest) {
  const { userId, politicaVersion } = await request.json();

  if (typeof userId !== "string" || typeof politicaVersion !== "string") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const db = adminClient();

  // El registro todavía no tiene sesión (falta confirmar el correo), así
  // que no hay token que validar. En su lugar se comprueba que la cuenta
  // exista de verdad y se acabe de crear: eso deja fuera que alguien
  // fabrique constancias para cuentas ajenas o antiguas.
  const { data: usuario, error } = await db.auth.admin.getUserById(userId);
  if (error || !usuario.user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const creada = new Date(usuario.user.created_at).getTime();
  if (Number.isNaN(creada) || Date.now() - creada > 5 * 60 * 1000) {
    return NextResponse.json(
      { error: "La cuenta no se acaba de registrar." },
      { status: 409 }
    );
  }

  // El índice único (user_id, politica_version) evita duplicados si el
  // navegador reintenta; por eso se ignora el conflicto en silencio.
  const { error: errorInsert } = await db.from("consentimientos").insert({
    user_id: userId,
    correo: usuario.user.email,
    ip: ipDeLaPeticion(request),
    user_agent: request.headers.get("user-agent"),
    politica_version: politicaVersion,
    acepta_terminos: true,
    acepta_privacidad: true,
    acepta_datos_sensibles: true,
  });

  if (errorInsert && !errorInsert.message.includes("duplicate key")) {
    return NextResponse.json({ error: errorInsert.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
