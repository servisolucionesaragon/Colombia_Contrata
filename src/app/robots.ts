import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/dashboard",
        "/perfil",
        "/historial",
        "/login",
        "/autorizaciones",
        "/solicitar",
        "/empresas/consultas",
        "/empresas/equipo",
        "/empresas/planes",
      ],
    },
    sitemap: "https://colombiacontrata.com/sitemap.xml",
  };
}
