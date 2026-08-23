import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolverContextoEmpresa } from "@/lib/empresaContext";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

// Elimina una invitación que todavía está pendiente — pensado para
// corregir un error al invitar (dato mal escrito, candidato
// equivocado) sin dejar la fila dando vueltas. Deliberadamente
// restringido a "pendiente": una consulta ya autorizada o rechazada es
// el registro real de lo que pasó (incluye si se descontó un crédito),
// borrarla perdería esa trazabilidad.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const { id: consultaId } = await params;
  const db = adminClient();

  const contexto = await resolverContextoEmpresa(db, user.id);
  if (!contexto) {
    return NextResponse.json({ error: "Esta acción es solo para cuentas de empresa." }, { status: 400 });
  }

  const { data: consulta } = await db
    .from("consultas")
    .select("id, empresa_id, estado")
    .eq("id", consultaId)
    .maybeSingle();

  if (!consulta || consulta.empresa_id !== contexto.empresaId) {
    return NextResponse.json({ error: "No encontramos esta consulta." }, { status: 404 });
  }

  if (consulta.estado !== "pendiente") {
    return NextResponse.json(
      { error: "Solo se puede eliminar una invitación que todavía está pendiente." },
      { status: 400 }
    );
  }

  const { error } = await db.from("consultas").delete().eq("id", consultaId);
  if (error) {
    return NextResponse.json({ error: "No pudimos eliminar la invitación." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
