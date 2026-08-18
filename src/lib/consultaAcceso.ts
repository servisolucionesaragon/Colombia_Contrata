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

  const contexto = await resolverContextoEmpresa(db, user.id);
  if (contexto && contexto.empresaId === consulta.empresa_id) {
    return consulta as ConsultaConDocumentos;
  }

  return null;
}
