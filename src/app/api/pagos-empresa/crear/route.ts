import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { getWompiKeys, buildWompiCheckoutUrl, siteUrl } from "@/lib/wompi";
import { resolverContextoEmpresa } from "@/lib/empresaContext";

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

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const { planId, periodo } = await request.json();
  if (typeof planId !== "string" || (periodo !== "mensual" && periodo !== "anual")) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const db = adminClient();

  const [contexto, { data: plan }] = await Promise.all([
    resolverContextoEmpresa(db, user.id),
    db
      .from("planes_empresa")
      .select("id, nombre, creditos, precio_mensual, precio_anual, activo, empresa_id")
      .eq("id", planId)
      .maybeSingle(),
  ]);

  if (!contexto) {
    return NextResponse.json(
      { error: "Esta compra es solo para cuentas de empresa." },
      { status: 400 }
    );
  }

  if (!contexto.esAdministrador) {
    return NextResponse.json(
      { error: "Solo el administrador de la empresa puede comprar planes." },
      { status: 403 }
    );
  }

  if (!contexto.razonSocial) {
    return NextResponse.json(
      {
        error: "Completa los datos de la empresa en el perfil antes de continuar.",
        code: "PERFIL_INCOMPLETO",
      },
      { status: 400 }
    );
  }

  if (!plan || !plan.activo) {
    return NextResponse.json({ error: "Este plan ya no está disponible." }, { status: 400 });
  }

  // Un plan privado (empresa_id no nulo) solo lo puede comprar la empresa
  // a la que se le asignó.
  if (plan.empresa_id && plan.empresa_id !== contexto.empresaId) {
    return NextResponse.json({ error: "Este plan no está disponible para tu cuenta." }, { status: 403 });
  }

  const monto = periodo === "anual" ? plan.precio_anual : plan.precio_mensual;
  if (!monto) {
    return NextResponse.json(
      { error: `Este plan no tiene precio ${periodo} configurado.` },
      { status: 400 }
    );
  }

  const amountInCents = Math.round(monto * 100);
  const reference = `EMP-${crypto.randomUUID()}`;

  const { error: insertError } = await db.from("pagos_empresa").insert({
    empresa_id: contexto.empresaId,
    plan_id: plan.id,
    plan_nombre: plan.nombre,
    periodo,
    monto,
    creditos: plan.creditos,
    wompi_referencia: reference,
  });
  if (insertError) {
    return NextResponse.json(
      { error: "No pudimos crear el pago. Intenta de nuevo." },
      { status: 500 }
    );
  }

  // El pago ya quedó registrado como "pendiente" aunque todavía no haya
  // llaves de Wompi configuradas, para no perder el pedido.
  const keys = await getWompiKeys(db);
  if (!keys) {
    return NextResponse.json({ reference, pagoDisponible: false });
  }

  const checkoutUrl = buildWompiCheckoutUrl({
    keys,
    reference,
    amountInCents,
    redirectUrl: `${siteUrl()}/empresas/planes/confirmacion?reference=${reference}`,
  });

  return NextResponse.json({
    reference,
    pagoDisponible: true,
    checkoutUrl,
  });
}
