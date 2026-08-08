import type { Metadata } from "next";
import Link from "next/link";
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
      <main className="flex-1">
        <section className="bg-brand-navy py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-x-1.5 text-sm font-medium text-white/60 hover:text-white"
            >
              <svg
                className="size-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              Volver al inicio
            </Link>
            <h1 className="mt-4 text-4xl sm:text-5xl font-bold text-white tracking-tight">
              {pagina.titulo}
            </h1>
          </div>
        </section>

        {pagina.contenido && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            {/* El contenido lo escribe el propio administrador desde /admin
                (RichTextEditor.tsx), no un usuario público — se trata como
                HTML confiable, igual que en un CMS. */}
            <div
              className="text-base text-gray-600 dark:text-gray-400 leading-relaxed [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-gray-900 dark:[&>h2]:text-gray-100 [&>h2]:mt-14 [&>h2]:mb-4 [&>h2]:pt-10 [&>h2]:border-t [&>h2]:border-gray-200 dark:[&>h2]:border-gray-800 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-gray-900 dark:[&>h3]:text-gray-100 [&>h3]:mt-6 [&>h3]:mb-2 [&>p]:my-4 [&>ul]:my-5 [&>ul]:space-y-2.5 [&>ul]:list-none [&>ul]:pl-0 [&>ul>li]:relative [&>ul>li]:pl-7 [&>ul>li]:before:content-['✓'] [&>ul>li]:before:absolute [&>ul>li]:before:left-0 [&>ul>li]:before:top-0 [&>ul>li]:before:text-brand-blue [&>ul>li]:before:font-bold [&>ol]:my-4 [&>ol]:pl-5 [&>ol]:list-decimal [&>ol]:space-y-1.5 [&>a]:text-brand-blue [&>a]:hover:underline"
              dangerouslySetInnerHTML={{ __html: pagina.contenido }}
            />
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
