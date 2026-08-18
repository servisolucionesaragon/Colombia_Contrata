import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { resolverContextoEmpresa } from "@/lib/empresaContext";
import { enviarCorreo } from "@/lib/resend";
import { plantillaInvitacionConsulta } from "@/lib/emailPlantillas";

// Una carga masiva puede tener hasta 500 candidatos — el envío de
// correos (en after(), después de responder) puede tardar más que el
// límite por defecto si se manda uno por uno.
export const maxDuration = 180;

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

  const { candidatos, loteReferencia, documentoIds } = await request.json();
  if (!Array.isArray(candidatos) || candidatos.length === 0) {
    return NextResponse.json({ error: "Agrega al menos un candidato." }, { status: 400 });
  }
  if (candidatos.length > 500) {
    return NextResponse.json(
      { error: "Máximo 500 candidatos por carga." },
      { status: 400 }
    );
  }
  if (!Array.isArray(documentoIds) || documentoIds.length === 0) {
    return NextResponse.json(
      { error: "Selecciona al menos un documento requerido." },
      { status: 400 }
    );
  }

  const db = adminClient();

  const { data: documentosRequeridos } = await db
    .from("precios_documentos")
    .select("id, documento")
    .in("id", documentoIds)
    .eq("activo", true);

  if (!documentosRequeridos || documentosRequeridos.length !== documentoIds.length) {
    return NextResponse.json(
      { error: "Alguno de los documentos seleccionados ya no está disponible." },
      { status: 400 }
    );
  }

  const contexto = await resolverContextoEmpresa(db, user.id);
  if (!contexto) {
    return NextResponse.json(
      { error: "Esta acción es solo para cuentas de empresa." },
      { status: 400 }
    );
  }

  if (!contexto.razonSocial) {
    return NextResponse.json(
      {
        error: "Completa los datos de la empresa en el perfil antes de continuar.",
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

  // El token se genera acá (no se vuelve a leer de la base después del
  // insert) para no encadenar un select() extra solo para recuperarlo.
  const filasConToken = filas.map((f) => ({
    ...f,
    tokenRespuesta: crypto.randomBytes(24).toString("hex"),
  }));

  const { error } = await db.from("consultas").insert(
    filasConToken.map((f) => ({
      empresa_id: contexto.empresaId,
      candidato_primer_nombre: f.primerNombre,
      candidato_segundo_nombre: f.segundoNombre || null,
      candidato_primer_apellido: f.primerApellido,
      candidato_segundo_apellido: f.segundoApellido || null,
      candidato_email: f.email,
      candidato_tipo_documento: f.tipoDocumento,
      candidato_numero_documento: f.numeroDocumento,
      candidato_fecha_expedicion: f.fechaExpedicion || null,
      lote_referencia: typeof loteReferencia === "string" ? loteReferencia : null,
      token_respuesta: f.tokenRespuesta,
      documentos_requeridos: documentosRequeridos,
    }))
  );

  if (error) {
    return NextResponse.json(
      { error: "No pudimos registrar las consultas." },
      { status: 500 }
    );
  }

  // El candidato no debe esperar a que salgan los correos (una carga
  // masiva puede tener hasta 500) — se envían después de responder,
  // sin bloquear. Si el envío de un correo falla, la consulta ya quedó
  // registrada de todas formas.
  after(async () => {
    for (const f of filasConToken) {
      await enviarCorreo(db, {
        to: f.email,
        subject: `${contexto.razonSocial} te invitó a Colombia Contrata`,
        html: plantillaInvitacionConsulta({
          candidatoNombre: `${f.primerNombre} ${f.primerApellido}`,
          empresaNombre: contexto.razonSocial ?? "una empresa",
          token: f.tokenRespuesta,
          documentos: documentosRequeridos.map((d) => d.documento),
        }),
      });
    }
  });

  return NextResponse.json({ success: true, creadas: filasConToken.length });
}
