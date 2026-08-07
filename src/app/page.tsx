import Header from "@/components/Header";
import Footer from "@/components/Footer";

const documentos = [
  "Antecedentes judiciales (Policía Nacional)",
  "Antecedentes disciplinarios (Procuraduría)",
  "Antecedentes fiscales (Contraloría)",
  "Medidas correctivas",
  "Registro de conductas sexuales (REDAM/RNMDS)",
  "Antecedentes penales",
];

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
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
            Todos tus documentos de contratación pública,{" "}
            <span className="text-brand-blue">en un solo lugar</span>
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-lg text-gray-600">
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
              className="inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3"
            >
              Soy empresa
            </a>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 text-center">
              Cómo funciona
            </h2>
            <div className="mt-12 grid sm:grid-cols-3 gap-8">
              {pasos.map((paso) => (
                <div key={paso.numero} className="text-center">
                  <div className="mx-auto flex items-center justify-center size-12 rounded-full bg-brand-blue text-white font-bold">
                    {paso.numero}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    {paso.titulo}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
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
            <h2 className="text-3xl font-bold text-gray-900 text-center">
              Documentos disponibles
            </h2>
            <p className="mt-3 text-center text-gray-600">
              Los certificados más solicitados para procesos de contratación
              pública.
            </p>
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentos.map((doc) => (
                <div
                  key={doc}
                  className="flex items-center gap-x-3 p-4 rounded-lg border border-gray-200"
                >
                  <span className="flex-none flex items-center justify-center size-8 rounded-full bg-brand-blue/10 text-brand-blue">
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
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {doc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Planes */}
        <section id="planes" className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 text-center">
              Planes
            </h2>
            <div className="mt-12 grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="p-8 rounded-2xl border border-gray-200 bg-white">
                <h3 className="text-xl font-semibold text-gray-900">
                  Persona independiente
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Paga solo por los documentos que necesitas para tu próximo
                  contrato.
                </p>
                <a
                  href="/registro"
                  className="mt-6 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark px-5 py-2.5"
                >
                  Solicitar documentos
                </a>
              </div>

              <div
                id="empresas"
                className="p-8 rounded-2xl border border-brand-blue/30 bg-white"
              >
                <h3 className="text-xl font-semibold text-gray-900">
                  Empresas
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Paquetes de consultas para validar antecedentes de tus
                  candidatos antes de contratar, con su autorización.
                </p>
                <a
                  href="/empresas"
                  className="mt-6 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-brand-blue text-brand-blue hover:bg-brand-blue/10 px-5 py-2.5"
                >
                  Conocer planes empresariales
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
