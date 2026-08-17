import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

const emailValido = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const TIPOS_DOCUMENTO = ["CC", "PPT", "CE", "PA"];

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// Crea una o varias invitaciones de consulta (individual = un solo
// candidato, masiva = varios a la vez desde el CSV). No descuenta
// créditos acá — eso solo pasa cuando el candidato autoriza, en
// /api/consultas/autorizar.
export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const { candidatos, loteReferencia } = await request.json();
  if (!Array.isArray(candidatos) || candidatos.length === 0) {
    return NextResponse.json({ error: "Agrega al menos un candidato." }, { status: 400 });
  }
  if (candidatos.length > 500) {
    return NextResponse.json(
      { error: "Máximo 500 candidatos por carga." },
      { status: 400 }
    );
  }

  const db = adminClient();

  const { data: profile } = await db
    .from("profiles")
    .select("account_type, razon_social")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.account_type !== "empresa") {
    return NextResponse.json(
      { error: "Esta acción es solo para cuentas de empresa." },
      { status: 400 }
    );
  }

  if (!profile.razon_social) {
    return NextResponse.json(
      {
        error: "Completa los datos de tu empresa en tu perfil antes de continuar.",
        code: "PERFIL_INCOMPLETO",
      },
      { status: 400 }
    );
  }

  const fechaValida = (v: string) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v);

  const filas = (candidatos as Array<Record<string, unknown>>)
    .map((c) => ({
      primerNombre: texto(c.primerNombre),
      segundoNombre: texto(c.segundoNombre),
      primerApellido: texto(c.primerApellido),
      segundoApellido: texto(c.segundoApellido),
      email: texto(c.email).toLowerCase(),
      tipoDocumento: texto(c.tipoDocumento).toUpperCase(),
      numeroDocumento: texto(c.numeroDocumento),
      fechaExpedicion: texto(c.fechaExpedicion),
    }))
    .filter(
      (c) =>
        c.primerNombre &&
        c.primerApellido &&
        emailValido(c.email) &&
        TIPOS_DOCUMENTO.includes(c.tipoDocumento) &&
        c.numeroDocumento &&
        fechaValida(c.fechaExpedicion)
    );

  if (filas.length === 0) {
    return NextResponse.json(
      {
        error:
          "Ningún candidato tiene todos los datos obligatorios (nombre, apellido, correo, tipo y número de documento).",
      },
      { status: 400 }
    );
  }

  const { error } = await db.from("consultas").insert(
    filas.map((f) => ({
      empresa_id: user.id,
      candidato_primer_nombre: f.primerNombre,
      candidato_segundo_nombre: f.segundoNombre || null,
      candidato_primer_apellido: f.primerApellido,
      candidato_segundo_apellido: f.segundoApellido || null,
      candidato_email: f.email,
      candidato_tipo_documento: f.tipoDocumento,
      candidato_numero_documento: f.numeroDocumento,
      candidato_fecha_expedicion: f.fechaExpedicion || null,
      lote_referencia: typeof loteReferencia === "string" ? loteReferencia : null,
    }))
  );

  if (error) {
    return NextResponse.json(
      { error: "No pudimos registrar las consultas." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, creadas: filas.length });
}
