import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolverContextoEmpresa } from "@/lib/empresaContext";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdministradorEmpresa(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  const db = adminClient();
  const contexto = await resolverContextoEmpresa(db, data.user.id);
  if (!contexto || !contexto.esAdministrador) return null;

  return { user: data.user, contexto };
}

const ROLES = ["administrador", "analista", "auxiliar"];

export async function GET(request: NextRequest) {
  const caller = await requireAdministradorEmpresa(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const db = adminClient();
  const { empresaId } = caller.contexto;

  const [{ data: dueño }, { data: miembros }, { data: authData }] = await Promise.all([
    db.from("profiles").select("id, razon_social").eq("id", empresaId).maybeSingle(),
    db
      .from("profiles")
      .select("id, primer_nombre, primer_apellido, rol_empresa")
      .eq("empresa_id_padre", empresaId),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const emailPorId = new Map((authData?.users ?? []).map((u) => [u.id, u.email]));
  const activoPorId = new Map(
    (authData?.users ?? []).map((u) => [u.id, !u.banned_until || new Date(u.banned_until) < new Date()])
  );

  const equipo = [
    {
      id: empresaId,
      nombre: dueño?.razon_social ?? "Cuenta principal",
      email: emailPorId.get(empresaId) ?? null,
      rol: "administrador" as const,
      esDueño: true,
      activo: true,
    },
    ...(miembros ?? []).map((m) => ({
      id: m.id,
      nombre: [m.primer_nombre, m.primer_apellido].filter(Boolean).join(" ") || null,
      email: emailPorId.get(m.id) ?? null,
      rol: (m.rol_empresa ?? "auxiliar") as "administrador" | "analista" | "auxiliar",
      esDueño: false,
      activo: activoPorId.get(m.id) ?? true,
    })),
  ];

  return NextResponse.json({ equipo });
}

export async function POST(request: NextRequest) {
  const caller = await requireAdministradorEmpresa(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { nombre, apellido, correo, password, rol } = await request.json();
  if (
    typeof nombre !== "string" ||
    !nombre.trim() ||
    typeof apellido !== "string" ||
    !apellido.trim() ||
    typeof correo !== "string" ||
    !correo.trim() ||
    typeof password !== "string" ||
    password.length < 6 ||
    !ROLES.includes(rol)
  ) {
    return NextResponse.json(
      { error: "Completa nombre, apellido, correo, una contraseña de al menos 6 caracteres y el rol." },
      { status: 400 }
    );
  }

  const db = adminClient();

  const { data: nuevoUsuario, error: createError } = await db.auth.admin.createUser({
    email: correo.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { account_type: "empresa_miembro" },
  });

  if (createError || !nuevoUsuario.user) {
    return NextResponse.json(
      { error: createError?.message ?? "No pudimos crear la cuenta del miembro." },
      { status: 400 }
    );
  }

  const { error: profileError } = await db.from("profiles").insert({
    id: nuevoUsuario.user.id,
    account_type: "empresa_miembro",
    primer_nombre: nombre.trim(),
    primer_apellido: apellido.trim(),
    empresa_id_padre: caller.contexto.empresaId,
    rol_empresa: rol,
  });

  if (profileError) {
    // Si falla guardar el perfil, no dejamos un usuario de Auth huérfano.
    await db.auth.admin.deleteUser(nuevoUsuario.user.id);
    return NextResponse.json(
      { error: "No pudimos guardar los datos del miembro." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const caller = await requireAdministradorEmpresa(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { userId, rol, activo } = await request.json();
  if (typeof userId !== "string") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  if (userId === caller.contexto.empresaId) {
    return NextResponse.json(
      { error: "No puedes editar la cuenta principal de la empresa." },
      { status: 400 }
    );
  }

  const db = adminClient();

  // Confirma que el miembro pertenece a la misma empresa de quien llama,
  // antes de dejarlo tocar nada.
  const { data: miembro } = await db
    .from("profiles")
    .select("id, empresa_id_padre")
    .eq("id", userId)
    .maybeSingle();

  if (!miembro || miembro.empresa_id_padre !== caller.contexto.empresaId) {
    return NextResponse.json({ error: "Miembro no encontrado." }, { status: 404 });
  }

  if (typeof rol === "string" && ROLES.includes(rol)) {
    const { error } = await db.from("profiles").update({ rol_empresa: rol }).eq("id", userId);
    if (error) {
      return NextResponse.json({ error: "No pudimos actualizar el rol." }, { status: 500 });
    }
  }

  if (typeof activo === "boolean") {
    const { error } = await db.auth.admin.updateUserById(userId, {
      ban_duration: activo ? "none" : "876000h",
    });
    if (error) {
      return NextResponse.json({ error: "No pudimos actualizar el acceso." }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
