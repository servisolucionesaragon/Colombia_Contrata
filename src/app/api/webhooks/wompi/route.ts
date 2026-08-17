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
  const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
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

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

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
    .eq("wompi_referencia", transaction.reference);

  return NextResponse.json({ received: true });
}
