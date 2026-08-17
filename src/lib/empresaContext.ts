import type { SupabaseClient } from "@supabase/supabase-js";

export type RolEmpresa = "administrador" | "analista" | "auxiliar";

export type EmpresaContext = {
  empresaId: string;
  rol: RolEmpresa;
  esAdministrador: boolean;
  razonSocial: string | null;
};

// Resuelve la "empresa efectiva" del usuario que llama: si es la cuenta
// dueña (account_type = "empresa"), la empresa es ella misma y su rol es
// siempre administrador. Si es un miembro de equipo (account_type =
// "empresa_miembro"), la empresa es empresa_id_padre y el rol es el que
// tenga asignado.
export async function resolverContextoEmpresa(
  db: SupabaseClient,
  userId: string
): Promise<EmpresaContext | null> {
  const { data: profile } = await db
    .from("profiles")
    .select("account_type, razon_social, empresa_id_padre, rol_empresa")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return null;

  if (profile.account_type === "empresa") {
    return {
      empresaId: userId,
      rol: "administrador",
      esAdministrador: true,
      razonSocial: profile.razon_social,
    };
  }

  if (profile.account_type === "empresa_miembro" && profile.empresa_id_padre) {
    const { data: empresa } = await db
      .from("profiles")
      .select("razon_social")
      .eq("id", profile.empresa_id_padre)
      .maybeSingle();

    const rol = (profile.rol_empresa ?? "auxiliar") as RolEmpresa;
    return {
      empresaId: profile.empresa_id_padre,
      rol,
      esAdministrador: rol === "administrador",
      razonSocial: empresa?.razon_social ?? null,
    };
  }

  return null;
}
