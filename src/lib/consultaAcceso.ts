import type { SupabaseClient, User } from "@supabase/supabase-js";
import { resolverContextoEmpresa } from "@/lib/empresaContext";

export type ConsultaConDocumentos = {
  id: string;
  empresa_id: string;
  resultado_pdfs: Record<string, string> | null;
};

const SELECT = "id, empresa_id, resultado_pdfs";

// Los documentos resultantes de una verificación son solo para la
// empresa que la solicitó — el candidato nunca los ve (ni sabe qué
// fuentes se consultaron), solo decide si autoriza o rechaza. Por eso
// esto solo autoriza a la empresa dueña de la consulta (o un miembro de
// su equipo, vía resolverContextoEmpresa), a diferencia de
// /api/consultas/autorizar y /api/consultas/pendientes que sí atienden
// también al candidato.
//
// La única excepción es un administrador del portal, habilitada a pedido
// explícito del usuario (2026-09-06) para poder dar soporte: sin esto no
// hay forma de responder un "pagué y el PDF no abre" sin pedirle a la
// empresa que reenvíe el archivo. Sigue sin alcanzar al candidato.
export async function resolverAccesoDocumentos(
  db: SupabaseClient,
  consultaId: string,
  user: User
): Promise<ConsultaConDocumentos | null> {
  const { data: consulta } = await db
    .from("consultas")
    .select(SELECT)
    .eq("id", consultaId)
    .maybeSingle();

  if (!consulta) return null;

  if (user.app_metadata?.role === "admin") {
    return consulta as ConsultaConDocumentos;
  }

  const contexto = await resolverContextoEmpresa(db, user.id);
  if (contexto && contexto.empresaId === consulta.empresa_id) {
    return consulta as ConsultaConDocumentos;
  }

  return null;
}
