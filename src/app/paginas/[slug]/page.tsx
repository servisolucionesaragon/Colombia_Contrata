import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

async function getPagina(slug: string) {
  const { data } = await supabase
    .from("paginas")
    .select("titulo, contenido, activo")
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pagina = await getPagina(slug);
  if (!pagina) return {};
  return { title: `${pagina.titulo} — Colombia Contrata` };
}

export default async function PaginaPersonalizada({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pagina = await getPagina(slug);

  if (!pagina) notFound();

  return (
    <>
      <Header />
      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {pagina.titulo}
          </h1>
          {pagina.contenido && (
            // El contenido lo escribe el propio administrador desde /admin
            // (RichTextEditor.tsx), no un usuario público — se trata como
            // HTML confiable, igual que en un CMS.
            <div
              className="mt-6 text-gray-700 dark:text-gray-300 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-brand-blue [&_a]:hover:underline"
              dangerouslySetInnerHTML={{ __html: pagina.contenido }}
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
