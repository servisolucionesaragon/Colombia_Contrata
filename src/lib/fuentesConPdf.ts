import type { SupabaseClient } from "@supabase/supabase-js";

// Mantiene al día la marca "genera PDF" del catálogo (`precios_documentos`)
// con lo que Vericol devuelve de verdad, en vez de una lista escrita a mano
// a partir de una sola observación.
//
// Solo marca `true`, nunca vuelve a `false`: haber recibido un PDF es
// prueba de que la fuente puede entregarlo, pero NO haberlo recibido no
// prueba lo contrario — una fuente suele omitir el soporte cuando no
// encuentra registros de esa persona. Inferir el "no" a partir de una
// respuesta vacía marcaría como "sin PDF" fuentes que sí lo dan.
//
// Es best-effort: se llama después de guardar el resultado y cualquier
// fallo se ignora, nunca debe tumbar una verificación ya completada.
export async function marcarFuentesQueGeneraronPdf(
  db: SupabaseClient,
  pdfs: Record<string, string> | null | undefined
): Promise<void> {
  const claves = Object.keys(pdfs ?? {}).filter((clave) => Boolean(pdfs?.[clave]));
  if (claves.length === 0) return;

  try {
    await db
      .from("precios_documentos")
      .update({ genera_pdf: true })
      .in("clave_fuente", claves)
      .eq("genera_pdf", false);
  } catch {
    /* la marca del catálogo no es crítica para el resultado */
  }
}
