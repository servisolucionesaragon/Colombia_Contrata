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

export async function GET(request: NextRequest) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const db = adminClient();

  const [{ data: authData, error: authError }, { data: perfiles }] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    db
      .from("profiles")
      .select(
        "id, account_type, primer_nombre, primer_apellido, razon_social, created_at"
      ),
  ]);

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const perfilPorId = new Map((perfiles ?? []).map((p) => [p.id, p]));

  const usuarios = authData.users.map((user) => {
    const perfil = perfilPorId.get(user.id);
    const nombre =
      perfil?.account_type === "empresa"
        ? perfil.razon_social
        : [perfil?.primer_nombre, perfil?.primer_apellido].filter(Boolean).join(" ");

    return {
      id: user.id,
      email: user.email,
      nombre: nombre || null,
      tipoCuenta: perfil?.account_type ?? null,
      esAdmin: user.app_metadata?.role === "admin",
      activo: !user.banned_until || new Date(user.banned_until) < new Date(),
      creadoEn: user.created_at,
    };
  });

  usuarios.sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1));

  return NextResponse.json({ usuarios });
}

export async function POST(request: NextRequest) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { userId, activo } = await request.json();
  if (typeof userId !== "string" || typeof activo !== "boolean") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  if (!activo && userId === caller.id) {
    return NextResponse.json(
      { error: "No puedes desactivar tu propia cuenta." },
      { status: 400 }
    );
  }

  const { error } = await adminClient().auth.admin.updateUserById(userId, {
    // "876000h" (100 años) equivale en la práctica a un baneo permanente;
    // "none" lo levanta. Supabase no tiene un flag "activo" directo, este
    // es el mecanismo real que bloquea el login.
    ban_duration: activo ? "none" : "876000h",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
