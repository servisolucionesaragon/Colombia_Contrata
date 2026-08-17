import { siteUrl } from "@/lib/wompi";

// Plantilla HTML del correo de invitación a autorizar una consulta de
// antecedentes. Los botones llevan a una página de confirmación
// intermedia (/consultas/responder) en vez de ejecutar la acción
// directamente desde el enlace — así un rastreador de correo (Outlook,
// Gmail, filtros de seguridad corporativos) que precarga los enlaces no
// dispara por accidente una autorización o un rechazo real.
export function plantillaInvitacionConsulta({
  candidatoNombre,
  empresaNombre,
  token,
}: {
  candidatoNombre: string;
  empresaNombre: string;
  token: string;
}) {
  const base = siteUrl();
  const urlAutorizar = `${base}/consultas/responder?token=${encodeURIComponent(token)}&decision=autorizar`;
  const urlRechazar = `${base}/consultas/responder?token=${encodeURIComponent(token)}&decision=rechazar`;

  return `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
    <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">Colombia Contrata</p>
    <h1 style="font-size: 20px; margin: 0 0 16px;">Hola ${candidatoNombre},</h1>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
      <strong>${empresaNombre}</strong> te invitó a verificar tus antecedentes a
      través de Colombia Contrata, como parte de un proceso de contratación o
      vinculación laboral.
    </p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      Según la Ley 1581 de 2012 (Habeas Data), esta verificación solo se puede
      hacer con tu autorización expresa. Puedes autorizarla o rechazarla desde
      aquí:
    </p>
    <div style="text-align: center; margin: 0 0 24px;">
      <a href="${urlAutorizar}"
        style="display: inline-block; background-color: #1d4ed8; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 28px; border-radius: 10px; margin: 0 8px 8px;">
        Autorizar
      </a>
      <a href="${urlRechazar}"
        style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 28px; border-radius: 10px; margin: 0 8px 8px;">
        Rechazar
      </a>
    </div>
    <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0 0 8px;">
      Cualquiera de los dos botones te lleva a una página donde debes
      confirmar tu decisión — no se realiza ninguna acción solo por abrir este
      correo.
    </p>
    <p style="font-size: 13px; line-height: 1.6; color: #9ca3af; margin: 24px 0 0;">
      Si no reconoces esta invitación, puedes ignorar este correo o rechazarla
      desde el botón de arriba.
    </p>
  </div>`;
}
