import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DIAS_RETENCION_DOCUMENTOS, fechaLimiteRetencion } from "@/lib/retencionDocumentos";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const maxDuration = 300;

function adminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type FilaConResultado = {
  id: string;
  resultado_pdfs: Record<string, string> | null;
};

// Borra los PDF de Storage y vacía el detalle guardado en la fila. Se
// borra también `resultado_json` a propósito: ahí viven los hallazgos
// completos (inhabilidades, multas, comparendos), que son el mismo dato
// sensible que el PDF — conservarlo dejaría la promesa a medias. Se
// mantienen la fecha y el nivel de riesgo, que son el registro de que la
// verificación existió y no revelan el detalle.
async function limpiarTabla(db: SupabaseClient, tabla: "consultas" | "solicitudes", limite: string) {
  const { data: filas, error } = await db
    .from(tabla)
    .select("id, resultado_pdfs")
    .lt("resultado_obtenido_at", limite)
    .not("resultado_json", "is", null);

  if (error) throw new Error(`${tabla}: ${error.message}`);

  let archivosBorrados = 0;
  const filasLimpiadas: string[] = [];
  const errores: string[] = [];

  for (const fila of (filas ?? []) as FilaConResultado[]) {
    const rutas = Object.values(fila.resultado_pdfs ?? {});

    if (rutas.length > 0) {
      const { error: errorStorage } = await db.storage.from("verificaciones-pdf").remove(rutas);
      if (errorStorage) {
        // Si el archivo no se pudo borrar, NO se limpia la fila: así el
        // próximo ciclo lo vuelve a intentar en vez de dejar huérfano un
        // PDF que la fila ya no referencia.
        errores.push(`${tabla}/${fila.id}: ${errorStorage.message}`);
        continue;
      }
      archivosBorrados += rutas.length;
    }

    const { error: errorUpdate } = await db
      .from(tabla)
      .update({
        resultado_pdfs: null,
        resultado_json: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fila.id);

    if (errorUpdate) errores.push(`${tabla}/${fila.id}: ${errorUpdate.message}`);
    else filasLimpiadas.push(fila.id);
  }

  return { revisadas: filas?.length ?? 0, filasLimpiadas: filasLimpiadas.length, archivosBorrados, errores };
}

// Limpieza automática de documentos vencidos. La dispara Vercel Cron una
// vez al día (ver vercel.json), autenticada con CRON_SECRET — Vercel manda
// ese valor en el header Authorization. Sin el secreto configurado el
// endpoint se niega a correr, para que nadie pueda dispararlo desde fuera.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET no está configurado." },
      { status: 500 }
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const limite = fechaLimiteRetencion().toISOString();
  const db = adminClient();

  try {
    const consultas = await limpiarTabla(db, "consultas", limite);
    const solicitudes = await limpiarTabla(db, "solicitudes", limite);

    return NextResponse.json({
      ok: true,
      diasRetencion: DIAS_RETENCION_DOCUMENTOS,
      anterioresA: limite,
      consultas,
      solicitudes,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fallo la limpieza." },
      { status: 500 }
    );
  }
}
