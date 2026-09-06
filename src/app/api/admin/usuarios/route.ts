import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { siteUrl } from "@/lib/wompi";

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

  const [
    { data: authData, error: authError },
    { data: perfiles },
    { data: consultas },
    { data: solicitudes },
    { data: pagosEmpresa },
  ] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    db
      .from("profiles")
      .select(
        "id, account_type, primer_nombre, primer_apellido, razon_social, created_at, empresa_id_padre"
      ),
    db.from("consultas").select("empresa_id, candidato_id"),
    db.from("solicitudes").select("user_id"),
    db.from("pagos_empresa").select("empresa_id"),
  ]);

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const perfilPorId = new Map((perfiles ?? []).map((p) => [p.id, p]));

  // Conteos de lo que arrastraría un borrado, para poder advertirlo en la UI
  // antes de que el admin confirme (ver las reglas de cascada en el README).
  const contar = <T,>(filas: T[] | null, obtenerId: (fila: T) => string | null | undefined) => {
    const mapa = new Map<string, number>();
    for (const fila of filas ?? []) {
      const id = obtenerId(fila);
      if (id) mapa.set(id, (mapa.get(id) ?? 0) + 1);
    }
    return mapa;
  };

  const consultasPorEmpresa = contar(consultas, (c) => c.empresa_id);
  const consultasComoCandidato = contar(consultas, (c) => c.candidato_id);
  const solicitudesPorUsuario = contar(solicitudes, (s) => s.user_id);
  const pagosPorEmpresa = contar(pagosEmpresa, (p) => p.empresa_id);
  const miembrosPorEmpresa = contar(perfiles, (p) => p.empresa_id_padre);

  const usuarios = authData.users.map((user) => {
    const perfil = perfilPorId.get(user.id);
    const tipoCuenta =
      (perfil?.account_type as string | null) ??
      (user.user_metadata?.account_type as string | undefined) ??
      null;

    const nombre =
      tipoCuenta === "empresa"
        ? perfil?.razon_social
        : [perfil?.primer_nombre, perfil?.primer_apellido].filter(Boolean).join(" ");

    return {
      id: user.id,
      email: user.email,
      nombre: nombre || null,
      tipoCuenta,
      esAdmin: user.app_metadata?.role === "admin",
      activo: !user.banned_until || new Date(user.banned_until) < new Date(),
      verificado: Boolean(user.email_confirmed_at),
      perfilCompleto: Boolean(perfil),
      creadoEn: user.created_at,
      relacionados: {
        consultas: consultasPorEmpresa.get(user.id) ?? 0,
        solicitudes: solicitudesPorUsuario.get(user.id) ?? 0,
        pagosEmpresa: pagosPorEmpresa.get(user.id) ?? 0,
        miembrosEquipo: miembrosPorEmpresa.get(user.id) ?? 0,
        // Si respondió consultas como candidato, la llave foránea es
        // NO ACTION y Postgres bloquea el borrado — se avisa antes de
        // intentarlo en vez de dejar que falle con un error crudo.
        respondioConsultas: consultasComoCandidato.get(user.id) ?? 0,
      },
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

  const { userId, activo, accion } = await request.json();
  if (typeof userId !== "string") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const db = adminClient();

  if (accion === "reenviar-verificacion") {
    const { data: usuario, error: errorUsuario } = await db.auth.admin.getUserById(userId);
    if (errorUsuario || !usuario.user?.email) {
      return NextResponse.json({ error: "No encontramos ese usuario." }, { status: 404 });
    }
    if (usuario.user.email_confirmed_at) {
      return NextResponse.json(
        { error: "Esa cuenta ya tiene el correo verificado." },
        { status: 400 }
      );
    }

    // Se usa el cliente anónimo a propósito: resend dispara la plantilla
    // "Confirm signup" de Supabase Auth (ya traducida al español), la misma
    // que recibió al registrarse. Supabase limita la frecuencia de reenvío,
    // así que un segundo intento seguido devuelve error.
    const publico = createClient(supabaseUrl, anonKey);
    const { error } = await publico.auth.resend({
      type: "signup",
      email: usuario.user.email,
      options: { emailRedirectTo: `${siteUrl()}/perfil` },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "No pudimos reenviar el correo." },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true });
  }

  if (accion === "eliminar") {
    if (userId === caller.id) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propia cuenta." },
        { status: 400 }
      );
    }

    const { count } = await db
      .from("consultas")
      .select("id", { count: "exact", head: true })
      .eq("candidato_id", userId);

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar: esta persona ya respondió consultas de antecedentes, y ese registro debe conservarse. Puedes desactivar la cuenta.",
        },
        { status: 409 }
      );
    }

    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (typeof activo !== "boolean") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  if (!activo && userId === caller.id) {
    return NextResponse.json(
      { error: "No puedes desactivar tu propia cuenta." },
      { status: 400 }
    );
  }

  const { error } = await db.auth.admin.updateUserById(userId, {
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
