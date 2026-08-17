import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

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

  const { documentoIds } = await request.json();
  if (!Array.isArray(documentoIds) || documentoIds.length === 0) {
    return NextResponse.json(
      { error: "Selecciona al menos un documento." },
      { status: 400 }
    );
  }

  const db = adminClient();

  const [{ data: profile }, { data: config }, { data: documentos }] =
    await Promise.all([
      db
        .from("profiles")
        .select("primer_nombre, primer_apellido, tipo_documento, documento, account_type")
        .eq("id", user.id)
        .maybeSingle(),
      db.from("configuracion_persona").select("precio_desde").eq("id", 1).single(),
      db
        .from("precios_documentos")
        .select("id, documento")
        .in("id", documentoIds)
        .eq("activo", true),
    ]);

  if (!profile || profile.account_type !== "persona") {
    return NextResponse.json(
      { error: "Esta solicitud es solo para cuentas de persona natural." },
      { status: 400 }
    );
  }

  if (
    !profile.primer_nombre ||
    !profile.primer_apellido ||
    !profile.tipo_documento ||
    !profile.documento
  ) {
    return NextResponse.json(
      {
        error: "Completa tus datos personales en tu perfil antes de continuar.",
        code: "PERFIL_INCOMPLETO",
      },
      { status: 400 }
    );
  }

  if (!config?.precio_desde) {
    return NextResponse.json(
      { error: "El precio de la solicitud aún no está configurado. Contacta al administrador." },
      { status: 400 }
    );
  }

  if (!documentos || documentos.length !== documentoIds.length) {
    return NextResponse.json(
      { error: "Alguno de los documentos seleccionados ya no está disponible." },
      { status: 400 }
    );
  }

  const monto = config.precio_desde;
  const amountInCents = Math.round(monto * 100);
  const reference = `SOL-${crypto.randomUUID()}`;

  const { error: insertError } = await db.from("solicitudes").insert({
    user_id: user.id,
    documentos,
    monto,
    wompi_referencia: reference,
  });
  if (insertError) {
    return NextResponse.json(
      { error: "No pudimos crear la solicitud. Intenta de nuevo." },
      { status: 500 }
    );
  }

  const { data: wompiConfig } = await db
    .from("configuracion_wompi")
    .select(
      "ambiente_activo, sandbox_public_key, sandbox_integrity_secret, produccion_public_key, produccion_integrity_secret"
    )
    .eq("id", 1)
    .maybeSingle();

  // Wompi tiene dos ambientes independientes (sandbox/producción), cada
  // uno con sus propias llaves; el admin elige cuál está activo desde
  // /admin → Pagos (Wompi) sin perder la configuración del otro.
  const ambiente = wompiConfig?.ambiente_activo === "produccion" ? "produccion" : "sandbox";
  const publicKey =
    ambiente === "produccion" ? wompiConfig?.produccion_public_key : wompiConfig?.sandbox_public_key;
  const integritySecret =
    ambiente === "produccion"
      ? wompiConfig?.produccion_integrity_secret
      : wompiConfig?.sandbox_integrity_secret;

  // La solicitud ya quedó registrada como "pendiente" aunque todavía no
  // haya llaves de Wompi configuradas — así no se pierde el pedido del
  // usuario. En cuanto el admin las guarde desde /admin → Pagos (Wompi),
  // este mismo endpoint empieza a devolver checkoutUrl sin más cambios de
  // código ni redeploy.
  if (!publicKey || !integritySecret) {
    return NextResponse.json({ reference, pagoDisponible: false });
  }

  // Firma de integridad exigida por Wompi para el checkout: SHA-256 de
  // referencia + monto en centavos + moneda + secreto de integridad.
  // Sin probar todavía contra llaves reales — verificar contra
  // docs.wompi.co en cuanto haya sandbox disponible.
  const signature = crypto
    .createHash("sha256")
    .update(`${reference}${amountInCents}COP${integritySecret}`)
    .digest("hex");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://colombiacontrata.com";
  const checkoutUrl = new URL("https://checkout.wompi.co/p/");
  checkoutUrl.searchParams.set("public-key", publicKey);
  checkoutUrl.searchParams.set("currency", "COP");
  checkoutUrl.searchParams.set("amount-in-cents", String(amountInCents));
  checkoutUrl.searchParams.set("reference", reference);
  checkoutUrl.searchParams.set("signature:integrity", signature);
  checkoutUrl.searchParams.set(
    "redirect-url",
    `${siteUrl}/solicitar/confirmacion?reference=${reference}`
  );

  return NextResponse.json({
    reference,
    pagoDisponible: true,
    checkoutUrl: checkoutUrl.toString(),
  });
}
