import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

// Sin esto, Next.js trata manifest.ts como estático y lo genera una sola
// vez en build time — un cambio de favicon en /admin nunca se reflejaría
// sin un redeploy. Mismo patrón que layout.tsx y page.tsx.
export const revalidate = 60;

// El ícono de la PWA usa la misma imagen configurable desde /admin ->
// Identidad del portal -> Ícono/Favicon ("favicon_url"), para que no haya
// que mantener dos íconos por separado — si el usuario cambia el favicon,
// el ícono de "instalar app" cambia con él. Si nunca configuró uno, cae a
// los archivos generados en public/ a partir del isotipo de marca.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { data } = await supabase
    .from("configuracion_portal")
    .select("favicon_url")
    .eq("id", 1)
    .single();

  const icon = data?.favicon_url;

  const icons: MetadataRoute.Manifest["icons"] = icon
    ? [
        { src: icon, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: icon, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: icon, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ]
    : [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        {
          src: "/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ];

  return {
    name: "Colombia Contrata",
    short_name: "Colombia Contrata",
    description:
      "Todos los documentos requeridos para contratación pública en un solo lugar.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1d4ed8",
    lang: "es-CO",
    icons,
  };
}
