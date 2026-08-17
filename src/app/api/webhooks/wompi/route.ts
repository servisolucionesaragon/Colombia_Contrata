import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Wompi llama este endpoint cuando cambia el estado de una transacción.
// Nunca probado contra un evento real todavía (no hay llaves de Wompi) —
// el algoritmo de checksum sigue la documentación de docs.wompi.co, pero
// hay que confirmarlo con un evento real en cuanto haya sandbox.
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

  // TODO: cuando exista la integración con el proveedor de fuentes, este
  // es el lugar para disparar la generación de los documentos al pasar a
  // estado "pagado".
  await db
    .from("solicitudes")
    .update({
      estado: nuevoEstado,
      wompi_transaction_id: transaction.id,
      updated_at: new Date().toISOString(),
    })
    .eq("wompi_referencia", reference);

  return NextResponse.json({ received: true });
}
