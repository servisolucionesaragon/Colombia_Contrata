import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PlanesEmpresaPricing from "@/components/PlanesEmpresaPricing";
import PreciosDocumentosPricing from "@/components/PreciosDocumentosPricing";
import PlanPersonaCard from "@/components/PlanPersonaCard";

const pasos = [
  {
    numero: "1",
    titulo: "Selecciona tus documentos",
    descripcion:
      "Marca en el checklist los documentos que necesitas para tu proceso de contratación.",
  },
  {
    numero: "2",
    titulo: "Autoriza y paga",
    descripcion:
      "Autoriza el tratamiento de tus datos y realiza el pago de forma segura.",
  },
  {
    numero: "3",
    titulo: "Recibe tus documentos",
    descripcion:
      "Te notificamos por correo cuando estén listos. Descárgalos en un solo comprimido, disponible por 10 días.",
  },
];

export default function Home() {
  return (
    <>
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Todos tus documentos de contratación pública,{" "}
            <span className="text-brand-blue">en un solo lugar</span>
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400">
            Olvídate de visitar una a una las entidades. Selecciona los
            certificados que necesitas, paga una sola vez y recíbelos listos
            para presentar.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/registro"
              className="inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark px-6 py-3"
            >
              Solicitar mis documentos
            </a>
            <a
              href="#empresas"
              className="inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-6 py-3"
            >
              Soy empresa
            </a>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="bg-gray-50 dark:bg-gray-900 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center">
              Cómo funciona
            </h2>
            <div className="mt-12 grid sm:grid-cols-3 gap-8">
              {pasos.map((paso) => (
                <div key={paso.numero} className="text-center">
                  <div className="mx-auto flex items-center justify-center size-12 rounded-full bg-brand-blue text-white font-bold">
                    {paso.numero}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {paso.titulo}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {paso.descripcion}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Documentos disponibles */}
        <section id="documentos" className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center">
              Documentos disponibles
            </h2>
            <p className="mt-3 text-center text-gray-600 dark:text-gray-400">
              Los certificados más solicitados para procesos de contratación
              pública.
            </p>
            <div className="mt-10">
              <PreciosDocumentosPricing />
            </div>
          </div>
        </section>

        {/* Planes */}
        <section id="planes" className="bg-gray-50 dark:bg-gray-900 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center">
              Planes
            </h2>

            <PlanPersonaCard />

            <div id="empresas" className="mt-20 scroll-mt-20">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">
                Planes para empresas
              </h3>
              <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
                Paquetes de consultas para validar antecedentes de tus
                candidatos antes de contratar, con su autorización.
              </p>
              <div className="mt-8">
                <PlanesEmpresaPricing />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
