import type { SupabaseClient, User } from "@supabase/supabase-js";
import { resolverContextoEmpresa } from "@/lib/empresaContext";

export type ConsultaConDocumentos = {
  id: string;
  empresa_id: string;
  candidato_id: string | null;
  candidato_email: string;
  resultado_pdfs: Record<string, string> | null;
};

const SELECT = "id, empresa_id, candidato_id, candidato_email, resultado_pdfs";

// Autoriza a dos tipos de usuario a ver los documentos de una consulta:
// la empresa dueña (o un miembro de su equipo, vía resolverContextoEmpresa)
// y el propio candidato consultado (por id ya vinculado, o por correo
// antes de que exista el vínculo) — el mismo criterio de propiedad que
// ya usan /api/consultas/autorizar y /api/consultas/pendientes.
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

  const esElCandidato =
    consulta.candidato_id === user.id ||
    (!consulta.candidato_id && consulta.candidato_email === user.email);
  if (esElCandidato) return consulta as ConsultaConDocumentos;

  const contexto = await resolverContextoEmpresa(db, user.id);
  if (contexto && contexto.empresaId === consulta.empresa_id) {
    return consulta as ConsultaConDocumentos;
  }

  return null;
}
