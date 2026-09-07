import type { MetadataRoute } from "next";
import { getPwaIcons } from "@/lib/pwaIcons";
import { supabase } from "@/lib/supabase";

// Sin esto, Next.js trata manifest.ts como estático y lo genera una sola
// vez en build time — un cambio de favicon en /admin nunca se reflejaría
// sin un redeploy. Mismo patrón que layout.tsx y page.tsx.
export const revalidate = 60;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // El nombre y el eslogan se editan en /admin → Identidad del portal;
  // los literales quedan solo como respaldo si esa fila no existe.
  const { data } = await supabase
    .from("configuracion_portal")
    .select("nombre_portal, eslogan")
    .eq("id", 1)
    .maybeSingle();

  const nombre = data?.nombre_portal?.trim() || "Colombia Contrata";

  return {
    name: nombre,
    short_name: nombre,
    description:
      data?.eslogan?.trim() ||
      "Todos los documentos requeridos para contratación pública en un solo lugar.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1d4ed8",
    lang: "es-CO",
    icons: await getPwaIcons(),
  };
}
