import { NextResponse } from "next/server";
import { getPwaIcons } from "@/lib/pwaIcons";

// Manifest aparte para /admin, con su propio "scope" y "start_url": así
// se puede instalar como una app independiente de la del sitio público
// (con nombre distinto, aunque comparten ícono), en vez de compartir el
// manifest.ts de la raíz. Next.js no soporta manifest.ts anidado por
// segmento, por eso este va como Route Handler propio en vez de la
// convención de archivo especial.
export const revalidate = 60;

export async function GET() {
  const manifest = {
    name: "Colombia Contrata — Admin",
    short_name: "CC Admin",
    description: "Panel de administración de Colombia Contrata.",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0d1b3d",
    lang: "es-CO",
    icons: await getPwaIcons(),
  };

  return NextResponse.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
