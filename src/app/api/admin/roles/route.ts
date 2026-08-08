import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminClient() {
  console.log(
    "[admin/roles] env check",
    JSON.stringify({
      hasUrl: !!supabaseUrl,
      hasAnon: !!anonKey,
      hasServiceRole: !!serviceRoleKey,
      serviceRoleLength: serviceRoleKey ? serviceRoleKey.length : 0,
    })
  );
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Solo confía en el token del propio cliente Supabase (verificado contra
// Supabase, no decodificado a mano) para saber quién está llamando y si
// tiene app_metadata.role === "admin". app_metadata nunca lo puede editar
// el propio usuario, así que es seguro usarlo aquí como fuente de verdad.
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

  const { data, error } = await adminClient().auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const admins = data.users
    .filter((user) => user.app_metadata?.role === "admin")
    .map((user) => ({ id: user.id, email: user.email }));

  return NextResponse.json({ admins });
}

export async function POST(request: NextRequest) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { email, action } = await request.json();
  if (
    typeof email !== "string" ||
    !email ||
    (action !== "grant" && action !== "revoke")
  ) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const supabaseAdmin = adminClient();
  const { data: usersData, error: listError } =
    await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const targetUser = usersData.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  );
  if (!targetUser) {
    return NextResponse.json(
      { error: "No existe una cuenta registrada con ese correo." },
      { status: 404 }
    );
  }

  if (action === "revoke" && targetUser.id === caller.id) {
    return NextResponse.json(
      { error: "No puedes quitarte tu propio acceso de administrador." },
      { status: 400 }
    );
  }

  const newAppMetadata = { ...targetUser.app_metadata };
  if (action === "grant") {
    newAppMetadata.role = "admin";
  } else {
    delete newAppMetadata.role;
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    targetUser.id,
    { app_metadata: newAppMetadata }
  );
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
