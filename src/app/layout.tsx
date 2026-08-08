import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import PrelineScript from "@/components/PrelineScript";
import { supabase } from "@/lib/supabase";

// Refresca cada minuto para que un cambio de favicon/logo en /admin se
// refleje sin necesitar un nuevo deploy.
export const revalidate = 60;

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var isDark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {}
})();
`;

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { data } = await supabase
    .from("configuracion_portal")
    .select("favicon_url")
    .eq("id", 1)
    .single();

  return {
    title: "Colombia Contrata",
    description:
      "Todos los documentos requeridos para contratación pública en un solo lugar.",
    icons: {
      icon: data?.favicon_url || "/icono.png",
    },
  };
}

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
        {children}
        <PrelineScript />
      </body>
    </html>
  );
}
