import type { SupabaseClient } from "@supabase/supabase-js";

export async function getResendConfig(
  db: SupabaseClient
): Promise<{ apiKey: string; remitente: string } | null> {
  const { data } = await db
    .from("configuracion_resend")
    .select("api_key, remitente")
    .eq("id", 1)
    .maybeSingle();

  if (!data?.api_key) return null;
  return { apiKey: data.api_key, remitente: data.remitente };
}

// Envío directo vía la API HTTP de Resend — distinto del SMTP que ya usa
// Supabase Auth para sus propios correos (confirmación, cambio de
// contraseña, etc.), que no sirve para mandar correos con contenido
// propio como este.
export async function enviarCorreo(
  db: SupabaseClient,
  opciones: { to: string; subject: string; html: string }
): Promise<{ ok: boolean; error?: string }> {
  const config = await getResendConfig(db);
  if (!config) return { ok: false, error: "Resend no está configurado." };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Colombia Contrata <${config.remitente}>`,
        to: opciones.to,
        subject: opciones.subject,
        html: opciones.html,
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `Resend respondió con un error (${res.status}).` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "No pudimos conectar con Resend." };
  }
}
