import type { SupabaseClient, User } from "@supabase/supabase-js";

export type SolicitudConDocumentos = {
  id: string;
  user_id: string;
  resultado_pdfs: Record<string, string> | null;
};

const SELECT = "id, user_id, resultado_pdfs";

// A diferencia de una consulta de empresa (donde el candidato nunca ve
// los documentos), una solicitud de persona es la propia persona
// comprando sus propios documentos — el único dueño legítimo es quien
// pagó, verificado por user_id.
//
// La única excepción es un administrador del portal, habilitada a pedido
// explícito del usuario (2026-09-06) para poder dar soporte desde
// /admin → Actividad por usuario.
export async function resolverAccesoDocumentosSolicitud(
  db: SupabaseClient,
  solicitudId: string,
  user: User
): Promise<SolicitudConDocumentos | null> {
  const { data: solicitud } = await db
    .from("solicitudes")
    .select(SELECT)
    .eq("id", solicitudId)
    .maybeSingle();

  if (!solicitud) return null;
  if (solicitud.user_id !== user.id && user.app_metadata?.role !== "admin") return null;

  return solicitud as SolicitudConDocumentos;
}
