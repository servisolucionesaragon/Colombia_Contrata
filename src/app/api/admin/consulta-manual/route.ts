import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSolverioConfig, consultarVerificacionCompleta } from "@/lib/solverio";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  if (data.user.app_metadata?.role !== "admin") return null;
  return data.user;
}

// Consulta manual de administrador: llama a Solverio directamente, sin
// pasar por la tabla "consultas" ni descontar créditos de ninguna
// empresa — pensada para probar la integración o resolver un caso
// puntual sin depender del saldo de un cliente. Los PDF se devuelven en
// base64 directo en la respuesta (no se suben a Storage) porque esta
// consulta no queda asociada a ningún registro permanente. Con Fluid
// Compute activado en el proyecto de Vercel, el máximo real del plan
// Hobby es 300s (no 60) — esta ruta sí espera a la respuesta completa
// (es una herramienta de admin, no un flujo de candidato), así que
// necesita el margen completo.
export const maxDuration = 180;

export async function POST(request: NextRequest) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { primerNombre, primerApellido, segundoNombre, segundoApellido, tipoDocumento, numeroDocumento, fechaExpedicion } =
    await request.json();

  if (
    typeof primerNombre !== "string" ||
    !primerNombre.trim() ||
    typeof primerApellido !== "string" ||
    !primerApellido.trim() ||
    typeof numeroDocumento !== "string" ||
    !numeroDocumento.trim() ||
    (tipoDocumento !== "CC" && tipoDocumento !== "CE" && tipoDocumento !== "PPT" && tipoDocumento !== "PA")
  ) {
    return NextResponse.json(
      { error: "Completa nombre, apellido, tipo y número de documento." },
      { status: 400 }
    );
  }

  const db = adminClient();
  const config = await getSolverioConfig(db);
  if (!config) {
    return NextResponse.json(
      { error: "Configura primero el endpoint y la API key en esta misma pestaña." },
      { status: 400 }
    );
  }

  const resultado = await consultarVerificacionCompleta(config, {
    documento: numeroDocumento.trim(),
    primerNombre: primerNombre.trim(),
    primerApellido: primerApellido.trim(),
    segundoNombre: typeof segundoNombre === "string" ? segundoNombre.trim() : null,
    segundoApellido: typeof segundoApellido === "string" ? segundoApellido.trim() : null,
    tipoDocumento,
    fechaExpedicion: typeof fechaExpedicion === "string" && fechaExpedicion ? fechaExpedicion : null,
  });

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 400 });
  }

  const raw = resultado.raw as { data?: Record<string, unknown> };
  const fuentes = (raw?.data?.fuentes as unknown[]) ?? [];
  const estadoConsulta = raw?.data?.estadoConsulta ?? null;

  return NextResponse.json({
    semaforo: resultado.semaforo,
    estadoConsulta,
    fuentes,
    pdfs: resultado.pdfs,
  });
}
