import type { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

export type WompiKeys = {
  ambiente: "sandbox" | "produccion";
  publicKey: string;
  integritySecret: string;
};

// Wompi tiene dos ambientes independientes (sandbox/producción), cada uno
// con sus propias llaves; el admin elige cuál está activo desde
// /admin → Pagos (Wompi) sin perder la configuración del otro. Devuelve
// null si el ambiente activo todavía no tiene llave pública ni secreto de
// integridad configurados.
export async function getWompiKeys(db: SupabaseClient): Promise<WompiKeys | null> {
  const { data } = await db
    .from("configuracion_wompi")
    .select(
      "ambiente_activo, sandbox_public_key, sandbox_integrity_secret, produccion_public_key, produccion_integrity_secret"
    )
    .eq("id", 1)
    .maybeSingle();

  const ambiente = data?.ambiente_activo === "produccion" ? "produccion" : "sandbox";
  const publicKey = ambiente === "produccion" ? data?.produccion_public_key : data?.sandbox_public_key;
  const integritySecret =
    ambiente === "produccion" ? data?.produccion_integrity_secret : data?.sandbox_integrity_secret;

  if (!publicKey || !integritySecret) return null;
  return { ambiente, publicKey, integritySecret };
}

// Firma de integridad exigida por Wompi para el checkout: SHA-256 de
// referencia + monto en centavos + moneda + secreto de integridad. Sin
// probar todavía contra llaves reales — verificar contra docs.wompi.co
// en cuanto haya sandbox disponible.
export function buildWompiCheckoutUrl({
  keys,
  reference,
  amountInCents,
  redirectUrl,
}: {
  keys: WompiKeys;
  reference: string;
  amountInCents: number;
  redirectUrl: string;
}) {
  const signature = crypto
    .createHash("sha256")
    .update(`${reference}${amountInCents}COP${keys.integritySecret}`)
    .digest("hex");

  const checkoutUrl = new URL("https://checkout.wompi.co/p/");
  checkoutUrl.searchParams.set("public-key", keys.publicKey);
  checkoutUrl.searchParams.set("currency", "COP");
  checkoutUrl.searchParams.set("amount-in-cents", String(amountInCents));
  checkoutUrl.searchParams.set("reference", reference);
  checkoutUrl.searchParams.set("signature:integrity", signature);
  checkoutUrl.searchParams.set("redirect-url", redirectUrl);

  return checkoutUrl.toString();
}

export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://colombiacontrata.com";
}
