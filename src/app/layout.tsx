import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import PrelineScript from "@/components/PrelineScript";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Colombia Contrata",
  description:
    "Todos los documentos requeridos para contratación pública en un solo lugar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PrelineScript />
      </body>
    </html>
  );
}
