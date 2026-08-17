import type { SupabaseClient } from "@supabase/supabase-js";

// Los créditos de una empresa nunca se guardan como un saldo aparte: se
// calculan en el momento sumando los créditos de sus pagos_empresa
// vigentes (pagados y no vencidos) y restando las consultas que ya
// descontaron crédito. Así no hay que mantener un contador sincronizado
// en dos lugares.
export async function creditosDisponibles(
  db: SupabaseClient,
  empresaId: string
): Promise<number> {
  const ahora = new Date().toISOString();

  const [{ data: pagos }, { count: consumidos }] = await Promise.all([
    db
      .from("pagos_empresa")
      .select("creditos, fecha_vencimiento")
      .eq("empresa_id", empresaId)
      .eq("estado", "pagado"),
    db
      .from("consultas")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", empresaId)
      .eq("credito_descontado", true),
  ]);

  const comprados = (pagos ?? [])
    .filter((p) => !p.fecha_vencimiento || p.fecha_vencimiento > ahora)
    .reduce((sum, p) => sum + p.creditos, 0);

  return comprados - (consumidos ?? 0);
}

// Una cuenta de empresa que además tiene rol de administrador del sitio
// (app_metadata.role === "admin", el mismo que da acceso a /admin) puede
// autorizar consultas sin depender de tener créditos comprados — pensado
// para poder probar el flujo real de punta a punta (incluida la
// verificación con Solverio) sin tener que simular un pago primero. No
// descuenta crédito real: no tiene sentido restarle saldo a una cuenta
// que de todas formas no lo necesita para pasar el bloqueo.
export async function esEmpresaAdmin(db: SupabaseClient, empresaId: string): Promise<boolean> {
  const { data, error } = await db.auth.admin.getUserById(empresaId);
  if (error || !data.user) return false;
  return data.user.app_metadata?.role === "admin";
}
