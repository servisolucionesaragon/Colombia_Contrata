import type { MetadataRoute } from "next";
import { getPwaIcons } from "@/lib/pwaIcons";

// Sin esto, Next.js trata manifest.ts como estático y lo genera una sola
// vez en build time — un cambio de favicon en /admin nunca se reflejaría
// sin un redeploy. Mismo patrón que layout.tsx y page.tsx.
export const revalidate = 60;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
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
    icons: await getPwaIcons(),
  };
}
