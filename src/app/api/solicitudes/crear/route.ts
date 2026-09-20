import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { getWompiKeys, buildWompiCheckoutUrl, siteUrl } from "@/lib/wompi";
import { procesarPagoAprobadoSolicitud } from "@/lib/solicitudVerificacion";

// La verificación de fuentes del atajo de admin corre con after(), igual
// que en el webhook de Wompi: una consulta real puede tardar más de 60s.
export const maxDuration = 180;

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

// Equivalente para personas de esEmpresaAdmin() en creditos.ts: una
// cuenta con rol de administrador del sitio (app_metadata.role === "admin",
// el mismo que abre /admin) no pasa por la pasarela de pagos — su
// solicitud queda "pagada" con monto 0 y la verificación se dispara de
// una vez. Pensado para consultar y probar sin tener que pagar; igual
// gasta créditos reales de Vericol.
async function esUsuarioAdmin(
  db: ReturnType<typeof adminClient>,
  userId: string
): Promise<boolean> {
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error || !data.user) return false;
  return data.user.app_metadata?.role === "admin";
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
        .select("id, documento, clave_fuente")
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

  const esAdmin = await esUsuarioAdmin(db, user.id);

  if (!esAdmin && !config?.precio_desde) {
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

  const monto = esAdmin ? 0 : config!.precio_desde;
  const amountInCents = Math.round(monto * 100);
  const reference = `SOL-${crypto.randomUUID()}`;

  const { data: solicitudCreada, error: insertError } = await db
    .from("solicitudes")
    .insert({
      user_id: user.id,
      documentos,
      monto,
      wompi_referencia: reference,
      estado: esAdmin ? "pagado" : "pendiente",
    })
    .select("id, user_id, documentos")
    .maybeSingle();
  if (insertError) {
    return NextResponse.json(
      { error: "No pudimos crear la solicitud. Intenta de nuevo." },
      { status: 500 }
    );
  }

  // Atajo de administrador: sin pasarela de pagos. Se consulta igual que
  // cuando el webhook de Wompi confirma un pago real, para no duplicar la
  // lógica de verificación ni el correo de "documentos listos".
  if (esAdmin && solicitudCreada) {
    after(async () => {
      await procesarPagoAprobadoSolicitud(db, solicitudCreada);
    });
    return NextResponse.json({ reference, pagoDisponible: false, sinPago: true });
  }

  // La solicitud ya quedó registrada como "pendiente" aunque todavía no
  // haya llaves de Wompi configuradas — así no se pierde el pedido del
  // usuario. En cuanto el admin las guarde desde /admin → Pagos (Wompi),
  // este mismo endpoint empieza a devolver checkoutUrl sin más cambios de
  // código ni redeploy.
  const keys = await getWompiKeys(db);
  if (!keys) {
    return NextResponse.json({ reference, pagoDisponible: false });
  }

  const checkoutUrl = buildWompiCheckoutUrl({
    keys,
    reference,
    amountInCents,
    redirectUrl: `${siteUrl()}/solicitar/confirmacion?reference=${reference}`,
  });

  return NextResponse.json({
    reference,
    pagoDisponible: true,
    checkoutUrl,
  });
}
