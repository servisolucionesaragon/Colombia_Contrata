import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const BASE_URL = "https://colombiacontrata.com";

// "terminos" y "privacidad" ya tienen su propia ruta fija (ver
// src/app/paginas/[slug]/page.tsx) — no deben duplicarse aquí.
const SLUGS_RESERVADOS = ["terminos", "privacidad"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: paginas } = await supabase
    .from("paginas")
    .select("slug, updated_at")
    .eq("activo", true)
    .not("slug", "in", `(${SLUGS_RESERVADOS.join(",")})`);

  const paginasUrls: MetadataRoute.Sitemap = (paginas ?? []).map((pagina) => ({
    url: `${BASE_URL}/paginas/${pagina.slug}`,
    lastModified: pagina.updated_at ?? undefined,
    changeFrequency: "monthly",
  }));

  return [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/registro`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/terminos`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacidad`, changeFrequency: "yearly", priority: 0.3 },
    ...paginasUrls,
  ];
}
