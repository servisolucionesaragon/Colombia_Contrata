import { siteUrl } from "@/lib/wompi";

const LOGO_URL =
  "https://zjbijmieiyumpqwyqhfm.supabase.co/storage/v1/object/public/Recursos/logo.png";

// Mismo lenguaje visual que las plantillas de Supabase Auth ya
// traducidas (Confirma tu cuenta, Contraseña modificada, etc.): tarjeta
// blanca con barra superior azul, franja tricolor, logo, y footer navy —
// para que este correo (enviado vía Resend, no por Supabase Auth) se
// sienta parte del mismo sistema.
//
// Los botones llevan a una página de confirmación intermedia
// (/consultas/responder) en vez de ejecutar la acción directamente
// desde el enlace — así un rastreador de correo (Outlook, Gmail,
// filtros de seguridad corporativos) que precarga los enlaces no
// dispara por accidente una autorización o un rechazo real.
export function plantillaInvitacionConsulta({
  candidatoNombre,
  empresaNombre,
  token,
  documentos,
}: {
  candidatoNombre: string;
  empresaNombre: string;
  token: string;
  documentos: string[];
}) {
  const base = siteUrl();
  const urlAutorizar = `${base}/consultas/responder?token=${encodeURIComponent(token)}&decision=autorizar`;
  const urlRechazar = `${base}/consultas/responder?token=${encodeURIComponent(token)}&decision=rechazar`;
  const listaDocumentos = documentos
    .map((d) => `<li style="margin:0 0 4px 0;">${d}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Autorización de antecedentes | Colombia Contrata</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .content { padding: 30px 22px !important; }
      .logo { width: 230px !important; }
      .title { font-size: 25px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#F5F7FA; font-family:Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F7FA; padding:40px 15px;">
    <tr>
      <td align="center">

        <table class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#FFFFFF; border-radius:16px; overflow:hidden; border:1px solid #E5E7EB;">

          <tr>
            <td style="height:7px; background-color:#0033A0; font-size:0; line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td align="center" style="padding:35px 25px 25px 25px; background-color:#FFFFFF;">
              <img class="logo" src="${LOGO_URL}" width="260" alt="Colombia Contrata" style="display:block; width:260px; max-width:100%; height:auto; border:0;">
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:0 35px 25px 35px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="33%" style="height:4px; background-color:#FCD116; font-size:0; line-height:0;">&nbsp;</td>
                  <td width="34%" style="height:4px; background-color:#0033A0; font-size:0; line-height:0;">&nbsp;</td>
                  <td width="33%" style="height:4px; background-color:#CE1126; font-size:0; line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="content" style="padding:10px 50px 40px 50px;">

              <h1 class="title" style="margin:0 0 20px 0; color:#0D1B3D; font-size:28px; line-height:1.3; font-weight:700; text-align:center;">
                Solicitud de autorización
              </h1>

              <p style="margin:0 0 18px 0; color:#374151; font-size:16px; line-height:1.7;">
                Hola <strong style="color:#0D1B3D;">${candidatoNombre}</strong>,
              </p>

              <p style="margin:0 0 18px 0; color:#6B7280; font-size:15px; line-height:1.7;">
                <strong style="color:#0D1B3D;">${empresaNombre}</strong> te invitó a verificar tus antecedentes a través de <strong style="color:#0D1B3D;">Colombia Contrata</strong>, como parte de un proceso de contratación o vinculación laboral. Según la Ley 1581 de 2012 (Habeas Data), esta verificación solo se puede hacer con tu autorización expresa.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8FAFC; border-radius:6px; margin:0 0 28px 0;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0 0 8px 0; color:#0D1B3D; font-size:13px; font-weight:bold;">
                      Documentos solicitados:
                    </p>
                    <ul style="margin:0; padding-left:18px; color:#6B7280; font-size:13px; line-height:1.6;">
                      ${listaDocumentos}
                    </ul>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:0 8px 12px 0;">
                    <a href="${urlAutorizar}" style="display:inline-block; background-color:#0033A0; color:#FFFFFF; text-decoration:none; font-size:16px; font-weight:bold; padding:15px 30px; border-radius:8px;">
                      Autorizar
                    </a>
                  </td>
                  <td align="center" style="padding:0 0 12px 8px;">
                    <a href="${urlRechazar}" style="display:inline-block; background-color:#CE1126; color:#FFFFFF; text-decoration:none; font-size:16px; font-weight:bold; padding:15px 30px; border-radius:8px;">
                      Rechazar
                    </a>
                  </td>
                </tr>
              </table>

              <div style="height:16px;"></div>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8FAFC; border-left:4px solid #FCD116; border-radius:6px;">
                <tr>
                  <td style="padding:16px 18px; color:#6B7280; font-size:13px; line-height:1.6; text-align:center;">
                    Cualquiera de los dos botones te lleva a una página donde debes confirmar tu decisión — no se realiza ninguna acción solo por abrir este correo.
                  </td>
                </tr>
              </table>

              <p style="margin:25px 0 0 0; color:#9CA3AF; font-size:13px; line-height:1.6; text-align:center;">
                Si no reconoces esta invitación, puedes ignorarla o rechazarla desde el botón de arriba.
              </p>

            </td>
          </tr>

          <tr>
            <td align="center" style="padding:25px 30px; background-color:#0D1B3D;">
              <p style="margin:0 0 8px 0; color:#FFFFFF; font-size:14px; font-weight:bold;">
                Colombia Contrata
              </p>
              <p style="margin:0; color:#CBD5E1; font-size:12px; line-height:1.5;">
                Gestión documental para la contratación
              </p>
              <p style="margin:15px 0 0 0; color:#94A3B8; font-size:11px; line-height:1.5;">
                Este es un mensaje automático. Por favor, no respondas directamente a este correo.
              </p>
              <p style="margin:12px 0 0 0; color:#64748B; font-size:11px;">
                © 2026 Colombia Contrata
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
