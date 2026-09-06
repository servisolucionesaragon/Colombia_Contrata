import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FUENTE_LABEL } from "@/lib/solverio";

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

function nombreFuentes(claves: unknown): string[] {
  if (!Array.isArray(claves)) return [];
  return claves.map((c) => (typeof c === "string" ? FUENTE_LABEL[c] ?? c : String(c)));
}

// Este módulo es para dar soporte: se ve el rastro de lo que hizo una cuenta
// (qué pidió, qué se cobró, qué devolvió el proveedor y qué falló), no el
// contenido de los documentos — esos siguen siendo accesibles solo por su
// dueño a través de los endpoints con URL firmada.
export async function GET(request: NextRequest) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Falta el usuario a consultar." }, { status: 400 });
  }

  const db = adminClient();

  const { data: cuenta, error: errorCuenta } = await db.auth.admin.getUserById(userId);
  if (errorCuenta || !cuenta.user) {
    return NextResponse.json({ error: "No encontramos ese usuario." }, { status: 404 });
  }
  const email = cuenta.user.email ?? null;

  const [
    { data: perfil },
    { data: solicitudes },
    { data: enviadas },
    { data: recibidas },
    { data: pagos },
  ] = await Promise.all([
    db
      .from("profiles")
      .select(
        "account_type, primer_nombre, primer_apellido, razon_social, tipo_documento, documento, telefono, empresa_id_padre, rol_empresa"
      )
      .eq("id", userId)
      .maybeSingle(),
    db
      .from("solicitudes")
      .select(
        "id, estado, monto, documentos, wompi_referencia, created_at, nivel_riesgo, resultado_pdfs, resultado_json, resultado_error, resultado_obtenido_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    db
      .from("consultas")
      .select(
        "id, candidato_primer_nombre, candidato_primer_apellido, candidato_email, candidato_numero_documento, estado, credito_descontado, nivel_riesgo, documentos_requeridos, resultado_pdfs, resultado_json, resultado_error, resultado_obtenido_at, fecha_respuesta, created_at"
      )
      .eq("empresa_id", userId)
      .order("created_at", { ascending: false }),
    // Como candidato la persona puede aparecer por id (si ya tenía cuenta
    // vinculada) o solo por correo (si la invitaron antes de registrarse).
    db
      .from("consultas")
      .select(
        "id, empresa_id, estado, credito_descontado, nivel_riesgo, fecha_respuesta, created_at"
      )
      .or(email ? `candidato_id.eq.${userId},candidato_email.eq.${email}` : `candidato_id.eq.${userId}`)
      .order("created_at", { ascending: false }),
    db
      .from("pagos_empresa")
      .select("id, plan_nombre, creditos, periodo, monto, estado, fecha_vencimiento, created_at")
      .eq("empresa_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  // Las consultas recibidas se muestran con el nombre de la empresa que
  // preguntó, no con su uuid.
  const idsEmpresas = [...new Set((recibidas ?? []).map((c) => c.empresa_id))];
  const nombreEmpresas = new Map<string, string | null>();
  if (idsEmpresas.length > 0) {
    const { data: empresas } = await db
      .from("profiles")
      .select("id, razon_social")
      .in("id", idsEmpresas);
    for (const empresa of empresas ?? []) nombreEmpresas.set(empresa.id, empresa.razon_social);
  }

  const contarPdfs = (pdfs: unknown) =>
    pdfs && typeof pdfs === "object" ? Object.keys(pdfs as object).length : 0;

  return NextResponse.json({
    cuenta: {
      id: userId,
      email,
      verificado: Boolean(cuenta.user.email_confirmed_at),
      activo:
        !cuenta.user.banned_until || new Date(cuenta.user.banned_until) < new Date(),
      creadoEn: cuenta.user.created_at,
      ultimoAcceso: cuenta.user.last_sign_in_at ?? null,
      tipoCuenta:
        (perfil?.account_type as string | null) ??
        (cuenta.user.user_metadata?.account_type as string | undefined) ??
        null,
      nombre:
        perfil?.razon_social ||
        [perfil?.primer_nombre, perfil?.primer_apellido].filter(Boolean).join(" ") ||
        null,
      documento: perfil?.documento
        ? `${perfil.tipo_documento ?? ""} ${perfil.documento}`.trim()
        : null,
      telefono: perfil?.telefono ?? null,
      rolEmpresa: perfil?.rol_empresa ?? null,
      perteneceAEmpresa: perfil?.empresa_id_padre ?? null,
    },
    solicitudes: (solicitudes ?? []).map((s) => ({
      id: s.id,
      estado: s.estado,
      monto: Number(s.monto ?? 0),
      referencia: s.wompi_referencia,
      creadaEn: s.created_at,
      fuentesPedidas: nombreFuentes(s.documentos),
      documentosGenerados: contarPdfs(s.resultado_pdfs),
      nivelRiesgo: s.nivel_riesgo ?? null,
      error: s.resultado_error ?? null,
      resultadoEn: s.resultado_obtenido_at ?? null,
      // Se devuelven tal cual para que el panel de soporte pueda abrir los
      // PDF y mostrar el hallazgo de las fuentes que no generan documento,
      // con el mismo componente que ve la persona dueña.
      pdfs: (s.resultado_pdfs as Record<string, string> | null) ?? null,
      resultadoJson: s.resultado_json ?? null,
    })),
    consultasEnviadas: (enviadas ?? []).map((c) => ({
      id: c.id,
      candidato:
        [c.candidato_primer_nombre, c.candidato_primer_apellido].filter(Boolean).join(" ") ||
        c.candidato_email ||
        "Sin nombre",
      candidatoEmail: c.candidato_email,
      candidatoDocumento: c.candidato_numero_documento,
      estado: c.estado,
      creditoDescontado: Boolean(c.credito_descontado),
      nivelRiesgo: c.nivel_riesgo ?? null,
      fuentesPedidas: nombreFuentes(c.documentos_requeridos),
      documentosGenerados: contarPdfs(c.resultado_pdfs),
      error: c.resultado_error ?? null,
      resultadoEn: c.resultado_obtenido_at ?? null,
      respondidaEn: c.fecha_respuesta ?? null,
      creadaEn: c.created_at,
      pdfs: (c.resultado_pdfs as Record<string, string> | null) ?? null,
      resultadoJson: c.resultado_json ?? null,
    })),
    consultasRecibidas: (recibidas ?? []).map((c) => ({
      id: c.id,
      empresa: nombreEmpresas.get(c.empresa_id) ?? "Empresa sin perfil",
      estado: c.estado,
      creditoDescontado: Boolean(c.credito_descontado),
      nivelRiesgo: c.nivel_riesgo ?? null,
      respondidaEn: c.fecha_respuesta ?? null,
      creadaEn: c.created_at,
    })),
    pagosEmpresa: (pagos ?? []).map((p) => ({
      id: p.id,
      plan: p.plan_nombre,
      creditos: p.creditos,
      periodo: p.periodo,
      monto: Number(p.monto ?? 0),
      estado: p.estado,
      vigenteHasta: p.fecha_vencimiento ?? null,
      creadoEn: p.created_at,
    })),
  });
}
