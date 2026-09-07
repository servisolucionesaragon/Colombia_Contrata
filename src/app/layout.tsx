import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import PrelineScript from "@/components/PrelineScript";
import WhatsAppButton from "@/components/WhatsAppButton";
import { supabase } from "@/lib/supabase";

// Refresca cada minuto para que un cambio de favicon/logo en /admin se
// refleje sin necesitar un nuevo deploy.
export const revalidate = 60;

const THEME_INIT_SCRIPT = `
(function () {
  try {
    // El tema por defecto es claro, aunque el sistema operativo del
    // visitante esté en oscuro: solo se activa el oscuro si la persona lo
    // eligió con el interruptor del encabezado.
    var stored = localStorage.getItem("theme");
    document.documentElement.classList.toggle("dark", stored === "dark");
  } catch (e) {}
})();
`;

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Respaldos por si la fila de configuración no existe todavía: el sitio
// nunca debe quedarse sin título ni sin descripción para compartir.
const TITLE = "Colombia Contrata";
const DESCRIPTION =
  "Todos los documentos requeridos para contratación pública en un solo lugar.";

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
};

export async function generateMetadata(): Promise<Metadata> {
  const { data } = await supabase
    .from("configuracion_portal")
    .select("favicon_url, nombre_portal, eslogan")
    .eq("id", 1)
    .single();

  const titulo = data?.nombre_portal?.trim() || TITLE;
  const descripcion = data?.eslogan?.trim() || DESCRIPTION;

  return {
    metadataBase: new URL("https://colombiacontrata.com"),
    title: titulo,
    description: descripcion,
    keywords: [
      "contratación pública Colombia",
      "antecedentes contratación pública",
      "certificados contratación pública",
      "verificación de antecedentes",
      "Habeas Data empresas",
    ],
    icons: {
      icon: data?.favicon_url || "/icono.png",
      apple: data?.favicon_url || "/apple-touch-icon.png",
    },
    appleWebApp: {
      capable: true,
      title: titulo,
      statusBarStyle: "default",
    },
    openGraph: {
      title: titulo,
      description: descripcion,
      url: "https://colombiacontrata.com",
      siteName: titulo,
      locale: "es_CO",
      type: "website",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: titulo,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descripcion,
      images: ["/og-image.png"],
    },
  };
}

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: TITLE,
  url: "https://colombiacontrata.com",
  logo: "https://colombiacontrata.com/logo.png",
  description: DESCRIPTION,
  areaServed: "CO",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${montserrat.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <Script id="organization-json-ld" type="application/ld+json" strategy="beforeInteractive">
          {JSON.stringify(ORGANIZATION_JSON_LD)}
        </Script>
        {children}
        <WhatsAppButton />
        <PrelineScript />
      </body>
    </html>
  );
}
