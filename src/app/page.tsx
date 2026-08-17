import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PlanesEmpresaPricing from "@/components/PlanesEmpresaPricing";
import PreciosDocumentosPricing from "@/components/PreciosDocumentosPricing";
import PlanPersonaCard from "@/components/PlanPersonaCard";
import { supabase } from "@/lib/supabase";

// Refresca cada minuto para que los cambios de /admin (pestaña "Página
// principal") se vean sin necesitar un nuevo deploy.
export const revalidate = 60;

const defaults = {
  hero_titulo_prefijo: "Todos tus documentos de contratación pública,",
  hero_titulo_destacado: "en un solo lugar",
  hero_subtitulo:
    "Olvídate de visitar una a una las entidades. Selecciona los certificados que necesitas, paga una sola vez y recíbelos listos para presentar.",
  hero_cta_primario_label: "Solicitar mis documentos",
  hero_cta_secundario_label: "Soy empresa",
  como_funciona_activo: true,
  como_funciona_titulo: "Cómo funciona",
  paso1_titulo: "Selecciona tus documentos",
  paso1_descripcion:
    "Marca en el checklist los documentos que necesitas para tu proceso de contratación.",
  paso2_titulo: "Autoriza y paga",
  paso2_descripcion:
    "Autoriza el tratamiento de tus datos y realiza el pago de forma segura.",
  paso3_titulo: "Recibe tus documentos",
  paso3_descripcion:
    "Te notificamos por correo cuando estén listos. Descárgalos en un solo comprimido, disponible por 10 días.",
  documentos_activo: true,
  documentos_titulo: "Documentos disponibles",
  documentos_subtitulo:
    "Los certificados más solicitados para procesos de contratación pública.",
  planes_activo: true,
  planes_titulo: "Planes",
  planes_empresa_titulo: "Planes para empresas",
  planes_empresa_subtitulo:
    "Paquetes de consultas para validar antecedentes de tus candidatos antes de contratar, con su autorización.",
};

type Bloque = {
  id: string;
  titulo: string | null;
  descripcion: string | null;
  imagen_url: string | null;
  imagen_posicion: "izquierda" | "derecha";
  imagen_ancho: number | null;
  fondo_color: string | null;
  boton_label: string | null;
  boton_href: string | null;
};

export default async function Home() {
  const [{ data }, { data: bloquesData }] = await Promise.all([
    supabase.from("configuracion_landing").select("*").eq("id", 1).single(),
    supabase
      .from("bloques_landing")
      .select("*")
      .eq("activo", true)
      .order("orden", { ascending: true }),
  ]);

  const c = { ...defaults, ...data };
  const bloques = (bloquesData as Bloque[]) ?? [];

  const pasos = [
    { numero: "1", titulo: c.paso1_titulo, descripcion: c.paso1_descripcion },
    { numero: "2", titulo: c.paso2_titulo, descripcion: c.paso2_descripcion },
    { numero: "3", titulo: c.paso3_titulo, descripcion: c.paso3_descripcion },
  ];

  return (
    <>
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-[1.05]">
              {c.hero_titulo_prefijo}{" "}
              <span className="text-brand-blue">{c.hero_titulo_destacado}</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
              {c.hero_subtitulo}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/solicitar"
                className="inline-flex items-center gap-x-2 text-sm font-bold rounded-xl border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-blue/25 transition-all px-7 py-3.5"
              >
                {c.hero_cta_primario_label}
              </a>
              <a
                href="#empresas"
                className="inline-flex items-center gap-x-2 text-sm font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-brand-blue dark:hover:border-brand-blue transition-colors px-7 py-3.5"
              >
                {c.hero_cta_secundario_label}
              </a>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        {c.como_funciona_activo && (
          <section id="como-funciona" className="bg-gray-50 dark:bg-gray-900/50 py-20 sm:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 text-center tracking-tight">
                {c.como_funciona_titulo}
              </h2>
              <div className="mt-14 grid sm:grid-cols-3 gap-6">
                {pasos.map((paso) => (
                  <div
                    key={paso.numero}
                    className="text-center rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 transition-shadow hover:shadow-lg hover:shadow-gray-900/5"
                  >
                    <div className="mx-auto flex items-center justify-center size-14 rounded-full bg-brand-blue text-white font-bold text-lg">
                      {paso.numero}
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {paso.titulo}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {paso.descripcion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Documentos disponibles */}
        {c.documentos_activo && (
          <section id="documentos" className="py-20 sm:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 text-center tracking-tight">
                {c.documentos_titulo}
              </h2>
              <p className="mt-3 text-center text-gray-500 dark:text-gray-400">
                {c.documentos_subtitulo}
              </p>
              <div className="mt-12">
                <PreciosDocumentosPricing />
              </div>
            </div>
          </section>
        )}

        {/* Planes */}
        {c.planes_activo && (
          <section id="planes" className="bg-gray-50 dark:bg-gray-900/50 py-20 sm:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 text-center tracking-tight">
                {c.planes_titulo}
              </h2>

              <PlanPersonaCard />

              <div id="empresas" className="mt-24 scroll-mt-20">
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 text-center tracking-tight">
                  {c.planes_empresa_titulo}
                </h3>
                <p className="mt-3 text-center text-gray-500 dark:text-gray-400">
                  {c.planes_empresa_subtitulo}
                </p>
                <div className="mt-10">
                  <PlanesEmpresaPricing />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Bloques de contenido (configurables desde /admin) */}
        {bloques.map((bloque, index) => (
          <section
            key={bloque.id}
            className={
              bloque.fondo_color
                ? "py-20 sm:py-24"
                : index % 2 === 0
                  ? "py-20 sm:py-24"
                  : "bg-gray-50 dark:bg-gray-900/50 py-20 sm:py-24"
            }
            style={bloque.fondo_color ? { backgroundColor: bloque.fondo_color } : undefined}
          >
            <div
              className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col ${
                bloque.imagen_url
                  ? bloque.imagen_posicion === "izquierda"
                    ? "sm:flex-row"
                    : "sm:flex-row-reverse"
                  : ""
              } items-center gap-8`}
            >
              {bloque.imagen_url && (
                <div
                  className={`w-full sm:w-1/2 flex justify-center ${
                    bloque.imagen_posicion === "izquierda"
                      ? "sm:justify-start"
                      : "sm:justify-end"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bloque.imagen_url}
                    alt={bloque.titulo ?? ""}
                    className="rounded-2xl object-contain max-w-full h-auto"
                    style={{ maxWidth: `min(${bloque.imagen_ancho ?? 400}px, 100%)` }}
                  />
                </div>
              )}
              <div
                className={`w-full ${bloque.imagen_url ? "sm:w-1/2" : "max-w-2xl mx-auto text-center"}`}
              >
                {bloque.titulo && (
                  <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                    {bloque.titulo}
                  </h2>
                )}
                {bloque.descripcion && (
                  <p className="mt-4 text-gray-500 dark:text-gray-400 whitespace-pre-line">
                    {bloque.descripcion}
                  </p>
                )}
                {bloque.boton_label && bloque.boton_href && (
                  <a
                    href={bloque.boton_href}
                    className="mt-6 inline-flex items-center gap-x-2 text-sm font-bold rounded-xl border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-blue/25 transition-all px-6 py-3"
                  >
                    {bloque.boton_label}
                  </a>
                )}
              </div>
            </div>
          </section>
        ))}
      </main>

      <Footer />
    </>
  );
}
