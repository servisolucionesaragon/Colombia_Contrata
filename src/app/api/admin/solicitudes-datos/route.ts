import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enviarCorreo } from "@/lib/resend";

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

const ESTADOS = ["recibida", "en_tramite", "resuelta", "rechazada"] as const;

const ETIQUETA_TIPO: Record<string, string> = {
  supresion: "Supresión de datos",
  revocacion: "Revocación de la autorización",
  acceso: "Acceso a mis datos",
  rectificacion: "Rectificación de datos",
  actualizacion: "Actualización de datos",
  otro: "Otra solicitud",
};

// Plazos de la Ley 1581 de 2012: 15 días hábiles para un reclamo
// (prorrogables 8 más) y 10 para una consulta. Se calcula en días hábiles
// de verdad — contar corridos daría una fecha límite equivocada y es
// justo el dato que sirve para no incumplir.
function diasHabilesTranscurridos(desde: string): number {
  const inicio = new Date(desde);
  const hoy = new Date();
  let dias = 0;
  const cursor = new Date(inicio);
  while (cursor < hoy) {
    cursor.setDate(cursor.getDate() + 1);
    const dia = cursor.getDay();
    if (dia !== 0 && dia !== 6) dias++;
  }
  return dias;
}

export async function GET(request: NextRequest) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const db = adminClient();
  const { data, error } = await db
    .from("solicitudes_datos")
    .select("id, user_id, correo, nombre, tipo, detalle, estado, respuesta, created_at, resuelta_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const solicitudes = (data ?? []).map((s) => {
    const abierta = s.estado === "recibida" || s.estado === "en_tramite";
    const habiles = diasHabilesTranscurridos(s.created_at);
    return {
      ...s,
      tipoEtiqueta: ETIQUETA_TIPO[s.tipo] ?? s.tipo,
      diasHabiles: habiles,
      // 15 días hábiles es el plazo del reclamo; a partir de 11 conviene
      // avisar para que no llegue al límite sin respuesta.
      porVencer: abierta && habiles >= 11 && habiles < 15,
      vencida: abierta && habiles >= 15,
    };
  });

  return NextResponse.json({
    solicitudes,
    pendientes: solicitudes.filter((s) => s.estado === "recibida" || s.estado === "en_tramite")
      .length,
  });
}

export async function POST(request: NextRequest) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id, estado, respuesta, notificar } = await request.json();
  if (typeof id !== "string" || !ESTADOS.includes(estado)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const cerrada = estado === "resuelta" || estado === "rechazada";
  const textoRespuesta =
    typeof respuesta === "string" && respuesta.trim() ? respuesta.trim() : null;

  if (cerrada && !textoRespuesta) {
    return NextResponse.json(
      { error: "Escribe la respuesta antes de cerrar la solicitud." },
      { status: 400 }
    );
  }

  const db = adminClient();
  const { data: actualizada, error } = await db
    .from("solicitudes_datos")
    .update({
      estado,
      respuesta: textoRespuesta,
      resuelta_at: cerrada ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("correo, nombre, tipo")
    .maybeSingle();

  if (error || !actualizada) {
    return NextResponse.json({ error: "No pudimos guardar la solicitud." }, { status: 500 });
  }

  // El correo al titular es la respuesta formal, así que se manda en
  // primer plano: si falla, el admin necesita enterarse y reintentar, no
  // quedarse creyendo que ya respondió.
  if (notificar && cerrada) {
    const etiqueta = ETIQUETA_TIPO[actualizada.tipo] ?? actualizada.tipo;
    const envio = await enviarCorreo(db, {
      to: actualizada.correo,
      subject: `Respuesta a tu solicitud: ${etiqueta}`,
      html: `<p>Hola${actualizada.nombre ? ` ${actualizada.nombre}` : ""},</p>
<p>Damos respuesta a tu solicitud de <strong>${etiqueta}</strong> radicada en Colombia Contrata.</p>
<p>${textoRespuesta}</p>
<p>Si no estás de acuerdo con esta respuesta, puedes presentar una queja ante la Superintendencia de Industria y Comercio (SIC).</p>
<p>Colombia Contrata</p>`,
    });

    if (!envio.ok) {
      return NextResponse.json({
        success: true,
        avisoCorreo: `Se guardó la respuesta, pero no pudimos enviarle el correo al titular (${envio.error}). Escríbele directamente a ${actualizada.correo}.`,
      });
    }
  }

  return NextResponse.json({ success: true });
}
