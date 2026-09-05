import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { procesarPagoAprobadoSolicitud } from "@/lib/solicitudVerificacion";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// La verificación real con Vericol puede tardar más de un minuto (ver el
// mismo comentario en /api/consultas/autorizar) — se dispara con after()
// después de responder a Wompi, no antes.
export const maxDuration = 180;

// Wompi llama este endpoint cuando cambia el estado de una transacción.
// Validado contra Wompi real (Sandbox) el 2026-09-04 — ver
// .claude/CLAUDE.md para el detalle del fix (URL de Eventos con www.).
export async function POST(request: NextRequest) {
  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: wompiConfig } = await db
    .from("configuracion_wompi")
    .select("ambiente_activo, sandbox_events_secret, produccion_events_secret")
    .eq("id", 1)
    .maybeSingle();

  // Wompi manda el evento por el ambiente desde el que se generó el pago
  // (sandbox o producción); como en Colombia Contrata solo hay un
  // ambiente "activo" a la vez, se verifica con el secreto de ese mismo
  // ambiente. Si en algún momento se necesita recibir eventos de ambos
  // ambientes en simultáneo, este es el lugar para intentar con los dos
  // secretos en vez de uno solo.
  const ambiente = wompiConfig?.ambiente_activo === "produccion" ? "produccion" : "sandbox";
  const eventsSecret =
    ambiente === "produccion" ? wompiConfig?.produccion_events_secret : wompiConfig?.sandbox_events_secret;
  if (!eventsSecret) {
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 });
  }

  const body = await request.json();
  const { event, data, signature, timestamp } = body ?? {};

  if (event !== "transaction.updated" || !data?.transaction) {
    return NextResponse.json({ received: true });
  }

  const transaction = data.transaction;

  const propsConcat = ((signature?.properties as string[]) ?? [])
    .map((path) =>
      path
        .split(".")
        .reduce((obj: Record<string, unknown> | undefined, key: string) => {
          if (obj && typeof obj === "object" && key in obj) {
            return obj[key] as Record<string, unknown>;
          }
          return undefined;
        }, data as Record<string, unknown>)
    )
    .join("");

  const expectedChecksum = crypto
    .createHash("sha256")
    .update(`${propsConcat}${timestamp}${eventsSecret}`)
    .digest("hex");

  if (!signature?.checksum || expectedChecksum !== signature.checksum) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const nuevoEstado =
    transaction.status === "APPROVED"
      ? "pagado"
      : transaction.status === "DECLINED" || transaction.status === "ERROR"
        ? "fallido"
        : "pendiente";

  const reference = transaction.reference as string;

  // El prefijo de la referencia (asignado al crearla) dice a qué tabla
  // pertenece: "SOL-" para solicitudes de documentos (personas), "EMP-"
  // para pagos de planes de empresa.
  if (reference?.startsWith("EMP-")) {
    const updatePayload: Record<string, unknown> = {
      estado: nuevoEstado,
      wompi_transaction_id: transaction.id,
      updated_at: new Date().toISOString(),
    };

    if (nuevoEstado === "pagado") {
      const { data: pago } = await db
        .from("pagos_empresa")
        .select("periodo")
        .eq("wompi_referencia", reference)
        .maybeSingle();

      const inicio = new Date();
      const vencimiento = new Date(inicio);
      if (pago?.periodo === "anual") {
        vencimiento.setFullYear(vencimiento.getFullYear() + 1);
      } else {
        vencimiento.setMonth(vencimiento.getMonth() + 1);
      }
      updatePayload.fecha_inicio = inicio.toISOString();
      updatePayload.fecha_vencimiento = vencimiento.toISOString();
    }

    await db.from("pagos_empresa").update(updatePayload).eq("wompi_referencia", reference);
    return NextResponse.json({ received: true });
  }

  const { data: solicitudActualizada } = await db
    .from("solicitudes")
    .update({
      estado: nuevoEstado,
      wompi_transaction_id: transaction.id,
      updated_at: new Date().toISOString(),
    })
    .eq("wompi_referencia", reference)
    .select("id, user_id, documentos, resultado_obtenido_at")
    .maybeSingle();

  // Dispara la verificación real de fuentes solo la primera vez que el
  // pago queda aprobado — resultado_obtenido_at ya seteado es la guarda
  // de idempotencia por si Wompi reenvía el mismo evento. Un intento
  // fallido (resultado_error, sin resultado_obtenido_at) sí se reintenta
  // en un próximo evento, a propósito.
  if (nuevoEstado === "pagado" && solicitudActualizada && !solicitudActualizada.resultado_obtenido_at) {
    after(async () => {
      await procesarPagoAprobadoSolicitud(db, solicitudActualizada);
    });
  }

  return NextResponse.json({ received: true });
}
