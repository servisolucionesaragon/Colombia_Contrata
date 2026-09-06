import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

const contar = async (db: SupabaseClient, tabla: string, columna: string, id: string) => {
  const { count } = await db
    .from(tabla)
    .select("id", { count: "exact", head: true })
    .eq(columna, id);
  return count ?? 0;
};

// Qué arrastra el borrado de esta cuenta. Las llaves foráneas contra
// auth.users son CASCADE (perfil, solicitudes, pagos, consultas enviadas,
// notificaciones y las cuentas de los miembros del equipo), salvo
// consultas.candidato_id, que es NO ACTION y bloquea el borrado — por eso
// se revisa antes en vez de dejar salir un error crudo de Postgres.
async function resumirCuenta(db: SupabaseClient, userId: string) {
  const [perfilRes, solicitudes, consultas, pagos, miembros, respondidas] = await Promise.all([
    db.from("profiles").select("account_type").eq("id", userId).maybeSingle(),
    contar(db, "solicitudes", "user_id", userId),
    contar(db, "consultas", "empresa_id", userId),
    contar(db, "pagos_empresa", "empresa_id", userId),
    contar(db, "profiles", "empresa_id_padre", userId),
    contar(db, "consultas", "candidato_id", userId),
  ]);

  return {
    tipoCuenta: (perfilRes.data?.account_type as string | null) ?? null,
    solicitudes,
    consultas,
    pagos,
    miembrosEquipo: miembros,
    respondidas,
    bloqueada: respondidas > 0,
  };
}

const MENSAJE_BLOQUEADA =
  "No podemos eliminar tu cuenta porque ya respondiste solicitudes de verificación de antecedentes. Ese registro es la constancia de que diste tu autorización y debemos conservarlo. Escríbenos a contacto@colombiacontrata.com y te ayudamos.";

const MENSAJE_ADMIN =
  "Tu cuenta tiene acceso de administrador del portal. Para eliminarla, primero quítale ese acceso desde /admin → Administradores.";

// Devuelve el resumen de lo que se borraría, para poder mostrárselo a la
// persona ANTES de que confirme.
export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const db = adminClient();
  const resumen = await resumirCuenta(db, user.id);

  return NextResponse.json({
    ...resumen,
    esAdmin: user.app_metadata?.role === "admin",
    motivoBloqueo: resumen.bloqueada
      ? MENSAJE_BLOQUEADA
      : user.app_metadata?.role === "admin"
        ? MENSAJE_ADMIN
        : null,
  });
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  // Un admin que se borre a sí mismo desde aquí podría dejar el portal sin
  // ningún administrador, sin forma de recuperarlo desde la interfaz.
  if (user.app_metadata?.role === "admin") {
    return NextResponse.json({ error: MENSAJE_ADMIN }, { status: 409 });
  }

  const db = adminClient();
  const resumen = await resumirCuenta(db, user.id);
  if (resumen.bloqueada) {
    return NextResponse.json({ error: MENSAJE_BLOQUEADA }, { status: 409 });
  }

  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json(
      { error: "No pudimos eliminar la cuenta. Intenta de nuevo o escríbenos." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
