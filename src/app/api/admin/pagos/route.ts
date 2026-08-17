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

  const [
    { data: solicitudes },
    { data: pagosEmpresa },
    { data: perfiles },
    { data: authData },
  ] = await Promise.all([
    db
      .from("solicitudes")
      .select("id, user_id, documentos, monto, estado, wompi_referencia, created_at")
      .order("created_at", { ascending: false }),
    db
      .from("pagos_empresa")
      .select(
        "id, empresa_id, plan_nombre, periodo, monto, estado, wompi_referencia, fecha_vencimiento, created_at"
      )
      .order("created_at", { ascending: false }),
    db
      .from("profiles")
      .select("id, account_type, primer_nombre, primer_apellido, razon_social"),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const perfilPorId = new Map((perfiles ?? []).map((p) => [p.id, p]));
  const emailPorId = new Map((authData?.users ?? []).map((u) => [u.id, u.email]));

  const nombreDe = (userId: string) => {
    const perfil = perfilPorId.get(userId);
    if (perfil?.account_type === "empresa") return perfil.razon_social;
    return [perfil?.primer_nombre, perfil?.primer_apellido].filter(Boolean).join(" ") || null;
  };

  const pagos = [
    ...(solicitudes ?? []).map((s) => ({
      tabla: "solicitudes" as const,
      id: s.id,
      tipo: "persona" as const,
      nombre: nombreDe(s.user_id),
      email: emailPorId.get(s.user_id) ?? null,
      detalle: `${(s.documentos as unknown[])?.length ?? 0} documento(s)`,
      monto: s.monto,
      estado: s.estado,
      referencia: s.wompi_referencia,
      fecha: s.created_at,
    })),
    ...(pagosEmpresa ?? []).map((p) => ({
      tabla: "pagos_empresa" as const,
      id: p.id,
      tipo: "empresa" as const,
      nombre: nombreDe(p.empresa_id),
      email: emailPorId.get(p.empresa_id) ?? null,
      detalle: `${p.plan_nombre} (${p.periodo})`,
      monto: p.monto,
      estado: p.estado,
      referencia: p.wompi_referencia,
      fecha: p.created_at,
      vigenteHasta: p.fecha_vencimiento,
    })),
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  return NextResponse.json({ pagos });
}

export async function POST(request: NextRequest) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { tabla, id, estado } = await request.json();
  if (
    (tabla !== "solicitudes" && tabla !== "pagos_empresa") ||
    typeof id !== "string" ||
    (estado !== "pendiente" && estado !== "pagado" && estado !== "fallido")
  ) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const db = adminClient();
  const payload: Record<string, unknown> = { estado, updated_at: new Date().toISOString() };

  // Al marcar manualmente un plan de empresa como pagado (ej. pago por
  // transferencia que no pasó por Wompi), se calcula la vigencia igual
  // que lo haría el webhook, para que quede consistente.
  if (tabla === "pagos_empresa" && estado === "pagado") {
    const { data: pago } = await db
      .from("pagos_empresa")
      .select("periodo")
      .eq("id", id)
      .maybeSingle();

    const inicio = new Date();
    const vencimiento = new Date(inicio);
    if (pago?.periodo === "anual") {
      vencimiento.setFullYear(vencimiento.getFullYear() + 1);
    } else {
      vencimiento.setMonth(vencimiento.getMonth() + 1);
    }
    payload.fecha_inicio = inicio.toISOString();
    payload.fecha_vencimiento = vencimiento.toISOString();
  }

  const { error } = await db.from(tabla).update(payload).eq("id", id);
  if (error) {
    return NextResponse.json({ error: "No pudimos actualizar el pago." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
